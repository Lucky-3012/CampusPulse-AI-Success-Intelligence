import type { StudentRow } from "@/db/schema";

/* ═══════════════════════════════════════════════════════════════════════════
   Student Success Score — transparent scoring hypothesis (prototype V1)
   ───────────────────────────────────────────────────────────────────────────
   S = 0.35·A + 0.20·T + 0.15·L + 0.10·E + 0.10·K + 0.10·P
   Every component is normalized to 0–100 (higher = better).
   Missing indicators are EXCLUDED and remaining weights renormalized to 1.0 —
   we never treat "unknown" as "zero". A completeness % is always reported.
   Academic risk and placement-readiness risk are assessed SEPARATELY so a
   strong composite score can never conceal a critical weakness.
   ═══════════════════════════════════════════════════════════════════════════ */

export const WEIGHTS = {
  academic: 0.35,
  attendance: 0.2,
  lms: 0.15,
  engagement: 0.1,
  skills: 0.1,
  placement: 0.1,
} as const;

export type ComponentKey = keyof typeof WEIGHTS;

export const COMPONENT_META: Record<ComponentKey, { label: string; short: string; color: string; source: string }> = {
  academic: { label: "Academic Performance", short: "Academic", color: "#7C93FF", source: "Examinations Cell" },
  attendance: { label: "Attendance", short: "Attend.", color: "#34D399", source: "Attendance ERP" },
  lms: { label: "LMS Engagement", short: "LMS", color: "#22D3EE", source: "Learning Mgmt System" },
  engagement: { label: "Co-curricular", short: "Engage.", color: "#FB923C", source: "Clubs & Activities" },
  skills: { label: "Skills", short: "Skills", color: "#A78BFA", source: "Skill Assessments" },
  placement: { label: "Placement Readiness", short: "Placement", color: "#F472B6", source: "Placement Cell" },
};

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

export interface ComponentBreakdown {
  key: ComponentKey;
  label: string;
  short: string;
  weight: number;          // documented weight (0–1)
  value: number | null;    // normalized 0–100, null when source missing
  available: boolean;
  contribution: number;    // points contributed to the final score after renorm
  signals: string[];       // human-readable drivers (explainability)
  trend: "improving" | "stable" | "declining" | "unknown";
  delta: number | null;    // change vs previous assessment window (points)
  color: string;
}

/* ── Component normalizers ───────────────────────────────────────────────── */

function academicComponent(s: StudentRow): Omit<ComponentBreakdown, "contribution" | "weight"> {
  const meta = COMPONENT_META.academic;
  const signals: string[] = [];
  if (s.cgpa == null && s.avgMarks == null) {
    return { key: "academic", label: meta.label, short: meta.short, value: null, available: false, signals: ["No examination records ingested"], trend: "unknown", delta: null, color: meta.color };
  }
  let base = 0;
  let parts = 0;
  if (s.cgpa != null) {
    base += (clamp(s.cgpa, 0, 10) / 10) * 100 * 0.6;
    parts += 0.6;
    signals.push(`CGPA ${s.cgpa.toFixed(2)} / 10`);
  }
  if (s.avgMarks != null) {
    base += clamp(s.avgMarks) * 0.4;
    parts += 0.4;
    signals.push(`Aggregate marks ${s.avgMarks.toFixed(1)}%`);
  }
  let value = (base / parts);
  const backlogPenalty = Math.min((s.backlogs ?? 0) * 8, 32);
  if (backlogPenalty > 0) {
    value -= backlogPenalty;
    signals.push(`${s.backlogs} active backlog${(s.backlogs ?? 0) > 1 ? "s" : ""} (−${backlogPenalty} pts)`);
  } else {
    signals.push("No active backlogs");
  }
  value = clamp(value);

  let trend: ComponentBreakdown["trend"] = "unknown";
  let delta: number | null = null;
  if (s.cgpa != null && s.prevCgpa != null) {
    delta = r1((s.cgpa - s.prevCgpa) * 10);
    trend = delta >= 2 ? "improving" : delta <= -2 ? "declining" : "stable";
    if (trend === "declining") signals.push(`CGPA declined ${Math.abs(s.cgpa - s.prevCgpa).toFixed(2)} since last assessment`);
  }
  return { key: "academic", label: meta.label, short: meta.short, value: r1(value), available: true, signals, trend, delta, color: meta.color };
}

