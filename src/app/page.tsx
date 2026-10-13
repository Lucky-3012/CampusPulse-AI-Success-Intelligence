import Link from "next/link";
import { Users, TriangleAlert, Target, HeartPulse, ArrowRight, TrendingDown, Building2, Clock3 } from "lucide-react";
import { getAnalyzedStudents, getInterventionsFeed, getLastSync } from "@/lib/queries";
import { SEGMENT_META, SEGMENT_ORDER, COMPONENT_META, WEIGHTS, type ComponentKey } from "@/lib/scoring";
import { SectionHead, Chip, Avatar } from "@/components/ui";
import { ScoreHistogram, SegmentDonut } from "@/components/charts";
import { KpiCard } from "@/components/widgets";
import { rgba, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BUCKETS = [
  { label: "<40", mid: 35, lo: 0, hi: 40 }, { label: "40s", mid: 45, lo: 40, hi: 50 },
  { label: "50s", mid: 55, lo: 50, hi: 60 }, { label: "60s", mid: 65, lo: 60, hi: 70 },
  { label: "70s", mid: 75, lo: 70, hi: 80 }, { label: "80s", mid: 85, lo: 80, hi: 90 },
  { label: "90+", mid: 95, lo: 90, hi: 101 },
];

export default async function OverviewPage() {
  const [analyses, feed, lastSync] = await Promise.all([getAnalyzedStudents(), getInterventionsFeed(), getLastSync()]);

  const scored = analyses.filter((a) => a.score != null);
  const avgScore = Math.round(scored.reduce((s, a) => s + (a.score ?? 0), 0) / (scored.length || 1));
  const highAcademic = analyses.filter((a) => a.academicRisk.level === "high").length;
  const placementAtRisk = analyses.filter((a) => a.placementRisk.level === "high" || a.placementRisk.level === "medium").length;
  const openInterventions = feed.filter((f) => f.status !== "completed").length;

  const histogram = BUCKETS.map((b) => ({
    bucket: b.label, mid: b.mid,
    count: scored.filter((a) => (a.score ?? 0) >= b.lo && (a.score ?? 0) < b.hi).length,
  }));

  const segRows = SEGMENT_ORDER.map((k) => ({
    key: k, name: SEGMENT_META[k].label,
    value: analyses.filter((a) => a.segment === k).length, color: SEGMENT_META[k].color,
  })).filter((r) => r.value > 0);

  const priority = [...analyses]
    .sort((x, y) => y.priorityScore - x.priorityScore)
    .filter((a) => a.segment !== "insufficient-data")
    .slice(0, 6);

  const recentFeed = feed.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* ── Page Title ─────────────────────────────────────────── */}
      <div className="rise flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-500">Faculty Command Center</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">Overview</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            {analyses.length} students across 6 branches — {lastSync ? `last synced ${timeAgo(lastSync)}` : "syncing…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/branches" className="btn btn-ghost !text-[12px]"><Building2 size={13} /> Branches</Link>
          <Link href="/students" className="btn btn-primary !text-[12px]">All students <ArrowRight size={13} /></Link>
        </div>
      </div>

      {/* ── KPI Blocks (clickable) ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          icon={<Users size={14} />}
          label="Total Students"
          value={analyses.length}
          color="#6366f1"
          delay={0}
          href="/students"
          cta="Open all records"
        />
        <KpiCard
          icon={<Target size={14} />}
          label="Avg Success Score"
          value={avgScore}
          color="#8b5cf6"
          delay={60}
          href="/students?sort=score&dir=desc"
          cta="View top scores"
        />
        <KpiCard
          icon={<TriangleAlert size={14} />}
          label="Academic Flags"
          value={highAcademic}
          color="#f43f5e"
          delay={120}
          href="/students?arisk=high"
          cta="See flagged students"
        />
        <KpiCard
          icon={<HeartPulse size={14} />}
          label="Open Interventions"
          value={openInterventions}
          color="#f59e0b"
          delay={180}
          href="/interventions"
          cta="Open intervention board"
        />
      </div>

      {/* ── Charts ─────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="card p-5">
          <SectionHead eyebrow="Score distribution" title="Success Score — cohort view" />
          <ScoreHistogram data={histogram} height={200} />
        </div>
        <div className="card p-5">
          <SectionHead eyebrow="Segments" title="Student segments" />
          <SegmentDonut data={segRows} total={analyses.length} height={180} />
          <div className="mt-3 space-y-1.5">
            {segRows.slice(0, 5).map((r) => (
              <Link key={r.key} href={`/students?segment=${r.key}`} className="flex items-center gap-2 rounded-lg px-2 py-1 text-[12px] transition-colors hover:bg-slate-50">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: r.color }} />
                <span className="text-slate-600 flex-1">{r.name}</span>
                <span className="font-mono2 font-semibold text-slate-900">{r.value}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Priority students + Recent activity ─────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Priority list */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-rose-500">Needs Attention</p>
              <h3 className="font-display text-[16px] font-bold text-slate-900">Priority students</h3>
            </div>
            <Link href="/students" className="btn btn-ghost !py-1.5 !text-[11.5px]">View all <ArrowRight size={12} /></Link>
          </div>
          <div className="divide-y divide-slate-50">
            {priority.map((a, i) => {
              const seg = SEGMENT_META[a.segment];
              const withHigh = a.academicRisk.level === "high" || a.placementRisk.level === "high";
              return (
                <Link key={a.student.studentCode} href={`/students/${a.student.studentCode}`} className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-slate-50">
                  <span className="font-mono2 w-5 text-[11px] text-slate-300">{i + 1}</span>
                  <Avatar name={a.student.fullName} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-900">{a.student.fullName}</p>
                    <p className="font-mono2 text-[10px] text-slate-400">{a.student.studentCode} · {a.student.department.split(" ")[0]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono2 text-[14px] font-bold" style={{ color: withHigh ? "#f43f5e" : "#f59e0b" }}>
                      {a.score != null ? Math.round(a.score) : "—"}
                    </span>
                    <span className="chip !text-[9.5px]" style={{ color: seg.color, background: rgba(seg.color, 0.1), borderColor: rgba(seg.color, 0.22) }}>
                      {seg.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-[16px] font-bold text-slate-900">Recent interventions</h3>
            <Link href="/interventions" className="text-[11.5px] font-semibold text-indigo-500 hover:underline">Board →</Link>
          </div>
          <div className="space-y-4">
            {recentFeed.map((f) => {
              const dot = f.status === "completed" ? "#10b981" : f.status === "in_progress" ? "#6366f1" : "#f59e0b";
              return (
                <Link href={`/students/${f.studentCode}`} key={f.id} className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dot }} />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium leading-snug text-slate-800">{f.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">{f.studentName}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-300"><Clock3 size={10} /> {timeAgo(f.updatedAt)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Formula strip ────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-indigo-500">Scoring Formula</p>
            <p className="font-mono2 mt-1 text-[13px] font-semibold text-slate-900">S = 0.35·A + 0.20·T + 0.15·L + 0.10·E + 0.10·K + 0.10·P</p>
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            {(Object.keys(COMPONENT_META) as ComponentKey[]).map((k) => (
              <span key={k} className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500">
                <span className="h-2 w-2 rounded-full" style={{ background: COMPONENT_META[k].color }} />
                {COMPONENT_META[k].short} {Math.round(WEIGHTS[k] * 100)}%
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
