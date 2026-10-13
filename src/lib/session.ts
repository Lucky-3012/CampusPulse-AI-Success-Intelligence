/**
 * Server-side session helpers.
 * The cp_session cookie is HttpOnly, SameSite=Lax, Secure in production.
 * It stores only: { role, code, dept, section } — no PII, no secrets.
 */

import { cookies } from "next/headers";

export interface SessionPayload {
  role: "teacher" | "student";
  code?: string;   // student: studentCode; teacher: unused
  dept?: string;
  section?: string;
}

const COOKIE_NAME = "cp_session";
const IS_PROD = process.env.NODE_ENV === "production";
// 8-hour session
const MAX_AGE = 8 * 60 * 60;

function encode(payload: SessionPayload): string {
  // Use Buffer in Node.js API route runtime
  const json = JSON.stringify(payload);
  const b64  = Buffer.from(json).toString("base64");
  return encodeURIComponent(b64);
}

export async function setSession(payload: SessionPayload): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, encode(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PROD,
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const jar = await cookies();
    const raw = jar.get(COOKIE_NAME)?.value;
    if (!raw) return null;
    const decoded = Buffer.from(decodeURIComponent(raw), "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as SessionPayload;
    if (!parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}
