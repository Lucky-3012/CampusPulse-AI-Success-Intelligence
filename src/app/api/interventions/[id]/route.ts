import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { interventions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const VALID_STATUS  = new Set(["pending", "in_progress", "completed"]);
const VALID_OUTCOME = new Set(["improved", "stable", "needs_review"]);
const MAX_NOTES_LEN = 500;

function sanitizeText(s: unknown, maxLen: number): string | null {
  if (typeof s !== "string" || !s.trim()) return null;
  return s.replace(/[\x00-\x1F\x7F]/g, " ").trim().slice(0, maxLen);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    // Only teachers may update intervention status/outcome
    if (session.role !== "teacher") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const { id } = await params;
    const numId = Number(id);
    if (!Number.isFinite(numId) || numId <= 0) {
      return NextResponse.json({ error: "Invalid intervention ID." }, { status: 400 });
    }

    // Verify the intervention exists before patching (prevent IDOR)
    const existing = await db.select({ id: interventions.id }).from(interventions).where(eq(interventions.id, numId)).limit(1);
    if (!existing.length) return NextResponse.json({ error: "Intervention not found." }, { status: 404 });

    const body = await req.json();
    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (body.status !== undefined) {
      if (!VALID_STATUS.has(String(body.status))) {
        return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
      }
      patch.status = body.status;
    }
    if (body.outcome !== undefined) {
      if (body.outcome !== null && !VALID_OUTCOME.has(String(body.outcome))) {
        return NextResponse.json({ error: "Invalid outcome value." }, { status: 400 });
      }
      patch.outcome = body.outcome;
    }
    if (body.notes !== undefined) {
      patch.notes = sanitizeText(body.notes, MAX_NOTES_LEN);
    }

    const [updated] = await db.update(interventions).set(patch).where(eq(interventions.id, numId)).returning();
    if (!updated) return NextResponse.json({ error: "Update failed." }, { status: 500 });

    return NextResponse.json({ intervention: updated });
  } catch (e) {
    console.error("[interventions PATCH]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Failed to update intervention." }, { status: 500 });
  }
}
