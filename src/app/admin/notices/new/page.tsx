"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewNoticePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!title.trim() || !content.trim()) {
      setError("শিরোনাম ও বিস্তারিত লিখুন।");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          published,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "নোটিশ সংরক্ষণ করা যায়নি।");
        return;
      }

      router.push("/admin/notices");
      router.refresh();
    } catch {
      setError("সার্ভারের সঙ্গে যোগাযোগ করা যায়নি।");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/notices"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← নোটিশের তালিকায় ফিরে যান
        </Link>

        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">
            নতুন নোটিশ তৈরি
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            নোটিশের তথ্য পূরণ করে সংরক্ষণ করুন।
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="title" className="mb-2 block text-sm font-medium">
                নোটিশের শিরোনাম
              </label>
              <input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                placeholder="শিরোনাম লিখুন"
              />
            </div>

            <div>
              <label htmlFor="content" className="mb-2 block text-sm font-medium">
                নোটিশের বিস্তারিত
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={20000}
                required
                rows={8}
                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                placeholder="নোটিশের বিস্তারিত লিখুন..."
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={published}
                onChange={(event) => setPublished(event.target.checked)}
                className="h-4 w-4"
              />
              সংরক্ষণের সঙ্গে সঙ্গে প্রকাশ করুন
            </label>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {saving ? "সংরক্ষণ হচ্ছে..." : "নোটিশ সংরক্ষণ"}
              </button>

              <Link
                href="/admin/notices"
                className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50"
              >
                বাতিল
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