function attendanceComponent(s: StudentRow): Omit<ComponentBreakdown, "contribution" | "weight"> {
  const meta = COMPONENT_META.attendance;
  const signals: string[] = [];
  if (s.attendancePct == null) {
    return { key: "attendance", label: meta.label, short: meta.short, value: null, available: false, signals: ["No attendance records ingested"], trend: "unknown", delta: null, color: meta.color };
  }
  signals.push(`Current attendance ${s.attendancePct.toFixed(1)}%`);
  if (s.attendancePct < 75) signals.push("Below the 75% institutional threshold");
  let trend: ComponentBreakdown["trend"] = "unknown";
  let delta: number | null = null;
  if (s.prevAttendancePct != null) {
    delta = r1(s.attendancePct - s.prevAttendancePct);
    trend = delta >= 2 ? "improving" : delta <= -2 ? "declining" : "stable";
    if (trend === "declining") signals.push(`Fell ${Math.abs(delta)} pts from last window (${s.prevAttendancePct.toFixed(0)}%)`);
  }
  return { key: "attendance", label: meta.label, short: meta.short, value: r1(clamp(s.attendancePct)), available: true, signals, trend, delta, color: meta.color };
}

function lmsComponent(s: StudentRow): Omit<ComponentBreakdown, "contribution" | "weight"> {
  const meta = COMPONENT_META.lms;
  const signals: string[] = [];
  if (s.assignmentCompletionPct == null && s.lmsLogins == null) {
    return { key: "lms", label: meta.label, short: meta.short, value: null, available: false, signals: ["No LMS activity ingested"], trend: "unknown", delta: null, color: meta.color };
  }
  let value = 0;
  let parts = 0;
  if (s.assignmentCompletionPct != null) {
    value += clamp(s.assignmentCompletionPct) * 0.65;
    parts += 0.65;
    signals.push(`${s.assignmentCompletionPct.toFixed(0)}% of assignments submitted`);
  }
  if (s.lmsLogins != null) {
    const loginScore = clamp((s.lmsLogins / 80) * 100); // 80+ sessions / semester ≈ excellent
    value += loginScore * 0.35;
    parts += 0.35;
    signals.push(`${s.lmsLogins} LMS sessions this semester`);
  }
  value = clamp(value / parts);
  return { key: "lms", label: meta.label, short: meta.short, value: r1(value), available: true, signals, trend: "unknown", delta: null, color: meta.color };
}

function engagementComponent(s: StudentRow): Omit<ComponentBreakdown, "contribution" | "weight"> {
  const meta = COMPONENT_META.engagement;
  if (s.eventsCount == null && s.projectsCount == null && s.certificationsCount == null) {
    return { key: "engagement", label: meta.label, short: meta.short, value: null, available: false, signals: ["No activity records ingested"], trend: "unknown", delta: null, color: meta.color };
  }
  const ev = s.eventsCount ?? 0;
  const pr = s.projectsCount ?? 0;
  const ct = s.certificationsCount ?? 0;
  const value = clamp(ev * 8 + pr * 14 + ct * 9);
  const signals = [
    `${ev} event${ev === 1 ? "" : "s"} participated`,
    `${pr} project${pr === 1 ? "" : "s"} delivered`,
    `${ct} certification${ct === 1 ? "" : "s"} earned`,
  ];
  return { key: "engagement", label: meta.label, short: meta.short, value: r1(value), available: true, signals, trend: "unknown", delta: null, color: meta.color };
}

