"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Member = { id: string; fullName: string; designation: string; batch: string | null; memberNumber: string | null; imageUrl: string | null; published: boolean; displayOrder: number };

export default function MemberList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [designation, setDesignation] = useState("");
  const [batch, setBatch] = useState("");
  const [filters, setFilters] = useState({ query: "", designation: "", batch: "" });
  const [workingId, setWorkingId] = useState("");

  const loadMembers = useCallback(async () => {
    setLoading(true); setError("");
    const params = new URLSearchParams();
    if (filters.query) params.set("q", filters.query);
    if (filters.designation) params.set("designation", filters.designation);
    if (filters.batch) params.set("batch", filters.batch);
    try {
      const response = await fetch(`/api/admin/members?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.members)) throw new Error(data.error || "সদস্যদের তালিকা লোড করা যায়নি।");
      setMembers(data.members as Member[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "সদস্যদের তালিকা লোড করা যায়নি।");
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFilters({ query: query.trim(), designation: designation.trim(), batch: batch.trim() });
  }

  function clearFilters() { setQuery(""); setDesignation(""); setBatch(""); setFilters({ query: "", designation: "", batch: "" }); }

  async function togglePublished(member: Member) {
    setWorkingId(member.id); setError("");
    try {
      const response = await fetch(`/api/admin/members/${encodeURIComponent(member.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !member.published }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "প্রকাশের অবস্থা পরিবর্তন করা যায়নি।");
      await loadMembers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "প্রকাশের অবস্থা পরিবর্তন করা যায়নি।");
    } finally { setWorkingId(""); }
  }

  async function deleteMember(member: Member) {
    if (!window.confirm(`“${member.fullName}” সদস্যকে মুছে ফেলবেন? এই কাজটি ফিরিয়ে আনা যাবে না।`)) return;
    setWorkingId(member.id); setError("");
    try {
      const response = await fetch(`/api/admin/members/${encodeURIComponent(member.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "সদস্য মুছে ফেলা যায়নি।");
      await loadMembers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "সদস্য মুছে ফেলা যায়নি।");
    } finally { setWorkingId(""); }
  }

  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <form onSubmit={search} className="grid gap-3 md:grid-cols-[1.3fr_1fr_1fr_auto_auto]"><label className="text-xs font-semibold text-slate-600">নাম বা পদবি<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="নাম বা পদবি লিখুন" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-600">নির্দিষ্ট পদবি<input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="যেমন: সম্পাদক" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-600">ব্যাচ / শিক্ষাবর্ষ<input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="ব্যাচ লিখুন" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" /></label><button className="self-end rounded-lg border border-emerald-800 px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">খুঁজুন</button><button type="button" onClick={clearFilters} className="self-end rounded-lg border border-slate-300 px-4 py-2.5 text-sm">পরিষ্কার</button></form>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p className="mt-5 rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-600">সদস্যদের তালিকা লোড হচ্ছে…</p> : members.length === 0 ? <p className="mt-5 rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-600">এই অনুসন্ধানে কোনো সদস্য পাওয়া যায়নি।</p> : <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{members.map((member) => <article key={member.id} className="overflow-hidden rounded-xl border border-slate-200"><div className="flex gap-4 p-4">{member.imageUrl ? <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100"><Image src={member.imageUrl} alt={member.fullName} fill sizes="80px" unoptimized className="object-cover" /></div> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl font-bold text-emerald-900">{member.fullName.slice(0, 1)}</div>}<div className="min-w-0"><h2 className="break-words font-bold text-emerald-950">{member.fullName}</h2><p className="mt-1 text-sm text-slate-600">{member.designation}</p>{member.batch && <p className="mt-1 text-xs text-slate-500">ব্যাচ: {member.batch}</p>}{member.memberNumber && <p className="mt-1 text-xs text-slate-500">সদস্য নম্বর: {member.memberNumber}</p>}<p className="mt-1 text-xs text-slate-500">ক্রম: {member.displayOrder}</p></div></div><div className="flex flex-wrap gap-2 border-t border-slate-100 p-3"><Link href={`/admin/members/${encodeURIComponent(member.id)}/edit`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">সম্পাদনা</Link><button type="button" disabled={workingId === member.id} onClick={() => void togglePublished(member)} className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${member.published ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}>{workingId === member.id ? "অপেক্ষা করুন…" : member.published ? "Unpublish" : "Publish"}</button><button type="button" disabled={workingId === member.id} onClick={() => void deleteMember(member)} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50">মুছুন</button></div></article>)}</div>}
  </section>;
}
