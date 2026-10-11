import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth";
import MemberList from "./member-list";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  await requireAdminPermission("members");
  return <main className="min-h-screen bg-slate-100 p-4 sm:p-8"><div className="mx-auto max-w-6xl">
    <Link href="/admin" className="text-sm font-medium text-emerald-800 hover:underline">← Admin Dashboard-এ ফিরুন</Link>
    <header className="mt-5 flex flex-col justify-between gap-4 rounded-2xl bg-emerald-950 p-6 text-white sm:flex-row sm:items-end"><div><h1 className="text-2xl font-bold sm:text-3xl">সদস্য পরিচিতি পরিচালনা</h1><p className="mt-2 text-sm leading-6 text-emerald-100">সদস্যের তথ্য, ছবি, প্রকাশের অবস্থা ও তালিকার ক্রম পরিচালনা করুন।</p></div><Link href="/admin/members/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-400 px-5 py-2.5 font-semibold text-emerald-950 hover:bg-amber-300">+ নতুন সদস্য</Link></header>
    <MemberList />
  </div></main>;
}