function skillsComponent(s: StudentRow): Omit<ComponentBreakdown, "contribution" | "weight"> {
  const meta = COMPONENT_META.skills;
  if (s.technicalScore == null && s.softSkillScore == null) {
    return { key: "skills", label: meta.label, short: meta.short, value: null, available: false, signals: ["No skill assessment ingested"], trend: "unknown", delta: null, color: meta.color };
  }
  const parts: number[] = [];
  const signals: string[] = [];
  if (s.technicalScore != null) { parts.push(clamp(s.technicalScore)); signals.push(`Technical assessment ${s.technicalScore.toFixed(0)} / 100`); }
  if (s.softSkillScore != null) { parts.push(clamp(s.softSkillScore)); signals.push(`Soft-skill assessment ${s.softSkillScore.toFixed(0)} / 100`); }
  const value = parts.reduce((a, b) => a + b, 0) / parts.length;
  return { key: "skills", label: meta.label, short: meta.short, value: r1(value), available: true, signals, trend: "unknown", delta: null, color: meta.color };
}

function placementComponent(s: StudentRow): Omit<ComponentBreakdown, "contribution" | "weight"> {
  const meta = COMPONENT_META.placement;
  const parts: number[] = [];
  const signals: string[] = [];
  if (s.aptitudeScore != null) { parts.push(clamp(s.aptitudeScore)); signals.push(`Aptitude ${s.aptitudeScore.toFixed(0)} / 100`); }
  if (s.codingScore != null) { parts.push(clamp(s.codingScore)); signals.push(`Coding ${s.codingScore.toFixed(0)} / 100`); }
  if (s.mockInterviewScore != null) { parts.push(clamp(s.mockInterviewScore)); signals.push(`Mock interview ${s.mockInterviewScore.toFixed(0)} / 100`); }
  if (parts.length === 0) {
    return { key: "placement", label: meta.label, short: meta.short, value: null, available: false, signals: ["Placement assessments not yet ingested"], trend: "unknown", delta: null, color: meta.color };
  }
  const value = parts.reduce((a, b) => a + b, 0) / parts.length;
  const weakest = Math.min(...parts);
  if (weakest < 50) signals.push("At least one readiness pillar below the 50-pt benchmark");
  return { key: "placement", label: meta.label, short: meta.short, value: r1(value), available: true, signals, trend: "unknown", delta: null, color: meta.color };
}

/* ── Risk assessment ─────────────────────────────────────────────────────── */

export interface RiskSignal { severity: "high" | "medium" | "watch"; text: string }
export interface RiskAssessment { level: "high" | "medium" | "low" | "unknown"; signals: RiskSignal[] }

export const RISK_META: Record<string, { label: string; color: string }> = {
  high: { label: "High Risk", color: "#FB7185" },
  medium: { label: "Review", color: "#FBBF24" },
  low: { label: "Stable", color: "#34D399" },
  unknown: { label: "Insufficient data", color: "#64748B" },
};

function levelFromSignals(signals: RiskSignal[]): RiskAssessment["level"] {
  if (signals.some((s) => s.severity === "high")) return "high";
  if (signals.some((s) => s.severity === "medium" || s.severity === "watch")) return "medium";
  return "low";
}

