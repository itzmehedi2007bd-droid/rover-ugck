import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { createSession } from "@/lib/session";
import { validateLoginInput } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "সঠিক JSON তথ্য পাঠান।" },
        { status: 400 }
      );
    }
    const validation = validateLoginInput(body);

    if (!validation.success || !validation.data) {
      return NextResponse.json(
        { error: "সঠিক ইমেইল ও পাসওয়ার্ড দিন।" },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।" },
        { status: 401 }
      );
    }

    const passwordMatches = await compare(password, admin.passwordHash);

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।" },
        { status: 401 }
      );
    }

    await createSession({
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin login failed:", error);

    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।" },
      { status: 500 }
    );
  }
}
