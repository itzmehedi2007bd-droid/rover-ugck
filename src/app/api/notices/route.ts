import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notices = await prisma.notice.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ notices });
  } catch {
    console.error("Public notices could not be loaded.");
    return NextResponse.json(
      { error: "নোটিশ লোড করা যায়নি।" },
      { status: 500 }
    );
  }
}
