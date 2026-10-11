import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: { published: true },
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startDate: true,
        endDate: true,
      },
    });
    return NextResponse.json({ events });
  } catch {
    console.error("Public events could not be loaded.");
    return NextResponse.json({ error: "ইভেন্ট লোড করা যায়নি।" }, { status: 500 });
  }
}
