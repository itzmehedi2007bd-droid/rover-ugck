import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth";
import AdminList from "./admin-list";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  await requireAdminPermission("admins");
  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-sm font-medium text-emerald-800 hover:underline">← Admin Dashboard-এ ফিরুন</Link>
        <header className="mt-5 rounded-2xl bg-emerald-950 p-6 text-white">
          <h1 className="text-2xl font-bold sm:text-3xl">Admin ও Sub-Admin ব্যবস্থাপনা</h1>
          <p className="mt-2 text-sm leading-6 text-emerald-100">Sub-Admin-কে প্রয়োজন অনুযায়ী Notice, Event, Gallery ও PDF Resource permission দিন। মূল Admin account এখানে সম্পাদনা বা মুছে ফেলা যাবে না।</p>
        </header>
        <AdminList />
      </div>
    </main>
  );
}
