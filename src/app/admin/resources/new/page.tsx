import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth";
import ResourceForm from "../resource-form";

export const dynamic = "force-dynamic";

export default async function NewResourcePage() {
  await requireAdminPermission("resources");
  return <main className="min-h-screen bg-slate-100 p-4 sm:p-8"><div className="mx-auto max-w-3xl"><Link href="/admin/resources" className="text-sm font-medium text-emerald-800 hover:underline">← রিসোর্স তালিকায় ফিরুন</Link><section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"><h1 className="text-2xl font-bold text-slate-900">নতুন PDF যোগ করুন</h1><ResourceForm /></section></div></main>;
}
