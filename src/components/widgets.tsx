"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

export function Counter({ to, decimals = 0, suffix = "", className }: {
  to: number; decimals?: number; suffix?: string; className?: string;
}) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const start = performance.now();
    const dur = 700;
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(from + (to - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick); else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return (
    <span className={cn("tabular-nums", className)}>
      {v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

export function ScoreRing({ value, size = 96, stroke = 8, color = "#6366f1", label, muted = false }: {
  value: number | null; size?: number; stroke?: number; color?: string; label?: string; sub?: string; muted?: boolean;
}) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setP(value ?? 0)));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, p)) / 100) * c;
  const cVal = muted ? "#94a3b8" : color;

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(15,23,42,0.07)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={value == null ? "transparent" : cVal} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.2,0.8,0.2,1)" }} />
      </svg>
      <div className="absolute text-center">
        <p className="font-mono2 font-bold leading-none text-slate-900" style={{ fontSize: size * 0.25 }}>
          {value == null ? "—" : Math.round(value)}
        </p>
        {label && <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>}
      </div>
    </div>
  );
}

export function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
  decimals = 0,
  suffix = "",
  delay = 0,
  href,
  cta,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: React.ReactNode;
  color: string;
  decimals?: number;
  suffix?: string;
  delay?: number;
  href?: string;
  cta?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <span className="grid h-7 w-7 place-items-center rounded-lg text-slate-500" style={{ background: `${color}18`, color }}>
          {icon}
        </span>
      </div>
      <p className="font-display mt-3 text-[28px] font-bold leading-none tracking-tight text-slate-900">
        <Counter to={value} decimals={decimals} suffix={suffix} />
      </p>
      {sub && <p className="mt-2 text-[11.5px] text-slate-400">{sub}</p>}
      {href && (
        <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-indigo-500 opacity-80 transition-opacity group-hover:opacity-100">
          {cta ?? "View details"} <ArrowRight size={12} />
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="group card card-hover rise block p-5" style={{ animationDelay: `${delay}ms` }}>
        {inner}
      </Link>
    );
  }

  return (
    <div className="card rise p-5" style={{ animationDelay: `${delay}ms` }}>
      {inner}
    </div>
  );
}

export function TrendChip({ trend, delta }: { trend: "improving" | "stable" | "declining"; delta?: number | null }) {
  const map = {
    improving: { icon: TrendingUp,   color: "#10b981", label: "Improving" },
    declining: { icon: TrendingDown,  color: "#f43f5e", label: "Declining" },
    stable:    { icon: Minus,         color: "#64748b", label: "Stable"    },
  } as const;
  const m = map[trend];
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: m.color }}>
      <Icon size={13} strokeWidth={2.4} /> {m.label}
      {delta != null && delta !== 0 && <span className="font-mono2 text-[10px] opacity-70">({delta > 0 ? "+" : ""}{delta})</span>}
    </span>
  );
}

export function Sparkline({ values, color = "#6366f1", width = 84, height = 26 }: {
  values: number[]; color?: string; width?: number; height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values), rng = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - 4) + 2;
    const y = height - 3 - ((v - min) / rng) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
