"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Resource = { id: string; title: string; description: string | null; category: string; fileName: string; filePath: string; fileSize: number; published: boolean; createdAt: string };
type Result = { error?: string; resources?: Resource[]; assetRemoved?: boolean };
async function read(response: Response): Promise<Result> { try { return await response.json() as Result; } catch { return {}; } }
const size = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;

export default function ResourceList() {
  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState("");
  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))).sort(), [items]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams(); if (query.trim()) params.set("q", query.trim()); if (category) params.set("category", category);
      const response = await fetch(`/api/admin/resources?${params}`, { cache: "no-store" });
      const data = await read(response); if (!response.ok) throw new Error(data.error || "রিসোর্স তালিকা লোড করা যায়নি।");
      setItems(data.resources ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "সার্ভারের সঙ্গে সংযোগ করা যায়নি।"); }
    finally { setLoading(false); }
  }, [query, category]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 200); return () => window.clearTimeout(timer); }, [load]);

  async function changePublished(item: Resource) {
    setBusy(item.id); setError("");
    try {
      const response = await fetch(`/api/admin/resources/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !item.published }) });
      const data = await read(response); if (!response.ok) throw new Error(data.error || "প্রকাশের অবস্থা বদলানো যায়নি।");
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, published: !item.published } : entry));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "পরিবর্তন সংরক্ষণ করা যায়নি।"); }
    finally { setBusy(""); }
  }
  async function remove(item: Resource) {
    if (!window.confirm(`“${item.title}” রিসোর্সটি মুছে ফেলবেন?`)) return;
    setBusy(item.id); setError("");
    try {
      const response = await fetch(`/api/admin/resources/${item.id}`, { method: "DELETE" });
      const data = await read(response); if (!response.ok) throw new Error(data.error || "রিসোর্স মুছে ফেলা যায়নি।");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (data.assetRemoved === false) setError("রিসোর্স মুছে গেছে, তবে Cloudinary ফাইলটি সরানো যায়নি। পরে Cloudinary থেকে সরিয়ে দিন।");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "রিসোর্স মুছে ফেলা যায়নি।"); }
    finally { setBusy(""); }
  }

  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:p-5">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="নাম বা বিবরণ দিয়ে খুঁজুন" className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm" aria-label="রিসোর্স খুঁজুন" />
      <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm" aria-label="ক্যাটাগরি বাছাই">
        <option value="">সব ক্যাটাগরি</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
      <button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">রিফ্রেশ</button>
    </div>
    {error && <p role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p className="p-10 text-center text-slate-500">রিসোর্স লোড হচ্ছে…</p> : items.length === 0 ? <div className="p-10 text-center"><h2 className="font-bold text-slate-800">কোনো PDF পাওয়া যায়নি</h2><p className="mt-2 text-sm text-slate-500">নতুন PDF যোগ করুন অথবা search/filter পরিবর্তন করুন।</p></div> : <div className="divide-y divide-slate-100">
      {items.map((item) => <article key={item.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{item.title}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{item.category}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{item.published ? "প্রকাশিত" : "খসড়া"}</span></div>
          {item.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.description}</p>}
          <p className="mt-2 text-xs text-slate-500">{size(item.fileSize)} · {new Date(item.createdAt).toLocaleDateString("bn-BD")}</p>
          <a href={item.filePath} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-emerald-800 underline">PDF খুলুন</a>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href={`/admin/resources/${item.id}/edit`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">সম্পাদনা</Link>
          <button type="button" disabled={busy === item.id} onClick={() => void changePublished(item)} className="rounded-lg border border-emerald-700 px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">{item.published ? "অপ্রকাশিত করুন" : "প্রকাশ করুন"}</button>
          <button type="button" disabled={busy === item.id} onClick={() => void remove(item)} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50">মুছুন</button>
        </div>
      </article>)}
    </div>}
  </section>;
}
