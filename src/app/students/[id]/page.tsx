import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { getStudentByCode, getStudentInterventions, getInterventionsFeed, getAnalyzedStudents } from "@/lib/queries";
import { SEGMENT_META, BAND_META, RISK_META, COMPONENT_META, recommendedActions, type ComponentKey } from "@/lib/scoring";
import { Avatar, Chip, SectionHead } from "@/components/ui";
import { ScoreRing, TrendChip } from "@/components/widgets";
import { RadarCompare } from "@/components/charts";
import { RecommendationPanel } from "@/components/profile-actions";
import { InterventionList } from "@/components/interventions-board";
import { rgba, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MENTORS = ["Dr. Kavitha Rao","Prof. Arun Menon","Dr. Sunita Deshmukh","Dr. Neha Kulkarni","Prof. Rakesh Iyer"];

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getStudentByCode(decodeURIComponent(id));
  if (!analysis) notFound();

  const s = analysis.student;
  const [feedAll, all] = await Promise.all([getInterventionsFeed(), getAnalyzedStudents()]);
  const items = feedAll.filter((f) => f.studentId === s.id);

  const cohort = (key: ComponentKey) => {
    const vals = all.map((a) => a.components.find((c) => c.key === key)?.value).filter((v): v is number => v != null).sort((x, y) => x - y);
    return vals.length ? vals[Math.floor(vals.length / 2)] : 0;
  };
  const radar = analysis.components.map((c) => ({ subject: c.short, student: c.value ?? 0, cohort: Math.round(cohort(c.key as ComponentKey)) }));
  const seg  = SEGMENT_META[analysis.segment];
  const band = BAND_META[analysis.band];
  const recs = recommendedActions(analysis);
  const mentors = Array.from(new Set([s.mentor ?? "Faculty Advisor", ...MENTORS]));

  return (
    <div className="space-y-6">
      <Link href="/students" className="rise inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-400 transition-colors hover:text-slate-900">
        <ArrowLeft size={13} /> Back to explorer
      </Link>

      {/* ── Header card ─────────────────────────────────────────── */}
      <div className="card rise p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <Avatar name={s.fullName} size={52} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[22px] font-bold text-slate-900">{s.fullName}</h1>
                {s.showcaseTag && <span className="chip bg-indigo-50 text-indigo-600 border-indigo-200">Profile {s.showcaseTag}</span>}
              </div>
              <p className="font-mono2 mt-0.5 text-[11.5px] text-slate-400">{s.studentCode} · {s.email ?? "—"}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Chip color="#64748b">{s.department.split(" & ")[0]}</Chip>
                <Chip color="#64748b">Sem {s.semester} · Sec {s.section}</Chip>
                <Chip color={seg.color}>{seg.label}</Chip>
                <TrendChip trend={analysis.overallTrend} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <ScoreRing value={analysis.score} size={100} stroke={9} color={seg.color} label="Score" muted={analysis.provisional} />
            <div className="space-y-2 text-[12px]">
              <div><p className="text-slate-400">Data completeness</p><p className="font-mono2 font-bold text-slate-900">{analysis.completeness}%</p></div>
              <div><p className="text-slate-400">Mentor</p><p className="font-semibold text-slate-700">{s.mentor ?? "—"}</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Risk flags ──────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {([{ title: "Academic Risk", risk: analysis.academicRisk }, { title: "Placement Risk", risk: analysis.placementRisk }] as const).map(({ title, risk }) => {
          const m = RISK_META[risk.level];
          return (
            <div key={title} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-[15px] font-bold text-slate-900">{title}</h3>
                <Chip color={m.color}>{m.label}</Chip>
              </div>
              <div className="space-y-1.5">
                {risk.signals.length === 0
                  ? <p className="flex items-center gap-1.5 text-[12px] text-slate-400"><Info size={12} /> No warning signals.</p>
                  : risk.signals.map((sig, j) => (
                    <p key={j} className="flex items-start gap-2 text-[12.5px] text-slate-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sig.severity === "high" ? "#f43f5e" : sig.severity === "medium" ? "#f59e0b" : "#94a3b8" }} />
                      {sig.text}
                    </p>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Score breakdown ─────────────────────────────────────── */}
      <div className="card p-6">
        <SectionHead eyebrow="Score breakdown" title="Component contributions" desc="Each dimension normalized to 0–100 and combined with its documented weight." />
        <div className="space-y-3">
          {analysis.components.map((c) => (
            <div key={c.key} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
              <div className="w-36 shrink-0">
                <p className="text-[12.5px] font-semibold text-slate-800">{c.label}</p>
                <p className="text-[10.5px] text-slate-400">{COMPONENT_META[c.key as ComponentKey].source}</p>
              </div>
              <div className="flex-1">
                {c.available && c.value != null ? (
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="bar-sweep h-full rounded-full" style={{ width: `${c.value}%`, background: c.color }} />
                    </div>
                    <span className="font-mono2 w-8 text-right text-[13px] font-bold text-slate-900">{Math.round(c.value)}</span>
                  </div>
                ) : (
                  <p className="flex items-center gap-1.5 text-[11.5px] italic text-slate-400"><XCircle size={11} /> Not ingested</p>
                )}
                <div className="mt-1 flex flex-wrap gap-x-3 text-[10.5px] text-slate-400">
                  {c.signals.slice(0, 2).map((sig, j) => <span key={j}>· {sig}</span>)}
                </div>
              </div>
              <div className="w-16 text-right">
                <p className="font-mono2 text-[14px] font-bold" style={{ color: c.available ? c.color : "#94a3b8" }}>{c.available ? `+${c.contribution.toFixed(1)}` : "—"}</p>
                <p className="text-[9px] uppercase tracking-wide text-slate-400">pts</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Radar + Trend ────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="card p-5">
          <SectionHead eyebrow="Cohort comparison" title="Student vs class median" />
          <RadarCompare data={radar} height={240} />
          <div className="mt-2 flex justify-center gap-5 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-400" /> This student</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300" /> Class median</span>
          </div>
        </div>
        <div className="card p-5">
          <SectionHead eyebrow="Trend" title="Since last assessment" />
          <div className="space-y-3 mt-1">
            {[
              s.cgpa != null && s.prevCgpa != null ? { label: "CGPA", now: s.cgpa.toFixed(2), prev: s.prevCgpa.toFixed(2), up: s.cgpa >= s.prevCgpa } : null,
              s.attendancePct != null && s.prevAttendancePct != null ? { label: "Attendance", now: `${s.attendancePct.toFixed(0)}%`, prev: `${s.prevAttendancePct.toFixed(0)}%`, up: s.attendancePct >= s.prevAttendancePct } : null,
            ].filter(Boolean).map((t) => (
              <div key={t!.label} className="rounded-xl border border-slate-100 p-3.5">
                <p className="text-[12px] font-semibold text-slate-700">{t!.label}</p>
                <div className="font-mono2 mt-1.5 flex items-center gap-2 text-[12px]">
                  <span className="text-slate-400">{t!.prev}</span>
                  <span className="text-slate-300">→</span>
                  <span className="font-bold" style={{ color: t!.up ? "#10b981" : "#f43f5e" }}>{t!.now}</span>
                </div>
              </div>
            ))}
            <p className="text-[11px] leading-relaxed text-slate-400">Decline triggers early-warning flags, not automatic conclusions.</p>
          </div>
        </div>
      </div>

      {/* ── Recommended actions ─────────────────────────────────── */}
      <div>
        <SectionHead eyebrow="Advisor copilot" title="Recommended support" desc="Faculty review and own every decision — recommendations inform, not replace, judgement." />
        <RecommendationPanel recommendations={recs} studentId={s.id} studentCode={s.studentCode} studentName={s.fullName} mentors={mentors} />
      </div>

      {/* ── Intervention history ─────────────────────────────────── */}
      <div>
        <SectionHead eyebrow="Outcome tracking" title={`Intervention history (${items.length})`} />
        <InterventionList items={items} />
      </div>
    </div>
  );
}
