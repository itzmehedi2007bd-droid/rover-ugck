import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function authorized() {
  const authorization = await authorizeAdmin("events");
  if (authorization.admin) return null;
  return errorResponse("এই কাজের অনুমতি আপনার নেই।", authorization.status);
}

function parseEvent(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const data = body as Record<string, unknown>;
  const update: {
    title?: string;
    description?: string;
    location?: string | null;
    startDate?: Date;
    endDate?: Date | null;
    published?: boolean;
  } = {};

  if (typeof data.published === "boolean") update.published = data.published;
  if (data.title !== undefined) {
    if (typeof data.title !== "string" || !data.title.trim() || data.title.trim().length > 200) return null;
    update.title = data.title.trim();
  }
  if (data.description !== undefined) {
    if (typeof data.description !== "string" || !data.description.trim() || data.description.trim().length > 20000) return null;
    update.description = data.description.trim();
  }
  if (data.location !== undefined) {
    if (typeof data.location !== "string" || data.location.trim().length > 300) return null;
    update.location = data.location.trim() || null;
  }
  if (data.startDate !== undefined) {
    if (typeof data.startDate !== "string") return null;
    const date = new Date(data.startDate);
    if (Number.isNaN(date.getTime())) return null;
    update.startDate = date;
  }
  if (data.endDate !== undefined) {
    if (data.endDate === null || data.endDate === "") update.endDate = null;
    else if (typeof data.endDate === "string") {
      const date = new Date(data.endDate);
      if (Number.isNaN(date.getTime())) return null;
      update.endDate = date;
    } else return null;
  }
  if (Object.keys(update).length === 0) return null;
  return update;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const authError = await authorized();
    if (authError) return authError;
    const event = await prisma.event.findUnique({ where: { id: params.id } });
    if (!event) return errorResponse("ইভেন্টটি পাওয়া যায়নি।", 404);
    return NextResponse.json({ event });
  } catch {
    console.error("Admin event could not be loaded.");
    return errorResponse("ইভেন্ট লোড করা যায়নি।", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authError = await authorized();
    if (authError) return authError;
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse("সঠিক JSON তথ্য পাঠান।", 400); }
    const data = parseEvent(body);
    if (!data) return errorResponse("সঠিক পরিবর্তনের তথ্য দিন।", 400);

    const existing = await prisma.event.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse("ইভেন্টটি পাওয়া যায়নি।", 404);
    const nextStartDate = data.startDate ?? existing.startDate;
    const nextEndDate = data.endDate === undefined ? existing.endDate : data.endDate;
    if (nextEndDate && nextEndDate < nextStartDate) {
      return errorResponse("শেষ তারিখ শুরুর তারিখের আগে হতে পারবে না।", 400);
    }

    const result = await prisma.event.updateMany({ where: { id: params.id }, data });
    if (result.count === 0) return errorResponse("ইভেন্টটি পাওয়া যায়নি।", 404);
    const event = await prisma.event.findUnique({ where: { id: params.id } });
    revalidatePath("/admin/events");
    revalidatePath("/");
    return NextResponse.json({ event });
  } catch {
    console.error("Admin event could not be updated.");
    return errorResponse("ইভেন্ট পরিবর্তন করা যায়নি।", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const authError = await authorized();
    if (authError) return authError;
    const result = await prisma.event.deleteMany({ where: { id: params.id } });
    if (result.count === 0) return errorResponse("ইভেন্টটি পাওয়া যায়নি।", 404);
    revalidatePath("/admin/events");
    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch {
    console.error("Admin event could not be deleted.");
    return errorResponse("ইভেন্ট মুছে ফেলা যায়নি।", 500);
  }
}
