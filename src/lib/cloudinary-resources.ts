import { createHash, randomUUID } from "node:crypto";

const MAX_PDF_SIZE = 20 * 1024 * 1024;
const RESOURCE_PREFIX = "rover-ugck/resources/";

export class ResourceFileError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ResourceFileError";
    this.status = status;
  }
}

function config() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret || !/^[A-Za-z0-9_-]+$/.test(cloudName)) {
    throw new ResourceFileError("Cloudinary আপলোড সেবা প্রস্তুত নয়। সার্ভার administrator-কে configuration পরীক্ষা করতে বলুন।", 503);
  }
  return { cloudName, apiKey, apiSecret };
}

function sign(parameters: Record<string, string>, secret: string) {
  const canonical = Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("&");
  return createHash("sha1").update(`${canonical}${secret}`).digest("hex");
}

export function validatePdf(bytes: Uint8Array, declaredType: string, originalName: string) {
  if (bytes.byteLength === 0) throw new ResourceFileError("নির্বাচিত PDF ফাইলটি খালি।");
  if (bytes.byteLength > MAX_PDF_SIZE) throw new ResourceFileError("PDF ফাইলের সর্বোচ্চ আকার ২০ MB হতে পারবে।");
  if (declaredType.toLowerCase() !== "application/pdf" || !/\.pdf$/i.test(originalName)) {
    throw new ResourceFileError("শুধু application/pdf MIME type-এর .pdf ফাইল গ্রহণ করা হবে।");
  }
  if (bytes.byteLength < 8 || new TextDecoder("ascii").decode(bytes.subarray(0, 5)) !== "%PDF-") {
    throw new ResourceFileError("ফাইলের প্রকৃত PDF signature যাচাই করা যায়নি।");
  }
}

export async function uploadResourcePdf(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  validatePdf(bytes, file.type, file.name);
  const { cloudName, apiKey, apiSecret } = config();
  const assetId = randomUUID();
  const publicId = `${RESOURCE_PREFIX}${assetId}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { public_id: publicId, timestamp };
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: "application/pdf" }), "resource.pdf");
  form.set("public_id", publicId);
  form.set("timestamp", timestamp);
  form.set("api_key", apiKey);
  form.set("signature", sign(params, apiSecret));

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form });
  } catch {
    throw new ResourceFileError("Cloudinary-তে PDF পাঠানো যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।", 502);
  }
  const result = await response.json().catch(() => null) as { secure_url?: unknown; public_id?: unknown; format?: unknown; bytes?: unknown } | null;
  if (!response.ok || result?.public_id !== publicId || result.format !== "pdf" || typeof result.secure_url !== "string") {
    throw new ResourceFileError("PDF আপলোড হয়নি। Cloudinary-এর PDF upload configuration পরীক্ষা করে আবার চেষ্টা করুন।", 502);
  }
  let url: URL;
  try { url = new URL(result.secure_url); } catch { throw new ResourceFileError("Cloudinary নিরাপদ PDF URL ফেরত দেয়নি।", 502); }
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !url.pathname.includes(`/${cloudName}/image/upload/`) || !url.pathname.toLowerCase().endsWith(".pdf")) {
    throw new ResourceFileError("Cloudinary নিরাপদ PDF URL ফেরত দেয়নি।", 502);
  }
  return { filePath: url.toString(), publicId, fileSize: bytes.byteLength, fileName: `${assetId}.pdf` };
}

export function resourceCloudinaryPublicId(filePath: string) {
  let url: URL;
  try { url = new URL(filePath); } catch { return null; }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName || url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return null;
  const prefix = `/${cloudName}/image/upload/`;
  if (!url.pathname.startsWith(prefix) || !url.pathname.toLowerCase().endsWith(".pdf")) return null;
  const pieces = url.pathname.slice(prefix.length).split("/");
  if (pieces[0]?.startsWith("v") && /^v\d+$/.test(pieces[0])) pieces.shift();
  const publicId = pieces.join("/").replace(/\.pdf$/i, "");
  return /^rover-ugck\/resources\/[0-9a-f-]{36}$/i.test(publicId) ? publicId : null;
}

export async function deleteResourcePdf(publicId: string) {
  if (!/^rover-ugck\/resources\/[0-9a-f-]{36}$/i.test(publicId)) throw new ResourceFileError("PDF asset-এর নিরাপদ পরিচয় যাচাই করা যায়নি।", 400);
  const { cloudName, apiKey, apiSecret } = config();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { public_id: publicId, timestamp };
  const form = new FormData();
  form.set("public_id", publicId);
  form.set("timestamp", timestamp);
  form.set("api_key", apiKey);
  form.set("signature", sign(params, apiSecret));
  let response: Response;
  try { response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: "POST", body: form }); }
  catch { throw new ResourceFileError("Cloudinary থেকে PDF সরানো যায়নি।", 502); }
  const result = await response.json().catch(() => null) as { result?: unknown } | null;
  if (!response.ok || (result?.result !== "ok" && result?.result !== "not found")) throw new ResourceFileError("Cloudinary থেকে PDF সরানো যায়নি।", 502);
}

export const MAX_RESOURCE_PDF_SIZE = MAX_PDF_SIZE;
