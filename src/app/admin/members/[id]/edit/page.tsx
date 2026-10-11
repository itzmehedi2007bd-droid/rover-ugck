import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth";
import MemberForm from "../../member-form";

export const dynamic = "force-dynamic";

export default async function EditMemberPage({ params }: { params: { id: string } }) {
  await requireAdminPermission("members");
  return <main className="min-h-screen bg-slate-100 p-4 sm:p-8"><div className="mx-auto max-w-3xl"><Link href="/admin/members" className="text-sm font-medium text-emerald-800 hover:underline">← সদস্য তালিকায় ফিরুন</Link><section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"><h1 className="text-2xl font-bold text-slate-900">সদস্যের তথ্য সম্পাদনা</h1><MemberForm memberId={params.id} /></section></div></main>;
}
