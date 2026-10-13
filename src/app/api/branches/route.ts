import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { getAnalyzedStudents } from "@/lib/queries";
import { SEGMENT_META, RISK_META, COMPONENT_META, type ComponentKey } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export interface BranchSectionSummary {
  branchName: string;
  branchCode: string;
  totalStudents: number;
  avgScore: number;
  avgAttendance: number;
  avgCGPA: number;
  academicRiskCount: number;
  placementRiskCount: number;
  placementGapCount: number;
  sections: {
    section: "A" | "B";
    totalStudents: number;
    avgScore: number;
    avgAttendance: number;
    avgCGPA: number;
    academicRiskCount: number;
    placementRiskCount: number;
    placementGapCount: number;
    students: {
      id: number;
      studentCode: string;
      fullName: string;
      semester: number;
      section: string;
      cgpa: number | null;
      attendancePct: number | null;
      score: number | null;
      segment: string;
      academicRisk: string;
      placementRisk: string;
      mentor: string | null;
    }[];
  }[];
}

export async function GET(req: NextRequest) {
  try {
    const analyses = await getAnalyzedStudents();

    // Group by Department / Branch
    const branchMap = new Map<string, typeof analyses>();
    analyses.forEach((a) => {
      const dept = a.student.department;
      if (!branchMap.has(dept)) branchMap.set(dept, []);
      branchMap.get(dept)!.push(a);
    });

    const result: BranchSectionSummary[] = Array.from(branchMap.entries()).map(([deptName, list]) => {
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

    return NextResponse.json({ branches: result });
  } catch (e) {
    console.error("Failed to load branch details:", e);
    return NextResponse.json({ error: "Failed to load branch details" }, { status: 500 });
  }
}
