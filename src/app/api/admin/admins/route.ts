import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });
const permissionKeys = ["canManageNotices", "canManageEvents", "canManageGallery", "canManageResources", "canManageMembers"] as const;
type PermissionKey = (typeof permissionKeys)[number];

function parsePermissions(body: Record<string, unknown>) {
  const permissions = body.permissions;
  if (permissions === undefined) return Object.fromEntries(permissionKeys.map((key) => [key, false])) as Record<PermissionKey, boolean>;
  if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) return null;
  const value = permissions as Record<string, unknown>;
  if (permissionKeys.some((key) => value[key] !== undefined && typeof value[key] !== "boolean")) return null;
  return Object.fromEntries(permissionKeys.map((key) => [key, value[key] === true])) as Record<PermissionKey, boolean>;
}

export async function GET() {
  const actor = await getAdmin();
  if (!actor) return error("অ্যাডমিন হিসেবে লগইন করুন।", 401);
  if (!actor.isSuperAdmin) return error("শুধু মূল Admin এই তালিকা দেখতে পারবেন।", 403);
  const admins = await prisma.admin.findMany({
    orderBy: [{ isSuperAdmin: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, email: true, isSuperAdmin: true, canManageNotices: true, canManageEvents: true, canManageGallery: true, canManageResources: true, canManageMembers: true, createdAt: true },
  });
  return NextResponse.json({ admins });
}

export async function POST(request: NextRequest) {
  const actor = await getAdmin();
  if (!actor) return error("অ্যাডমিন হিসেবে লগইন করুন।", 401);
  if (!actor.isSuperAdmin) return error("শুধু মূল Admin Sub-Admin তৈরি করতে পারবেন।", 403);
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return error("সঠিক তথ্য দিন।", 400);
  const data = body as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const password = typeof data.password === "string" ? data.password : "";
  const permissions = parsePermissions(data);
  if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255 || password.length < 8 || password.length > 128 || !permissions) {
    return error("নাম, বৈধ ইমেইল, ৮–১২৮ অক্ষরের পাসওয়ার্ড ও সঠিক অনুমতি দিন।", 400);
  }
  try {
    const admin = await prisma.admin.create({
      data: { name, email, passwordHash: await hash(password, 12), isSuperAdmin: false, ...permissions },
      select: { id: true, name: true, email: true, isSuperAdmin: true, canManageNotices: true, canManageEvents: true, canManageGallery: true, canManageResources: true, canManageMembers: true, createdAt: true },
    });
    return NextResponse.json({ admin }, { status: 201 });
  } catch (cause) {
    if (cause && typeof cause === "object" && "code" in cause && cause.code === "P2002") return error("এই ইমেইলে Admin আগে থেকেই আছে।", 409);
    console.error("Sub-admin creation failed.");
    return error("Sub-Admin তৈরি করা যায়নি।", 500);
  }
}
