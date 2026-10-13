import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";

/**
 * CampusPulse AI — Unified Student Data Hub schema.
 *
 * One table = one unified student profile assembled from six campus sources
 * (Academic, Attendance, LMS, Engagement, Skills, Placement) matched by
 * student_code. Indicators are NULLABLE on purpose: missing source data must
 * be surfaced as "unknown", never silently treated as zero performance.
 */
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentCode: text("student_code").notNull().unique(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  department: text("department").notNull(),
  semester: integer("semester").notNull(),
  section: text("section").notNull().default("A"),
  admissionYear: integer("admission_year"),
  mentor: text("mentor"),

  // ── Academic source (CGPA, marks, backlog burden) ────────────────────────
  cgpa: real("cgpa"),
  prevCgpa: real("prev_cgpa"),
  avgMarks: real("avg_marks"),
  backlogs: integer("backlogs"),

  // ── Attendance source ─────────────────────────────────────────────────────
  attendancePct: real("attendance_pct"),
  prevAttendancePct: real("prev_attendance_pct"),

  // ── LMS source (logins, assignment completion) ────────────────────────────
  lmsLogins: integer("lms_logins"),
  assignmentCompletionPct: real("assignment_completion_pct"),

  // ── Engagement source (events, projects, certifications) ──────────────────
  eventsCount: integer("events_count"),
  projectsCount: integer("projects_count"),
  certificationsCount: integer("certifications_count"),

  // ── Skills source (technical + soft-skill assessments) ────────────────────
  technicalScore: real("technical_score"),
  softSkillScore: real("soft_skill_score"),

  // ── Placement source (aptitude, coding, mock interviews) ──────────────────
  aptitudeScore: real("aptitude_score"),
  codingScore: real("coding_score"),
  mockInterviewScore: real("mock_interview_score"),

  // Ground-truth tag used to inject validation profiles ('A' | 'B' | 'C')
  showcaseTag: text("showcase_tag"),

  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

/**
 * Intervention & Outcome Tracking module — faculty assign support actions,
 * move them through a workflow and record whether indicators improved.
 */
export const interventions = pgTable("interventions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  actionKey: text("action_key").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  detail: text("detail"),
  priority: text("priority").notNull().default("medium"), // high | medium | low
  status: text("status").notNull().default("pending"), // pending | in_progress | completed
  outcome: text("outcome"), // improved | stable | needs_review
  notes: text("notes"),
  assignedBy: text("assigned_by").notNull().default("Faculty Advisor"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Custom branches and sections — faculty can add new departments and
 * class sections from the Branch & Section Hub. These are merged with
 * auto-detected branches from student data.
 */
export const customBranches = pgTable("custom_branches", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customSections = pgTable("custom_sections", {
  id: serial("id").primaryKey(),
  branchCode: text("branch_code").notNull(),
  sectionName: text("section_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StudentRow = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type InterventionRow = typeof interventions.$inferSelect;
export type NewIntervention = typeof interventions.$inferInsert;
export type CustomBranchRow = typeof customBranches.$inferSelect;
export type CustomSectionRow = typeof customSections.$inferSelect;
