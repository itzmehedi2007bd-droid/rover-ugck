import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const images = await prisma.galleryImage.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        fileName: true,
        filePath: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ images });
  } catch {
    console.error("Public gallery could not be loaded.");
    return NextResponse.json({ error: "গ্যালারি লোড করা যায়নি।" }, { status: 500 });
  }
}
