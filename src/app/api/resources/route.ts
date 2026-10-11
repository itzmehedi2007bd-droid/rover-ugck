import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const resources = await prisma.resource.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, description: true, category: true, fileName: true, filePath: true, mimeType: true, fileSize: true, createdAt: true },
    });
    return NextResponse.json({ resources });
  } catch {
    console.error("Public resources could not be loaded.");
    return NextResponse.json({ error: "রিসোর্স লোড করা যায়নি।" }, { status: 500 });
  }
}
