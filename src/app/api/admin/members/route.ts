import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeAdmin } from "@/lib/auth";
import { deleteMemberImage, GalleryUploadError, uploadMemberImage } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
const text = (value: FormDataEntryValue | unknown) => typeof value === "string" ? value.trim() : "";

function validate(data: { fullName: string; designation: string; batch: string; memberNumber: string; displayOrder: number }) {
  return data.fullName.length >= 2 && data.fullName.length <= 150 &&
    data.designation.length >= 2 && data.designation.length <= 120 &&
    data.batch.length <= 80 && data.memberNumber.length <= 100 &&
    Number.isInteger(data.displayOrder) && data.displayOrder >= 0 && data.displayOrder <= 100000;
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin("members");
  if (!authorization.admin) return error("সদস্য পরিচালনার অনুমতি আপনার নেই।", authorization.status);
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const designation = request.nextUrl.searchParams.get("designation")?.trim().slice(0, 120) ?? "";
  const batch = request.nextUrl.searchParams.get("batch")?.trim().slice(0, 80) ?? "";
  try {
    const members = await prisma.member.findMany({
      where: {
        ...(query ? { OR: [{ fullName: { contains: query } }, { designation: { contains: query } }, { memberNumber: { contains: query } }] } : {}),
        ...(designation ? { designation } : {}),
        ...(batch ? { batch } : {}),
      },
      orderBy: [{ displayOrder: "asc" }, { fullName: "asc" }],
    });
    return NextResponse.json({ members }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Admin member list could not be loaded.");
    return error("সদস্যদের তালিকা লোড করা যায়নি।", 500);
  }
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdmin("members");
  if (!authorization.admin) return error("সদস্য পরিচালনার অনুমতি আপনার নেই।", authorization.status);
  let uploaded: Awaited<ReturnType<typeof uploadMemberImage>> | null = null;
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 5 * 1024 * 1024 + 256 * 1024) return error("ছবির আকার সর্বোচ্চ ৫ MB হতে পারবে।", 413);
    let fullName = "", designation = "", batch = "", memberNumber = "", displayOrder = 0, published = false;
    let image: File | null = null;
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      fullName = text(form.get("fullName")); designation = text(form.get("designation"));
      batch = text(form.get("batch")); memberNumber = text(form.get("memberNumber"));
      const orderValue = text(form.get("displayOrder")); displayOrder = orderValue ? Number(orderValue) : 0;
      published = form.get("published") === "true";
      const file = form.get("image");
      if (file instanceof File && file.size > 0) image = file;
      else if (file !== null && file !== "") return error("নির্বাচিত ছবিটি সঠিক নয়।", 400);
    } else {
      const body: unknown = await request.json().catch(() => null);
      if (!body || typeof body !== "object" || Array.isArray(body)) return error("সঠিক সদস্যের তথ্য দিন।", 400);
      const data = body as Record<string, unknown>;
      fullName = text(data.fullName); designation = text(data.designation); batch = text(data.batch); memberNumber = text(data.memberNumber);
      displayOrder = data.displayOrder === undefined ? 0 : Number(data.displayOrder);
      if (data.published !== undefined && typeof data.published !== "boolean") return error("প্রকাশের অবস্থা সঠিক নয়।", 400);
      published = data.published === true;
    }
    const values = { fullName, designation, batch, memberNumber, displayOrder };
    if (!validate(values)) return error("নাম, পদবি, ঐচ্ছিক batch/সদস্য নম্বর ও display order সঠিকভাবে দিন।", 400);
    if (memberNumber && await prisma.member.findUnique({ where: { memberNumber } })) return error("এই সদস্য নম্বরটি আগে থেকেই ব্যবহৃত হয়েছে।", 409);
    if (image) uploaded = await uploadMemberImage(image);
    const member = await prisma.member.create({ data: {
      fullName, designation, batch: batch || null, memberNumber: memberNumber || null,
      displayOrder, published, imageUrl: uploaded?.filePath ?? null,
    } });
    revalidatePath("/members"); revalidatePath("/"); revalidatePath("/admin/members");
    return NextResponse.json({ member }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    if (uploaded) { try { await deleteMemberImage(uploaded.publicId); } catch { /* preserve the primary error; remote cleanup can be retried */ } }
    if (cause instanceof GalleryUploadError) return error(cause.message, cause.status);
    if (cause && typeof cause === "object" && "code" in cause && cause.code === "P2002") return error("এই সদস্য নম্বরটি আগে থেকেই ব্যবহৃত হয়েছে।", 409);
    console.error("Member creation failed.");
    return error("সদস্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।", 500);
  }
}
