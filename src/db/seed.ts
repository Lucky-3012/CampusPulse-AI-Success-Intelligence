import "dotenv/config";
import { db } from "./index";
import { students, interventions, type NewStudent } from "./schema";
import { analyzeStudent } from "@/lib/scoring";

/* ═══════════════════════════════════════════════════════════════════════════
   Synthetic data generator — 500 unified student profiles.
   Deterministic (seeded PRNG) so every demo run reproduces the same campus.
   Includes three GROUND-TRUTH validation profiles from the methodology:
     A — strong academics, weak placement readiness
     B — declining academics, low attendance, incomplete assignments
     C — consistently strong across every dimension
   ═══════════════════════════════════════════════════════════════════════════ */

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260214);
const ri = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const rf = (min: number, max: number, dec = 1) => Number((rand() * (max - min) + min).toFixed(dec));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;

const FIRST = [
  "Aarav", "Vivaan", "Aditya", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan", "Rohan", "Kabir",
  "Ananya", "Diya", "Aadhya", "Myra", "Sara", "Ira", "Prisha", "Anika", "Navya", "Kavya",
  "Rahul", "Sneha", "Vikram", "Tanvi", "Nikhil", "Priya", "Karan", "Ritika", "Manav", "Ishita",
  "Dev", "Meera", "Aryan", "Shreya", "Yash", "Pooja", "Harsh", "Lakshmi", "Siddharth", "Nisha",
  "Tejas", "Anu", "Farhan", "Gauri", "Zaid", "Harini", "Omkar", "Jhanvi", "Rudra", "Kriti",
];
const LAST = [
  "Sharma", "Patel", "Nair", "Iyer", "Reddy", "Khan", "Mehta", "Gupta", "Singh", "Das",
  "Kulkarni", "Menon", "Chopra", "Rao", "Pillai", "Verma", "Joshi", "Chauhan", "Bose", "Dutta",
  "Malhotra", "Shetty", "Agarwal", "Banerjee", "Krishnan", "Saxena", "Pawar", "Qureshi",
];
const MENTORS = [
  "Dr. Kavitha Rao", "Prof. Arun Menon", "Dr. Sunita Deshmukh", "Prof. Rakesh Iyer",
  "Dr. Neha Kulkarni", "Prof. Imran Sheikh", "Dr. Aparna Pillai", "Prof. Vivek Chauhan",
  "Dr. Radhika Bose", "Prof. Sandeep Verma",
];
const DEPTS: { code: string; name: string; seats: number }[] = [
  { code: "CSE", name: "Computer Science & Engineering", seats: 120 },
  { code: "ISE", name: "Information Science & Engineering", seats: 90 },
  { code: "ECE", name: "Electronics & Communication", seats: 90 },
  { code: "EEE", name: "Electrical & Electronics", seats: 70 },
  { code: "MEC", name: "Mechanical Engineering", seats: 70 },
  { code: "CIV", name: "Civil Engineering", seats: 60 },
];

type Archetype = "high" | "steady" | "placement-weak" | "academic-risk" | "attendance" | "disengaged";

const ARCHETYPE_PICKS: { key: Archetype; p: number }[] = [
  { key: "steady", p: 0.47 },
  { key: "high", p: 0.15 },
  { key: "placement-weak", p: 0.12 },
  { key: "academic-risk", p: 0.1 },
  { key: "disengaged", p: 0.08 },
  { key: "attendance", p: 0.08 },
];

function drawArchetype(): Archetype {
  const x = rand();
  let acc = 0;
  for (const it of ARCHETYPE_PICKS) { acc += it.p; if (x < acc) return it.key; }
  return "steady";
}

interface Metrics {
  cgpa: number; prevCgpa: number; avgMarks: number; backlogs: number;
  attendancePct: number; prevAttendancePct: number;
  lmsLogins: number; assignmentCompletionPct: number;
  eventsCount: number; projectsCount: number; certificationsCount: number;
  technicalScore: number; softSkillScore: number;
  aptitudeScore: number; codingScore: number; mockInterviewScore: number;
}

