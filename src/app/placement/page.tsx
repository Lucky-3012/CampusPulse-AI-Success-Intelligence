import Link from "next/link";
import { Target, TriangleAlert, Hourglass, ArrowUpRight } from "lucide-react";
import { getAnalyzedStudents } from "@/lib/queries";
import { RISK_META, type ComponentKey } from "@/lib/scoring";
import { SectionHead, Chip, Avatar } from "@/components/ui";
import { DeptCompareBars, AptitudeScatter } from "@/components/charts";
import { rgba } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PlacementPage() {
  const analyses = await getAnalyzedStudents();

  const withData = analyses.filter((a) => a.components.find((c) => c.key === "placement")?.available);
  const noData   = analyses.filter((a) => !a.components.find((c) => c.key === "placement")?.available);
  const pVal = (a: (typeof analyses)[number]) => a.components.find((c) => c.key === "placement")?.value ?? null;

  const avgReady = Math.round(withData.reduce((s, a) => s + (pVal(a) ?? 0), 0) / (withData.length || 1));
  const highRisk = withData.filter((a) => a.placementRisk.level === "high").length;
  const ready65  = withData.filter((a) => (pVal(a) ?? 0) >= 65).length;

  const scatter = withData
    .filter((a) => a.student.aptitudeScore != null && a.student.codingScore != null)
    .slice(0, 200)
    .map((a) => ({ x: Math.round(a.student.aptitudeScore!), y: Math.round(a.student.codingScore!), name: a.student.fullName }));

  const deptRows = Array.from(new Set(analyses.map((a) => a.student.department))).map((d) => {
    const inDept = analyses.filter((a) => a.student.department === d);
    const avgOf = (key: ComponentKey) => {
      const vals = inDept.map((a) => a.components.find((c) => c.key === key)?.value).filter((v): v is number => v != null);
      return vals.length ? Math.round((vals.reduce((x, y) => x + y, 0) / vals.length) * 10) / 10 : null;
    };
    return { dept: inDept[0]?.student.studentCode.slice(0, 3) ?? "???", academic: avgOf("academic"), placement: avgOf("placement") };
  });

  const pillars = [
    { key: "aptitudeScore" as const,      label: "Aptitude",       bench: 65 },
    { key: "codingScore" as const,         label: "Coding / DSA",   bench: 60 },
    { key: "mockInterviewScore" as const,  label: "Mock Interview", bench: 65 },
    { key: "technicalScore" as const,      label: "Technical",      bench: 70 },
    { key: "softSkillScore" as const,      label: "Soft Skills",    bench: 70 },
  ].map((p) => {
    const vals = analyses.map((a) => a.student[p.key]).filter((v): v is number => v != null);
    const avg  = vals.length ? Math.round((vals.reduce((x, y) => x + y, 0) / vals.length) * 10) / 10 : 0;
    return { ...p, avg, behind: avg < p.bench };
  });

  const attention = [...withData].sort((a, b) => (pVal(a) ?? 0) - (pVal(b) ?? 0)).slice(0, 8);

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="rise flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-600">Placement Intelligence</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">Placement Readiness</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            {withData.length} assessed · {ready65} above employability benchmark · {noData.length} awaiting data
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {[
            { label: "Avg Readiness", value: `${avgReady}/100`, color: "#6366f1" },
            { label: "High Risk",     value: highRisk,           color: "#f43f5e" },
            { label: "Awaiting Data", value: noData.length,      color: "#94a3b8" },
          ].map((s) => (
            <div key={s.label} className="card px-4 py-2.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
              <p className="font-mono2 mt-0.5 text-[18px] font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts row ─────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="card p-5">
          <SectionHead eyebrow="Skill map" title="Aptitude × Coding scatter" desc="Dots below both dashed lines need targeted coaching." />
          <AptitudeScatter data={scatter} height={240} />
        </div>

        <div className="card p-5">
          <SectionHead eyebrow="Benchmarks" title="Skill gaps" />
          <div className="space-y-4 mt-1">
            {pillars.map((p) => (
              <div key={p.key}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-[12.5px] font-medium text-slate-700">{p.label}</span>
                  <span className="font-mono2 text-[12px] font-bold" style={{ color: p.behind ? "#f43f5e" : "#10b981" }}>
                    {p.avg}<span className="text-slate-300">/{p.bench}</span>
                  </span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="bar-sweep h-full rounded-full" style={{ width: `${p.avg}%`, background: p.behind ? "#f43f5e" : "#10b981" }} />
                  <span className="absolute top-0 h-full w-px bg-slate-400/40" style={{ left: `${p.bench}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dept comparison ────────────────────────────────────── */}
      <div className="card p-5">
        <SectionHead eyebrow="By department" title="Academic vs placement, per branch" />
        <DeptCompareBars data={deptRows} height={200} />
      </div>

      {/* ── Coaching queue ─────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-rose-500">Coaching Queue</p>
            <h3 className="font-display text-[16px] font-bold text-slate-900">Lowest readiness first</h3>
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {attention.map((a, i) => {
            const s = a.student;
            const pScore = pVal(a);
            const pr = RISK_META[a.placementRisk.level];
            return (
              <Link key={s.studentCode} href={`/students/${s.studentCode}`} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-slate-50">
                <span className="font-mono2 w-5 text-[11px] text-slate-300">{i + 1}</span>
                <Avatar name={s.fullName} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-900">{s.fullName}</p>
                  <p className="font-mono2 text-[10px] text-slate-400">{s.studentCode} · Sem {s.semester}</p>
                </div>
                <span className="chip !text-[9.5px]" style={{ color: pr.color, background: rgba(pr.color, 0.1), borderColor: rgba(pr.color, 0.22) }}>{pr.label}</span>
                <span className="font-mono2 w-14 text-right text-[15px] font-bold" style={{ color: (pScore ?? 0) < 45 ? "#f43f5e" : "#f59e0b" }}>
                  {pScore != null ? Math.round(pScore) : "—"}<span className="text-[10px] text-slate-300">/100</span>
                </span>
                <ArrowUpRight size={14} className="text-slate-300" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
