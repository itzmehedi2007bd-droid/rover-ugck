
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import type { Admin } from "@prisma/client";

export type AdminSafe = Omit<Admin, "passwordHash">;
export type AdminPermission = "notices" | "events" | "gallery" | "resources" | "members" | "admins";

const permissionFields = {
  notices: "canManageNotices",
  events: "canManageEvents",
  gallery: "canManageGallery",
  resources: "canManageResources",
  members: "canManageMembers",
} as const;

export function hasAdminPermission(admin: AdminSafe, permission: AdminPermission): boolean {
  if (admin.isSuperAdmin) return true;
  if (permission === "admins") return false;
  return admin[permissionFields[permission]];
}

export async function authorizeAdmin(permission: AdminPermission) {
  const admin = await getAdmin();
  if (!admin) return { admin: null, status: 401 as const };
  if (!hasAdminPermission(admin, permission)) return { admin: null, status: 403 as const };
  return { admin, status: null };
}

export const getAdmin = cache(
  async (permission?: AdminPermission): Promise<AdminSafe | null> => {
    const session = await verifySession();

    if (!session?.adminId) {
      return null;
    }

    const admin = await prisma.admin.findUnique({
      where: { id: session.adminId },
    });

    if (!admin || admin.email !== session.email) {
      return null;
    }

    const { passwordHash: _passwordHash, ...safeAdmin } = admin;
    if (permission && !hasAdminPermission(safeAdmin, permission)) return null;
    return safeAdmin;
  }
);

export async function requireAdmin(): Promise<AdminSafe> {
  const admin = await getAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}

export async function requireAdminPermission(permission: AdminPermission): Promise<AdminSafe> {
  const admin = await getAdmin(permission);
  if (!admin) redirect("/admin");
  return admin;
}
