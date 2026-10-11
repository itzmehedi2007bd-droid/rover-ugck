"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Member = { id: string; fullName: string; designation: string; batch: string | null; memberNumber: string | null; imageUrl: string | null; published: boolean; displayOrder: number };

export default function MemberForm({ memberId }: { memberId?: string }) {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [batch, setBatch] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [published, setPublished] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(Boolean(memberId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!memberId) return;
    let active = true;
    fetch(`/api/admin/members/${encodeURIComponent(memberId)}`, { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok || !data.member) throw new Error(data.error || "সদস্যের তথ্য লোড করা যায়নি।");
      if (!active) return;
      const value = data.member as Member;
      setMember(value); setFullName(value.fullName); setDesignation(value.designation); setBatch(value.batch ?? ""); setMemberNumber(value.memberNumber ?? ""); setDisplayOrder(String(value.displayOrder)); setPublished(value.published); setPreview(value.imageUrl ?? "");
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "সদস্যের তথ্য লোড করা যায়নি।"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [memberId]);

  useEffect(() => {
    if (!image) return;
    const url = URL.createObjectURL(image); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function selectImage(file: File | null) {
    setError(""); setImage(null);
    if (!file) { setPreview(member?.imageUrl ?? ""); return; }
    if (file.size > 5 * 1024 * 1024) { setPreview(member?.imageUrl ?? ""); setError("ছবির আকার সর্বোচ্চ ৫ MB হতে পারবে।"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setPreview(member?.imageUrl ?? ""); setError("শুধু JPG, JPEG, PNG বা WebP ছবি নির্বাচন করুন।"); return; }
    setImage(file);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData();
    form.set("fullName", fullName); form.set("designation", designation); form.set("batch", batch); form.set("memberNumber", memberNumber); form.set("displayOrder", displayOrder); form.set("published", String(published));
    if (image) form.set("image", image);
    try {
      const response = await fetch(memberId ? `/api/admin/members/${encodeURIComponent(memberId)}` : "/api/admin/members", { method: memberId ? "PATCH" : "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "সদস্যের তথ্য সংরক্ষণ করা যায়নি।");
      router.push("/admin/members"); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "সদস্যের তথ্য সংরক্ষণ করা যায়নি।");
    } finally { setSaving(false); }
  }

  if (loading) return <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">সদস্যের তথ্য লোড হচ্ছে…</p>;
  return <form onSubmit={save} className="mt-6 space-y-5">
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-slate-700">পূর্ণ নাম<input required minLength={2} maxLength={150} value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      <label className="text-sm font-medium text-slate-700">পদবি<input required minLength={2} maxLength={120} value={designation} onChange={(e) => setDesignation(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      <label className="text-sm font-medium text-slate-700">ব্যাচ / শিক্ষাবর্ষ (ঐচ্ছিক)<input maxLength={80} value={batch} onChange={(e) => setBatch(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      <label className="text-sm font-medium text-slate-700">সদস্য নম্বর (ঐচ্ছিক)<input maxLength={100} value={memberNumber} onChange={(e) => setMemberNumber(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      <label className="text-sm font-medium text-slate-700">তালিকায় অবস্থান<input type="number" min={0} max={100000} step={1} value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /><span className="mt-1 block text-xs text-slate-500">ছোট সংখ্যা আগে দেখাবে।</span></label>
    </div>
    <label className="block text-sm font-medium text-slate-700">প্রোফাইল ছবি (ঐচ্ছিক)<input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(e) => selectImage(e.target.files?.[0] ?? null)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-medium file:text-emerald-800" /><span className="mt-1 block text-xs text-slate-500">JPG, JPEG, PNG বা WebP · সর্বোচ্চ ৫ MB{member?.imageUrl ? " · নতুন ছবি দিলে পুরোনো ছবি প্রতিস্থাপিত হবে" : ""}</span></label>
    {preview && <div className="relative h-56 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"><Image src={preview} alt="প্রোফাইল ছবির preview" fill sizes="224px" unoptimized className="object-cover" /></div>}
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-emerald-800" />Public directory-তে প্রকাশ করুন</label>
    <div className="flex flex-wrap gap-3"><button disabled={saving} className="rounded-lg bg-emerald-900 px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? "সংরক্ষণ হচ্ছে…" : memberId ? "পরিবর্তন সংরক্ষণ" : "সদস্য যোগ করুন"}</button><Link href="/admin/members" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">বাতিল</Link></div>
  </form>;
}
