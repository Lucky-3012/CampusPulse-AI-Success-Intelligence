"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from "recharts";
import { rgba } from "@/lib/utils";

const AXIS = { fill: "#64748b", fontSize: 10.5, fontWeight: 500 } as const;
const GRID = "rgba(15,23,42,0.06)";

function LightTooltip({ active, payload, label, unit = "" }: { active?: boolean; payload?: { name?: string; value?: number | string; color?: string }[]; label?: string | number; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xl shadow-slate-900/5">
      {label != null && <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[12px]">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? "#6366f1" }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-mono2 font-semibold text-slate-900">
            {typeof p.value === "number" ? Math.round(p.value * 10) / 10 : p.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Score distribution histogram ────────────────────────────────────────── */

export interface BucketRow { bucket: string; count: number; mid: number }

export function ScoreHistogram({ data, height = 210 }: { data: BucketRow[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap="18%">
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="bucket" tick={AXIS} tickLine={false} axisLine={{ stroke: "rgba(15,23,42,0.1)" }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip content={<LightTooltip unit=" students" />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
        <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]}>
          {data.map((d) => {
            const color = d.mid < 60 ? "#f43f5e" : d.mid < 80 ? "#f59e0b" : "#10b981";
            return <Cell key={d.bucket} fill={color} fillOpacity={0.85} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Segment donut ───────────────────────────────────────────────────────── */

export interface DonutRow { name: string; value: number; color: string }

export function SegmentDonut({ data, total, height = 210 }: { data: DonutRow[]; total: number; height?: number }) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Tooltip content={<LightTooltip unit=" students" />} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={64} outerRadius={86} paddingAngle={3} strokeWidth={0} cornerRadius={5}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} fillOpacity={0.88} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-mono2 text-[26px] font-bold leading-none text-slate-900">{total}</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Students</div>
        </div>
      </div>
    </div>
  );
}

/* ── Department comparison (academic vs placement) ───────────────────────── */

export interface DeptRow { dept: string; academic: number | null; placement: number | null }

export function DeptCompareBars({ data, height = 230 }: { data: DeptRow[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -26, bottom: 0 }} barGap={4}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="dept" tick={AXIS} tickLine={false} axisLine={{ stroke: "rgba(15,23,42,0.1)" }} />
        <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip content={<LightTooltip unit=" / 100" />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
        <Bar dataKey="academic" name="Academic index" fill="#6366f1" fillOpacity={0.9} radius={[5, 5, 0, 0]} />
        <Bar dataKey="placement" name="Placement readiness" fill="#db2777" fillOpacity={0.8} radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Student vs cohort radar ─────────────────────────────────────────────── */

export interface RadarRow { subject: string; student: number; cohort: number }

export function RadarCompare({ data, height = 250 }: { data: RadarRow[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="rgba(15,23,42,0.1)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "#475569", fontSize: 10, fontWeight: 600 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name="Cohort median" dataKey="cohort" stroke="#94a3b8" strokeWidth={1.5} fill="#94a3b8" fillOpacity={0.15} />
        <Radar name="This student" dataKey="student" stroke="#6366f1" strokeWidth={2} fill="#6366f1" fillOpacity={0.22} />
        <Tooltip content={<LightTooltip unit=" / 100" />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/* ── Placement scatter (aptitude × coding) ───────────────────────────────── */

export interface ScatterRow { x: number; y: number; name: string }

export function AptitudeScatter({ data, height = 260 }: { data: ScatterRow[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis dataKey="x" type="number" domain={[0, 100]} tick={AXIS} tickLine={false} name="Aptitude" axisLine={{ stroke: "rgba(15,23,42,0.1)" }} label={{ value: "APTITUDE →", position: "insideBottom", offset: 6, fill: "#94a3b8", fontSize: 9, letterSpacing: 1 }} />
        <YAxis dataKey="y" type="number" domain={[0, 100]} tick={AXIS} tickLine={false} name="Coding" axisLine={false} label={{ value: "CODING →", angle: -90, position: "insideLeft", offset: 30, fill: "#94a3b8", fontSize: 9, letterSpacing: 1 }} />
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: "rgba(15,23,42,0.25)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as ScatterRow;
            return (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xl shadow-slate-900/5">
                <div className="text-[11px] font-semibold text-slate-900">{d.name}</div>
                <div className="mt-0.5 font-mono2 text-[10.5px] text-slate-500">apt {d.x} · code {d.y}</div>
              </div>
            );
          }}
        />
        <ReferenceLine x={50} stroke={rgba("#d97706", 0.45)} strokeDasharray="4 4" />
        <ReferenceLine y={45} stroke={rgba("#d97706", 0.45)} strokeDasharray="4 4" />
        <Scatter data={data} shape={(props: { cx?: number; cy?: number }) => <circle cx={props.cx} cy={props.cy} r={3} fill="#0891b2" fillOpacity={0.45} stroke="#0891b2" strokeOpacity={0.75} strokeWidth={0.6} />} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
