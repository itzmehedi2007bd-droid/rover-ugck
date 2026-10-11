import { createHash, randomUUID } from "node:crypto";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = {
  "image/jpeg": { extension: "jpg", matches: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: "png", matches: (bytes: Uint8Array) => startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  "image/webp": { extension: "webp", matches: (bytes: Uint8Array) => startsWithBytes(bytes.subarray(0, 4), [0x52, 0x49, 0x46, 0x46]) && startsWithBytes(bytes.subarray(8, 12), [0x57, 0x45, 0x42, 0x50]) },
} as const;

function startsWithBytes(bytes: Uint8Array, expected: number[]) {
  return expected.every((byte, index) => bytes[index] === byte);
}

export class GalleryUploadError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "GalleryUploadError";
    this.status = status;
  }
}

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret || !/^[A-Za-z0-9_-]+$/.test(cloudName)) {
    throw new GalleryUploadError("ছবি আপলোডের সেবা প্রস্তুত নয়। সার্ভার administrator-কে Cloudinary configuration পরীক্ষা করতে বলুন।", 503);
  }
  return { cloudName, apiKey, apiSecret };
}

function signature(parameters: Record<string, string>, apiSecret: string) {
  const canonical = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1").update(`${canonical}${apiSecret}`).digest("hex");
}

export function identifyGalleryImage(bytes: Uint8Array, declaredType: string) {
  const type = IMAGE_TYPES[declaredType as keyof typeof IMAGE_TYPES];
  if (!type || !type.matches(bytes)) {
    throw new GalleryUploadError("শুধু JPG, JPEG, PNG ও WebP ছবির ফাইল গ্রহণ করা হয়। ফাইলের ধরন ও আসল ছবির format মিলিয়ে দেখুন।");
  }
  return type.extension;
}

async function uploadImage(file: File, folder: "gallery" | "members") {
  if (file.size === 0) throw new GalleryUploadError("নির্বাচিত ছবিটি খালি। অন্য একটি ছবি নির্বাচন করুন।");
  if (file.size > MAX_IMAGE_SIZE) throw new GalleryUploadError("ছবির আকার সর্বোচ্চ ৫ MB হতে পারবে।");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = identifyGalleryImage(bytes, file.type);
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const fileId = randomUUID();
  const publicId = `rover-ugck/${folder}/${fileId}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signed = { public_id: publicId, timestamp };
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: file.type }), `${folder}.${extension}`);
  form.set("public_id", publicId);
  form.set("timestamp", timestamp);
  form.set("api_key", apiKey);
  form.set("signature", signature(signed, apiSecret));

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form });
  } catch {
    throw new GalleryUploadError("ছবি আপলোড সেবার সঙ্গে সংযোগ করা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।", 502);
  }
  const result = await response.json().catch(() => null) as { secure_url?: unknown; public_id?: unknown } | null;
  if (!response.ok || typeof result?.secure_url !== "string" || result.public_id !== publicId) {
    throw new GalleryUploadError("ছবি আপলোড করা যায়নি। ফাইলটি পরীক্ষা করে আবার চেষ্টা করুন।", 502);
  }

  const url = new URL(result.secure_url);
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !url.pathname.includes(`/${cloudName}/image/upload/`)) {
    throw new GalleryUploadError("ছবি আপলোড সেবা থেকে নিরাপদ image URL পাওয়া যায়নি।", 502);
  }
  return { fileName: `${fileId}.${extension}`, filePath: url.toString(), publicId };
}

export function uploadGalleryImage(file: File) {
  return uploadImage(file, "gallery");
}

export function uploadMemberImage(file: File) {
  return uploadImage(file, "members");
}

function cloudinaryImagePublicId(filePath: string, folder: "gallery" | "members") {
  let url: URL;
  try { url = new URL(filePath); } catch { return null; }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName || url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return null;
  const prefix = `/${cloudName}/image/upload/`;
  if (!url.pathname.startsWith(prefix)) return null;
  const assetPath = url.pathname.slice(prefix.length).split("/");
  if (assetPath[0]?.startsWith("v") && /^v\d+$/.test(assetPath[0])) assetPath.shift();
  const publicId = assetPath.join("/").replace(/\.(?:jpe?g|png|webp)$/i, "");
  return new RegExp(`^rover-ugck/${folder}/[0-9a-f-]{36}$`, "i").test(publicId) ? publicId : null;
}

export function galleryCloudinaryPublicId(filePath: string) {
  return cloudinaryImagePublicId(filePath, "gallery");
}

export function memberCloudinaryPublicId(filePath: string) {
  return cloudinaryImagePublicId(filePath, "members");
}

async function deleteImage(publicId: string, folder: "gallery" | "members") {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  if (!new RegExp(`^rover-ugck/${folder}/[0-9a-f-]{36}$`, "i").test(publicId)) {
    throw new GalleryUploadError("ছবির নিরাপদ পরিচয় যাচাই করা যায়নি।", 400);
  }
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signed = { public_id: publicId, timestamp };
  const form = new FormData();
  form.set("public_id", publicId);
  form.set("timestamp", timestamp);
  form.set("api_key", apiKey);
  form.set("signature", signature(signed, apiSecret));

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: "POST", body: form });
  } catch {
    throw new GalleryUploadError("Cloudinary-তে ছবিটি মোছা যায়নি। আবার চেষ্টা করুন।", 502);
  }
  const result = await response.json().catch(() => null) as { result?: unknown } | null;
  if (!response.ok || (result?.result !== "ok" && result?.result !== "not found")) {
    throw new GalleryUploadError("Cloudinary-তে ছবিটি মোছা যায়নি। গ্যালারি entry অক্ষত রাখা হয়েছে।", 502);
  }
}

export function deleteGalleryImage(publicId: string) {
  return deleteImage(publicId, "gallery");
}

export function deleteMemberImage(publicId: string) {
  return deleteImage(publicId, "members");
}
