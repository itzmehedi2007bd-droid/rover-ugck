"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type EventRecord = {
  title: string;
  description: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  published: boolean;
};

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function EventForm({ eventId }: { eventId?: string }) {
  const router = useRouter();
  const [event, setEvent] = useState<EventRecord>({
    title: "",
    description: "",
    location: "",
    startDate: "",
    endDate: "",
    published: false,
  });
  const [loading, setLoading] = useState(Boolean(eventId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    fetch(`/api/admin/events/${encodeURIComponent(eventId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "ইভেন্ট লোড করা যায়নি।");
        if (active) {
          setEvent({
            ...data.event,
            startDate: localDateTime(data.event.startDate),
            endDate: localDateTime(data.event.endDate),
          });
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "ইভেন্ট লোড করা যায়নি।");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [eventId]);

  async function save(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError("");
    if (event.endDate && new Date(event.endDate) < new Date(event.startDate)) {
      setError("শেষ তারিখ শুরুর তারিখের আগে হতে পারবে না।");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(eventId ? `/api/admin/events/${encodeURIComponent(eventId)}` : "/api/admin/events", {
        method: eventId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...event,
          startDate: new Date(event.startDate).toISOString(),
          endDate: event.endDate ? new Date(event.endDate).toISOString() : null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "ইভেন্ট সংরক্ষণ করা যায়নি।");
      router.push("/admin/events");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "সার্ভারের সঙ্গে সংযোগ করা যায়নি।");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="mt-5 text-slate-600">ইভেন্ট লোড হচ্ছে…</p>;

  return (
    <form onSubmit={save} className="mt-6 space-y-5">
      <div>
        <label htmlFor="event-title" className="mb-2 block text-sm font-medium">শিরোনাম</label>
        <input id="event-title" value={event.title} onChange={(e) => setEvent({ ...event, title: e.target.value })} maxLength={200} required className="w-full rounded-lg border border-slate-300 px-3 py-3" />
      </div>
      <div>
        <label htmlFor="event-description" className="mb-2 block text-sm font-medium">বিবরণ</label>
        <textarea id="event-description" value={event.description} onChange={(e) => setEvent({ ...event, description: e.target.value })} maxLength={20000} required rows={7} className="w-full rounded-lg border border-slate-300 px-3 py-3" />
      </div>
      <div>
        <label htmlFor="event-location" className="mb-2 block text-sm font-medium">স্থান (ঐচ্ছিক)</label>
        <input id="event-location" value={event.location ?? ""} onChange={(e) => setEvent({ ...event, location: e.target.value })} maxLength={300} className="w-full rounded-lg border border-slate-300 px-3 py-3" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="event-start" className="mb-2 block text-sm font-medium">শুরুর তারিখ ও সময়</label>
          <input id="event-start" type="datetime-local" value={event.startDate} onChange={(e) => setEvent({ ...event, startDate: e.target.value })} required className="w-full rounded-lg border border-slate-300 px-3 py-3" />
        </div>
        <div>
          <label htmlFor="event-end" className="mb-2 block text-sm font-medium">শেষের তারিখ ও সময় (ঐচ্ছিক)</label>
          <input id="event-end" type="datetime-local" value={event.endDate ?? ""} onChange={(e) => setEvent({ ...event, endDate: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-3" />
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={event.published} onChange={(e) => setEvent({ ...event, published: e.target.checked })} className="h-4 w-4" />
        সংরক্ষণের সঙ্গে প্রকাশ করুন
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className="rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? "সংরক্ষণ হচ্ছে…" : eventId ? "পরিবর্তন সংরক্ষণ" : "ইভেন্ট তৈরি করুন"}</button>
        <Link href="/admin/events" className="rounded-lg border border-slate-300 px-5 py-3">বাতিল</Link>
      </div>
    </form>
  );
}
