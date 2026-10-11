import { existsSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteGalleryImage, GalleryUploadError, galleryCloudinaryPublicId, uploadGalleryImage } from "@/lib/cloudinary";
import { authorizeAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function authorized() {
  const authorization = await authorizeAdmin("gallery");
  if (authorization.admin) return null;
  return errorResponse("এই কাজের অনুমতি আপনার নেই।", authorization.status);
}

function validateMetadata(title: string, description: string) {
  return Boolean(title && title.length <= 200 && description.length <= 2000);
}

function parseLocalPath(filePath: string) {
  const match = /^\/gallery\/([A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpe?g|png|webp|avif|gif))$/i.exec(filePath);
  if (!match || !existsSync(path.join(process.cwd(), "public", "gallery", match[1]))) return null;
  return { filePath, fileName: match[1] };
}

async function canDeleteAsset(publicId: string, excludingId?: string) {
  const otherImages = await prisma.galleryImage.findMany({
    where: excludingId ? { id: { not: excludingId } } : undefined,
    select: { filePath: true },
  });
  return !otherImages.some((image) => galleryCloudinaryPublicId(image.filePath) === publicId);
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const authError = await authorized();
    if (authError) return authError;
    const image = await prisma.galleryImage.findUnique({ where: { id: params.id } });
    if (!image) return errorResponse("ছবিটি পাওয়া যায়নি।", 404);
    return NextResponse.json({ image });
  } catch {
    console.error("Gallery image could not be loaded.");
    return errorResponse("ছবির তথ্য লোড করা যায়নি।", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  let uploaded: Awaited<ReturnType<typeof uploadGalleryImage>> | null = null;
  let saved = false;
  try {
    const authError = await authorized();
    if (authError) return authError;
    const current = await prisma.galleryImage.findUnique({ where: { id: params.id } });
    if (!current) return errorResponse("ছবিটি পাওয়া যায়নি।", 404);

    let data: { title: string; description: string | null; fileName?: string; filePath?: string };
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      const title = String(form.get("title") ?? "").trim();
      const description = String(form.get("description") ?? "").trim();
      if (!validateMetadata(title, description)) return errorResponse("শিরোনাম ও বিবরণ সঠিকভাবে দিন।", 400);
      data = { title, description: description || null };
      const file = form.get("image");
      if (file instanceof File) {
        uploaded = await uploadGalleryImage(file);
        data.fileName = uploaded.fileName;
        data.filePath = uploaded.filePath;
      } else if (file !== null && file !== "") {
        return errorResponse("নির্বাচিত ছবিটি সঠিক নয়।", 400);
      }
    } else {
      let body: unknown;
      try { body = await request.json(); } catch { return errorResponse("সঠিক JSON তথ্য পাঠান।", 400); }
      if (!body || typeof body !== "object" || Array.isArray(body)) return errorResponse("সঠিক পরিবর্তনের তথ্য দিন।", 400);
      const input = body as Record<string, unknown>;
      const title = typeof input.title === "string" ? input.title.trim() : current.title;
      const description = typeof input.description === "string" ? input.description.trim() : current.description ?? "";
      if (!validateMetadata(title, description)) return errorResponse("শিরোনাম ও বিবরণ সঠিকভাবে দিন।", 400);
      data = { title, description: description || null };
      if (input.filePath !== undefined) {
        if (typeof input.filePath !== "string") return errorResponse("সঠিক ছবির path দিন।", 400);
        const local = parseLocalPath(input.filePath.trim());
        if (!local) return errorResponse("public/gallery-তে থাকা বৈধ ছবির path দিন।", 400);
        data = { ...data, ...local };
      }
    }

    const image = await prisma.galleryImage.update({ where: { id: params.id }, data });
    saved = true;
    if (uploaded) {
      const oldPublicId = galleryCloudinaryPublicId(current.filePath);
      if (oldPublicId && oldPublicId !== uploaded.publicId) {
        try { if (await canDeleteAsset(oldPublicId)) await deleteGalleryImage(oldPublicId); } catch { /* metadata update is successful; stale cloud asset can be cleaned later */ }
      }
    }
    revalidatePath("/admin/gallery");
    revalidatePath("/");
    return NextResponse.json({ image });
  } catch (cause) {
    if (uploaded && !saved) {
      try { await deleteGalleryImage(uploaded.publicId); } catch { /* best-effort cleanup */ }
    }
    if (cause instanceof GalleryUploadError) return errorResponse(cause.message, cause.status);
    console.error("Gallery image could not be updated.");
    return errorResponse("ছবির তথ্য পরিবর্তন করা যায়নি। আবার চেষ্টা করুন।", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const authError = await authorized();
    if (authError) return authError;
    const image = await prisma.galleryImage.findUnique({ where: { id: params.id } });
    if (!image) return errorResponse("ছবিটি পাওয়া যায়নি।", 404);
    const publicId = galleryCloudinaryPublicId(image.filePath);
    if (publicId && await canDeleteAsset(publicId, image.id)) await deleteGalleryImage(publicId);
    await prisma.galleryImage.delete({ where: { id: image.id } });
    revalidatePath("/admin/gallery");
    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (cause) {
    if (cause instanceof GalleryUploadError) return errorResponse(cause.message, cause.status);
    console.error("Gallery image could not be deleted.");
    return errorResponse("ছবিটি গ্যালারি থেকে সরানো যায়নি।", 500);
  }
}
