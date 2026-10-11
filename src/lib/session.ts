
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export interface SessionPayload {
  adminId: string;
  email: string;
  name: string;
}

export const COOKIE_NAME = "admin_session";
const SESSION_DURATION = 24 * 60 * 60;

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET missing or too short in .env");
  }

  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    adminId: payload.adminId,
    email: payload.email,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .setSubject(payload.adminId)
    .sign(getSecretKey());
}

export async function decrypt(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.adminId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      payload.sub !== payload.adminId
    ) {
      return null;
    }

    return {
      adminId: payload.adminId,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

export async function createSession(
  payload: SessionPayload
): Promise<void> {
  const token = await encrypt(payload);
  const cookieStore = cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(Date.now() + SESSION_DURATION * 1000),
    path: "/",
  });
}

export async function verifySession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return decrypt(token);
}

export async function getSession(): Promise<SessionPayload | null> {
  return verifySession();
}

export async function deleteSession(): Promise<void> {
  cookies().delete(COOKIE_NAME);
}
