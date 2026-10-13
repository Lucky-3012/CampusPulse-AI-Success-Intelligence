"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, Users, ArrowRight, AlertCircle, Loader2, Zap,
  Sigma, Building2, HeartPulse, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { cn } from "@/lib/utils";

const BRANCHES = [
  { code: "CSE", name: "Computer Science & Engineering" },
  { code: "ISE", name: "Information Science & Engineering" },
  { code: "ECE", name: "Electronics & Communication" },
  { code: "EEE", name: "Electrical & Electronics" },
  { code: "MEC", name: "Mechanical Engineering" },
  { code: "CIV", name: "Civil Engineering" },
];

const FACULTY_LIST = [
  { name: "Dr. Kavitha Rao", dept: "Computer Science & Engineering", section: "A" },
  { name: "Prof. Arun Menon", dept: "Electronics & Communication", section: "B" },
  { name: "Dr. Sunita Deshmukh", dept: "Information Science & Engineering", section: "A" },
  { name: "Dr. Neha Kulkarni", dept: "Computer Science & Engineering", section: "A" },
  { name: "Prof. Rakesh Iyer", dept: "Electrical & Electronics", section: "B" },
  { name: "Prof. Vivek Chauhan", dept: "Mechanical Engineering", section: "A" },
];

const DEMO_STUDENTS = [
  { tag: "A", name: "Aarav Deshmukh", code: "CSE24A007", highlight: "High academics · placement gap" },
  { tag: "B", name: "Diya Nair", code: "ECE25B021", highlight: "Declining academics · attendance" },
  { tag: "C", name: "Meera Krishnan", code: "CSE23A003", highlight: "Strong all-round performer" },
];

