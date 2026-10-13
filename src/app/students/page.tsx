import { getAnalyzedStudents } from "@/lib/queries";
import { Explorer, type ExplorerRow } from "@/components/explorer";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const analyses = await getAnalyzedStudents();

  const rows: ExplorerRow[] = analyses.map((a) => ({
    code: a.student.studentCode,
    name: a.student.fullName,
    dept: a.student.department,
    deptShort: a.student.studentCode.slice(0, 3),
    semester: a.student.semester,
    section: a.student.section,
    mentor: a.student.mentor,
    score: a.score,
    completeness: a.completeness,
    provisional: a.provisional,
    segment: a.segment,
    band: a.band,
    academicRisk: a.academicRisk.level,
    placementRisk: a.placementRisk.level,
    trend: a.overallTrend,
    tag: a.student.showcaseTag,
    priorityScore: a.priorityScore,
    comps: [
      a.components.find((c) => c.key === "academic")?.value ?? null,
      a.components.find((c) => c.key === "attendance")?.value ?? null,
      a.components.find((c) => c.key === "lms")?.value ?? null,
      a.components.find((c) => c.key === "engagement")?.value ?? null,
      a.components.find((c) => c.key === "skills")?.value ?? null,
      a.components.find((c) => c.key === "placement")?.value ?? null,
    ],
  }));

  return (
    <div className="space-y-5">
      <div className="rise">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-500">Student Explorer</p>
        <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">All Students</h1>
        <p className="mt-1 text-[13px] text-slate-500">Search, filter and open any profile for the full explanation and recommended support.</p>
      </div>
      <Explorer rows={rows} />
    </div>
  );
}
