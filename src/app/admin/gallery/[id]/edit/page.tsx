import Link from "next/link";
import GalleryForm from "../../GalleryForm";

export default function EditGalleryImagePage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/gallery" className="text-sm font-medium text-emerald-800 hover:underline">← গ্যালারিতে ফিরুন</Link>
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">ছবির তথ্য সম্পাদনা</h1>
          <GalleryForm imageId={params.id} />
        </section>
      </div>
    </main>
  );
}
