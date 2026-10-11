import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function resourceFileUrl(id: string, download = false) {
  return `/api/resources/${encodeURIComponent(id)}/file${download ? "?download=1" : ""}`;
}

export default async function ResourcesPage() {
  const resources = await prisma.resource.findMany({
    where: { published: true }, orderBy: { createdAt: "desc" },
    select: { id: true, title: true, description: true, category: true, fileName: true, filePath: true, createdAt: true },
  }).catch(() => null);
  return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8">
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="text-sm font-medium text-emerald-800 hover:underline">← মূল ওয়েবসাইট</Link>
      <header className="mt-5 rounded-2xl bg-emerald-950 p-6 text-white sm:p-8"><h1 className="text-3xl font-bold">শিক্ষা ও প্রয়োজনীয় রিসোর্স</h1><p className="mt-3 leading-7 text-emerald-100">প্রকাশিত PDF পড়ুন, preview দেখুন অথবা ডাউনলোড করুন।</p></header>
      {resources === null ? <p role="alert" className="mt-6 rounded-xl bg-red-50 p-5 text-red-700">রিসোর্স লোড করা যায়নি। পরে আবার চেষ্টা করুন।</p> : resources.length === 0 ? <p className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">এখনো কোনো প্রকাশিত PDF নেই।</p> : <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {resources.map((resource) => <article key={resource.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 p-5"><div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{resource.category}</span><h2 className="mt-3 text-xl font-bold text-slate-900">{resource.title}</h2>{resource.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{resource.description}</p>}<time className="mt-3 block text-xs text-slate-500" dateTime={resource.createdAt.toISOString()}>{resource.createdAt.toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" })}</time></div></div>
          <iframe title={`${resource.title} PDF preview`} src={resourceFileUrl(resource.id)} className="h-80 w-full border-y border-slate-200 bg-slate-100" />
          <div className="flex flex-wrap gap-3 p-5"><a href={resourceFileUrl(resource.id)} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">PDF খুলুন</a><a href={resourceFileUrl(resource.id, true)} download className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">ডাউনলোড</a></div>
        </article>)}
      </div>}
    </div>
  </main>;
}