function academicRisk(s: StudentRow, acad: number | null, attendance: number | null, lms: number | null): RiskAssessment {
  if (acad == null && attendance == null) return { level: "unknown", signals: [{ severity: "watch", text: "No academic or attendance data — cannot assess academic risk" }] };
  const signals: RiskSignal[] = [];
  if (attendance != null) {
    if (attendance < 65) signals.push({ severity: "high", text: `Attendance ${attendance.toFixed(0)}% is critically below the 75% threshold` });
    else if (attendance < 75) signals.push({ severity: "medium", text: `Attendance ${attendance.toFixed(0)}% is below the 75% institutional threshold` });
  }
  if (s.attendancePct != null && s.prevAttendancePct != null && s.attendancePct <= s.prevAttendancePct - 6) {
    signals.push({ severity: "medium", text: `Attendance declining: ${s.prevAttendancePct.toFixed(0)}% → ${s.attendancePct.toFixed(0)}%` });
  }
  const bl = s.backlogs ?? 0;
  if (bl >= 3) signals.push({ severity: "high", text: `${bl} active backlogs across semesters` });
  else if (bl >= 1) signals.push({ severity: "medium", text: `${bl} active backlog${bl > 1 ? "s" : ""} pending clearance` });
  if (s.cgpa != null) {
    if (s.cgpa < 5.0) signals.push({ severity: "high", text: `CGPA ${s.cgpa.toFixed(2)} below the 5.0 academic floor` });
    else if (s.cgpa < 6.5) signals.push({ severity: "medium", text: `CGPA ${s.cgpa.toFixed(2)} is in the watch band (5.0–6.5)` });
  }
  if (s.cgpa != null && s.prevCgpa != null && s.cgpa <= s.prevCgpa - 0.4) {
    signals.push({ severity: "medium", text: `Academic decline: CGPA ${s.prevCgpa.toFixed(2)} → ${s.cgpa.toFixed(2)}` });
  }
  if (s.avgMarks != null && s.avgMarks < 50) signals.push({ severity: "medium", text: `Aggregate marks ${s.avgMarks.toFixed(0)}% below the 50% pass buffer` });
  if (s.assignmentCompletionPct != null && s.assignmentCompletionPct < 45) {
    signals.push({ severity: "medium", text: `Only ${s.assignmentCompletionPct.toFixed(0)}% of assignments submitted` });
  }
  if (acad != null && acad < 48) signals.push({ severity: "high", text: `Composite academic index ${acad.toFixed(0)} / 100 is critical` });
  return { level: levelFromSignals(signals), signals };
}

function placementRisk(s: StudentRow, placement: number | null): RiskAssessment {
  if (placement == null) return { level: "unknown", signals: [{ severity: "watch", text: "Placement assessments missing — readiness cannot be judged yet" }] };
  const signals: RiskSignal[] = [];
  if (placement < 45) signals.push({ severity: "high", text: `Placement readiness ${placement.toFixed(0)} / 100 is critical` });
  else if (placement < 62) signals.push({ severity: "medium", text: `Placement readiness ${placement.toFixed(0)} / 100 below employability benchmark` });
  if (s.aptitudeScore != null && s.aptitudeScore < 50) signals.push({ severity: "medium", text: `Aptitude ${s.aptitudeScore.toFixed(0)} / 100 below benchmark` });
  if (s.codingScore != null && s.codingScore < 45) signals.push({ severity: "medium", text: `Coding ${s.codingScore.toFixed(0)} / 100 below benchmark` });
  if (s.mockInterviewScore != null && s.mockInterviewScore < 50) signals.push({ severity: "medium", text: `Mock interview ${s.mockInterviewScore.toFixed(0)} / 100 needs coaching` });
  if ((s.certificationsCount ?? 0) === 0 && s.semester >= 5) signals.push({ severity: "watch", text: "No certifications earned by final-year window" });
  return { level: levelFromSignals(signals), signals };
}

/* ── Segmentation ────────────────────────────────────────────────────────── */

export type SegmentKey =
  | "strong"
  | "on-track"
  | "academic-support"
  | "attendance-concern"
  | "low-engagement"
  | "placement-gap"
  | "insufficient-data";

export const SEGMENT_META: Record<SegmentKey, { label: string; color: string; desc: string; support: string }> = {
  "strong": { label: "Strong All-Round", color: "#A78BFA", desc: "Strong academic and placement indicators.", support: "Advanced projects, internships, leadership roles" },
  "on-track": { label: "On Track", color: "#38BDF8", desc: "Steady progress with no critical weakness.", support: "Maintain momentum with periodic check-ins" },
  "academic-support": { label: "Academic Support", color: "#FB7185", desc: "Low academic index, backlogs or declining marks.", support: "Faculty mentoring and subject tutoring" },
  "attendance-concern": { label: "Attendance Concern", color: "#FBBF24", desc: "Attendance below the institutional threshold.", support: "Check-in to understand barriers; attendance plan" },
  "low-engagement": { label: "Low Engagement", color: "#FB923C", desc: "Incomplete assignments or declining LMS activity.", support: "Structured learning plan and reminders" },
  "placement-gap": { label: "Placement Gap", color: "#22D3EE", desc: "Academically strong but placement-weak.", support: "Aptitude drills, coding roadmap, mock interviews" },
  "insufficient-data": { label: "Insufficient Data", color: "#64748B", desc: "Too many missing indicators for a reliable assessment.", support: "Complete data collection before assessing" },
};

