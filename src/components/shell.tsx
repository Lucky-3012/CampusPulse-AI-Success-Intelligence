"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Gauge,
  Users,
  Target,
  HeartPulse,
  ShieldCheck,
  Building2,
  ChevronDown,
  Search,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAuth } from "./auth-context";
import { cn, initials } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  match: (p: string) => boolean;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { href: "/", label: "Command Center", icon: Gauge, match: (p) => p === "/" },
      { href: "/branches", label: "Branch & Section Hub", icon: Building2, match: (p) => p.startsWith("/branches") },
      { href: "/students", label: "Student Explorer", icon: Users, match: (p) => p.startsWith("/students") },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { href: "/placement", label: "Placement Readiness", icon: Target, match: (p) => p.startsWith("/placement") },
      { href: "/interventions", label: "Interventions", icon: HeartPulse, match: (p) => p.startsWith("/interventions") },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/data-quality", label: "Data Quality", icon: ShieldCheck, match: (p) => p.startsWith("/data-quality") },
    ],
  },
];

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-10 w-10 place-items-center rounded-xl border border-indigo-400/40 bg-indigo-500/15">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M2 12h4l2.5-6 4 12 2.5-8 1.7 2H22" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="pulse-dot absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </div>
      <div className="leading-tight">
        <div className="font-display text-[15px] font-bold tracking-tight text-white">
          CampusPulse <span className="text-indigo-300">AI</span>
        </div>
        <div className="text-[9.5px] font-medium uppercase tracking-[0.2em] text-slate-400">
          Success Intelligence
        </div>
      </div>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const t = () =>
      setNow(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    t();
    const id = setInterval(t, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono2 text-[11.5px] tabular-nums text-slate-500">{now || "—"}</span>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, student, teacher, isLoggedIn, logout } = useAuth();
  const [q, setQ] = useState("");

  // Pages that show without sidebar (login page, student results page)
  const isLoginPage = pathname === "/login";
  const isStudentPage = pathname.startsWith("/student");
  const showSidebar = !isLoginPage && !isStudentPage;

  const active = NAV_GROUPS.flatMap((g) => g.items).find((n) => n.match(pathname));

  const displayName = role === "teacher" && teacher ? teacher.name : role === "student" && student ? student.fullName : "Guest";
  const displayMeta = role === "teacher" && teacher
    ? `${teacher.department.split(" ")[0]} · Sec ${teacher.section}`
    : role === "student" && student
    ? `${student.studentCode} · Sec ${student.section}`
    : "";

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/students?q=${encodeURIComponent(q.trim())}`);
  };

  const handleLogout = async () => { await logout(); router.push("/login"); };

  // No shell wrapping for login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Student results page — minimal header, no sidebar
  if (isStudentPage) {
    return (
      <div className="min-h-screen">
        <header className="glass sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-slate-200/80 px-6 lg:px-8">
          <Link href="/login" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg border border-indigo-400/30 bg-indigo-500/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M2 12h4l2.5-6 4 12 2.5-8 1.7 2H22" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-display text-[14px] font-bold tracking-tight text-slate-900">
              CampusPulse <span className="text-indigo-500">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {student && (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">
                  {initials(student.fullName)}
                </span>
                <div className="leading-tight">
                  <div className="text-[12px] font-semibold text-slate-900">{student.fullName}</div>
                  <div className="text-[10px] text-slate-400">{student.studentCode} · {student.department.split(" ")[0]}</div>
                </div>
              </div>
            )}
            <button onClick={handleLogout} className="btn btn-ghost !py-1.5 !px-3 !text-[11px]">
              <LogOut size={12} /> Sign out
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-6 pb-16 pt-8 lg:px-8">{children}</main>
      </div>
    );
  }

  // Teacher / Faculty view — full sidebar
  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      {showSidebar && (
        <aside
          className="fixed inset-y-0 left-0 z-40 hidden w-[256px] flex-col border-r border-white/5 lg:flex"
          style={{ background: "linear-gradient(180deg,#101736 0%,#0b1128 55%,#0a0f24 100%)" }}
        >
          <div className="px-5 pb-5 pt-6">
            <BrandMark />
          </div>

          {/* Teacher identity */}
          {teacher && (
            <div className="mx-4 mb-5 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-300">Faculty Portal</div>
              <div className="mt-1.5 truncate text-[12.5px] font-bold text-white">{teacher.name}</div>
              <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                {teacher.department.split(" ")[0]} · Sec {teacher.section}
              </div>
            </div>
          )}

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-3">
            {NAV_GROUPS.map((g) => (
              <div key={g.title}>
                <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  {g.title}
                </div>
                <div className="space-y-0.5">
                  {g.items.map((n) => {
                    const isActive = n.match(pathname);
                    const Icon = n.icon;
                    return (
                      <Link
                        key={n.href}
                        href={n.href}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-all duration-150",
                          isActive ? "text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                        )}
                      >
                        {isActive && (
                          <>
                            <span className="absolute inset-0 -z-10 rounded-lg border border-indigo-400/30 bg-gradient-to-r from-indigo-500/25 to-cyan-400/10" />
                            <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-indigo-400 to-cyan-300" />
                          </>
                        )}
                        <Icon size={15} strokeWidth={2.2} className={cn(isActive ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300")} />
                        {n.label}
                        {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-300" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="space-y-2 p-3">
            <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-white/10">
              <LogOut size={12} /> Sign out
            </button>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-300">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Data warehouse online
              </div>
              <p className="mt-1.5 text-[9.5px] leading-relaxed text-slate-500">
                6 sources unified · 501 synthetic profiles. Insights support faculty decisions.
              </p>
            </div>
          </div>
        </aside>
      )}

      {/* ── Main ────────────────────────────────────────────────── */}
      <div className={cn("flex min-h-screen flex-1 flex-col", showSidebar && "lg:pl-[256px]")}>
        <header className="glass sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-slate-200/80 px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="font-display text-[13.5px] font-bold tracking-tight lg:hidden">
              CampusPulse <span className="text-indigo-500">AI</span>
            </span>
            <nav className="hidden items-center gap-1.5 text-[12px] lg:flex">
              <span className="font-medium text-slate-400">CampusPulse</span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className="font-semibold text-slate-900">{active?.label ?? "Overview"}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <form onSubmit={submitSearch} className="relative hidden md:block">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search students…"
                className="input !w-52 !rounded-full !py-1.5 !pl-8 !text-[12px] focus:!w-64 transition-all"
              />
            </form>
            <div className="hidden xl:block"><LiveClock /></div>
            <div className="hidden h-5 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">
                {initials(displayName)}
              </span>
              <span className="hidden flex-col items-start leading-tight sm:flex">
                <span className="max-w-[130px] truncate text-[11.5px] font-semibold text-slate-900">{displayName}</span>
                <span className="text-[9.5px] font-medium text-slate-400">{displayMeta}</span>
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 pb-16 pt-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