function metricsFor(a: Archetype): Metrics {
  switch (a) {
    case "high": {
      const cgpa = rf(8.4, 9.7, 2);
      return {
        cgpa, prevCgpa: rf(Math.max(7.5, cgpa - 0.4), Math.min(10, cgpa + 0.2), 2),
        avgMarks: rf(82, 96), backlogs: 0,
        attendancePct: rf(85, 97), prevAttendancePct: rf(84, 96),
        lmsLogins: ri(55, 110), assignmentCompletionPct: rf(88, 100),
        eventsCount: ri(2, 5), projectsCount: ri(2, 4), certificationsCount: ri(1, 4),
        technicalScore: rf(80, 96), softSkillScore: rf(76, 95),
        aptitudeScore: rf(70, 95), codingScore: rf(72, 96), mockInterviewScore: rf(70, 92),
      };
    }
    case "placement-weak":
      return {
        cgpa: rf(7.4, 9.0, 2), prevCgpa: rf(7.2, 9.0, 2),
        avgMarks: rf(70, 88), backlogs: 0,
        attendancePct: rf(78, 95), prevAttendancePct: rf(76, 93),
        lmsLogins: ri(40, 90), assignmentCompletionPct: rf(75, 98),
        eventsCount: ri(1, 4), projectsCount: ri(1, 3), certificationsCount: ri(0, 2),
        technicalScore: rf(60, 88), softSkillScore: rf(55, 80),
        aptitudeScore: rf(25, 55), codingScore: rf(22, 58), mockInterviewScore: rf(30, 58),
      };
    case "academic-risk": {
      const cgpa = rf(4.4, 6.3, 2);
      return {
        cgpa, prevCgpa: rf(Math.min(7.4, cgpa + 0.5), 7.4, 2),
        avgMarks: rf(38, 58), backlogs: ri(1, 4),
        attendancePct: rf(48, 74), prevAttendancePct: rf(58, 82),
        lmsLogins: ri(3, 30), assignmentCompletionPct: rf(25, 60),
        eventsCount: ri(0, 1), projectsCount: ri(0, 1), certificationsCount: 0,
        technicalScore: rf(35, 60), softSkillScore: rf(45, 65),
        aptitudeScore: rf(30, 60), codingScore: rf(25, 55), mockInterviewScore: rf(30, 55),
      };
    }
    case "attendance":
      return {
        cgpa: rf(6.8, 8.0, 2), prevCgpa: rf(6.8, 8.2, 2),
        avgMarks: rf(60, 80), backlogs: 0,
        attendancePct: rf(56, 72), prevAttendancePct: rf(72, 88),
        lmsLogins: ri(20, 60), assignmentCompletionPct: rf(55, 85),
        eventsCount: ri(1, 3), projectsCount: ri(0, 2), certificationsCount: ri(0, 2),
        technicalScore: rf(55, 78), softSkillScore: rf(58, 80),
        aptitudeScore: rf(45, 75), codingScore: rf(45, 72), mockInterviewScore: rf(48, 75),
      };
    case "disengaged":
      return {
        cgpa: rf(6.8, 8.3, 2), prevCgpa: rf(6.6, 8.4, 2),
        avgMarks: rf(62, 84), backlogs: 0,
        attendancePct: rf(70, 90), prevAttendancePct: rf(70, 90),
        lmsLogins: ri(2, 15), assignmentCompletionPct: rf(20, 48),
        eventsCount: 0, projectsCount: 0, certificationsCount: 0,
        technicalScore: rf(55, 80), softSkillScore: rf(55, 78),
        aptitudeScore: rf(50, 75), codingScore: rf(45, 75), mockInterviewScore: rf(48, 72),
      };
    default:
      return { // steady
        cgpa: rf(6.6, 8.2, 2), prevCgpa: rf(6.4, 8.2, 2),
        avgMarks: rf(62, 82), backlogs: chance(0.1) ? 1 : 0,
        attendancePct: rf(72, 88), prevAttendancePct: rf(70, 88),
        lmsLogins: ri(25, 70), assignmentCompletionPct: rf(60, 90),
        eventsCount: ri(0, 3), projectsCount: ri(0, 2), certificationsCount: ri(0, 2),
        technicalScore: rf(58, 80), softSkillScore: rf(60, 82),
        aptitudeScore: rf(55, 80), codingScore: rf(50, 78), mockInterviewScore: rf(55, 78),
      };
  }
}

