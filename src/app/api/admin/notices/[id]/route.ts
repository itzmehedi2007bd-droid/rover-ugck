import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function authorized() {
  const authorization = await authorizeAdmin("notices");
  if (authorization.admin) return null;
  return jsonError("এই কাজের অনুমতি আপনার নেই।", authorization.status);
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const authError = await authorized();
    if (authError) return authError;
    const notice = await prisma.notice.findUnique({ where: { id: params.id } });
    if (!notice) return jsonError("নোটিশটি পাওয়া যায়নি।", 404);
    return NextResponse.json({ notice });
  } catch (error) {
    console.error("Notice GET failed:", error);
    return jsonError("নোটিশ লোড করা যায়নি।", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authError = await authorized();
    if (authError) return authError;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("সঠিক JSON তথ্য পাঠান।", 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return jsonError("সঠিক তথ্য পাঠান।", 400);
    const data = body as Record<string, unknown>;
    const update: { title?: string; content?: string; published?: boolean } = {};

    if (typeof data.published === "boolean") update.published = data.published;
    if (data.title !== undefined) {
      if (typeof data.title !== "string" || !data.title.trim() || data.title.trim().length > 200) {
        return jsonError("শিরোনাম লিখুন (সর্বোচ্চ ২০০ অক্ষর)।", 400);
      }
      update.title = data.title.trim();
    }
    if (data.content !== undefined) {
      if (typeof data.content !== "string" || !data.content.trim() || data.content.trim().length > 20000) {
        return jsonError("বিবরণ লিখুন (সর্বোচ্চ ২০০০০ অক্ষর)।", 400);
      }
      update.content = data.content.trim();
    }
    if (Object.keys(update).length === 0) return jsonError("পরিবর্তনের তথ্য দিন।", 400);

    const result = await prisma.notice.updateMany({ where: { id: params.id }, data: update });
    if (result.count === 0) return jsonError("নোটিশটি পাওয়া যায়নি।", 404);
    const notice = await prisma.notice.findUnique({ where: { id: params.id } });
    revalidatePath("/admin/notices");
    revalidatePath("/");
    return NextResponse.json({ notice });
  } catch (error) {
    console.error("Notice PATCH failed:", error);
    return jsonError("নোটিশ পরিবর্তন করা যায়নি।", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const authError = await authorized();
    if (authError) return authError;
    const result = await prisma.notice.deleteMany({ where: { id: params.id } });
    if (result.count === 0) return jsonError("নোটিশটি পাওয়া যায়নি।", 404);
    revalidatePath("/admin/notices");
    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notice DELETE failed:", error);
    return jsonError("নোটিশ মুছে ফেলা যায়নি।", 500);
  }
}
