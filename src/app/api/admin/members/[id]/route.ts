import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeAdmin } from "@/lib/auth";
import { deleteMemberImage, GalleryUploadError, memberCloudinaryPublicId, uploadMemberImage } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

type Context = { params: { id: string } };
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

function valid(fullName: string, designation: string, batch: string, memberNumber: string, displayOrder: number) {
  return fullName.length >= 2 && fullName.length <= 150 && designation.length >= 2 && designation.length <= 120 &&
    batch.length <= 80 && memberNumber.length <= 100 && Number.isInteger(displayOrder) && displayOrder >= 0 && displayOrder <= 100000;
}

export async function GET(_request: NextRequest, { params }: Context) {
  const authorization = await authorizeAdmin("members");
  if (!authorization.admin) return error("সদস্য পরিচালনার অনুমতি আপনার নেই।", authorization.status);
  const member = await prisma.member.findUnique({ where: { id: params.id } });
  return member ? NextResponse.json({ member }, { headers: { "Cache-Control": "no-store" } }) : error("সদস্যকে পাওয়া যায়নি।", 404);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const authorization = await authorizeAdmin("members");
  if (!authorization.admin) return error("সদস্য পরিচালনার অনুমতি আপনার নেই।", authorization.status);
  let uploaded: Awaited<ReturnType<typeof uploadMemberImage>> | null = null;
  let saved = false;
  try {
    const current = await prisma.member.findUnique({ where: { id: params.id } });
    if (!current) return error("সদস্যকে পাওয়া যায়নি।", 404);
    let fullName = current.fullName, designation = current.designation, batch = current.batch ?? "", memberNumber = current.memberNumber ?? "";
    let displayOrder = current.displayOrder, published = current.published, image: File | null = null;
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > 5 * 1024 * 1024 + 256 * 1024) return error("ছবির আকার সর্বোচ্চ ৫ MB হতে পারবে।", 413);
      const form = await request.formData();
      fullName = text(form.get("fullName")); designation = text(form.get("designation")); batch = text(form.get("batch")); memberNumber = text(form.get("memberNumber"));
      const orderValue = text(form.get("displayOrder")); displayOrder = orderValue ? Number(orderValue) : 0;
      if (form.has("published")) published = form.get("published") === "true";
      const file = form.get("image");
      if (file instanceof File && file.size > 0) image = file;
      else if (file !== null && file !== "") return error("নির্বাচিত ছবিটি সঠিক নয়।", 400);
    } else {
      const body: unknown = await request.json().catch(() => null);
      if (!body || typeof body !== "object" || Array.isArray(body)) return error("সঠিক পরিবর্তনের তথ্য দিন।", 400);
      const data = body as Record<string, unknown>;
      if ("imageUrl" in data) return error("ছবি URL সরাসরি পরিবর্তন করা যাবে না; upload ব্যবহার করুন।", 400);
      if (data.fullName !== undefined) fullName = text(data.fullName);
      if (data.designation !== undefined) designation = text(data.designation);
      if (data.batch !== undefined) batch = text(data.batch);
      if (data.memberNumber !== undefined) memberNumber = text(data.memberNumber);
      if (data.displayOrder !== undefined) displayOrder = Number(data.displayOrder);
      if (data.published !== undefined) {
        if (typeof data.published !== "boolean") return error("প্রকাশের অবস্থা সঠিক নয়।", 400);
        published = data.published;
      }
    }
    if (!valid(fullName, designation, batch, memberNumber, displayOrder)) return error("নাম, পদবি, ঐচ্ছিক batch/সদস্য নম্বর ও display order সঠিকভাবে দিন।", 400);
    if (memberNumber && await prisma.member.findFirst({ where: { memberNumber, id: { not: current.id } }, select: { id: true } })) return error("এই সদস্য নম্বরটি আগে থেকেই ব্যবহৃত হয়েছে।", 409);
    if (image) uploaded = await uploadMemberImage(image);
    const member = await prisma.member.update({ where: { id: current.id }, data: {
      fullName, designation, batch: batch || null, memberNumber: memberNumber || null,
      displayOrder, published, ...(uploaded ? { imageUrl: uploaded.filePath } : {}),
    } });
    saved = true;
    if (uploaded) {
      const oldPublicId = memberCloudinaryPublicId(current.imageUrl ?? "");
      if (oldPublicId) {
        const oldReferences = await prisma.member.count({ where: { id: { not: current.id }, imageUrl: current.imageUrl } });
        if (oldReferences === 0) { try { await deleteMemberImage(oldPublicId); } catch { /* replacement is saved; remote cleanup may be retried */ } }
      }
    }
    revalidatePath("/members"); revalidatePath("/"); revalidatePath("/admin/members");
    return NextResponse.json({ member }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    if (uploaded && !saved) { try { await deleteMemberImage(uploaded.publicId); } catch { /* best-effort cleanup */ } }
    if (cause instanceof GalleryUploadError) return error(cause.message, cause.status);
    if (cause && typeof cause === "object" && "code" in cause && cause.code === "P2002") return error("এই সদস্য নম্বরটি আগে থেকেই ব্যবহৃত হয়েছে।", 409);
    console.error("Member update failed.");
    return error("সদস্যের পরিবর্তন সংরক্ষণ করা যায়নি।", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const authorization = await authorizeAdmin("members");
  if (!authorization.admin) return error("সদস্য পরিচালনার অনুমতি আপনার নেই।", authorization.status);
  try {
    const member = await prisma.member.findUnique({ where: { id: params.id } });
    if (!member) return error("সদস্যকে পাওয়া যায়নি।", 404);
    const publicId = memberCloudinaryPublicId(member.imageUrl ?? "");
    if (publicId) {
      const references = await prisma.member.count({ where: { id: { not: member.id }, imageUrl: member.imageUrl } });
      if (references === 0) await deleteMemberImage(publicId);
    }
    await prisma.member.delete({ where: { id: member.id } });
    revalidatePath("/members"); revalidatePath("/"); revalidatePath("/admin/members");
    return NextResponse.json({ success: true });
  } catch (cause) {
    if (cause instanceof GalleryUploadError) return error(cause.message, cause.status);
    console.error("Member deletion failed.");
    return error("সদস্য মুছে ফেলা যায়নি। ছবি ও সদস্যের তথ্য অক্ষত রাখা হয়েছে।", 500);
  }
}