function semesterMeta() {
  const semester = ri(1, 8);
  const admissionYear = 2026 - Math.ceil(semester / 2); // sem 1-2 → 2025, 3-4 → 2024 …
  return { semester, admissionYear, section: pick(["A", "B"]) };
}

function buildShowcase(): NewStudent[] {
  const now = new Date();
  return [
    {
      studentCode: "CSE24A007", fullName: "Aarav Deshmukh", email: "aarav.deshmukh@campuspulse.edu",
      department: "Computer Science & Engineering", semester: 4, section: "A", admissionYear: 2024, mentor: "Dr. Kavitha Rao",
      cgpa: 8.68, prevCgpa: 8.51, avgMarks: 84.5, backlogs: 0,
      attendancePct: 88.4, prevAttendancePct: 87.2,
      lmsLogins: 74, assignmentCompletionPct: 92,
      eventsCount: 3, projectsCount: 3, certificationsCount: 2,
      technicalScore: 84, softSkillScore: 76,
      aptitudeScore: 41, codingScore: 38, mockInterviewScore: 46,
      showcaseTag: "A", syncedAt: now,
    },
    {
      studentCode: "ECE25B021", fullName: "Diya Nair", email: "diya.nair@campuspulse.edu",
      department: "Electronics & Communication", semester: 2, section: "B", admissionYear: 2025, mentor: "Prof. Arun Menon",
      cgpa: 5.42, prevCgpa: 6.31, avgMarks: 52.4, backlogs: 2,
      attendancePct: 57.6, prevAttendancePct: 76.1,
      lmsLogins: 9, assignmentCompletionPct: 38,
      eventsCount: 0, projectsCount: 0, certificationsCount: 0,
      technicalScore: 48, softSkillScore: 55,
      aptitudeScore: 45, codingScore: 40, mockInterviewScore: 50,
      showcaseTag: "B", syncedAt: now,
    },
    {
      studentCode: "CSE23A003", fullName: "Meera Krishnan", email: "meera.krishnan@campuspulse.edu",
      department: "Computer Science & Engineering", semester: 6, section: "A", admissionYear: 2023, mentor: "Dr. Neha Kulkarni",
      cgpa: 9.12, prevCgpa: 9.04, avgMarks: 90.2, backlogs: 0,
      attendancePct: 94.1, prevAttendancePct: 93.5,
      lmsLogins: 96, assignmentCompletionPct: 97,
      eventsCount: 4, projectsCount: 3, certificationsCount: 3,
      technicalScore: 90, softSkillScore: 88,
      aptitudeScore: 80, codingScore: 86, mockInterviewScore: 82,
      showcaseTag: "C", syncedAt: now,
    },
  ];
}

