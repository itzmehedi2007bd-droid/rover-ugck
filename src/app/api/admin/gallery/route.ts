import { existsSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { GalleryUploadError, uploadGalleryImage } from "@/lib/cloudinary";
import { authorizeAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseLocalGalleryImage(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const data = body as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const filePath = typeof data.filePath === "string" ? data.filePath.trim() : "";
  const match = /^\/gallery\/([A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpe?g|png|webp|avif|gif))$/i.exec(filePath);
  if (!title || title.length > 200 || description.length > 2000 || !match) return null;
  if (!existsSync(path.join(process.cwd(), "public", "gallery", match[1]))) return null;
  return { title, description: description || null, fileName: match[1], filePath };
}

export async function GET() {
  try {
    const authorization = await authorizeAdmin("gallery");
    if (!authorization.admin) return errorResponse("এই কাজের অনুমতি আপনার নেই।", authorization.status);
    const images = await prisma.galleryImage.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ images });
  } catch {
    console.error("Admin gallery could not be loaded.");
    return errorResponse("গ্যালারি লোড করা যায়নি।", 500);
  }
}

export async function POST(request: NextRequest) {
  let authorization;
  try { authorization = await authorizeAdmin("gallery"); } catch {
    console.error("Gallery admin authorization could not be verified.");
    return errorResponse("অ্যাডমিন পরিচয় যাচাই করা যায়নি। আবার লগইন করুন।", 500);
  }
  if (!authorization?.admin) return errorResponse("এই কাজের অনুমতি আপনার নেই।", authorization?.status ?? 401);
  let uploaded: Awaited<ReturnType<typeof uploadGalleryImage>> | null = null;
  let saved = false;
  try {
    let data: { title: string; description: string | null; fileName: string; filePath: string } | null = null;
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      const title = String(form.get("title") ?? "").trim();
      const description = String(form.get("description") ?? "").trim();
      const file = form.get("image");
      if (!title || title.length > 200 || description.length > 2000) {
        return errorResponse("শিরোনাম ও বিবরণ সঠিকভাবে দিন।", 400);
      }
      if (!(file instanceof File)) return errorResponse("আপলোড করার জন্য একটি ছবি নির্বাচন করুন।", 400);
      uploaded = await uploadGalleryImage(file);
      data = { title, description: description || null, fileName: uploaded.fileName, filePath: uploaded.filePath };
    } else {
      let body: unknown;
      try { body = await request.json(); } catch { return errorResponse("সঠিক JSON তথ্য পাঠান।", 400); }
      data = parseLocalGalleryImage(body);
      if (!data) return errorResponse("শিরোনাম, বিবরণ এবং public/gallery-তে থাকা বৈধ ছবির path দিন।", 400);
    }

    const image = await prisma.galleryImage.create({ data });
    saved = true;
    revalidatePath("/admin/gallery");
    revalidatePath("/");
    return NextResponse.json({ image }, { status: 201 });
  } catch (cause) {
    if (uploaded && !saved) {
      try { const { deleteGalleryImage } = await import("@/lib/cloudinary"); await deleteGalleryImage(uploaded.publicId); } catch { /* best-effort cleanup; never expose credentials */ }
    }
    if (cause instanceof GalleryUploadError) return errorResponse(cause.message, cause.status);
    console.error("Gallery image could not be created.");
    return errorResponse("ছবি গ্যালারিতে যোগ করা যায়নি। আবার চেষ্টা করুন।", 500);
  }
}
