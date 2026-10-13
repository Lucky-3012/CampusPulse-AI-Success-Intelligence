"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, ArrowUpDown, ArrowRight } from "lucide-react";
import { Avatar, Chip, MiniMeter, EmptyState } from "@/components/ui";
import { TrendChip } from "@/components/widgets";
import {
  SEGMENT_META,
  RISK_META,
  BAND_META,
  COMPONENT_META,
  type SegmentKey,
} from "@/lib/scoring";
import { cn } from "@/lib/utils";

export interface ExplorerRow {
  code: string;
  name: string;
  dept: string;
  deptShort: string;
  semester: number;
  section: string;
  mentor: string | null;
  score: number | null;
  completeness: number;
  provisional: boolean;
  segment: SegmentKey;
  band: "strong" | "developing" | "support";
  academicRisk: "high" | "medium" | "low" | "unknown";
  placementRisk: "high" | "medium" | "low" | "unknown";
  trend: "improving" | "stable" | "declining";
  tag: string | null;
  priorityScore: number;
  comps: [number | null, number | null, number | null, number | null, number | null, number | null];
}

const COMP_COLORS = [
  COMPONENT_META.academic.color,
  COMPONENT_META.attendance.color,
  COMPONENT_META.lms.color,
  COMPONENT_META.engagement.color,
  COMPONENT_META.skills.color,
  COMPONENT_META.placement.color,
];

type SortKey = "priority" | "score" | "name" | "risk";

