import { HeartPulse, Play, CheckCheck, TrendingUp } from "lucide-react";
import { getInterventionsFeed } from "@/lib/queries";
import { InterventionBoard } from "@/components/interventions-board";

export const dynamic = "force-dynamic";

export default async function InterventionsPage() {
  const feed = await getInterventionsFeed();
  const pending    = feed.filter((f) => f.status === "pending").length;
  const inProgress = feed.filter((f) => f.status === "in_progress").length;
  const completed  = feed.filter((f) => f.status === "completed").length;
  const total      = feed.length;

  const STATS = [
    { label: "Pending",     value: pending,    dot: "#f59e0b" },
    { label: "In progress", value: inProgress, dot: "#6366f1" },
    { label: "Completed",   value: completed,  dot: "#10b981" },
    { label: "Total",       value: total,      dot: "#64748b" },
  ];

  return (
    <div className="space-y-7">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="rise flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-500">Insight to Action</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">Interventions</h1>
          <p className="mt-1 text-[13px] text-slate-500">Track faculty-assigned support actions from pending through to recorded outcomes.</p>
        </div>
        {/* Summary pills */}
        <div className="flex flex-wrap gap-2.5">
          {STATS.map((s) => (
            <div key={s.label} className="card flex items-center gap-2.5 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.dot }} />
              <span className="text-[11.5px] font-medium text-slate-500">{s.label}</span>
              <span className="font-mono2 text-[15px] font-bold text-slate-900">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Kanban board ───────────────────────────────────────── */}
      <InterventionBoard items={feed} />
    </div>
  );
}