export const SEGMENT_ORDER: SegmentKey[] = ["academic-support", "attendance-concern", "low-engagement", "placement-gap", "on-track", "strong", "insufficient-data"];

/* ── Composite analysis ──────────────────────────────────────────────────── */

export type BandKey = "strong" | "developing" | "support";

export interface AnalyzedStudent {
  student: StudentRow;
  components: ComponentBreakdown[];
  score: number | null;        // null when nothing is available
  band: BandKey;
  provisional: boolean;        // completeness < 55% → treat cautiously
  completeness: number;        // 0–100 (share of documented weight available)
  academicRisk: RiskAssessment;
  placementRisk: RiskAssessment;
  segment: SegmentKey;
  overallTrend: "improving" | "stable" | "declining";
  strengths: { label: string; value: number }[];
  concerns: { label: string; value: number }[];
  priorityScore: number;       // internal sort key for attention queues
}

export function analyzeStudent(s: StudentRow): AnalyzedStudent {
  const partials = [
    academicComponent(s),
    attendanceComponent(s),
    lmsComponent(s),
    engagementComponent(s),
    skillsComponent(s),
    placementComponent(s),
  ];

  const availableWeight = partials.reduce((acc, c) => acc + (c.available ? WEIGHTS[c.key as ComponentKey] : 0), 0);
  const completeness = Math.round(availableWeight * 100);

  // Missing indicators are excluded, remaining weights renormalized to 1.0
  let score: number | null = null;
  const components: ComponentBreakdown[] = partials.map((c) => {
    const w = WEIGHTS[c.key as ComponentKey];
    if (!c.available || c.value == null || availableWeight === 0) {
      return { ...c, weight: w, contribution: 0 };
    }
    const renormW = w / availableWeight;
    return { ...c, weight: w, contribution: r1(c.value * renormW) };
  });

  if (availableWeight > 0) {
    const sum = partials.reduce((acc, c) => acc + (c.available && c.value != null ? WEIGHTS[c.key as ComponentKey] * c.value : 0), 0);
    score = r1(sum / availableWeight);
  }

  const get = (k: ComponentKey) => components.find((c) => c.key === k)?.value ?? null;
  const acad = get("academic");
  const att = get("attendance");
  const lms = get("lms");
  const eng = get("engagement");
  const plc = get("placement");
  const skl = get("skills");

  const aRisk = academicRisk(s, acad, att, lms);
  const pRisk = placementRisk(s, plc);
  const provisional = completeness < 55;

  // Segmentation — evaluated in priority order so the most urgent need wins
  let segment: SegmentKey = "on-track";
  if (provisional) segment = "insufficient-data";
  else if (aRisk.level === "high" || (acad != null && acad < 52)) segment = "academic-support";
  else if (att != null && att < 70) segment = "attendance-concern";
  else if (acad != null && acad >= 72 && plc != null && plc < 60) segment = "placement-gap";
  else if (score != null && score >= 80 && (plc == null || plc >= 68) && (att == null || att >= 80)) segment = "strong";
  else if ((lms != null && lms < 48) || (eng != null && eng < 22)) segment = "low-engagement";

  const deltas = components.map((c) => c.delta).filter((d): d is number => d != null);
  const netDelta = deltas.reduce((a, b) => a + b, 0);
  const overallTrend: AnalyzedStudent["overallTrend"] = deltas.length === 0 ? "stable" : netDelta >= 2 ? "improving" : netDelta <= -2 ? "declining" : "stable";

  const avail = components.filter((c) => c.available && c.value != null);
  const strengths = avail.filter((c) => (c.value ?? 0) >= 75).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 3).map((c) => ({ label: c.label, value: c.value ?? 0 }));
  const concerns = avail.filter((c) => (c.value ?? 0) < 60).sort((a, b) => (a.value ?? 0) - (b.value ?? 0)).slice(0, 3).map((c) => ({ label: c.label, value: c.value ?? 0 }));

  const band: BandKey = score == null ? "support" : score >= 80 ? "strong" : score >= 60 ? "developing" : "support";

  const riskW = { high: 3, medium: 2, low: 1, unknown: 1 } as const;
  const priorityScore =
    riskW[aRisk.level] * 100 +
    riskW[pRisk.level] * 40 +
    (100 - (score ?? 100)) +
    (overallTrend === "declining" ? 25 : 0) -
    (segment === "insufficient-data" ? 120 : 0);

  return { student: s, components, score, band, provisional, completeness, academicRisk: aRisk, placementRisk: pRisk, segment, overallTrend, strengths, concerns, priorityScore };
}

