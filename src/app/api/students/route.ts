import { NextRequest, NextResponse } from "next/server";
import { getAnalyzedStudents } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Unified student list with computed analytics.
 * Query params: search, dept, sem, segment, arisk, prisk, band
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const search = (sp.get("search") ?? "").trim().toLowerCase();
    const dept = sp.get("dept");
    const sem = sp.get("sem");
    const segment = sp.get("segment");
    const arisk = sp.get("arisk");
    const prisk = sp.get("prisk");
    const band = sp.get("band");

    let data = await getAnalyzedStudents();
    if (search) data = data.filter((a) => a.student.fullName.toLowerCase().includes(search) || a.student.studentCode.toLowerCase().includes(search));
    if (dept && dept !== "all") data = data.filter((a) => a.student.department === dept);
    if (sem && sem !== "all") data = data.filter((a) => a.student.semester === Number(sem));
    if (segment && segment !== "all") data = data.filter((a) => a.segment === segment);
    if (arisk && arisk !== "all") data = data.filter((a) => a.academicRisk.level === arisk);
    if (prisk && prisk !== "all") data = data.filter((a) => a.placementRisk.level === prisk);
    if (band && band !== "all") data = data.filter((a) => a.band === band);

    return NextResponse.json({
      count: data.length,
      students: data.map((a) => ({
        code: a.student.studentCode,
        name: a.student.fullName,
        department: a.student.department,
        semester: a.student.semester,
        score: a.score,
        completeness: a.completeness,
        band: a.band,
        segment: a.segment,
        academicRisk: a.academicRisk.level,
        placementRisk: a.placementRisk.level,
        trend: a.overallTrend,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load students" }, { status: 500 });
  }
}
