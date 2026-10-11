"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Notice = { title: string; content: string; published: boolean };

export default function EditNoticePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/notices/${encodeURIComponent(params.id)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "নোটিশ লোড করা যায়নি।");
        if (!cancelled) setNotice(data.notice);
      })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : "নোটিশ লোড করা যায়নি।"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!notice) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/notices/${encodeURIComponent(params.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: notice.title, content: notice.content }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "নোটিশ সংরক্ষণ করা যায়নি।");
      router.push("/admin/notices");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "সার্ভারের সঙ্গে সংযোগ করা যায়নি।");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/notices" className="text-sm font-medium text-emerald-800 hover:underline">← নোটিশের তালিকায় ফিরুন</Link>
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">নোটিশ সম্পাদনা</h1>
          {loading ? <p className="mt-5 text-slate-600">নোটিশ লোড হচ্ছে…</p> : notice ? (
            <form onSubmit={save} className="mt-6 space-y-5">
              <div><label htmlFor="title" className="mb-2 block text-sm font-medium">শিরোনাম</label><input id="title" value={notice.title} onChange={(event) => setNotice({ ...notice, title: event.target.value })} maxLength={200} required className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-emerald-700" /></div>
              <div><label htmlFor="content" className="mb-2 block text-sm font-medium">বিবরণ</label><textarea id="content" value={notice.content} onChange={(event) => setNotice({ ...notice, content: event.target.value })} maxLength={20000} required rows={9} className="w-full resize-y rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-emerald-700" /></div>
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <div className="flex flex-wrap gap-3"><button type="submit" disabled={saving} className="rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{saving ? "সংরক্ষণ হচ্ছে…" : "পরিবর্তন সংরক্ষণ"}</button><Link href="/admin/notices" className="rounded-lg border border-slate-300 px-5 py-3">বাতিল</Link></div>
            </form>
          ) : <p role="alert" className="mt-5 text-red-700">{error}</p>}
        </section>
      </div>
    </main>
  );
}
