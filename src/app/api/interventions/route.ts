import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { interventions, students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ACTION_LIBRARY } from "@/lib/scoring";
import { getInterventionsFeed } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_NOTES_LEN    = 500;
const MAX_ASSIGNED_LEN = 80;
const VALID_STATUS     = new Set(["pending", "in_progress", "completed"]);
const VALID_PRIORITY   = new Set(["low", "medium", "high"]);

// Sanitize free-text fields — strip control characters
function sanitizeText(s: unknown, maxLen: number): string | null {
  if (typeof s !== "string" || !s.trim()) return null;
  return s.replace(/[\x00-\x1F\x7F]/g, " ").trim().slice(0, maxLen);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (session.role !== "teacher") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const statusFilter = req.nextUrl.searchParams.get("status");
    let feed = await getInterventionsFeed();

    // Safe whitelist filter
    if (statusFilter && VALID_STATUS.has(statusFilter)) {
      feed = feed.filter((f) => f.status === statusFilter);
    }

    return NextResponse.json({ count: feed.length, interventions: feed });
  } catch (e) {
    console.error("[interventions GET]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Failed to load interventions." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    // Both teachers and students (sending guidance requests) may POST
    // But students may only create interventions for themselves
    const body = await req.json();

    const studentId = Number(body.studentId);
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return NextResponse.json({ error: "Invalid studentId." }, { status: 400 });
    }

    // If student session, verify they can only create for themselves
    if (session.role === "student" && session.code) {
      const own = await db.select({ id: students.id, code: students.studentCode })
        .from(students).where(eq(students.id, studentId)).limit(1);
      if (!own.length || own[0].code !== session.code) {
        return NextResponse.json({ error: "Students may only create interventions for themselves." }, { status: 403 });
      }
    }

    const actionKey = sanitizeText(body.actionKey, 40);
    if (!actionKey) return NextResponse.json({ error: "actionKey is required." }, { status: 400 });

    const studentRec = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!studentRec.length) return NextResponse.json({ error: "Student not found." }, { status: 404 });

    const tpl = ACTION_LIBRARY.find((a) => a.key === actionKey);
    if (!tpl) return NextResponse.json({ error: "Unknown action key." }, { status: 400 });

    const rawPriority = String(body.priority ?? "").trim();
    const priority = VALID_PRIORITY.has(rawPriority) ? rawPriority : tpl.priority;

    const assignedBy = sanitizeText(body.assignedBy, MAX_ASSIGNED_LEN) ?? "Faculty Advisor";
    const notes      = sanitizeText(body.notes, MAX_NOTES_LEN);

    const [created] = await db.insert(interventions).values({
      studentId,
      actionKey: tpl.key,
      title:     tpl.title,
      category:  tpl.category,
      detail:    tpl.detail,
      priority,
      status:    "pending",
      assignedBy,
      notes,
    }).returning();

    return NextResponse.json({ intervention: created }, { status: 201 });
  } catch (e) {
    console.error("[interventions POST]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Failed to create intervention." }, { status: 500 });
  }
}