export function Explorer({ rows }: { rows: ExplorerRow[] }) {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [sec, setSec] = useState("all");
  const [sem, setSem] = useState("all");
  const [segment, setSegment] = useState("all");
  const [arisk, setArisk] = useState("all");
  const [prisk, setPrisk] = useState("all");
  const [sort, setSort] = useState<SortKey>("priority");
  const [dir, setDir] = useState<-1 | 1>(1);

  // Sync filters/sort with deep links from dashboard buttons
  const searchParams = useSearchParams();
  useEffect(() => {
    const qParam = searchParams.get("q");
    const deptParam = searchParams.get("dept");
    const secParam = searchParams.get("sec");
    const semParam = searchParams.get("sem");
    const segmentParam = searchParams.get("segment");
    const ariskParam = searchParams.get("arisk");
    const priskParam = searchParams.get("prisk");
    const sortParam = searchParams.get("sort") as SortKey | null;
    const dirParam = searchParams.get("dir");

    setQ(qParam ?? "");
    setDept(deptParam ?? "all");
    setSec(secParam ?? "all");
    setSem(semParam ?? "all");
    setSegment(segmentParam ?? "all");
    setArisk(ariskParam ?? "all");
    setPrisk(priskParam ?? "all");
    if (sortParam && ["priority", "score", "name", "risk"].includes(sortParam)) {
      setSort(sortParam);
    }
    setDir(dirParam === "desc" ? -1 : 1);
  }, [searchParams]);

  const depts = useMemo(() => Array.from(new Set(rows.map((r) => r.dept))).sort(), [rows]);
  const segCounts = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.segment, (m.get(r.segment) ?? 0) + 1));
    return m;
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (ql && !r.name.toLowerCase().includes(ql) && !r.code.toLowerCase().includes(ql)) return false;
      if (dept !== "all" && r.dept !== dept) return false;
      if (sec !== "all" && r.section !== sec) return false;
      if (sem !== "all" && r.semester !== Number(sem)) return false;
      if (segment !== "all" && r.segment !== segment) return false;
      if (arisk !== "all" && r.academicRisk !== arisk) return false;
      if (prisk !== "all" && r.placementRisk !== prisk) return false;
      return true;
    });
    const riskW = { high: 3, medium: 2, low: 1, unknown: 0 } as const;
    out = out.sort((a, b) => {
      let v = 0;
      if (sort === "priority") v = b.priorityScore - a.priorityScore;
      else if (sort === "score") v = (a.score ?? -1) - (b.score ?? -1);
      else if (sort === "name") v = a.name.localeCompare(b.name);
      else v = riskW[b.academicRisk] * 10 + riskW[b.placementRisk] - (riskW[a.academicRisk] * 10 + riskW[a.placementRisk]);
      return v * dir;
    });
    return out;
  }, [rows, q, dept, sec, sem, segment, arisk, prisk, sort, dir]);

  const sortBtn = (key: SortKey, label: string) => (
    <button
      onClick={() => {
        if (sort === key) setDir((d) => (d === 1 ? -1 : 1));
        else { setSort(key); setDir(1); }
      }}
      className={cn(
        "btn !rounded-lg !px-2.5 !py-1.5 text-[11px]",
        sort === key ? "bg-[rgba(99,102,241,0.14)] text-[#4338ca] border-[rgba(99,102,241,0.3)]" : "btn-ghost"
      )}
    >
      <ArrowUpDown size={11} /> {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Segment quick filters */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSegment("all")} className={cn("chip cursor-pointer transition-all", segment === "all" && "ring-1 ring-[#6366f1]")} style={{ color: "#0f172a", background: "rgba(15,23,42,0.08)", borderColor: "rgba(15,23,42,0.18)" }}>
          All segments · {rows.length}
        </button>
        {(Object.keys(SEGMENT_META) as SegmentKey[]).map((k) => {
          const meta = SEGMENT_META[k];
          const n = segCounts.get(k) ?? 0;
          if (n === 0) return null;
          return (
            <button
              key={k}
              onClick={() => setSegment(segment === k ? "all" : k)}
              className={cn("chip cursor-pointer transition-all hover:brightness-125", segment === k && "ring-1")}
              style={{ color: meta.color, background: `${meta.color}1a`, borderColor: `${meta.color}4d`, ["--tw-ring-color" as string]: meta.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
              {meta.label} · {n}
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="card flex flex-wrap items-center gap-2.5 p-3.5">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or register no…" className="input w-full !pl-9" />
        </div>
        <select value={dept} onChange={(e) => setDept(e.target.value)} className="input">
          <option value="all">All branches</option>
          {depts.map((d) => (<option key={d} value={d}>{d}</option>))}
        </select>
        <select value={sec} onChange={(e) => setSec(e.target.value)} className="input">
          <option value="all">All sections</option>
          <option value="A">Section A</option>
          <option value="B">Section B</option>
        </select>
        <select value={sem} onChange={(e) => setSem(e.target.value)} className="input">
          <option value="all">All semesters</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (<option key={s} value={s}>Semester {s}</option>))}
        </select>
        <select value={arisk} onChange={(e) => setArisk(e.target.value)} className="input">
          <option value="all">Academic risk: any</option>
          <option value="high">Academic: high</option>
          <option value="medium">Academic: review</option>
          <option value="low">Academic: stable</option>
        </select>
        <select value={prisk} onChange={(e) => setPrisk(e.target.value)} className="input">
          <option value="all">Placement risk: any</option>
          <option value="high">Placement: high</option>
          <option value="medium">Placement: review</option>
          <option value="low">Placement: ready</option>
          <option value="unknown">Placement: no data</option>
        </select>
        <div className="ml-auto flex items-center gap-1.5">
          <SlidersHorizontal size={13} className="text-[#94a3b8]" />
          {sortBtn("priority", "Priority")}
          {sortBtn("score", "Score")}
          {sortBtn("risk", "Risk")}
          {sortBtn("name", "Name")}
        </div>
      </div>

      <div className="text-[11.5px] font-medium text-[#94a3b8]">
        Showing <span className="font-mono2 text-[#4338ca]">{filtered.length}</span> of {rows.length} unified profiles
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="max-h-[68vh] overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#ffffff]">
              <tr className="border-b border-[rgba(15,23,42,0.12)] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
                <th className="px-5 py-3.5">Student</th>
                <th className="px-3 py-3.5">Dept · Sem</th>
                <th className="px-3 py-3.5">Success Score</th>
                <th className="px-3 py-3.5">Dimensions</th>
                <th className="px-3 py-3.5">Segment</th>
                <th className="px-3 py-3.5">Acad. Risk</th>
                <th className="px-3 py-3.5">Place. Risk</th>
                <th className="px-3 py-3.5">Trend</th>
                <th className="px-3 py-3.5 text-right">Data</th>
                <th className="px-3 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const seg = SEGMENT_META[r.segment];
                const ar = RISK_META[r.academicRisk];
                const pr = RISK_META[r.placementRisk];
                const band = BAND_META[r.band];
                return (
                  <tr key={r.code} className="group border-b border-[rgba(15,23,42,0.06)] transition-colors hover:bg-[rgba(99,102,241,0.045)]">
                    <td className="px-5 py-3">
                      <Link href={`/students/${r.code}`} className="flex items-center gap-3">
                        <Avatar name={r.name} size={32} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-slate-900 group-hover:text-[#4338ca]">
                            {r.name}
                            {r.tag && <span className="rounded bg-[rgba(99,102,241,0.16)] px-1 py-px font-mono2 text-[9px] font-bold text-[#6366f1]">{r.tag}</span>}
                          </div>
                          <div className="font-mono2 text-[10.5px] text-[#94a3b8]">{r.code}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-[11.5px] font-medium text-[#475569]">{r.deptShort}</div>
                      <div className="text-[10.5px] text-[#94a3b8]">Sem {r.semester} · Sec {r.section}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-mono2 text-[15px] font-bold")} style={{ color: r.provisional ? "#64748b" : band.color }}>
                          {r.score == null ? "—" : Math.round(r.score)}
                        </span>
                        {r.provisional && <span className="chip !px-1.5 !py-0.5 !text-[9px]" style={{ color: "#64748b", background: "rgba(100,116,139,0.1)", borderColor: "rgba(100,116,139,0.3)" }}>PROV</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3"><MiniMeter values={r.comps} colors={COMP_COLORS} /></td>
                    <td className="px-3 py-3"><Chip color={seg.color} dot={false} className="!text-[10px]">{seg.label}</Chip></td>
                    <td className="px-3 py-3"><span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: ar.color }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: ar.color }} />{ar.label}</span></td>
                    <td className="px-3 py-3"><span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: pr.color }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: pr.color }} />{pr.label}</span></td>
                    <td className="px-3 py-3"><TrendChip trend={r.trend} /></td>
                    <td className="px-3 py-3 text-right"><span className="font-mono2 text-[11px] text-[#64748b]">{r.completeness}%</span></td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/students/${r.code}`} className="inline-grid h-7 w-7 place-items-center rounded-lg text-[#94a3b8] transition-all hover:bg-[rgba(99,102,241,0.14)] hover:text-slate-900">
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8"><EmptyState title="No students match these filters" hint="Loosen one or more filters — segments and risk flags are combinable." /></div>
          )}
        </div>
      </div>
    </div>
  );
}
