import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeAdmin } from "@/lib/auth";
import { MAX_RESOURCE_PDF_SIZE, ResourceFileError, uploadResourcePdf } from "@/lib/cloudinary-resources";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

function text(value: FormDataEntryValue | null) { return typeof value === "string" ? value.trim() : ""; }

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeAdmin("resources");
    if (!authorization.admin) return error("এই কাজের অনুমতি আপনার নেই।", authorization.status);
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const category = request.nextUrl.searchParams.get("category")?.trim() ?? "";
    const resources = await prisma.resource.findMany({
      where: {
        ...(query ? { OR: [{ title: { contains: query } }, { description: { contains: query } }, { fileName: { contains: query } }] } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ resources });
  } catch {
    console.error("Admin resource listing failed.");
    return error("রিসোর্স তালিকা লোড করা যায়নি।", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeAdmin("resources");
    if (!authorization.admin) return error("এই কাজের অনুমতি আপনার নেই।", authorization.status);
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_RESOURCE_PDF_SIZE + 256 * 1024) return error("PDF ফাইলের সর্বোচ্চ আকার ২০ MB হতে পারবে।", 413);
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) return error("PDF upload form সঠিক নয়।", 400);
    const form = await request.formData();
    const title = text(form.get("title"));
    const description = text(form.get("description"));
    const category = text(form.get("category"));
    const file = form.get("pdf");
    if (!title || title.length > 200 || description.length > 4000 || !category || category.length > 80) {
      return error("নাম, বিবরণ ও সর্বোচ্চ ৮০ অক্ষরের category সঠিকভাবে দিন।", 400);
    }
    if (!(file instanceof File)) return error("একটি PDF ফাইল নির্বাচন করুন।", 400);
    const uploaded = await uploadResourcePdf(file);
    try {
      const resource = await prisma.resource.create({ data: {
        title, description: description || null, category, fileName: uploaded.fileName,
        filePath: uploaded.filePath, mimeType: "application/pdf", fileSize: uploaded.fileSize,
        published: form.get("published") === "true",
      } });
      revalidatePath("/admin/resources");
      revalidatePath("/resources");
      return NextResponse.json({ resource }, { status: 201 });
    } catch (cause) {
      try { const { deleteResourcePdf } = await import("@/lib/cloudinary-resources"); await deleteResourcePdf(uploaded.publicId); } catch { /* cleanup is best effort */ }
      throw cause;
    }
  } catch (cause) {
    if (cause instanceof ResourceFileError) return error(cause.message, cause.status);
    console.error("PDF resource creation failed.");
    return error("PDF সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।", 500);
  }
}
