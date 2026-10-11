import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ResourceForm from "../../resource-form";

export const dynamic = "force-dynamic";

export default async function EditResourcePage({ params }: { params: { id: string } }) {
  await requireAdminPermission("resources");
  const resource = await prisma.resource.findUnique({ where: { id: params.id } });
  if (!resource) notFound();
  return <main className="min-h-screen bg-slate-100 p-4 sm:p-8"><div className="mx-auto max-w-3xl"><Link href="/admin/resources" className="text-sm font-medium text-emerald-800 hover:underline">← রিসোর্স তালিকায় ফিরুন</Link><section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"><h1 className="text-2xl font-bold text-slate-900">PDF রিসোর্স সম্পাদনা</h1><ResourceForm initial={{ id: resource.id, title: resource.title, description: resource.description, category: resource.category, fileName: resource.fileName, filePath: resource.filePath, fileSize: resource.fileSize, published: resource.published }} /></section></div></main>;
}
