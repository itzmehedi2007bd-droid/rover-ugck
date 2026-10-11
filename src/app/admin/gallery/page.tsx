"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type GalleryImage = {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  filePath: string;
  createdAt: string;
};

async function responseData(response: Response) {
  try { return await response.json(); } catch { return {}; }
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const loadImages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/gallery", { cache: "no-store" });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error || "গ্যালারি লোড করা যায়নি।");
      setImages(data.images ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "সার্ভারের সঙ্গে সংযোগ করা যায়নি।");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadImages(); }, [loadImages]);

  async function deleteImage(image: GalleryImage) {
    if (!window.confirm(`“${image.title}” গ্যালারি থেকে সরাবেন? অন্য entry একই ছবি ব্যবহার করলে ছবিটি মোছা হবে না।`)) return;
    setBusyId(image.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/gallery/${image.id}`, { method: "DELETE" });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error || "ছবিটি গ্যালারি থেকে সরানো যায়নি।");
      setImages((current) => current.filter((item) => item.id !== image.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "সার্ভারের সঙ্গে সংযোগ করা যায়নি।");
    } finally { setBusyId(""); }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm font-medium text-emerald-800 hover:underline">← অ্যাডমিন ড্যাশবোর্ড</Link>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">গ্যালারি পরিচালনা</h1>
            <p className="mt-2 text-sm text-slate-600">ছবি ও তার বিবরণ পরিচালনা করুন।</p>
          </div>
          <Link href="/admin/gallery/new" className="rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-700">+ নতুন ছবি</Link>
        </header>
        {error && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={() => void loadImages()} className="ml-3 underline">আবার চেষ্টা করুন</button></p>}
        {loading ? <p className="rounded-xl bg-white p-10 text-center text-slate-500">গ্যালারি লোড হচ্ছে…</p> : images.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center"><p className="font-semibold text-slate-800">গ্যালারিতে এখনো কোনো ছবি নেই।</p><p className="mt-2 text-sm text-slate-500">নতুন ছবি যোগ করুন বাটনে ক্লিক করে ডিভাইস থেকে ছবি upload করুন।</p></div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => (
              <article key={image.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="relative aspect-video bg-slate-100"><Image src={image.filePath} alt={image.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" unoptimized /></div>
                <div className="p-4"><h2 className="font-bold text-emerald-950">{image.title}</h2>{image.description && <p className="mt-2 text-sm leading-6 text-slate-600">{image.description}</p>}<p className="mt-2 break-all text-xs text-slate-500">{image.fileName}</p><div className="mt-4 flex gap-2"><Link href={`/admin/gallery/${image.id}/edit`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">সম্পাদনা</Link><button type="button" disabled={busyId === image.id} onClick={() => void deleteImage(image)} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50">গ্যালারি থেকে সরান</button></div></div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
