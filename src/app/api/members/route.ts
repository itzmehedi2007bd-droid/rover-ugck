import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const designation = request.nextUrl.searchParams.get("designation")?.trim().slice(0, 100) ?? "";
  const batch = request.nextUrl.searchParams.get("batch")?.trim().slice(0, 80) ?? "";
  try {
    const members = await prisma.member.findMany({
      where: {
        published: true,
        ...(query ? { OR: [{ fullName: { contains: query } }, { designation: { contains: query } }] } : {}),
        ...(designation ? { designation } : {}),
        ...(batch ? { batch } : {}),
      },
      orderBy: [{ displayOrder: "asc" }, { fullName: "asc" }],
      select: { id: true, fullName: true, designation: true, batch: true, memberNumber: true, imageUrl: true },
    });
    return NextResponse.json({ members }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Public member list could not be loaded.");
    return NextResponse.json({ error: "সদস্যদের তালিকা লোড করা যায়নি।" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
