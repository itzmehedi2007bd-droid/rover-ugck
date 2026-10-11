"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type ResourceFormValue = { id: string; title: string; description: string | null; category: string; fileName: string; filePath: string; fileSize: number; published: boolean };

export default function ResourceForm({ initial }: { initial?: ResourceFormValue }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "সাধারণ");
  const [published, setPublished] = useState(initial?.published ?? false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isEdit = Boolean(initial);

  useEffect(() => { if (!file) { setPreview(""); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      let body: BodyInit; const headers: HeadersInit = {};
      if (file || !isEdit) {
        const form = new FormData(); form.set("title", title); form.set("description", description); form.set("category", category); form.set("published", String(published));
        if (file) form.set("pdf", file); body = form;
      } else {
        (headers as Record<string, string>)["Content-Type"] = "application/json";
        body = JSON.stringify({ title, description, category, published });
      }
      const response = await fetch(isEdit ? `/api/admin/resources/${initial?.id}` : "/api/admin/resources", { method: isEdit ? "PATCH" : "POST", headers, body });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "তথ্য সংরক্ষণ করা যায়নি।");
      setSuccess(isEdit ? "রিসোর্সের তথ্য সংরক্ষিত হয়েছে।" : "PDF সফলভাবে যোগ হয়েছে।");
      if (!isEdit) { setTitle(""); setDescription(""); setCategory("সাধারণ"); setPublished(false); setFile(null); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "সার্ভারের সঙ্গে সংযোগ করা যায়নি।"); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="mt-6 space-y-5">
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {success && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
    <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">PDF-এর নাম</span><input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">বিবরণ</span><textarea maxLength={4000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
    <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">ক্যাটাগরি</span><input required maxLength={80} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="যেমন: ফরম, নির্দেশিকা, পাঠ্যসামগ্রী" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">PDF ফাইল {isEdit && "প্রতিস্থাপন (ঐচ্ছিক)"}</span><input type="file" accept="application/pdf,.pdf" required={!isEdit} onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full rounded-lg border border-slate-300 p-3 text-sm" /><span className="mt-1 block text-xs text-slate-500">PDF format, সর্বোচ্চ ২০ MB। {isEdit ? "নতুন ফাইল না দিলে বর্তমান ফাইল থাকবে।" : ""}</span></label>
    {(preview || initial?.filePath) && <div><p className="mb-2 text-sm font-semibold text-slate-700">{preview ? "নতুন ফাইলের preview" : "বর্তমান PDF"}</p><iframe title="PDF preview" src={preview || initial?.filePath} className="h-[28rem] w-full rounded-lg border border-slate-300" /><a href={preview || initial?.filePath} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-emerald-800 underline">নতুন ট্যাবে খুলুন</a></div>}
    <label className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} className="h-4 w-4 accent-emerald-800" />সেভ করার পর public Resources পেজে প্রকাশ করুন</label>
    <div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? "সংরক্ষণ হচ্ছে…" : isEdit ? "পরিবর্তন সংরক্ষণ" : "PDF আপলোড করুন"}</button><Link href="/admin/resources" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">তালিকায় ফিরুন</Link></div>
  </form>;
}