async function main() {
  console.log("→ Clearing existing rows…");
  await db.delete(interventions);
  await db.delete(students);

  const rows: NewStudent[] = [...buildShowcase()];
  const now = Date.now();

  for (const dept of DEPTS) {
    const from = dept.code === "CSE" ? 3 : 1; // showcase already used CSE 24A/23A slots conceptually
    for (let i = from; i <= dept.seats; i++) {
      const meta = semesterMeta();
      const roll = i.toString().padStart(3, "0");
      const archetype = drawArchetype();
      const m = metricsFor(archetype);
      const first = pick(FIRST);
      const last = pick(LAST);

      // Missing-data injection — the ingestion layer must mark these unknown,
      // never zero. Placement data is the most commonly delayed source.
      // A small cohort of "transfer students" has only their transcript linked
      // so far — every other source is pending, which produces provisional
      // (<55% completeness) assessments and the Insufficient Data segment.
      const transferPending = chance(0.05);
      const missingPlacement = transferPending || chance(0.16);
      const missingSkills = transferPending || (!missingPlacement && chance(0.07));
      const missingLms = transferPending || chance(0.05);
      const missingEngagement = transferPending;
      const missingAttendance = transferPending;

      const syncedAt = new Date(now - ri(15, 240) * 60_000);

      rows.push({
        studentCode: `${dept.code}${String(meta.admissionYear).slice(2)}${meta.section}${roll}`,
        fullName: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${roll}@campuspulse.edu`,
        department: dept.name,
        semester: meta.semester,
        section: meta.section,
        admissionYear: meta.admissionYear,
        mentor: pick(MENTORS),
        cgpa: m.cgpa,
        prevCgpa: m.prevCgpa,
        avgMarks: m.avgMarks,
        backlogs: m.backlogs,
        attendancePct: missingAttendance ? null : m.attendancePct,
        prevAttendancePct: missingAttendance ? null : m.prevAttendancePct,
        lmsLogins: missingLms ? null : m.lmsLogins,
        assignmentCompletionPct: missingLms ? null : m.assignmentCompletionPct,
        eventsCount: missingEngagement ? null : m.eventsCount,
        projectsCount: missingEngagement ? null : m.projectsCount,
        certificationsCount: missingEngagement ? null : m.certificationsCount,
        technicalScore: missingSkills ? null : m.technicalScore,
        softSkillScore: missingSkills ? null : m.softSkillScore,
        aptitudeScore: missingPlacement ? null : m.aptitudeScore,
        codingScore: missingPlacement ? null : m.codingScore,
        mockInterviewScore: missingPlacement ? null : m.mockInterviewScore,
        syncedAt,
      });
    }
  }

  console.log(`→ Inserting ${rows.length} unified student profiles…`);
  const inserted: { id: number; code: string }[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const res = await db.insert(students).values(chunk).returning({ id: students.id, code: students.studentCode });
    inserted.push(...res);
  }

  // Seed a believable intervention backlog using the REAL scoring engine,
  // so the workflow demo is consistent with the analytics.
  const insertedRows = await db.select().from(students);
  const analyses = insertedRows.map((r) => ({ row: r, a: analyzeStudent(r) }));
  const byCode = (code: string) => analyses.find((x) => x.row.studentCode === code);
  const highRisk = analyses.filter((x) => x.a.academicRisk.level === "high" && x.row.showcaseTag !== "B").slice(0, 4);
  const placementGap = analyses.filter((x) => x.a.segment === "placement-gap").slice(0, 2);
  const attendanceConcern = analyses.filter((x) => x.a.segment === "attendance-concern").slice(0, 1);
  const strongPick = analyses.find((x) => x.a.segment === "strong" && x.row.showcaseTag !== "C");

  const diya = byCode("ECE25B021")!;
  const day = 24 * 60 * 60 * 1000;
  const seeds = [
    { student: diya.row, actionKey: "backlog-plan", status: "pending", outcome: null, assignedBy: "Prof. Arun Menon", notes: "Backlog subjects mapped — supplementary exam registration due Friday.", dCreated: 2, dUpdated: 0 },
    { student: diya.row, actionKey: "attendance-checkin", status: "in_progress", outcome: null, assignedBy: "Prof. Arun Menon", notes: "First check-in done; student cited commute issues. Exploring hostel slot.", dCreated: 6, dUpdated: 1 },
    { student: diya.row, actionKey: "learning-plan", status: "completed", outcome: "improved", assignedBy: "Dr. Sunita Deshmukh", notes: "Assignment completion moved 22% → 38% in three weeks. Keep monitoring.", dCreated: 21, dUpdated: 3 },
    ...(highRisk[0] ? [{ student: highRisk[0].row, actionKey: "mentor-1on1", status: "pending", outcome: null, assignedBy: pick(MENTORS), notes: null, dCreated: 1, dUpdated: 0 }] : []),
    ...(highRisk[1] ? [{ student: highRisk[1].row, actionKey: "subject-tutoring", status: "in_progress", outcome: null, assignedBy: pick(MENTORS), notes: "Paired with peer tutor for Engineering Mathematics II.", dCreated: 9, dUpdated: 2 }] : []),
    ...(highRisk[2] ? [{ student: highRisk[2].row, actionKey: "backlog-plan", status: "in_progress", outcome: null, assignedBy: pick(MENTORS), notes: null, dCreated: 12, dUpdated: 4 }] : []),
    ...(highRisk[3] ? [{ student: highRisk[3].row, actionKey: "mentor-1on1", status: "completed", outcome: "stable", assignedBy: pick(MENTORS), notes: "Mentoring cycle complete. Marks steady, attendance needs watching.", dCreated: 30, dUpdated: 5 }] : []),
    ...(placementGap[0] ? [{ student: placementGap[0].row, actionKey: "coding-roadmap", status: "in_progress", outcome: null, assignedBy: "Dr. Kavitha Rao", notes: "Week 3 of 8: arrays + strings module passed, graphs next.", dCreated: 15, dUpdated: 2 }] : []),
    ...(placementGap[1] ? [{ student: placementGap[1].row, actionKey: "aptitude-drill", status: "completed", outcome: "stable", assignedBy: "Dr. Kavitha Rao", notes: "Aptitude re-test +9 pts. Re-test coding next month.", dCreated: 35, dUpdated: 8 }] : []),
    ...(attendanceConcern[0] ? [{ student: attendanceConcern[0].row, actionKey: "attendance-plan", status: "pending", outcome: null, assignedBy: pick(MENTORS), notes: null, dCreated: 1, dUpdated: 0 }] : []),
    ...(strongPick ? [{ student: strongPick.row, actionKey: "internship-fasttrack", status: "completed", outcome: "improved", assignedBy: "Dr. Kavitha Rao", notes: "Shortlisted for summer internship cohort.", dCreated: 40, dUpdated: 10 }] : []),
  ];

  const actionMeta: Record<string, { title: string; category: string; detail: string; priority: string }> = {
    "mentor-1on1": { title: "Faculty Mentoring Session", category: "Mentoring", detail: "Weekly 1:1 with the course mentor to diagnose blockers and agree a CGPA recovery plan.", priority: "high" },
    "subject-tutoring": { title: "Subject Peer Tutoring", category: "Academic", detail: "Pair with a high-performing peer tutor for weak subjects; focus on fundamentals.", priority: "high" },
    "backlog-plan": { title: "Backlog Clearance Plan", category: "Academic", detail: "Structured study plan for supplementary exams with weekly progress checkpoints.", priority: "high" },
    "attendance-checkin": { title: "Wellness & Attendance Check-in", category: "Wellbeing", detail: "Confidential advisor conversation to identify barriers affecting attendance.", priority: "high" },
    "attendance-plan": { title: "Attendance Improvement Plan", category: "Attendance", detail: "Daily attendance monitoring with a parent/guardian communication loop.", priority: "medium" },
    "aptitude-drill": { title: "Aptitude Practice Program", category: "Placement", detail: "Daily quantitative and logical-reasoning drills via the placement portal.", priority: "medium" },
    "coding-roadmap": { title: "Coding Bootcamp Roadmap", category: "Placement", detail: "8-week structured DSA and problem-solving track with weekly assessments.", priority: "high" },
    "learning-plan": { title: "Structured Learning Plan", category: "Engagement", detail: "Assignment calendar with milestones, nudges and weekly LMS goals.", priority: "medium" },
    "internship-fasttrack": { title: "Internship Fast-Track Nomination", category: "Growth", detail: "Prioritize for the company internship pipeline and hackathon teams.", priority: "low" },
  };

  for (const s of seeds) {
    const meta = actionMeta[s.actionKey];
    await db.insert(interventions).values({
      studentId: s.student.id,
      actionKey: s.actionKey,
      title: meta.title,
      category: meta.category,
      detail: meta.detail,
      priority: meta.priority,
      status: s.status,
      outcome: s.outcome,
      notes: s.notes,
      assignedBy: s.assignedBy,
      createdAt: new Date(now - s.dCreated * day),
      updatedAt: new Date(now - s.dUpdated * day - 3_600_000),
    });
  }

  // Summary for the console — doubles as a quick validation print.
  const seg: Record<string, number> = {};
  let missingPlacement = 0;
  for (const { row, a } of analyses) {
    seg[a.segment] = (seg[a.segment] ?? 0) + 1;
    if (row.aptitudeScore == null) missingPlacement++;
  }
  console.log("✔ Students:", analyses.length, "| interventions:", seeds.length);
  console.log("✔ Segment distribution:", seg);
  console.log("✔ Missing placement source:", missingPlacement, "students (handled as unknown, not zero)");
  for (const code of ["CSE24A007", "ECE25B021", "CSE23A003"]) {
    const x = byCode(code)!;
    console.log(`✔ Profile ${x.row.showcaseTag} (${x.a.student.fullName}) → score ${x.a.score}, segment ${x.a.segment}, A-risk ${x.a.academicRisk.level}, P-risk ${x.a.placementRisk.level}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
