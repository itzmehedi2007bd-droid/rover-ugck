"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";

type Member = { id: string; fullName: string; designation: string; batch: string | null; memberNumber: string | null; imageUrl: string | null };

export default function MemberDirectory() {
  const [members, setMembers] = useState<Member[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [designation, setDesignation] = useState("");
  const [batch, setBatch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMembers = useCallback(async (filters: { query?: string; designation?: string; batch?: string } = {}) => {
    setLoading(true); setError("");
    const params = new URLSearchParams();
    if (filters.query) params.set("q", filters.query);
    if (filters.designation) params.set("designation", filters.designation);
    if (filters.batch) params.set("batch", filters.batch);
    try {
      const response = await fetch(`/api/members?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.members)) throw new Error(data.error || "সদস্যদের তালিকা লোড করা যায়নি।");
      setMembers(data.members as Member[]);
      if (!filters.query && !filters.designation && !filters.batch) setDesignations(Array.from(new Set((data.members as Member[]).map((member) => member.designation))).sort((a, b) => a.localeCompare(b, "bn")));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "সদস্যদের তালিকা লোড করা যায়নি।");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); void loadMembers({ query: query.trim(), designation: designation.trim(), batch: batch.trim() });
  }

  function clearFilters() {
    setQuery(""); setDesignation(""); setBatch(""); void loadMembers();
  }

  return <section className="mt-6">
    <form onSubmit={search} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto_auto] lg:p-5">
      <label className="text-xs font-semibold text-slate-600">নাম বা পদবি দিয়ে খুঁজুন<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="সদস্যের নাম বা পদবি" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" /></label>
      <label className="text-xs font-semibold text-slate-600">পদবি<select value={designation} onChange={(event) => setDesignation(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="">সব পদবি</option>{designations.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">ব্যাচ / শিক্ষাবর্ষ<input value={batch} onChange={(event) => setBatch(event.target.value)} placeholder="ব্যাচ লিখুন" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" /></label>
      <button className="self-end rounded-lg bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">খুঁজুন</button>
      <button type="button" onClick={clearFilters} className="self-end rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">পরিষ্কার</button>
    </form>
    {loading ? <p className="mt-6 rounded-xl bg-white p-8 text-center text-sm text-slate-600">সদস্যদের তালিকা লোড হচ্ছে…</p> : error ? <p role="alert" className="mt-6 rounded-xl bg-red-50 p-6 text-center text-sm text-red-700">{error}</p> : members.length === 0 ? <p className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">কোনো প্রকাশিত সদস্য পাওয়া যায়নি।</p> : <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{members.map((member) => <article key={member.id} className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="relative aspect-[4/3] bg-emerald-50">{member.imageUrl ? <Image src={member.imageUrl} alt={member.fullName} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-6xl font-bold text-emerald-800">{member.fullName.slice(0, 1)}</div>}</div><div className="p-5"><h2 className="text-lg font-bold text-emerald-950">{member.fullName}</h2><p className="mt-1 text-sm font-medium text-slate-700">{member.designation}</p>{member.batch && <p className="mt-3 text-sm text-slate-600">ব্যাচ / শিক্ষাবর্ষ: {member.batch}</p>}{member.memberNumber && <p className="mt-1 text-sm text-slate-600">সদস্য নম্বর: {member.memberNumber}</p>}</div></article>)}</div>}
  </section>;
}