export function analyzeRows(rows: StudentRow[]): AnalyzedStudent[] {
  return rows.map(analyzeStudent);
}

export const BAND_META: Record<BandKey, { label: string; color: string }> = {
  strong: { label: "Strong", color: "#34D399" },
  developing: { label: "Developing", color: "#FBBF24" },
  support: { label: "Needs Support", color: "#FB7185" },
};

/* ── Intervention library & rule-based recommendations ───────────────────── */

export interface ActionTemplate {
  key: string;
  title: string;
  category: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

export const ACTION_LIBRARY: ActionTemplate[] = [
  { key: "mentor-1on1", title: "Faculty Mentoring Session", category: "Mentoring", detail: "Weekly 1:1 with the course mentor to diagnose blockers and agree a CGPA recovery plan.", priority: "high" },
  { key: "subject-tutoring", title: "Subject Peer Tutoring", category: "Academic", detail: "Pair with a high-performing peer tutor for weak subjects; focus on fundamentals.", priority: "high" },
  { key: "backlog-plan", title: "Backlog Clearance Plan", category: "Academic", detail: "Structured study plan for supplementary exams with weekly progress checkpoints.", priority: "high" },
  { key: "attendance-checkin", title: "Wellness & Attendance Check-in", category: "Wellbeing", detail: "Confidential advisor conversation to identify barriers affecting attendance.", priority: "high" },
  { key: "attendance-plan", title: "Attendance Improvement Plan", category: "Attendance", detail: "Daily attendance monitoring with a parent/guardian communication loop.", priority: "medium" },
  { key: "aptitude-drill", title: "Aptitude Practice Program", category: "Placement", detail: "Daily quantitative and logical-reasoning drills via the placement portal.", priority: "medium" },
  { key: "coding-roadmap", title: "Coding Bootcamp Roadmap", category: "Placement", detail: "8-week structured DSA and problem-solving track with weekly assessments.", priority: "high" },
  { key: "mock-interviews", title: "Mock Interview Series", category: "Placement", detail: "Bi-weekly HR and technical mock interviews with recorded feedback.", priority: "medium" },
  { key: "learning-plan", title: "Structured Learning Plan", category: "Engagement", detail: "Assignment calendar with milestones, nudges and weekly LMS goals.", priority: "medium" },
  { key: "assignment-reminders", title: "Assignment Reminder Workflow", category: "Engagement", detail: "Automated deadline nudges and pending-task tracking for the advisor.", priority: "low" },
  { key: "club-involvement", title: "Club & Project Involvement", category: "Engagement", detail: "Nominate the student to a technical club or guided mini-project.", priority: "low" },
  { key: "advanced-project", title: "Advanced Research Project", category: "Growth", detail: "Placement into a faculty-led research or innovation capstone.", priority: "low" },
  { key: "internship-fasttrack", title: "Internship Fast-Track Nomination", category: "Growth", detail: "Prioritize for the company internship pipeline and hackathon teams.", priority: "low" },
  { key: "leadership", title: "Peer Mentor / Leadership Role", category: "Growth", detail: "Rotate into peer mentoring to build leadership and communication.", priority: "low" },
  { key: "data-collection", title: "Complete Data Collection", category: "Data Quality", detail: "Request the missing assessment scores before a reliable assessment.", priority: "low" },
];

export interface Recommendation extends ActionTemplate { reason: string }

export function recommendedActions(a: AnalyzedStudent): Recommendation[] {
  const lib = Object.fromEntries(ACTION_LIBRARY.map((x) => [x.key, x]));
  const out: Recommendation[] = [];
  const push = (key: string, reason: string) => {
    if (!out.some((o) => o.key === key) && lib[key]) out.push({ ...lib[key], reason });
  };
  const val = (k: ComponentKey) => a.components.find((c) => c.key === k)?.value ?? null;
  const acad = val("academic"); const att = val("attendance"); const lms = val("lms"); const plc = val("placement");

  switch (a.segment) {
    case "strong":
      push("advanced-project", "Strong composite indicators — channel energy into depth work");
      push("internship-fasttrack", "Readiness indicators support early industry exposure");
      push("leadership", "High engagement makes the student a good peer mentor");
      break;
    case "placement-gap": {
      if (a.student.codingScore != null && a.student.codingScore < 55) push("coding-roadmap", `Coding assessment ${a.student.codingScore.toFixed(0)}/100 trails strong academics`);
      if (a.student.aptitudeScore != null && a.student.aptitudeScore < 58) push("aptitude-drill", `Aptitude ${a.student.aptitudeScore.toFixed(0)}/100 is the gap to close`);
      push("mock-interviews", "Convert strong academics into interview performance");
      push("coding-roadmap", "Structured problem-solving practice builds on the strong foundation");
      break;
    }
    case "academic-support":
      push("mentor-1on1", "High academic risk — start with diagnosis, not assumption");
      if ((a.student.backlogs ?? 0) > 0) push("backlog-plan", `${a.student.backlogs} active backlog(s) need a clearance timeline`);
      push("subject-tutoring", `Composite academic index is ${acad != null ? acad.toFixed(0) : "unknown"}/100`);
      push("learning-plan", "Rebuild weekly study cadence with visible milestones");
      break;
    case "attendance-concern":
      push("attendance-checkin", `Attendance ${att?.toFixed(0) ?? "—"}% — understand the barrier first`);
      push("attendance-plan", "Sustained monitoring prevents a slide into academic risk");
      break;
    case "low-engagement":
      push("learning-plan", `LMS engagement ${lms?.toFixed(0) ?? "—"}/100 indicates a broken study loop`);
      push("assignment-reminders", `Assignment completion is ${a.student.assignmentCompletionPct?.toFixed(0) ?? "—"}%`);
      push("club-involvement", "Low co-curricular presence — reconnect through interests");
      break;
    case "insufficient-data":
      push("data-collection", `Only ${a.completeness}% of indicator weight available`);
      if (a.academicRisk.level === "medium" || a.academicRisk.level === "high") push("mentor-1on1", "Available indicators already show warning signs");
      break;
    default: // on-track
      if (plc != null && plc < 68) push("mock-interviews", `Placement readiness ${plc.toFixed(0)}/100 is the next frontier`);
      if (plc != null && plc >= 68) push("internship-fasttrack", "Solid placement indicators — test them in the field");
      if (att != null && att < 78) push("attendance-plan", "Attendance has limited headroom above the threshold");
      push("club-involvement", "Broaden the profile with guided co-curricular depth");
      break;
  }
  if (a.completeness < 70) push("data-collection", `Assessment confidence limited — ${a.completeness}% data completeness`);
  return out.slice(0, 4);
}

/* ── Intervention workflow metadata ──────────────────────────────────────── */

export const STATUS_META: Record<string, { label: string; color: string; next?: string }> = {
  pending: { label: "Pending", color: "#FBBF24", next: "in_progress" },
  in_progress: { label: "In Progress", color: "#38BDF8", next: "completed" },
  completed: { label: "Completed", color: "#34D399" },
};

export const OUTCOME_META: Record<string, { label: string; color: string }> = {
  improved: { label: "Improved", color: "#34D399" },
  stable: { label: "Stable", color: "#FBBF24" },
  needs_review: { label: "Needs Review", color: "#FB7185" },
};

export const PRIORITY_META: Record<string, { label: string; color: string }> = {
  high: { label: "High priority", color: "#FB7185" },
  medium: { label: "Medium", color: "#FBBF24" },
  low: { label: "Low", color: "#64748B" },
};
