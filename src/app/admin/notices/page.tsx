"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Notice = {
  id: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
};

async function responseData(response: Response) {
  try {
    return (await response.json()) as { error?: string; notices?: Notice[] };
  } catch {
    return {};
  }
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const loadNotices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/notices", { cache: "no-store" });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error || "নোটিশ লোড করা যায়নি।");
      setNotices(data.notices ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "সার্ভারের সঙ্গে সংযোগ করা যায়নি।");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadNotices(); }, [loadNotices]);

  async function updateNotice(notice: Notice, published: boolean) {
    setBusyId(notice.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/notices/${notice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published }),
      });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error || "নোটিশের অবস্থা পরিবর্তন করা যায়নি।");
      setNotices((current) => current.map((item) => item.id === notice.id ? { ...item, published } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "সার্ভারের সঙ্গে সংযোগ করা যায়নি।");
    } finally {
      setBusyId("");
    }
  }

  async function deleteNotice(notice: Notice) {
    if (!window.confirm(`“${notice.title}” নোটিশটি মুছে ফেলবেন?`)) return;
    setBusyId(notice.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/notices/${notice.id}`, { method: "DELETE" });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error || "নোটিশ মুছে ফেলা যায়নি।");
      setNotices((current) => current.filter((item) => item.id !== notice.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "সার্ভারের সঙ্গে সংযোগ করা যায়নি।");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm font-medium text-emerald-800 hover:underline">← অ্যাডমিন ড্যাশবোর্ড</Link>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">নোটিশ পরিচালনা</h1>
            <p className="mt-2 text-sm text-slate-600">নোটিশ তৈরি, সম্পাদনা, প্রকাশ ও মুছে ফেলুন।</p>
          </div>
          <Link href="/admin/notices/new" className="rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-700">+ নতুন নোটিশ</Link>
        </header>

        {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={() => void loadNotices()} className="ml-3 font-bold underline">আবার চেষ্টা করুন</button></div>}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5">
            <h2 className="font-bold text-slate-900">সকল নোটিশ</h2>
            <button type="button" onClick={() => void loadNotices()} disabled={loading} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">রিফ্রেশ</button>
          </div>
          {loading ? <p className="p-10 text-center text-slate-500">নোটিশ লোড হচ্ছে…</p> : notices.length === 0 ? (
            <div className="p-10 text-center"><h3 className="font-bold text-slate-800">এখনো কোনো নোটিশ নেই</h3><p className="mt-2 text-sm text-slate-500">নতুন নোটিশ তৈরি করে এখানে দেখুন।</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notices.map((notice) => (
                <article key={notice.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{notice.title}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${notice.published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{notice.published ? "প্রকাশিত" : "খসড়া"}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{notice.content}</p>
                    <p className="mt-2 text-xs text-slate-500">{new Date(notice.createdAt).toLocaleDateString("bn-BD")}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link href={`/admin/notices/${notice.id}/edit`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">সম্পাদনা</Link>
                    <button type="button" disabled={busyId === notice.id} onClick={() => void updateNotice(notice, !notice.published)} className="rounded-lg border border-emerald-700 px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">{notice.published ? "অপ্রকাশিত করুন" : "প্রকাশ করুন"}</button>
                    <button type="button" disabled={busyId === notice.id} onClick={() => void deleteNotice(notice)} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50">মুছুন</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
