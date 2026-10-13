import { db } from "@/db";
import { students, interventions, type StudentRow } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { analyzeRows, type AnalyzedStudent } from "@/lib/scoring";

/** Fetch every unified student record and compute the transparent analysis. */
export async function getAnalyzedStudents(): Promise<AnalyzedStudent[]> {
  const rows: StudentRow[] = await db.select().from(students);
  return analyzeRows(rows).sort((a, b) => a.student.studentCode.localeCompare(b.student.studentCode));
}

export async function getStudentByCode(code: string): Promise<AnalyzedStudent | null> {
  const rows = await db.select().from(students).where(eq(students.studentCode, code)).limit(1);
  if (rows.length === 0) return null;
  return analyzeRows(rows)[0];
}

export async function getStudentInterventions(studentId: number) {
  return db.select().from(interventions).where(eq(interventions.studentId, studentId)).orderBy(desc(interventions.updatedAt));
}

export interface InterventionWithStudent {
  id: number;
  studentId: number;
  actionKey: string;
  title: string;
  category: string;
  detail: string | null;
  priority: string;
  status: string;
  outcome: string | null;
  notes: string | null;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
  studentName: string;
  studentCode: string;
  department: string;
  semester: number;
  segment: string;
  academicRiskLevel: string;
  score: number | null;
}

export async function getInterventionsFeed(): Promise<InterventionWithStudent[]> {
  const rows = await db
    .select({ i: interventions, s: students })
    .from(interventions)
    .innerJoin(students, eq(interventions.studentId, students.id))
    .orderBy(desc(interventions.updatedAt));

  return rows.map(({ i, s }) => {
    const analysis = analyzeRows([s])[0];
    return {
      id: i.id,
      studentId: i.studentId,
      actionKey: i.actionKey,
      title: i.title,
      category: i.category,
      detail: i.detail,
      priority: i.priority,
      status: i.status,
      outcome: i.outcome,
      notes: i.notes,
      assignedBy: i.assignedBy,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
      studentName: s.fullName,
      studentCode: s.studentCode,
      department: s.department,
      semester: s.semester,
      segment: analysis.segment,
      academicRiskLevel: analysis.academicRisk.level,
      score: analysis.score,
    };
  });
}

/** Latest warehouse sync timestamp across student records. */
export async function getLastSync(): Promise<Date | null> {
  const rows = await db.select({ max: sql<Date>`max(${students.syncedAt})` }).from(students);
  const raw = rows[0]?.max as unknown as Date | string | null | undefined;
  if (!raw) return null;
  return raw instanceof Date ? raw : new Date(raw);
}
