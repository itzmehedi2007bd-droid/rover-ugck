import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: { id: string } };
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });
const permissionKeys = ["canManageNotices", "canManageEvents", "canManageGallery", "canManageResources", "canManageMembers"] as const;

async function rootOnly() {
  const actor = await getAdmin();
  if (!actor) return { actor: null, response: error("অ্যাডমিন হিসেবে লগইন করুন।", 401) };
  if (!actor.isSuperAdmin) return { actor: null, response: error("শুধু মূল Admin এই কাজ করতে পারবেন।", 403) };
  return { actor, response: null };
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await rootOnly();
  if (!auth.actor) return auth.response;
  const target = await prisma.admin.findUnique({ where: { id: params.id } });
  if (!target) return error("Admin-কে পাওয়া যায়নি।", 404);
  if (target.isSuperAdmin) return error("মূল Admin account সাধারণ management action দিয়ে পরিবর্তন করা যাবে না।", 403);
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return error("সঠিক তথ্য দিন।", 400);
  const data = body as Record<string, unknown>;
  if ("isSuperAdmin" in data || "role" in data) return error("Super Admin-এর ভূমিকা পরিবর্তন করা যাবে না।", 403);
  const update: { name?: string; email?: string; passwordHash?: string; canManageNotices?: boolean; canManageEvents?: boolean; canManageGallery?: boolean; canManageResources?: boolean; canManageMembers?: boolean } = {};
  if (data.name !== undefined) {
    if (typeof data.name !== "string" || data.name.trim().length < 2 || data.name.trim().length > 100) return error("নাম ২–১০০ অক্ষরের মধ্যে দিন।", 400);
    update.name = data.name.trim();
  }
  if (data.email !== undefined) {
    if (typeof data.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) || data.email.trim().length > 255) return error("বৈধ ইমেইল দিন।", 400);
    update.email = data.email.trim().toLowerCase();
  }
  if (data.password !== undefined && data.password !== "") {
    if (typeof data.password !== "string" || data.password.length < 8 || data.password.length > 128) return error("পাসওয়ার্ড ৮–১২৮ অক্ষরের মধ্যে দিন।", 400);
    update.passwordHash = await hash(data.password, 12);
  }
  if (data.permissions !== undefined) {
    if (!data.permissions || typeof data.permissions !== "object" || Array.isArray(data.permissions)) return error("সঠিক permission দিন।", 400);
    const permissions = data.permissions as Record<string, unknown>;
    if (permissionKeys.some((key) => typeof permissions[key] !== "boolean")) return error("প্রতিটি permission নির্বাচন করুন।", 400);
    for (const key of permissionKeys) update[key] = permissions[key] as boolean;
  }
  if (Object.keys(update).length === 0) return error("পরিবর্তনের তথ্য দিন।", 400);
  try {
    const admin = await prisma.admin.update({ where: { id: target.id }, data: update, select: { id: true, name: true, email: true, isSuperAdmin: true, canManageNotices: true, canManageEvents: true, canManageGallery: true, canManageResources: true, canManageMembers: true, createdAt: true } });
    return NextResponse.json({ admin });
  } catch (cause) {
    if (cause && typeof cause === "object" && "code" in cause && cause.code === "P2002") return error("এই ইমেইলে Admin আগে থেকেই আছে।", 409);
    console.error("Sub-admin update failed.");
    return error("Sub-Admin-এর তথ্য সংরক্ষণ করা যায়নি।", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const auth = await rootOnly();
  if (!auth.actor) return auth.response;
  const target = await prisma.admin.findUnique({ where: { id: params.id }, select: { id: true, isSuperAdmin: true } });
  if (!target) return error("Admin-কে পাওয়া যায়নি।", 404);
  if (target.isSuperAdmin || target.id === auth.actor.id) return error("মূল Admin account মুছে ফেলা যাবে না।", 403);
  await prisma.admin.delete({ where: { id: target.id } });
  return NextResponse.json({ success: true });
}
