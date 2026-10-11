import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseEvent(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const data = body as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const location = typeof data.location === "string" ? data.location.trim() : "";
  const startDate = typeof data.startDate === "string" ? new Date(data.startDate) : null;
  const endDate = typeof data.endDate === "string" && data.endDate ? new Date(data.endDate) : null;

  if (!title || title.length > 200 || !description || description.length > 20000) return null;
  if (!startDate || Number.isNaN(startDate.getTime())) return null;
  if (endDate && (Number.isNaN(endDate.getTime()) || endDate < startDate)) return null;
  if (location.length > 300) return null;

  return {
    title,
    description,
    location: location || null,
    startDate,
    endDate,
    published: data.published === true,
  };
}

async function readJson(request: NextRequest): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const authorization = await authorizeAdmin("events");
    if (!authorization.admin) return errorResponse("এই কাজের অনুমতি আপনার নেই।", authorization.status);
    const events = await prisma.event.findMany({ orderBy: { startDate: "asc" } });
    return NextResponse.json({ events });
  } catch {
    console.error("Admin events could not be loaded.");
    return errorResponse("ইভেন্ট লোড করা যায়নি।", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeAdmin("events");
    if (!authorization.admin) return errorResponse("এই কাজের অনুমতি আপনার নেই।", authorization.status);
    const data = parseEvent(await readJson(request));
    if (!data) return errorResponse("শিরোনাম, বিবরণ ও সঠিক তারিখ দিন। শেষ তারিখ শুরুর তারিখের আগে হতে পারবে না।", 400);

    const event = await prisma.event.create({ data });
    revalidatePath("/admin/events");
    revalidatePath("/");
    return NextResponse.json({ event }, { status: 201 });
  } catch {
    console.error("Admin event could not be created.");
    return errorResponse("ইভেন্ট সংরক্ষণ করা যায়নি।", 500);
  }
}
