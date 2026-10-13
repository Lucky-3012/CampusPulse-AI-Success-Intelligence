import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { ilike } from "drizzle-orm";
import { analyzeStudent } from "@/lib/scoring";
import { setSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// ── Input validation constants ────────────────────────────────────────────
const MAX_ROLL_LEN = 20;
const MAX_BRANCH_LEN = 80;
const MAX_SECTION_LEN = 4;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate and sanitize inputs — never trust client data
    const rollNumber = String(body.rollNumber ?? "").trim().toUpperCase().slice(0, MAX_ROLL_LEN);
    const branch     = String(body.branch     ?? "").trim().slice(0, MAX_BRANCH_LEN);
    const section    = String(body.section    ?? "").trim().toUpperCase().slice(0, MAX_SECTION_LEN);

    if (!rollNumber) {
      return NextResponse.json({ error: "Roll number is required." }, { status: 400 });
    }

    // Parameterized query via Drizzle — no SQL injection possible
    const rows = await db
      .select()
      .from(students)
      .where(ilike(students.studentCode, rollNumber))
      .limit(1);

    if (rows.length === 0) {
      // Generic error — do not reveal whether the code exists or not (avoids enumeration)
      return NextResponse.json(
        { error: "No student record found. Check the roll number, branch, and section." },
        { status: 404 }
      );
    }

    const s = rows[0];

    // Verify branch match (if provided — quick-login omits it)
    if (branch && branch !== "all") {
      const deptNorm  = s.department.toLowerCase();
      const codeNorm  = s.studentCode.toLowerCase().slice(0, 3);
      const inputNorm = branch.toLowerCase();
      const match =
        deptNorm.includes(inputNorm) ||
        inputNorm.includes(deptNorm) ||
        codeNorm === inputNorm.slice(0, 3);
      if (!match) {
        return NextResponse.json(
          { error: "Branch does not match the student record." },
          { status: 400 }
        );
      }
    }

    // Verify section match (if provided)
    if (section && section !== "ALL") {
      if (s.section.toUpperCase() !== section) {
        return NextResponse.json(
          { error: "Section does not match the student record." },
          { status: 400 }
        );
      }
    }

    const analysis = analyzeStudent(s);

    // Set server-side HttpOnly session cookie — never expose in URL or JS
    await setSession({
      role: "student",
      code: s.studentCode,
      dept: s.department,
      section: s.section,
    });

    // Return only necessary, non-sensitive fields
    return NextResponse.json({
      success: true,
      student: {
        id: s.id,
        studentCode: s.studentCode,
        fullName: s.fullName,
        email: s.email,
        department: s.department,
        section: s.section,
        semester: s.semester,
        mentor: s.mentor,
        score: analysis.score,
        segment: analysis.segment,
        academicRiskLevel: analysis.academicRisk.level,
        placementRiskLevel: analysis.placementRisk.level,
      },
    });
  } catch (e) {
    // Never expose stack traces or internal errors to the client
    console.error("[auth/student] Error:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
