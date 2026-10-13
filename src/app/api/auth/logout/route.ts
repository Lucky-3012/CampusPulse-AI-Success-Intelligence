import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[auth/logout] Error:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Logout failed." }, { status: 500 });
  }
}
