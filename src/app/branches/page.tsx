import { getAnalyzedStudents } from "@/lib/queries";
import { BranchExplorer, type BranchData } from "@/components/branch-explorer";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const analyses = await getAnalyzedStudents();

  // Group by Department / Branch
  const branchMap = new Map<string, typeof analyses>();
  analyses.forEach((a) => {
    const dept = a.student.department;
    if (!branchMap.has(dept)) branchMap.set(dept, []);
    branchMap.get(dept)!.push(a);
  });

  const branches: BranchData[] = Array.from(branchMap.entries()).map(([deptName, list]) => {
    const branchCode = list[0]?.student.studentCode.slice(0, 3) || deptName.slice(0, 3).toUpperCase();

    const calcAverages = (items: typeof list) => {
      const scores = items.map((x) => x.score).filter((s): s is number => s != null);
      const attendances = items.map((x) => x.student.attendancePct).filter((at): at is number => at != null);
      const cgpas = items.map((x) => x.student.cgpa).filter((cg): cg is number => cg != null);

      return {
        avgScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
        avgAttendance: attendances.length ? Math.round((attendances.reduce((a, b) => a + b, 0) / attendances.length) * 10) / 10 : 0,
        avgCGPA: cgpas.length ? Math.round((cgpas.reduce((a, b) => a + b, 0) / cgpas.length) * 100) / 100 : 0,
        academicRiskCount: items.filter((x) => x.academicRisk.level === "high" || x.academicRisk.level === "medium").length,
        placementRiskCount: items.filter((x) => x.placementRisk.level === "high" || x.placementRisk.level === "medium").length,
        placementGapCount: items.filter((x) => x.segment === "placement-gap").length,
      };
    };

    const overall = calcAverages(list);
    const secAList = list.filter((x) => x.student.section === "A");
    const secBList = list.filter((x) => x.student.section === "B");

    const mapStudentItem = (x: (typeof list)[number]) => ({
      id: x.student.id,
      studentCode: x.student.studentCode,
      fullName: x.student.fullName,
      semester: x.student.semester,
      section: x.student.section,
      cgpa: x.student.cgpa,
      attendancePct: x.student.attendancePct,
      score: x.score,
      segment: x.segment,
      academicRisk: x.academicRisk.level,
      placementRisk: x.placementRisk.level,
      mentor: x.student.mentor,
    });

    return {
      branchName: deptName,
      branchCode,
      totalStudents: list.length,
      avgScore: overall.avgScore,
      avgAttendance: overall.avgAttendance,
      avgCGPA: overall.avgCGPA,
      academicRiskCount: overall.academicRiskCount,
      placementRiskCount: overall.placementRiskCount,
      placementGapCount: overall.placementGapCount,
      sections: [
        {
          section: "A",
          totalStudents: secAList.length,
          ...calcAverages(secAList),
          students: secAList.map(mapStudentItem).sort((a, b) => a.fullName.localeCompare(b.fullName)),
        },
        {
          section: "B",
          totalStudents: secBList.length,
          ...calcAverages(secBList),
          students: secBList.map(mapStudentItem).sort((a, b) => a.fullName.localeCompare(b.fullName)),
        },
      ],
    };
  });

  return (
    <div className="space-y-6">
      <BranchExplorer branches={branches} />
    </div>
  );
}
