import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth";
import ResourceList from "./resource-list";

export const dynamic = "force-dynamic";

export default async function AdminResourcesPage() {
  await requireAdminPermission("resources");
  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm font-medium text-emerald-800 hover:underline">← অ্যাডমিন ড্যাশবোর্ড</Link>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">PDF রিসোর্স পরিচালনা</h1>
            <p className="mt-2 text-sm text-slate-600">PDF আপলোড, সম্পাদনা, প্রকাশ এবং শ্রেণিবিন্যাস করুন।</p>
          </div>
          <Link href="/admin/resources/new" className="rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-700">+ নতুন PDF যোগ করুন</Link>
        </header>
        <ResourceList />
      </div>
    </main>
  );
}
