import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: { id: string } };
const MAX_PDF_SIZE = 20 * 1024 * 1024;

function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status, headers: { "Cache-Control": "no-store" } });
}

function allowedPdfUrl(value: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName || !/^[A-Za-z0-9_-]+$/.test(cloudName)) return null;
  try {
    const url = new URL(value);
    const path = new RegExp(`^/${cloudName}/image/upload/(?:v[0-9]+/)?rover-ugck/resources/[0-9a-f-]{36}\\.pdf$`, "i");
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || url.port || url.username || url.password || url.search || url.hash || !path.test(url.pathname)) return null;
    return url;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const resource = await prisma.resource.findFirst({
      where: { id: params.id, published: true },
      select: { id: true, fileName: true, filePath: true, mimeType: true, fileSize: true },
    });
    if (!resource) return jsonError("প্রকাশিত PDF-টি পাওয়া যায়নি।", 404);
    if (resource.mimeType !== "application/pdf" || resource.fileSize > MAX_PDF_SIZE) {
      return jsonError("PDF ফাইলের তথ্য যাচাই করা যায়নি।", 415);
    }
    const url = allowedPdfUrl(resource.filePath);
    if (!url) return jsonError("এই PDF-এর নিরাপদ Cloudinary URL সঠিক নয়।", 502, "INVALID_PDF_URL");

    let upstream: Response;
    try {
      upstream = await fetch(url, {
        cache: "no-store",
        redirect: "manual",
      });
    } catch {
      return jsonError("Cloudinary PDF-তে সংযোগ করা যাচ্ছে না। পরে আবার চেষ্টা করুন।", 502, "PDF_ORIGIN_UNAVAILABLE");
    }

    if (upstream.status === 401 || upstream.status === 403) {
      await upstream.body?.cancel();
      return jsonError(
        "Cloudinary PDF delivery বন্ধ আছে। Cloudinary Console → Product Environment → Security-তে ‘Allow delivery of PDF and ZIP files’ চালু করুন।",
        503,
        "PDF_DELIVERY_BLOCKED",
      );
    }
    if (upstream.status !== 200) {
      await upstream.body?.cancel();
      return jsonError("Cloudinary থেকে PDF পাওয়া যায়নি। ফাইলটি Cloudinary-তে আছে কি না পরীক্ষা করুন।", 502, "PDF_ORIGIN_ERROR");
    }
    const contentType = upstream.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/pdf") {
      await upstream.body?.cancel();
      return jsonError("Cloudinary থেকে বৈধ PDF response পাওয়া যায়নি।", 502, "INVALID_PDF_RESPONSE");
    }
    const contentLength = Number(upstream.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_PDF_SIZE) {
      await upstream.body?.cancel();
      return jsonError("PDF ফাইলের আকার অনুমোদিত সীমার চেয়ে বড়।", 413);
    }

    const reader = upstream.body?.getReader();
    if (!reader) return jsonError("Cloudinary থেকে PDF-এর body পাওয়া যায়নি।", 502, "INVALID_PDF_RESPONSE");
    const initialChunks: Uint8Array[] = [];
    let initialSize = 0;
    try {
      while (initialSize < 5) {
        const part = await reader.read();
        if (part.done) break;
        initialChunks.push(part.value);
        initialSize += part.value.byteLength;
      }
    } catch {
      await reader.cancel();
      return jsonError("Cloudinary থেকে PDF body যাচাই করা যায়নি।", 502, "INVALID_PDF_RESPONSE");
    }
    const signature = new Uint8Array(initialSize);
    let signatureOffset = 0;
    for (const chunk of initialChunks) {
      signature.set(chunk, signatureOffset);
      signatureOffset += chunk.byteLength;
    }
    if (initialSize < 5 || new TextDecoder("ascii").decode(signature.subarray(0, 5)) !== "%PDF-") {
      await reader.cancel();
      return jsonError("Cloudinary থেকে বৈধ PDF ফাইল পাওয়া যায়নি।", 502, "INVALID_PDF_RESPONSE");
    }

    const safeFileName = /^[A-Za-z0-9._-]+\.pdf$/i.test(resource.fileName) ? resource.fileName : `${resource.id}.pdf`;
    const disposition = request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${safeFileName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Accept-Ranges": "none",
    });
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of initialChunks) controller.enqueue(chunk);
        void (async () => {
          try {
            while (true) {
              const part = await reader.read();
              if (part.done) {
                controller.close();
                break;
              }
              controller.enqueue(part.value);
            }
          } catch (error) {
            controller.error(error);
          } finally {
            reader.releaseLock();
          }
        })();
      },
      cancel(reason) {
        return reader.cancel(reason);
      },
    });
    return new Response(body, { status: 200, headers });
  } catch {
    console.error("Public PDF delivery failed.");
    return jsonError("PDF পাঠানো যায়নি। পরে আবার চেষ্টা করুন।", 500);
  }
}
