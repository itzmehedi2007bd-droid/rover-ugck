"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type EventRecord = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  published: boolean;
};

async function responseData(response: Response) {
  try { return await response.json(); } catch { return {}; }
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/events", { cache: "no-store" });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error || "ইভেন্ট লোড করা যায়নি।");
      setEvents(data.events ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "সার্ভারের সঙ্গে সংযোগ করা যায়নি।");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadEvents(); }, [loadEvents]);

  async function togglePublished(event: EventRecord) {
    setBusyId(event.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !event.published }),
      });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error || "প্রকাশের অবস্থা বদলানো যায়নি।");
      setEvents((current) => current.map((item) => item.id === event.id ? { ...item, published: !event.published } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "সার্ভারের সঙ্গে সংযোগ করা যায়নি।");
    } finally { setBusyId(""); }
  }

  async function deleteEvent(event: EventRecord) {
    if (!window.confirm(`“${event.title}” ইভেন্টটি মুছে ফেলবেন?`)) return;
    setBusyId(event.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/events/${event.id}`, { method: "DELETE" });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error || "ইভেন্ট মুছে ফেলা যায়নি।");
      setEvents((current) => current.filter((item) => item.id !== event.id));
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
            <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">ইভেন্ট পরিচালনা</h1>
            <p className="mt-2 text-sm text-slate-600">ইভেন্ট তৈরি, সম্পাদনা, প্রকাশ ও মুছে ফেলুন।</p>
          </div>
          <Link href="/admin/events/new" className="rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-700">+ নতুন ইভেন্ট</Link>
        </header>

        {error && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={() => void loadEvents()} className="ml-3 underline">আবার চেষ্টা করুন</button></p>}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4"><h2 className="font-bold">সকল ইভেন্ট</h2><button type="button" onClick={() => void loadEvents()} disabled={loading} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">রিফ্রেশ</button></div>
          {loading ? <p className="p-10 text-center text-slate-500">ইভেন্ট লোড হচ্ছে…</p> : events.length === 0 ? <p className="p-10 text-center text-slate-600">এখনো কোনো ইভেন্ট নেই।</p> : (
            <div className="divide-y divide-slate-100">
              {events.map((event) => (
                <article key={event.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-emerald-950">{event.title}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${event.published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{event.published ? "প্রকাশিত" : "খসড়া"}</span></div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{event.description}</p>
                    <p className="mt-2 text-sm text-slate-600">{new Date(event.startDate).toLocaleString("bn-BD")}{event.endDate ? ` – ${new Date(event.endDate).toLocaleString("bn-BD")}` : ""}{event.location ? ` · ${event.location}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link href={`/admin/events/${event.id}/edit`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">সম্পাদনা</Link>
                    <button type="button" disabled={busyId === event.id} onClick={() => void togglePublished(event)} className="rounded-lg border border-emerald-700 px-3 py-2 text-sm text-emerald-800 disabled:opacity-50">{event.published ? "অপ্রকাশিত করুন" : "প্রকাশ করুন"}</button>
                    <button type="button" disabled={busyId === event.id} onClick={() => void deleteEvent(event)} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50">মুছুন</button>
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
