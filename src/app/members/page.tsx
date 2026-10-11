import Link from "next/link";
import MemberDirectory from "./member-directory";

export const dynamic = "force-dynamic";

export default function MembersPage() {
  return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/" className="text-sm font-medium text-emerald-800 hover:underline">← মূল ওয়েবসাইটে ফিরুন</Link>
      <header className="mt-5 rounded-2xl bg-emerald-950 p-6 text-white sm:p-9">
        <p className="text-sm font-semibold text-emerald-200">Rover UGCK</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">সদস্য পরিচিতি</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-100">Rover UGCK-এর প্রকাশিত সদস্যদের নাম, পদবি ও পরিচিতি দেখুন।</p>
      </header>
      <MemberDirectory />
    </div>
  </main>;
}
