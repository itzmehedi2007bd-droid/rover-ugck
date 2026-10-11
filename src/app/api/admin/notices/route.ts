import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function readNoticeInput(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const data = body as Record<string, unknown>;
    const title = typeof data.title === "string" ? data.title.trim() : "";
    const content = typeof data.content === "string" ? data.content.trim() : "";
    if (!title || title.length > 200 || !content || content.length > 20000) return null;
    return { title, content, published: data.published === true };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const authorization = await authorizeAdmin("notices");
    if (!authorization.admin) return jsonError("এই কাজের অনুমতি আপনার নেই।", authorization.status);
    const notices = await prisma.notice.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ notices });
  } catch (error) {
    console.error("Notice GET failed:", error);
    return jsonError("নোটিশ লোড করা যায়নি।", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeAdmin("notices");
    if (!authorization.admin) return jsonError("এই কাজের অনুমতি আপনার নেই।", authorization.status);
    const input = await readNoticeInput(request);
    if (!input) return jsonError("শিরোনাম (সর্বোচ্চ ২০০ অক্ষর) ও বিবরণ (সর্বোচ্চ ২০০০০ অক্ষর) দিন।", 400);
    const notice = await prisma.notice.create({ data: input });
    revalidatePath("/admin/notices");
    revalidatePath("/");
    return NextResponse.json({ notice }, { status: 201 });
  } catch (error) {
    console.error("Notice POST failed:", error);
    return jsonError("নোটিশ সংরক্ষণ করা যায়নি।", 500);
  }
}
