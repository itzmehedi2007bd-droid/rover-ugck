import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "@/app/admin/login/actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const admin = await requireAdmin();

  const sections = [
    {
      title: "নোটিশ",
      description: "নোটিশ পরিচালনা করুন",
      href: "/admin/notices",
    },
    {
      title: "ইভেন্ট",
      description: "রোভার কার্যক্রম পরিচালনা করুন",
      href: "/admin/events",
    },
    {
      title: "গ্যালারি",
      description: "ছবি ও স্মৃতি পরিচালনা করুন",
      href: "/admin/gallery",
    },
    {
      title: "রিসোর্স",
      description: "PDF ও প্রয়োজনীয় ফাইল পরিচালনা করুন",
      href: "/admin/resources",
    },
    {
      title: "সদস্য পরিচিতি",
      description: "সদস্যদের পরিচিতি ও প্রকাশের অবস্থা পরিচালনা করুন",
      href: "/admin/members",
      memberPermission: true,
    },
    {
      title: "অ্যাডমিন",
      description: "প্রশাসনিক ব্যবস্থাপনা",
      href: "/admin/admins",
      superAdminOnly: true,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-2xl bg-emerald-950 p-6 text-white">
          <Image src="/images/rover-group-logo.jpg" alt="Rover Scout Group logo" width={64} height={64} className="mb-4 h-16 w-16 rounded-full bg-white p-1 object-contain" />
          <p className="text-sm text-emerald-200">
            Ulipur Government College
          </p>

          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Rover UGCK Admin Dashboard
          </h1>

          <p className="mt-2 text-sm text-emerald-100">
            স্বাগতম, {admin.name}
          </p>

          <p className="mt-1 text-sm text-emerald-100">
            {admin.email}
          </p>

          <form action={logoutAction} className="mt-4">
            <button
              type="submit"
              className="rounded-lg bg-amber-400 px-5 py-2 font-semibold text-emerald-950 hover:bg-amber-300"
            >
              লগআউট
            </button>
          </form>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.filter((item) => {
            if ("superAdminOnly" in item) return admin.isSuperAdmin;
            if (item.href === "/admin/notices") return admin.isSuperAdmin || admin.canManageNotices;
            if (item.href === "/admin/events") return admin.isSuperAdmin || admin.canManageEvents;
            if (item.href === "/admin/gallery") return admin.isSuperAdmin || admin.canManageGallery;
            if (item.href === "/admin/resources") return admin.isSuperAdmin || admin.canManageResources;
            if ("memberPermission" in item) return admin.isSuperAdmin || admin.canManageMembers;
            return true;
          }).map((item) => {
            const cardClass =
              "block h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md";

            const content = (
              <>
                <h2 className="text-lg font-bold text-emerald-950">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {item.description}
                </p>
                {item.href === null && (
                  <p className="mt-3 text-xs text-amber-700">
                    শিগগিরই আসছে
                  </p>
                )}
              </>
            );

            return (
              <article key={item.title}>
                {item.href ? (
                  <Link href={item.href} className={cardClass}>
                    {content}
                  </Link>
                ) : (
                  <div className={cardClass}>{content}</div>
                )}
              </article>
            );
          })}
        </section>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-block rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
          >
            মূল ওয়েবসাইটে ফিরে যান
          </Link>
        </div>
      </div>
    </main>
  );
}
