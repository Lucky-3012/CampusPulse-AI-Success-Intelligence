"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { PRIORITY_META } from "@/lib/scoring";
import { cn, rgba } from "@/lib/utils";

export interface Rec {
  key: string;
  title: string;
  category: string;
  detail: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

export function RecommendationPanel({ recommendations, studentId, studentCode, studentName, mentors }: {
  recommendations: Rec[];
  studentId: number;
  studentCode: string;
  studentName: string;
  mentors: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<Rec | null>(null);
  const [assignee, setAssignee] = useState(mentors[0] ?? "Faculty Advisor");
  const [priority, setPriority] = useState<string>("medium");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const launch = (r: Rec) => {
    setOpen(r);
    setPriority(r.priority);
    setNote("");
    setDone(null);
  };

  const submit = () => {
    if (!open) return;
    setBusy(true);
    startTransition(async () => {
      try {
        const res = await fetch("/api/interventions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, actionKey: open.key, assignedBy: assignee, priority, notes: note || null }),
        });
        if (!res.ok) throw new Error("failed");
        setDone(open.title);
        setTimeout(() => { setOpen(null); router.refresh(); }, 900);
      } finally {
        setBusy(false);
      }
    });
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {recommendations.map((r, idx) => {
          const p = PRIORITY_META[r.priority];
          return (
            <div key={r.key + idx} className="card card-hover rise flex flex-col p-4" style={{ animationDelay: `${idx * 60}ms` }}>
              <div className="flex items-center gap-1.5">
                <span className="rounded-md bg-[rgba(99,102,241,0.12)] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#4338ca]">{r.category}</span>
                <span className="chip !text-[9px]" style={{ color: p.color, background: rgba(p.color, 0.1), borderColor: rgba(p.color, 0.3) }}>{p.label}</span>
              </div>
              <h4 className="font-display mt-2 text-[13.5px] font-semibold text-slate-900">{r.title}</h4>
              <p className="mt-1 flex-1 text-[11px] leading-relaxed text-[#64748b]">{r.detail}</p>
              <p className="mt-2 flex items-start gap-1.5 text-[10.5px] italic leading-relaxed text-[#94a3b8]">
                <Sparkles size={10} className="mt-0.5 shrink-0 text-[#6366f1]" /> {r.reason}
              </p>
              <button onClick={() => launch(r)} className="btn btn-ghost mt-3 w-full !py-2 !text-[11px] hover:!bg-[rgba(99,102,241,0.14)] hover:!text-[#4338ca]">
                <Plus size={12} /> Assign this intervention
              </button>
            </div>
          );
        })}
      </div>

      {/* Assign modal */}
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
          <div className="fade-in absolute inset-0 bg-[rgba(15,23,42,0.5)] backdrop-blur-sm" onClick={() => !busy && setOpen(null)} />
          <div className="modal-in relative w-full max-w-md rounded-3xl border border-[rgba(15,23,42,0.16)] bg-[#ffffff] p-6 shadow-2xl">
            <button onClick={() => !busy && setOpen(null)} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-[#64748b] transition-colors hover:bg-[rgba(15,23,42,0.08)] hover:text-slate-900">
              <X size={15} />
            </button>
            {done ? (
              <div className="grid place-items-center py-8 text-center">
                <CheckCircle2 size={40} className="text-[#10b981]" />
                <div className="font-display mt-3 text-[15px] font-semibold text-slate-900">Intervention assigned</div>
                <div className="mt-1 text-[12px] text-[#64748b]">“{done}” is now tracked on the board.</div>
              </div>
            ) : (
              <>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6366f1]">Assign intervention</div>
                <h3 className="font-display mt-1.5 text-[18px] font-semibold text-slate-900">{open.title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[#64748b]">{open.detail}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
                  for <span className="font-semibold text-[#4338ca]">{studentName}</span>
                  <span className="font-mono2 text-[10px]">({studentCode})</span>
                </div>
                <div className="mt-5 space-y-3.5">
                  <label className="block">
                    <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">Assign to</span>
                    <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="input w-full">
                      {mentors.map((m) => (<option key={m} value={m}>{m}</option>))}
                    </select>
                  </label>
                  <div>
                    <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">Priority</span>
                    <div className="flex gap-2">
                      {(["low", "medium", "high"] as const).map((p) => {
                        const m = PRIORITY_META[p];
                        const on = priority === p;
                        return (
                          <button key={p} onClick={() => setPriority(p)} className={cn("chip cursor-pointer capitalize transition-all", on && "ring-1")} style={{ color: m.color, background: rgba(m.color, on ? 0.16 : 0.07), borderColor: rgba(m.color, on ? 0.55 : 0.22), ["--tw-ring-color" as string]: m.color }}>
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">Note (optional)</span>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Context for the assignee…" className="input w-full resize-none" />
                  </label>
                </div>
                <button onClick={submit} disabled={busy} className="btn btn-primary mt-5 w-full !py-2.5">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  Confirm — add to intervention board
                </button>
                <p className="mt-3 text-center text-[10px] leading-relaxed text-[#94a3b8]">
                  Recommendations support faculty judgement; the assignee reviews and owns every decision.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
