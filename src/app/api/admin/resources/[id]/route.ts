import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeAdmin } from "@/lib/auth";
import { deleteResourcePdf, MAX_RESOURCE_PDF_SIZE, ResourceFileError, resourceCloudinaryPublicId, uploadResourcePdf } from "@/lib/cloudinary-resources";
import { prisma } from "@/lib/prisma";

type Context = { params: { id: string } };
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });
const str = (v: unknown) => typeof v === "string" ? v.trim() : "";

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const authorization = await authorizeAdmin("resources");
    if (!authorization.admin) return error("এই কাজের অনুমতি আপনার নেই।", authorization.status);
    const resource = await prisma.resource.findUnique({ where: { id: params.id } });
    return resource ? NextResponse.json({ resource }) : error("রিসোর্সটি পাওয়া যায়নি।", 404);
  } catch {
    console.error("Admin resource read failed.");
    return error("রিসোর্স লোড করা যায়নি।", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  let uploaded: Awaited<ReturnType<typeof uploadResourcePdf>> | null = null;
  let saved = false;
  try {
    const authorization = await authorizeAdmin("resources");
    if (!authorization.admin) return error("এই কাজের অনুমতি আপনার নেই।", authorization.status);
    const current = await prisma.resource.findUnique({ where: { id: params.id } });
    if (!current) return error("রিসোর্সটি পাওয়া যায়নি।", 404);
    let title = current.title, description = current.description ?? "", category = current.category;
    let published = current.published;
    let pdf: File | null = null;
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > MAX_RESOURCE_PDF_SIZE + 256 * 1024) return error("PDF ফাইলের সর্বোচ্চ আকার ২০ MB হতে পারবে।", 413);
      const form = await request.formData();
      title = str(form.get("title")); description = str(form.get("description")); category = str(form.get("category"));
      published = form.get("published") === "true";
      const value = form.get("pdf");
      if (value instanceof File && value.size > 0) pdf = value;
      else if (value !== null && value !== "") return error("নির্বাচিত ফাইলটি সঠিক PDF নয়।", 400);
    } else {
      const body: unknown = await request.json().catch(() => null);
      if (!body || typeof body !== "object" || Array.isArray(body)) return error("পরিবর্তনের তথ্য সঠিক নয়।", 400);
      const data = body as Record<string, unknown>;
      if (data.title !== undefined) title = str(data.title);
      if (data.description !== undefined) description = str(data.description);
      if (data.category !== undefined) category = str(data.category);
      if (data.published !== undefined) {
        if (typeof data.published !== "boolean") return error("প্রকাশের অবস্থা সঠিক নয়।", 400);
        published = data.published;
      }
    }
    if (!title || title.length > 200 || description.length > 4000 || !category || category.length > 80) return error("নাম, বিবরণ ও category সঠিকভাবে দিন।", 400);
    if (pdf) uploaded = await uploadResourcePdf(pdf);
    const resource = await prisma.resource.update({ where: { id: current.id }, data: {
      title, description: description || null, category, published,
      ...(uploaded ? { fileName: uploaded.fileName, filePath: uploaded.filePath, mimeType: "application/pdf", fileSize: uploaded.fileSize } : {}),
    } });
    saved = true;
    if (uploaded) {
      const oldId = resourceCloudinaryPublicId(current.filePath);
      if (oldId && oldId !== uploaded.publicId) {
        const references = await prisma.resource.count({ where: { id: { not: current.id }, filePath: current.filePath } });
        if (references === 0) { try { await deleteResourcePdf(oldId); } catch { /* replacement is saved; remote cleanup can be retried */ } }
      }
    }
    revalidatePath("/admin/resources"); revalidatePath("/resources");
    return NextResponse.json({ resource });
  } catch (cause) {
    if (uploaded && !saved) { try { await deleteResourcePdf(uploaded.publicId); } catch { /* best-effort cleanup */ } }
    if (cause instanceof ResourceFileError) return error(cause.message, cause.status);
    console.error("PDF resource update failed.");
    return error("রিসোর্সের পরিবর্তন সংরক্ষণ করা যায়নি।", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const authorization = await authorizeAdmin("resources");
    if (!authorization.admin) return error("এই কাজের অনুমতি আপনার নেই।", authorization.status);
    const current = await prisma.resource.findUnique({ where: { id: params.id } });
    if (!current) return error("রিসোর্সটি পাওয়া যায়নি।", 404);
    await prisma.resource.delete({ where: { id: current.id } });
    let assetRemoved = true;
    const publicId = resourceCloudinaryPublicId(current.filePath);
    if (publicId) {
      const references = await prisma.resource.count({ where: { filePath: current.filePath } });
      if (references === 0) {
        try { await deleteResourcePdf(publicId); } catch { assetRemoved = false; }
      }
    }
    revalidatePath("/admin/resources"); revalidatePath("/resources");
    return NextResponse.json({ success: true, assetRemoved });
  } catch (cause) {
    if (cause instanceof ResourceFileError) return error(cause.message, cause.status);
    console.error("PDF resource deletion failed.");
    return error("রিসোর্স মুছে ফেলা যায়নি।", 500);
  }
}
