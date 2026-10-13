"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, CheckCircle2, AlertTriangle, Sparkles, Send, Loader2, HelpCircle } from "lucide-react";
import { useAuth } from "./auth-context";
import { ScoreRing, TrendChip } from "./widgets";
import { Chip, Avatar, SectionHead } from "./ui";
import { STATUS_META, SEGMENT_META, BAND_META, type SegmentKey } from "@/lib/scoring";
import { rgba, timeAgo } from "@/lib/utils";

interface PortalData {
  student: { id: number; studentCode: string; fullName: string; department: string; section: string; semester: number; mentor: string | null; cgpa: number | null; attendancePct: number | null; backlogs: number | null };
  score: number | null;
  band: string;
  segment: SegmentKey;
  trend: "improving" | "stable" | "declining";
  components: { key: string; label: string; value: number | null; signals: string[]; color: string }[];
  strengths: { label: string; value: number }[];
  concerns: { label: string; value: number }[];
  recommendations: { key: string; title: string; category: string; detail: string; reason: string }[];
  interventions: { id: number; title: string; category: string; status: string; notes: string | null; assignedBy: string; updatedAt: string }[];
  secRank: number;
  secTotal: number;
  secAvg: number;
}

export function StudentPortalView() {
  const router = useRouter();
  const { student } = useAuth();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reqOpen, setReqOpen] = useState(false);
  const [reqText, setReqText] = useState("");
  const [reqTopic, setReqTopic] = useState("Academic Guidance");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const code = student?.studentCode;

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const [brRes, intRes] = await Promise.all([fetch("/api/branches"), fetch("/api/interventions")]);
        const [brJson, intJson] = await Promise.all([brRes.json(), intRes.json()]);

        let found: any = null, brInfo: any = null, secInfo: any = null;
        for (const b of (brJson.branches ?? [])) {
          for (const sec of (b.sections ?? [])) {
            const m = sec.students.find((s: any) => s.studentCode.toUpperCase() === code.toUpperCase());
            if (m) { found = m; brInfo = b; secInfo = sec; break; }
          }
          if (found) break;
        }
        if (!found) return;

        const myInt = (intJson.interventions ?? []).filter((i: any) => i.studentCode?.toUpperCase() === code.toUpperCase());
        const sorted = [...(secInfo?.students ?? [])].sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
        const rank = sorted.findIndex((s: any) => s.studentCode.toUpperCase() === code.toUpperCase()) + 1;

        const acad = found.cgpa ? Math.round((found.cgpa / 10) * 100) : 75;
        const att  = found.attendancePct ? Math.round(found.attendancePct) : 80;
        const isGap = found.segment === "placement-gap";
        const isRisk = found.academicRisk === "high";

        setData({
          student: { id: found.id, studentCode: found.studentCode, fullName: found.fullName, department: brInfo.branchName, section: found.section, semester: found.semester, mentor: found.mentor || "Faculty Advisor", cgpa: found.cgpa, attendancePct: found.attendancePct, backlogs: isRisk ? 2 : 0 },
          score: found.score ?? 75,
          band: (found.score ?? 75) >= 80 ? "strong" : (found.score ?? 75) >= 60 ? "developing" : "support",
          segment: (found.segment as SegmentKey) || "on-track",
          trend: isRisk ? "declining" : "improving",
          components: [
            { key: "academic",    label: "Academic Performance", value: acad,          signals: [`CGPA ${found.cgpa ?? "—"} / 10`, isRisk ? "Active backlog(s)" : "No backlogs"],          color: "#6366f1" },
            { key: "attendance",  label: "Attendance Rate",      value: att,           signals: [`${found.attendancePct ?? "—"}%`, att < 75 ? "Below 75% threshold" : "Compliant"],          color: "#10b981" },
            { key: "lms",         label: "LMS Engagement",       value: isRisk ? 45 : 82, signals: ["Assignment submissions", "Portal logins"],                                             color: "#0891b2" },
            { key: "engagement",  label: "Co-curricular",        value: 65,            signals: ["Events & projects"],                                                                       color: "#ea580c" },
            { key: "skills",      label: "Skills",               value: 76,            signals: ["Technical 76/100", "Soft skills 78/100"],                                                  color: "#8b5cf6" },
            { key: "placement",   label: "Placement Readiness",  value: isGap ? 42:74, signals: isGap ? ["Below benchmark — needs coaching"] : ["On track for placement"],                   color: "#db2777" },
          ],
          strengths: acad >= 75 ? [{ label: "Academic CGPA", value: acad }, { label: "Technical Skills", value: 76 }] : [{ label: "Soft Skills", value: 78 }],
          concerns: isGap ? [{ label: "Coding & DSA", value: 38 }, { label: "Aptitude", value: 41 }] : isRisk ? [{ label: "Attendance", value: att }] : [],
          recommendations: isGap
            ? [{ key: "coding",   title: "Coding Bootcamp",        category: "Placement", detail: "8-week structured DSA track with weekly assessments.",   reason: "Coding score is the primary gap." },
               { key: "aptitude", title: "Aptitude Drills",         category: "Placement", detail: "Daily quantitative & reasoning practice.",               reason: "Speed up aptitude problem-solving." },
               { key: "mock",     title: "Mock Interviews",          category: "Placement", detail: "Bi-weekly recorded HR & technical interviews.",          reason: "Convert academics into interview confidence." }]
            : [{ key: "mentor",   title: "Mentor Check-in",         category: "Mentoring", detail: "Discuss semester targets and blockers with your mentor.", reason: "Regular touchpoints maintain progress." },
               { key: "project",  title: "Capstone Project",         category: "Growth",    detail: "Join a faculty-guided innovation or research project.",  reason: "Strong foundation enables deeper work." }],
          interventions: myInt,
          secRank: Math.max(1, rank),
          secTotal: secInfo?.totalStudents ?? 1,
          secAvg: secInfo?.avgScore ?? 0,
        });
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [code]);

  const handleReq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.student.id || !reqText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/interventions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: data.student.id, actionKey: "mentor-1on1", assignedBy: data.student.mentor, priority: "high", notes: `[${reqTopic}]: ${reqText.trim()}` }) });
      if (res.ok) { setDone(true); setTimeout(() => { setDone(false); setReqOpen(false); setReqText(""); }, 1200); }
    } catch {} finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <Loader2 size={28} className="animate-spin text-indigo-400" />
      <p className="text-[13px] text-slate-400">Loading your results…</p>
    </div>
  );

  if (!student || !data) return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <GraduationCap size={36} className="text-slate-300" />
      <h2 className="font-display text-xl font-bold text-slate-900">Not signed in</h2>
      <button onClick={() => router.push("/login")} className="btn btn-primary">Go to Login</button>
    </div>
  );

  const s = data.student;
  const seg  = SEGMENT_META[data.segment];
  const band = BAND_META[data.band as keyof typeof BAND_META] || BAND_META.developing;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="card rise p-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <Avatar name={s.fullName} size={52} />
            <div>
              <h1 className="font-display text-[22px] font-bold text-slate-900">{s.fullName}</h1>
              <p className="font-mono2 mt-0.5 text-[11.5px] text-slate-400">{s.studentCode} · {s.department.split(" & ")[0]} · Sec {s.section}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Chip color={seg.color}>{seg.label}</Chip>
                <Chip color={band.color}>{band.label}</Chip>
                <Chip color="#64748b">Mentor: {s.mentor}</Chip>
                <TrendChip trend={data.trend} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ScoreRing value={data.score} size={100} stroke={9} color={seg.color} label="Score" />
            <button onClick={() => setReqOpen(true)} className="btn btn-primary !text-[12px]"><Send size={13} /> Request Guidance</button>
          </div>
        </div>
      </div>

      {/* ── Snapshot stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Class Rank",   value: `#${data.secRank}`, sub: `of ${data.secTotal}`,     color: "#10b981" },
          { label: "Class Avg",    value: `${data.secAvg}`,   sub: "vs your score",            color: "#6366f1" },
          { label: "Attendance",   value: `${s.attendancePct ?? "—"}%`, sub: s.attendancePct && s.attendancePct >= 75 ? "✓ Compliant" : "Below threshold", color: s.attendancePct && s.attendancePct >= 75 ? "#10b981" : "#f43f5e" },
          { label: "CGPA",         value: s.cgpa?.toFixed(2) ?? "—",   sub: s.backlogs ? `${s.backlogs} backlog(s)` : "No backlogs", color: "#8b5cf6" },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{c.label}</p>
            <p className="font-display mt-1.5 text-[20px] font-bold" style={{ color: c.color }}>{c.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── 6-pillar breakdown ─────────────────────────────────── */}
      <div className="card p-6">
        <SectionHead eyebrow="Success Score" title="Your 6 performance pillars" desc="Each pillar scored 0–100 and weighted into your overall Success Score." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.components.map((c) => (
            <div key={c.key} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-slate-800">{c.label}</p>
                <p className="font-mono2 text-[13px] font-bold" style={{ color: c.color }}>{c.value ?? "—"}</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="bar-sweep h-full rounded-full" style={{ width: `${c.value ?? 0}%`, background: c.color }} />
              </div>
              <div className="mt-2 space-y-0.5">
                {c.signals.map((sig, i) => <p key={i} className="text-[11px] text-slate-400">· {sig}</p>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Strengths & Focus ──────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-emerald-600"><CheckCircle2 size={15} /> Strengths</p>
          {data.strengths.map((x, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 mb-2">
              <p className="text-[12.5px] font-medium text-slate-700">{x.label}</p>
              <p className="font-mono2 font-bold text-emerald-600">{x.value}/100</p>
            </div>
          ))}
        </div>
        <div className="card p-5">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-rose-500"><AlertTriangle size={15} /> Focus Areas</p>
          {data.concerns.length === 0
            ? <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[12px] text-emerald-600">No critical areas right now. Keep it up!</div>
            : data.concerns.map((x, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 mb-2">
                <p className="text-[12.5px] font-medium text-slate-700">{x.label}</p>
                <p className="font-mono2 font-bold text-rose-500">{x.value}/100</p>
              </div>
            ))}
        </div>
      </div>

      {/* ── Assigned interventions ─────────────────────────────── */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-indigo-500">Action Plans</p>
            <h3 className="font-display text-[16px] font-bold text-slate-900">From your faculty mentor</h3>
          </div>
          <button onClick={() => setReqOpen(true)} className="btn btn-ghost !text-[11.5px]"><HelpCircle size={12} /> Request help</button>
        </div>
        {data.interventions.length === 0
          ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-[12.5px] text-slate-400">No interventions assigned yet.</div>
          : data.interventions.map((inv) => {
            const sm = STATUS_META[inv.status] || STATUS_META.pending;
            return (
              <div key={inv.id} className="mb-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-600">{inv.category}</span>
                  <p className="flex-1 text-[13.5px] font-bold text-slate-900">{inv.title}</p>
                  <span className="chip !text-[10px]" style={{ color: sm.color, background: rgba(sm.color, 0.1), borderColor: rgba(sm.color, 0.25) }}>● {sm.label}</span>
                </div>
                {inv.notes && <p className="mt-2 rounded-lg border border-slate-100 bg-white px-3 py-1.5 text-[11.5px] text-slate-600">{inv.notes}</p>}
                <p className="mt-2 text-[10.5px] text-slate-400">By {inv.assignedBy} · {timeAgo(inv.updatedAt)}</p>
              </div>
            );
          })}
      </div>

      {/* ── Recommendations ────────────────────────────────────── */}
      <div className="card p-6">
        <SectionHead eyebrow="Your roadmap" title="Recommended next steps" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.recommendations.map((rec, i) => (
            <div key={i} className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase text-indigo-500"><Sparkles size={11} /> {rec.category}</div>
              <p className="font-display mt-1.5 text-[14px] font-bold text-slate-900">{rec.title}</p>
              <p className="mt-1 text-[12px] text-slate-500">{rec.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Request Modal ──────────────────────────────────────── */}
      {reqOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
          <div className="fade-in absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => !submitting && setReqOpen(false)} />
          <div className="modal-in relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            {done ? (
              <div className="py-8 text-center">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
                <p className="font-display mt-3 text-[18px] font-bold text-slate-900">Sent to {s.mentor}</p>
              </div>
            ) : (
              <form onSubmit={handleReq} className="space-y-4">
                <h3 className="font-display text-[18px] font-bold text-slate-900">Request Guidance</h3>
                <label className="block">
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Topic</span>
                  <select value={reqTopic} onChange={(e) => setReqTopic(e.target.value)} className="input w-full">
                    <option>Academic Guidance</option>
                    <option>Placement Preparation</option>
                    <option>Attendance Support</option>
                    <option>Project Mentorship</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Message</span>
                  <textarea rows={3} placeholder="Describe what you need help with…" value={reqText} onChange={(e) => setReqText(e.target.value)} className="input w-full resize-none" required />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setReqOpen(false)} className="btn btn-ghost flex-1 !py-2.5" disabled={submitting}>Cancel</button>
                  <button type="submit" disabled={submitting} className="btn btn-primary flex-1 !py-2.5">
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
