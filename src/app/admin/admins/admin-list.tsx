"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type AdminRecord = {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  canManageNotices: boolean;
  canManageEvents: boolean;
  canManageGallery: boolean;
  canManageResources: boolean;
  canManageMembers: boolean;
  createdAt: string;
};

type Permissions = Pick<AdminRecord, "canManageNotices" | "canManageEvents" | "canManageGallery" | "canManageResources" | "canManageMembers">;
const emptyPermissions: Permissions = { canManageNotices: false, canManageEvents: false, canManageGallery: false, canManageResources: false, canManageMembers: false };
const permissionLabels: { key: keyof Permissions; label: string }[] = [
  { key: "canManageNotices", label: "Notice পরিচালনা" },
  { key: "canManageEvents", label: "Event পরিচালনা" },
  { key: "canManageGallery", label: "Gallery পরিচালনা" },
  { key: "canManageResources", label: "PDF Resource পরিচালনা" },
  { key: "canManageMembers", label: "সদস্য পরিচিতি পরিচালনা" },
];

export default function AdminList() {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<AdminRecord | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<Permissions>(emptyPermissions);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/admins", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.admins)) throw new Error(data.error || "Admin তালিকা লোড করা যায়নি।");
      setAdmins(data.admins as AdminRecord[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Admin তালিকা লোড করা যায়নি।");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAdmins(); }, [loadAdmins]);

  function resetForm() {
    setEditing(null); setName(""); setEmail(""); setPassword(""); setPermissions(emptyPermissions); setError(""); setNotice("");
  }

  function beginEdit(admin: AdminRecord) {
    setEditing(admin); setName(admin.name); setEmail(admin.email); setPassword("");
    setPermissions({ canManageNotices: admin.canManageNotices, canManageEvents: admin.canManageEvents, canManageGallery: admin.canManageGallery, canManageResources: admin.canManageResources, canManageMembers: admin.canManageMembers });
    setNotice(""); setError(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(editing ? `/api/admin/admins/${encodeURIComponent(editing.id)}` : "/api/admin/admins", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, permissions }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "তথ্য সংরক্ষণ করা যায়নি।");
      setNotice(editing ? "Sub-Admin-এর তথ্য হালনাগাদ হয়েছে।" : "নতুন Sub-Admin তৈরি হয়েছে।");
      setEditing(null); setName(""); setEmail(""); setPassword(""); setPermissions(emptyPermissions);
      await loadAdmins();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "তথ্য সংরক্ষণ করা যায়নি।");
    } finally { setSaving(false); }
  }

  async function removeAdmin(admin: AdminRecord) {
    if (admin.isSuperAdmin || !window.confirm(`“${admin.name}” Sub-Admin-কে মুছে ফেলবেন? তার আর Admin access থাকবে না।`)) return;
    setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/admins/${encodeURIComponent(admin.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sub-Admin মুছে ফেলা যায়নি।");
      setNotice("Sub-Admin মুছে ফেলা হয়েছে।");
      if (editing?.id === admin.id) resetForm();
      await loadAdmins();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sub-Admin মুছে ফেলা যায়নি।");
    }
  }

  return <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-emerald-950">{editing ? "Sub-Admin সম্পাদনা" : "নতুন Sub-Admin"}</h2>
      <form onSubmit={save} className="mt-5 space-y-4">
        <label className="block text-sm font-medium text-slate-700">নাম<input required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        <label className="block text-sm font-medium text-slate-700">ইমেইল<input required type="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        <label className="block text-sm font-medium text-slate-700">{editing ? "নতুন password (না বদলালে ফাঁকা রাখুন)" : "Password"}<input required={!editing} type="password" minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        <fieldset className="rounded-xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">কাজের permission</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">{permissionLabels.map(({ key, label }) => <label key={key} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={permissions[key]} onChange={(e) => setPermissions((current) => ({ ...current, [key]: e.target.checked }))} className="h-4 w-4 accent-emerald-800" />{label}</label>)}</div>
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        <div className="flex flex-wrap gap-3"><button disabled={saving} className="rounded-lg bg-emerald-900 px-5 py-2.5 font-semibold text-white disabled:opacity-60">{saving ? "সংরক্ষণ হচ্ছে…" : editing ? "পরিবর্তন সংরক্ষণ" : "Sub-Admin তৈরি করুন"}</button>{editing && <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-5 py-2.5">বাতিল</button>}</div>
      </form>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-emerald-950">Admin তালিকা</h2><button type="button" onClick={() => void loadAdmins()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Refresh</button></div>
      {loading ? <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Admin তালিকা লোড হচ্ছে…</p> : error && admins.length === 0 ? <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p> : admins.length === 0 ? <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">কোনো Admin পাওয়া যায়নি।</p> : <div className="mt-5 space-y-3">{admins.map((admin) => <article key={admin.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{admin.name}{admin.isSuperAdmin && <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">মূল Admin · সুরক্ষিত</span>}</h3><p className="mt-1 break-all text-sm text-slate-600">{admin.email}</p><p className="mt-2 text-xs text-slate-500">{admin.isSuperAdmin ? "সব বিভাগের পূর্ণ permission" : permissionLabels.filter(({ key }) => admin[key]).map(({ label }) => label).join(" · ") || "কোনো content permission দেওয়া নেই"}</p></div>{!admin.isSuperAdmin && <div className="flex gap-2"><button type="button" onClick={() => beginEdit(admin)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">সম্পাদনা</button><button type="button" onClick={() => void removeAdmin(admin)} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700">মুছুন</button></div>}</div></article>)}</div>}
    </section>
  </div>;
}