export default function LoginPage() {
  const router = useRouter();
  const { loginAsStudent, loginAsTeacher, quickLoginStudent, quickLoginTeacher } = useAuth();
  const [tab, setTab] = useState<"student" | "teacher">("student");

  const [studentBranch, setStudentBranch] = useState(BRANCHES[0].name);
  const [studentSection, setStudentSection] = useState("A");
  const [studentRoll, setStudentRoll] = useState("");
  const [studentError, setStudentError] = useState("");
  const [loading, setLoading] = useState(false);

  const [teacherName, setTeacherName] = useState(FACULTY_LIST[0].name);
  const [teacherBranch, setTeacherBranch] = useState(FACULTY_LIST[0].dept);
  const [teacherSection, setTeacherSection] = useState(FACULTY_LIST[0].section);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError("");
    if (!studentRoll.trim()) { setStudentError("Enter your Roll Number."); return; }
    setLoading(true);
    const res = await loginAsStudent({ rollNumber: studentRoll.trim(), branch: studentBranch, section: studentSection });
    setLoading(false);
    if (res.success) router.push("/student");
    else setStudentError(res.error || "Student not found.");
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await loginAsTeacher({ name: teacherName, branch: teacherBranch, section: teacherSection });
    if (res.success) router.push("/");
    else setStudentError(res.error || "Faculty login failed. Please try again.");
  };

  const handleDemoStudent = async (d: (typeof DEMO_STUDENTS)[0]) => {
    setLoading(true);
    const ok = await quickLoginStudent(d.code);
    setLoading(false);
    if (ok) router.push("/student");
  };

  return (
    <div className="min-h-screen bg-[#f3f5fa]">
      {/* Ambient decorations */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-48 left-1/3 h-[480px] w-[760px] rounded-full opacity-[0.16]" style={{ background: "radial-gradient(closest-side, #a5b4fc, transparent 70%)" }} />
        <div className="absolute top-1/3 -right-48 h-[420px] w-[520px] rounded-full opacity-[0.1]" style={{ background: "radial-gradient(closest-side, #5eead4, transparent 70%)" }} />
      </div>

      <div className="mx-auto grid min-h-screen max-w-[1320px] gap-6 p-6 lg:grid-cols-[1.05fr_1fr] lg:py-10">
        {/* ── Left Hero ──────────────────────────────────────── */}
        <div
          className="rise relative flex flex-col justify-between overflow-hidden rounded-3xl p-8 text-white md:p-10"
          style={{ background: "linear-gradient(160deg,#111736 0%,#0c1229 60%,#0a0f24 100%)" }}
        >
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full opacity-25" style={{ background: "radial-gradient(closest-side,#6366f1,transparent 70%)" }} />
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-lg border border-indigo-400/40 bg-indigo-500/15">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 12h4l2.5-6 4 12 2.5-8 1.7 2H22" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span className="font-display text-[15px] font-bold">CampusPulse <span className="text-indigo-300">AI</span></span>
            </div>
            <h1 className="font-display mt-8 max-w-md text-[32px] font-extrabold leading-[1.08] tracking-tight md:text-[38px]">
              Smart Campus<br />Analytics<br />
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">Platform.</span>
            </h1>
            <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-slate-400">
              Academics, attendance, LMS activity, skills and placement readiness — unified into
              explainable intelligence for students and faculty.
            </p>
            <div className="mt-8 space-y-3.5">
              {[
                { icon: GraduationCap, text: "Students: view your results, success score, 6-pillar performance breakdown and recommended roadmaps." },
                { icon: Building2, text: "Teachers: explore branch × section analytics, assign interventions, and track outcomes." },
                { icon: Sigma, text: "Transparent scoring: S = 0.35·A + 0.20·T + 0.15·L + 0.10·E + 0.10·K + 0.10·P — no black boxes." },
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/5 text-indigo-300 ring-1 ring-white/10"><p.icon size={14} /></span>
                  <p className="text-[12.5px] leading-relaxed text-slate-300">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 flex items-center gap-4 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
            <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-400" /> PostgreSQL-backed</span>
            <span className="flex items-center gap-1.5"><HeartPulse size={12} className="text-pink-400" /> Intervention tracking</span>
          </div>
        </div>

        {/* ── Right Form Card ────────────────────────────────── */}
        <div className="rise flex flex-col justify-center rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xl shadow-slate-900/5 md:p-9" style={{ animationDelay: "80ms" }}>
          <div>
            <h2 className="font-display text-[24px] font-bold tracking-tight text-slate-900">Sign in</h2>
            <p className="mt-1 text-[13px] text-slate-500">Choose your role to get started.</p>
          </div>

          {/* Tab switcher */}
          <div className="mt-6 flex rounded-xl border border-slate-200 bg-slate-100/80 p-1">
            {([
              { key: "student" as const, label: "Student", icon: GraduationCap, desc: "View results & performance" },
              { key: "teacher" as const, label: "Teacher / Faculty", icon: Users, desc: "Command center & analytics" },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setStudentError(""); }}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-3 text-center transition-all",
                  tab === t.key ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <div className="flex items-center gap-2 text-[12.5px] font-semibold">
                  <t.icon size={15} className={tab === t.key ? "text-indigo-500" : ""} />
                  {t.label}
                </div>
                <span className="text-[10px] text-slate-400">{t.desc}</span>
              </button>
            ))}
          </div>

          {/* ── Student Login ─────────────────────────────────── */}
          {tab === "student" && (
            <form onSubmit={handleStudentSubmit} className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Branch</span>
                  <select value={studentBranch} onChange={(e) => setStudentBranch(e.target.value)} className="input w-full">
                    {BRANCHES.map((b) => (<option key={b.code} value={b.name}>{b.code} — {b.name}</option>))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Section</span>
                  <select value={studentSection} onChange={(e) => setStudentSection(e.target.value)} className="input w-full">
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Roll Number</span>
                <input type="text" placeholder="e.g. CSE24A007" value={studentRoll} onChange={(e) => { setStudentRoll(e.target.value); setStudentError(""); }} className="input w-full font-mono2 !text-[14px] uppercase" />
              </label>
              {studentError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11.5px] font-medium text-rose-600">
                  <AlertCircle size={14} className="shrink-0" /> {studentError}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn btn-primary w-full !py-3 !text-[13px]">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                View My Results & Performance
              </button>
              <div className="border-t border-slate-100 pt-4">
                <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  <Zap size={11} className="text-amber-500" /> Quick demo profiles
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {DEMO_STUDENTS.map((d) => (
                    <button key={d.code} type="button" onClick={() => handleDemoStudent(d)} className="rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-all hover:border-indigo-300 hover:shadow">
                      <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-900">
                        <span className="rounded bg-indigo-100 px-1 py-px font-mono2 text-[9px] font-bold text-indigo-600">{d.tag}</span>
                        {d.name.split(" ")[0]}
                      </div>
                      <div className="font-mono2 text-[9px] font-semibold text-indigo-500">{d.code}</div>
                      <div className="mt-0.5 text-[9px] text-slate-400">{d.highlight}</div>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* ── Teacher Login ─────────────────────────────────── */}
          {tab === "teacher" && (
            <form onSubmit={handleTeacherSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Faculty Name</span>
                <select
                  value={teacherName}
                  onChange={(e) => {
                    setTeacherName(e.target.value);
                    const m = FACULTY_LIST.find((f) => f.name === e.target.value);
                    if (m) { setTeacherBranch(m.dept); setTeacherSection(m.section); }
                  }}
                  className="input w-full"
                >
                  {FACULTY_LIST.map((f) => (<option key={f.name} value={f.name}>{f.name} ({f.dept.split(" ")[0]} · Sec {f.section})</option>))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Department</span>
                  <select value={teacherBranch} onChange={(e) => setTeacherBranch(e.target.value)} className="input w-full">
                    {BRANCHES.map((b) => (<option key={b.code} value={b.name}>{b.code} — {b.name}</option>))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Section</span>
                  <select value={teacherSection} onChange={(e) => setTeacherSection(e.target.value)} className="input w-full">
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="all">All Sections</option>
                  </select>
                </label>
              </div>
              <button type="submit" className="btn btn-primary w-full !py-3 !text-[13px]">
                <ArrowRight size={15} /> Open Faculty Command Center
              </button>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-[11px] leading-relaxed text-slate-500">
                Faculty access the full Command Center: Branch Hub, Student Explorer, Placement Analytics, Intervention Tracker and Data Quality.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
