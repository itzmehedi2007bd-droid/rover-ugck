"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type GalleryImage = { title: string; description: string | null; filePath: string };
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function GalleryForm({ imageId }: { imageId?: string }) {
  const router = useRouter();
  const [image, setImage] = useState<GalleryImage>({ title: "", description: "", filePath: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(Boolean(imageId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedFile) { setPreviewUrl(""); return; }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  useEffect(() => {
    if (!imageId) return;
    let active = true;
    fetch(`/api/admin/gallery/${encodeURIComponent(imageId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "ছবির তথ্য লোড করা যায়নি।");
        if (active) setImage(data.image);
      })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "ছবির তথ্য লোড করা যায়নি।"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [imageId]);

  function selectImage(file: File | undefined) {
    setError("");
    if (!file) { setSelectedFile(null); return; }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setSelectedFile(null);
      setError("শুধু JPG, JPEG, PNG ও WebP ছবির ফাইল নির্বাচন করুন।");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setSelectedFile(null);
      setError("ছবির আকার সর্বোচ্চ ৫ MB হতে পারবে।");
      return;
    }
    setSelectedFile(file);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!imageId && !selectedFile) { setError("আপলোড করার জন্য একটি ছবি নির্বাচন করুন।"); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("title", image.title);
      formData.set("description", image.description ?? "");
      if (selectedFile) formData.set("image", selectedFile);
      const response = await fetch(imageId ? `/api/admin/gallery/${encodeURIComponent(imageId)}` : "/api/admin/gallery", {
        method: imageId ? "PATCH" : "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "ছবির তথ্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।");
      router.push("/admin/gallery");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "সার্ভারের সঙ্গে সংযোগ করা যায়নি। আবার চেষ্টা করুন।");
    } finally { setSaving(false); }
  }

  if (loading) return <p className="mt-5 text-slate-600">ছবির তথ্য লোড হচ্ছে…</p>;

  return (
    <form onSubmit={save} className="mt-6 space-y-5">
      <div>
        <label htmlFor="image-title" className="mb-2 block text-sm font-medium">ছবির শিরোনাম</label>
        <input id="image-title" value={image.title} onChange={(e) => setImage({ ...image, title: e.target.value })} maxLength={200} required className="w-full rounded-lg border border-slate-300 px-3 py-3" />
      </div>
      <div>
        <label htmlFor="image-description" className="mb-2 block text-sm font-medium">বিবরণ (ঐচ্ছিক)</label>
        <textarea id="image-description" value={image.description ?? ""} onChange={(e) => setImage({ ...image, description: e.target.value })} maxLength={2000} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-3" />
      </div>
      <div>
        <label htmlFor="image-file" className="mb-2 block text-sm font-medium">ছবি নির্বাচন করুন</label>
        <input id="image-file" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => selectImage(event.target.files?.[0])} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3" />
        <p className="mt-2 text-xs leading-5 text-slate-500">JPG, JPEG, PNG বা WebP; সর্বোচ্চ ৫ MB। {imageId ? "নতুন ছবি না বাছলে বর্তমান ছবিটি থাকবে।" : "ছবি upload হলেই গ্যালারিতে প্রকাশিত হবে।"}</p>
      </div>
      {(previewUrl || image.filePath) && (
        <div className="relative aspect-video max-w-xl overflow-hidden rounded-xl bg-slate-100">
          <Image src={previewUrl || image.filePath} alt={image.title || "ছবির preview"} fill sizes="(max-width: 768px) 100vw, 640px" className="object-contain" unoptimized />
        </div>
      )}
      {selectedFile && <p className="text-sm text-slate-600">নির্বাচিত ফাইল: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className="rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? "সংরক্ষণ হচ্ছে…" : imageId ? "পরিবর্তন সংরক্ষণ" : "গ্যালারিতে যোগ করুন"}</button>
        <Link href="/admin/gallery" className="rounded-lg border border-slate-300 px-5 py-3">বাতিল</Link>
      </div>
    </form>
  );
}
