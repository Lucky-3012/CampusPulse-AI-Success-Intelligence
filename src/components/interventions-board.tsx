"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, CheckCheck, Loader2, Save, StickyNote } from "lucide-react";
import { Avatar, Chip, EmptyState } from "@/components/ui";
import {
  STATUS_META,
  OUTCOME_META,
  PRIORITY_META,
  SEGMENT_META,
  type SegmentKey,
} from "@/lib/scoring";
import { cn, rgba, timeAgo } from "@/lib/utils";

export interface BoardItem {
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

async function patchIntervention(id: number, patch: Record<string, string | null>) {
  const res = await fetch(`/api/interventions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Update failed");
  return res.json();
}

export function InterventionCard({ item }: { item: BoardItem }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [, startTransition] = useTransition();
  const dirty = notes !== (item.notes ?? "");
  const sMeta = STATUS_META[item.status] ?? STATUS_META.pending;
  const pMeta = PRIORITY_META[item.priority] ?? PRIORITY_META.medium;
  const seg = SEGMENT_META[item.segment as SegmentKey];

  const update = (patch: Record<string, string | null>) => {
    setBusy(true);
    startTransition(async () => {
      try {
        await patchIntervention(item.id, patch);
        router.refresh();
      } finally {
        setBusy(false);
      }
    });
  };

  return (
    <div className="card card-hover p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip color={pMeta.color} dot={false} className="!text-[9.5px]">{pMeta.label}</Chip>
            <span className="rounded-md bg-[rgba(15,23,42,0.08)] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#64748b]">{item.category}</span>
          </div>
          <h4 className="font-display mt-2 text-[13.5px] font-semibold leading-snug text-slate-900">{item.title}</h4>
          {item.detail && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#64748b]">{item.detail}</p>}
        </div>
        {busy && <Loader2 size={14} className="mt-0.5 animate-spin text-[#6366f1]" />}
      </div>

      <Link href={`/students/${item.studentCode}`} className="mt-3 flex items-center gap-2.5 rounded-xl border border-[rgba(15,23,42,0.09)] bg-[rgba(15,23,42,0.04)] p-2 transition-colors hover:border-[rgba(99,102,241,0.35)]">
        <Avatar name={item.studentName} size={26} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold text-slate-900">{item.studentName}</div>
          <div className="font-mono2 text-[9.5px] text-[#94a3b8]">{item.studentCode} · Sem {item.semester}</div>
        </div>
        {seg && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: seg.color, boxShadow: `0 0 8px ${rgba(seg.color, 0.6)}` }} title={seg.label} />}
        {item.score != null && <span className="font-mono2 text-[11px] font-bold text-[#475569]">{Math.round(item.score)}</span>}
      </Link>

      <div className="mt-3 flex items-center gap-1.5 text-[10.5px] text-[#94a3b8]">
        <span className="truncate">Assigned to <span className="text-[#64748b]">{item.assignedBy}</span></span>
        <span className="ml-auto shrink-0">updated {timeAgo(item.updatedAt)}</span>
      </div>

      <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-[rgba(15,23,42,0.05)] px-2.5 py-2">
        <StickyNote size={11} className="mt-0.5 shrink-0 text-[#94a3b8]" />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Record follow-up note…"
          rows={notes ? 2 : 1}
          className="w-full resize-none bg-transparent text-[11px] leading-relaxed text-[#475569] outline-none placeholder:text-[#94a3b8]"
        />
        {dirty && (
          <button onClick={() => update({ notes })} disabled={busy} className="btn btn-primary !rounded-md !px-2 !py-1 !text-[9.5px]" title="Save note">
            <Save size={10} /> Save
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {item.status === "pending" && (
          <button onClick={() => update({ status: "in_progress" })} disabled={busy} className="btn btn-ghost flex-1 !py-2 !text-[11px]">
            <Play size={11} /> Start intervention
          </button>
        )}
        {item.status === "in_progress" && (
          <button onClick={() => update({ status: "completed" })} disabled={busy} className="btn btn-ghost flex-1 !py-2 !text-[11px] hover:!bg-[rgba(52,211,153,0.12)] hover:!text-[#10b981]">
            <CheckCheck size={12} /> Mark complete
          </button>
        )}
        {item.status === "completed" && (
          <div className="flex flex-1 items-center gap-1.5">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">Outcome</span>
            <select
              value={item.outcome ?? ""}
              disabled={busy}
              onChange={(e) => update({ outcome: e.target.value || null })}
              className="input flex-1 !rounded-lg !px-2 !py-1.5 !text-[10.5px]"
              style={item.outcome ? { color: OUTCOME_META[item.outcome]?.color, borderColor: rgba(OUTCOME_META[item.outcome]?.color ?? "#64748b", 0.4) } : undefined}
            >
              <option value="">Not recorded…</option>
              <option value="improved">Improved</option>
              <option value="stable">Stable</option>
              <option value="needs_review">Needs review</option>
            </select>
          </div>
        )}
        <span className="chip shrink-0 !text-[9px]" style={{ color: sMeta.color, background: rgba(sMeta.color, 0.1), borderColor: rgba(sMeta.color, 0.28) }}>● {sMeta.label}</span>
      </div>
    </div>
  );
}

export function InterventionBoard({ items }: { items: BoardItem[] }) {
  const columns = [
    { key: "pending", ...STATUS_META.pending },
    { key: "in_progress", ...STATUS_META.in_progress },
    { key: "completed", ...STATUS_META.completed },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {columns.map((c) => {
        const list = items.filter((i) => i.status === c.key);
        return (
          <div key={c.key} className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5 rounded-2xl border border-[rgba(15,23,42,0.09)] bg-[rgba(16,22,36,0.5)] px-4 py-3">
              <span className="h-2 w-2 rounded-full" style={{ background: c.color, boxShadow: `0 0 10px ${rgba(c.color, 0.7)}` }} />
              <span className="font-display text-[13px] font-semibold text-slate-900">{c.label}</span>
              <span className="ml-auto font-mono2 text-[11px] font-bold" style={{ color: c.color }}>{list.length}</span>
            </div>
            <div className={cn("flex flex-col gap-3 rounded-2xl border border-dashed p-2", list.length === 0 ? "border-[rgba(15,23,42,0.12)]" : "border-transparent p-0")}>
              {list.length === 0 && <EmptyState title={`No ${c.label.toLowerCase()} interventions`} hint="Actions assigned from student profiles appear here first." />}
              {list.map((i) => <InterventionCard key={i.id} item={i} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function InterventionList({ items }: { items: BoardItem[] }) {
  if (items.length === 0) return <EmptyState title="No interventions recorded yet" hint="Assign a recommended support action above — it will be tracked here across sessions." />;
  return (
    <div className="grid gap-3">
      {items.map((i) => <InterventionCard key={i.id} item={i} />)}
    </div>
  );
}
