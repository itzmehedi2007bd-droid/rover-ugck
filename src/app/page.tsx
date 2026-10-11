
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const activities = [
  { icon: "🤝", title: "সমাজসেবা", description: "মানুষের পাশে দাঁড়ানো এবং স্বেচ্ছাসেবামূলক কাজে অংশ নেওয়া।" },
  { icon: "🌱", title: "পরিবেশ সংরক্ষণ", description: "বৃক্ষরোপণ ও পরিবেশ রক্ষায় সচেতনতা তৈরি।" },
  { icon: "⛺", title: "ক্যাম্পিং ও প্রশিক্ষণ", description: "নেতৃত্ব, শৃঙ্খলা ও বাস্তব দক্ষতা অর্জন।" },
  { icon: "🇧🇩", title: "জাতীয় কার্যক্রম", description: "জাতীয় দিবস ও সামাজিক উদ্যোগে অংশগ্রহণ।" },
];

type PublicNotice = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

type PublicEvent = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
};

type PublicGalleryImage = {
  id: string;
  title: string;
  description: string | null;
  filePath: string;
  createdAt: string;
};

type PublicResource = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  fileName: string;
  filePath: string;
  createdAt: string;
};

function resourceFileUrl(id: string, download = false) {
  return `/api/resources/${encodeURIComponent(id)}/file${download ? "?download=1" : ""}`;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notices, setNotices] = useState<PublicNotice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [noticeLoadFailed, setNoticeLoadFailed] = useState(false);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsLoadFailed, setEventsLoadFailed] = useState(false);
  const [galleryImages, setGalleryImages] = useState<PublicGalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryLoadFailed, setGalleryLoadFailed] = useState(false);
  const [resources, setResources] = useState<PublicResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesLoadFailed, setResourcesLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadNotices() {
      try {
        const response = await fetch("/api/notices", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.notices)) {
          throw new Error("Notice request failed");
        }
        if (active) setNotices(data.notices as PublicNotice[]);
      } catch {
        if (active) setNoticeLoadFailed(true);
      } finally {
        if (active) setNoticesLoading(false);
      }
    }

    void loadNotices();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/events", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.events)) throw new Error("Event request failed");
        if (active) setEvents(data.events as PublicEvent[]);
      })
      .catch(() => { if (active) setEventsLoadFailed(true); })
      .finally(() => { if (active) setEventsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/gallery", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.images)) throw new Error("Gallery request failed");
        if (active) setGalleryImages(data.images as PublicGalleryImage[]);
      })
      .catch(() => { if (active) setGalleryLoadFailed(true); })
      .finally(() => { if (active) setGalleryLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/resources", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.resources)) throw new Error("Resource request failed");
        if (active) setResources(data.resources as PublicResource[]);
      })
      .catch(() => { if (active) setResourcesLoadFailed(true); })
      .finally(() => { if (active) setResourcesLoading(false); });
    return () => { active = false; };
  }, []);

  const navItems = [
    ["আমাদের সম্পর্কে", "#about"],
    ["কার্যক্রম", "#activities"],
    ["নোটিশ", "#notices"],
    ["রিসোর্স", "/resources"],
    ["সদস্য পরিচিতি", "/members"],
    ["গ্যালারি", "#gallery"],
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-800">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-custom flex min-h-16 items-center justify-between gap-3">
          <a href="#" className="flex items-center gap-3">
            <Image src="/images/rover-group-logo.jpg" alt="Rover Scout Group logo" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-contain" />
            <span>
              <strong className="block text-lg font-bold leading-tight text-emerald-950">Rover UGCK</strong>
              <span className="text-xs text-slate-600">উলিপুর সরকারি কলেজ রোভার স্কাউট</span>
            </span>
          </a>

          <nav className="hidden items-center gap-6 lg:flex">
            {navItems.map(([label, href]) => (
              <a key={href} href={href} className="text-sm font-medium transition hover:text-emerald-800">
                {label}
              </a>
            ))}
            <a href="#contact" className="rounded-full bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">
              যোগাযোগ করুন
            </a>
          </nav>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 text-xl lg:hidden"
            aria-label={menuOpen ? "মেনু বন্ধ করুন" : "মেনু খুলুন"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {menuOpen && (
          <nav className="container-custom flex flex-col gap-1 border-t border-slate-200 py-3 lg:hidden">
            {navItems.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-emerald-50">
                {label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <section className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white">
        <div className="container-custom grid grid-cols-1 items-center gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">
              ⚜ সেবা • শৃঙ্খলা • আত্মোন্নয়ন
            </span>
            <h1 className="mt-6 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              সেবার ব্রতে গড়ি
              <span className="mt-2 block text-amber-300">দক্ষ ও মানবিক আগামী</span>
            </h1>
            <p className="mt-5 max-w-xl leading-8 text-emerald-50/90">
              উলিপুর সরকারি কলেজ রোভার স্কাউট গ্রুপের ওয়েবসাইটে স্বাগতম।
              আমাদের কার্যক্রম, নোটিশ ও রোভারিংয়ের বিভিন্ন তথ্য এখানে জানুন।
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#about" className="inline-flex min-h-12 items-center justify-center rounded-full bg-amber-400 px-7 py-3 font-bold text-emerald-950 hover:bg-amber-300">
                আমাদের সম্পর্কে জানুন
              </a>
              <a href="#activities" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 px-7 py-3 font-semibold hover:bg-white/10">
                কার্যক্রম দেখুন
              </a>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="rounded-3xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur">
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl bg-white p-8 text-center text-emerald-950 sm:min-h-80">
                <Image
                  src="/images/scout-icon.png"
                  alt="Scout icon"
                  width={72}
                  height={72}
                  className="h-16 w-16 object-contain"
                  style={{ filter: "brightness(0) saturate(100%) invert(22%) sepia(17%) saturate(2800%) hue-rotate(103deg) brightness(91%) contrast(92%)" }}
                />
                <h2 className="mt-5 text-xl font-bold text-emerald-950 sm:text-2xl">উলিপুর সরকারি কলেজ</h2>
                <p className="mt-2 text-base font-semibold text-red-700 sm:text-lg">রোভার স্কাউট গ্রুপ</p>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-emerald-100">
              নেতৃত্ব • বন্ধুত্ব • দায়িত্ব • মানবসেবা
            </p>
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-20 py-16 sm:py-20">
        <div className="container-custom grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="font-semibold text-emerald-800">আমাদের সম্পর্কে</p>
            <h2 className="mt-3 text-3xl font-bold leading-snug text-emerald-950 sm:text-4xl">
              সেবার মাধ্যমে নিজেকে গড়ে তুলি। 
            </h2>
          </div>
          <div>
            <p className="leading-8 text-slate-600">
              রোভারিং তরুণদের নেতৃত্ব, দায়িত্ববোধ, শৃঙ্খলা ও সমাজসেবার মানসিকতা বিকাশের একটি সুযোগ।
              Rover UGCK-এর কার্যক্রম, লক্ষ্য এবং সাংগঠনিক তথ্য এখানে তুলে ধরা হলো।
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              উলিপুর সরকারি কলেজ রোভার স্কাউট গ্রুপ বাংলাদেশ স্কাউটসের রোভার স্কাউট শাখার আদর্শ ও চেতনাকে ধারণ করে সেবা, শৃঙ্খলা, নেতৃত্ব এবং মানবিক মূল্যবোধ বিকাশে কাজ করার প্রত্যয়ে এগিয়ে চলেছে।

আমাদের লক্ষ্য হলো তরুণদের যোগ্য, আত্মনির্ভরশীল, দায়িত্বশীল ও মানবিক নাগরিক হিসেবে গড়ে উঠতে সহায়তা করা। রোভার স্কাউটিংয়ের মাধ্যমে সদস্যরা নেতৃত্বের গুণাবলি অর্জন, দলগতভাবে কাজ করা, সামাজিক দায়িত্ব পালন এবং মানুষের কল্যাণে এগিয়ে আসার অনুপ্রেরণা লাভ করে।

আমরা বিশ্বাস করি, একজন আদর্শ রোভার শুধু নিজের উন্নয়নেই সীমাবদ্ধ থাকে না; বরং সমাজ ও দেশের কল্যাণে অবদান রাখার মানসিকতা ধারণ করে। মানবসেবা, পরিবেশ সংরক্ষণ, সামাজিক সচেতনতা এবং স্বেচ্ছাসেবামূলক কার্যক্রমের মাধ্যমে ইতিবাচক পরিবর্তনে ভূমিকা রাখাই আমাদের অনুপ্রেরণা।

আমাদের মূলমন্ত্র—সেবা, শৃঙ্খলা ও আত্মোন্নয়ন।

আমরা স্বপ্ন দেখি এমন একটি প্রজন্মের, যারা সততা, সাহস, দায়িত্ববোধ ও মানবিকতা নিয়ে দেশ ও মানুষের পাশে দাঁড়াবে। সেই স্বপ্ন বাস্তবায়নে উলিপুর সরকারি কলেজ রোভার স্কাউট গ্রুপের প্রতিটি সদস্য নিজেকে প্রস্তুত করার প্রত্যয়ে এগিয়ে যেতে চায়।

একজন রোভার, সেবার জন্য প্রস্তুত—মানবতার কল্যাণে নিবেদিত।
            </p>
          </div>
        </div>
      </section>

      <section id="activities" className="scroll-mt-20 bg-emerald-50 py-16 sm:py-20">
        <div className="container-custom">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-semibold text-emerald-800">আমাদের উদ্যোগ</p>
            <h2 className="mt-2 text-3xl font-bold text-emerald-950 sm:text-4xl">রোভার কার্যক্রম</h2>
            <p className="mt-4 leading-7 text-slate-600">দক্ষতা অর্জন, মানুষের সেবা এবং দায়িত্বশীল নাগরিক হিসেবে গড়ে ওঠার প্রয়াস।</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {activities.map((item) => (
              <article key={item.title} className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-2xl">{item.icon}</span>
                <h3 className="mt-5 text-lg font-bold text-emerald-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="notices" className="scroll-mt-20 py-16 sm:py-20">
        <div className="container-custom grid grid-cols-1 gap-8 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 p-6 sm:p-8">
            <span className="text-2xl">📢</span>
            <h2 className="mt-3 text-2xl font-bold text-emerald-950">নোটিশ বোর্ড</h2>
            <p className="mt-3 leading-7 text-slate-600">
              গুরুত্বপূর্ণ ঘোষণা, প্রশিক্ষণ, সভা ও বিজ্ঞপ্তি এখানে প্রকাশ করা হবে।
            </p>
            {noticesLoading ? (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                নোটিশ লোড হচ্ছে…
              </p>
            ) : noticeLoadFailed ? (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700">
                নোটিশ লোড করা যায়নি। পরে আবার চেষ্টা করুন।
              </p>
            ) : notices.length === 0 ? (
              <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                এখনো কোনো যাচাইকৃত নোটিশ যোগ করা হয়নি।
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {notices.map((notice) => (
                  <article key={notice.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="font-bold text-emerald-950">{notice.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                      {notice.content}
                    </p>
                    <time dateTime={notice.createdAt} className="mt-3 block text-xs text-slate-500">
                      {new Date(notice.createdAt).toLocaleDateString("bn-BD", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  </article>
                ))}
              </div>
            )}
          </article>
          <article className="rounded-2xl border border-slate-200 p-6 sm:p-8">
            <span className="text-2xl">📅</span>
            <h2 className="mt-3 text-2xl font-bold text-emerald-950">ইভেন্ট ও আয়োজন</h2>
            <p className="mt-3 leading-7 text-slate-600">
              আসন্ন কার্যক্রম, ইভেন্টের সময়সূচি ও অংশগ্রহণের তথ্য।
            </p>
            {eventsLoading ? (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">ইভেন্ট লোড হচ্ছে…</p>
            ) : eventsLoadFailed ? (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">ইভেন্ট লোড করা যায়নি।</p>
            ) : events.length === 0 ? (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">এখনো কোনো প্রকাশিত ইভেন্ট নেই।</p>
            ) : (
              <div className="mt-4 space-y-3">
                {events.map((event) => (
                  <article key={event.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="font-bold text-emerald-950">{event.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{event.description}</p>
                    <p className="mt-3 text-xs text-slate-500">
                      {new Date(event.startDate).toLocaleString("bn-BD", { dateStyle: "long", timeStyle: "short" })}
                      {event.endDate ? ` – ${new Date(event.endDate).toLocaleString("bn-BD", { dateStyle: "long", timeStyle: "short" })}` : ""}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>

      <section id="resources" className="scroll-mt-20 bg-slate-50 py-16 sm:py-20">
        <div className="container-custom">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-semibold text-emerald-800">শেখার উপকরণ</p>
              <h2 className="mt-2 text-3xl font-bold text-emerald-950 sm:text-4xl">PDF রিসোর্স</h2>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">প্রকাশিত ফরম, নির্দেশিকা ও অন্যান্য PDF এখানে পড়ুন বা ডাউনলোড করুন।</p>
            </div>
            <a href="/resources" className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-800 px-5 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">সব রিসোর্স দেখুন</a>
          </div>
          {resourcesLoading ? (
            <p className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-slate-600">PDF রিসোর্স লোড হচ্ছে…</p>
          ) : resourcesLoadFailed ? (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 p-6 text-center text-sm text-red-700">PDF রিসোর্স লোড করা যায়নি। পরে আবার চেষ্টা করুন।</p>
          ) : resources.length === 0 ? (
            <p className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">এখনো কোনো প্রকাশিত PDF নেই।</p>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {resources.map((resource) => (
                <article key={resource.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{resource.category}</span>
                  <h3 className="mt-3 text-lg font-bold text-emerald-950">{resource.title}</h3>
                  {resource.description && <p className="mt-2 flex-1 whitespace-pre-wrap text-sm leading-7 text-slate-600">{resource.description}</p>}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <a href={resourceFileUrl(resource.id)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">PDF দেখুন</a>
                    <a href={resourceFileUrl(resource.id, true)} download className="inline-flex min-h-10 items-center justify-center rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">ডাউনলোড</a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="gallery" className="scroll-mt-20 bg-emerald-50 py-16 sm:py-20">
        <div className="container-custom">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-semibold text-emerald-800">আমাদের স্মৃতি</p>
            <h2 className="mt-2 text-3xl font-bold text-emerald-950 sm:text-4xl">ছবির গ্যালারি</h2>
            <p className="mt-4 leading-7 text-slate-600">রোভারের কার্যক্রমের নির্বাচিত ছবি ও স্মৃতিচিত্র।</p>
          </div>
          {galleryLoading ? (
            <p className="mt-8 rounded-xl bg-white p-6 text-center text-sm text-slate-600">গ্যালারি লোড হচ্ছে…</p>
          ) : galleryLoadFailed ? (
            <p role="alert" className="mt-8 rounded-xl bg-red-50 p-6 text-center text-sm text-red-700">গ্যালারি লোড করা যায়নি।</p>
          ) : galleryImages.length === 0 ? (
            <p className="mt-8 rounded-xl bg-white p-6 text-center text-sm text-slate-600">এখনো কোনো ছবি যোগ করা হয়নি।</p>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {galleryImages.map((image) => (
                <article key={image.id} className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <Image src={image.filePath} alt={image.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" unoptimized />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-emerald-950">{image.title}</h3>
                    {image.description && <p className="mt-2 text-sm leading-6 text-slate-600">{image.description}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="contact" className="scroll-mt-20 bg-slate-100 py-16 sm:py-20">
        <div className="container-custom text-center">
          <p className="font-semibold text-emerald-800">যোগাযোগ</p>
          <h2 className="mt-2 text-3xl font-bold text-emerald-950 sm:text-4xl">Rover UGCK-এর সঙ্গে যুক্ত হোন</h2>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-600">
            সদস্য হওয়ার নিয়ম, কার্যক্রম অথবা ওয়েবসাইট সম্পর্কে জানতে গ্রুপের দায়িত্বপ্রাপ্ত কর্তৃপক্ষের সঙ্গে যোগাযোগ করুন।
          </p>
          <p className="mt-5 text-sm text-slate-500">হোয়াটসঅ্যাপ/ফোনকলঃ ০১৩৩২০২৪১৩০</p>
        </div>
      </section>

      <footer className="bg-slate-950 py-8 text-white">
        <div className="container-custom flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <div>
            <p className="font-bold">Rover UGCK</p>
            <p className="mt-1 text-sm text-slate-300">উলিপুর সরকারি কলেজ রোভার স্কাউট গ্রুপ</p>
          </div>
            <p className="text-xs text-slate-400">Developed by It&apos;z Mehedi</p>
        </div>
      </footer>
    </main>
  );
}
