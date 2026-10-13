export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Convert a 6-digit hex color to rgba() string with the given alpha. */
export function rgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function fmt1(n: number | null | undefined, fallback = "—") {
  if (n === null || n === undefined || Number.isNaN(n)) return fallback;
  return (Math.round(n * 10) / 10).toString();
}

export function fmtInt(n: number | null | undefined, fallback = "—") {
  if (n === null || n === undefined || Number.isNaN(n)) return fallback;
  return Math.round(n).toLocaleString("en-IN");
}

export function pct(n: number | null | undefined, fallback = "—") {
  if (n === null || n === undefined || Number.isNaN(n)) return fallback;
  return `${Math.round(n)}%`;
}

export function timeAgo(input: Date | string) {
  const d = typeof input === "string" ? new Date(input) : input;
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function fmtDate(input: Date | string) {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
