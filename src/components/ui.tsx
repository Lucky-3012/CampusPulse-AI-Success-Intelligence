import { rgba, initials, cn } from "@/lib/utils";

export function Chip({ color, children, dot = true, className }: {
  color: string; children: React.ReactNode; dot?: boolean; className?: string;
}) {
  return (
    <span className={cn("chip", className)} style={{ color, background: rgba(color, 0.1), borderColor: rgba(color, 0.22) }}>
      {dot && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />}
      {children}
    </span>
  );
}

export function Avatar({ name, size = 34, color }: { name: string; size?: number; color?: string }) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  const c = color ?? `hsl(${h} 55% 55%)`;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{
        width: size, height: size, fontSize: size * 0.34,
        background: `linear-gradient(135deg, ${c}, hsl(${h} 55% 45%))`,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
      }}
    >
      {initials(name)}
    </span>
  );
}

export function SectionHead({ eyebrow, title, desc, right, className }: {
  eyebrow?: string; title: string; desc?: string; right?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-start justify-between gap-3", className)}>
      <div>
        {eyebrow && (
          <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.2em] text-indigo-500">{eyebrow}</p>
        )}
        <h2 className="font-display text-[17px] font-bold text-slate-900">{title}</h2>
        {desc && <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">{desc}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function ProgressBar({ value, color, height = 6, className }: {
  value: number; color: string; height?: number; className?: string;
}) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-slate-100", className)} style={{ height }}>
      <div className="bar-sweep h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}

const DIM_LABELS = ["Academic", "Attendance", "LMS", "Engagement", "Skills", "Placement"];

export function MiniMeter({ values, colors, height = 26 }: { values: (number | null)[]; colors: string[]; height?: number }) {
  const allNull = values.every((v) => v == null);
  if (allNull) {
    return (
      <span className="text-[10px] italic text-slate-400">Insufficient data</span>
    );
  }
  return (
    <div className="flex items-end gap-[3px]" style={{ height: `${height}px` }}>
      {values.map((v, i) => {
        // Clamp normalized value to 0-100 for display height
        const pct = v != null ? Math.min(100, Math.max(0, v)) : 0;
        const label = DIM_LABELS[i] ?? `D${i + 1}`;
        const tip = v != null ? `${label}: ${Math.round(v)}/100` : `${label}: not ingested`;
        return (
          <span
            key={i}
            title={tip}
            className="relative w-[5px] rounded-full bg-slate-100"
            style={{ height: `${height}px` }}
          >
            {v != null && (
              <span
                className="absolute bottom-0 left-0 w-full rounded-full transition-all"
                style={{
                  height: `${pct}%`,
                  background: colors[i],
                  minHeight: "2px",
                }}
              />
            )}
            {v == null && (
              <span
                className="absolute bottom-0 left-0 w-full rounded-full"
                style={{ height: "15%", background: "rgba(148,163,184,0.3)" }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <p className="text-[13px] font-semibold text-slate-600">{title}</p>
      <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-slate-400">{hint}</p>
    </div>
  );
}
