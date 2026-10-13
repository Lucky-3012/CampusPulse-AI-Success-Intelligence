"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Layers,
  GraduationCap,
  ArrowRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  Target,
  ArrowUpRight,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Award,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { Avatar, Chip, MiniMeter } from "./ui";
import { Counter, ScoreRing } from "./widgets";
import {
  SEGMENT_META,
  RISK_META,
  BAND_META,
  COMPONENT_META,
  type SegmentKey,
} from "@/lib/scoring";
import { cn, rgba } from "@/lib/utils";

export interface BranchData {
  branchName: string;
  branchCode: string;
  totalStudents: number;
  avgScore: number;
  avgAttendance: number;
  avgCGPA: number;
  academicRiskCount: number;
  placementRiskCount: number;
  placementGapCount: number;
  sections: {
    section: "A" | "B";
    totalStudents: number;
    avgScore: number;
    avgAttendance: number;
    avgCGPA: number;
    academicRiskCount: number;
    placementRiskCount: number;
    placementGapCount: number;
    students: {
      id: number;
      studentCode: string;
      fullName: string;
      semester: number;
      section: string;
      cgpa: number | null;
      attendancePct: number | null;
      score: number | null;
      segment: string;
      academicRisk: string;
      placementRisk: string;
      mentor: string | null;
    }[];
  }[];
}

const COMP_COLORS = [
  COMPONENT_META.academic.color,
  COMPONENT_META.attendance.color,
  COMPONENT_META.lms.color,
  COMPONENT_META.engagement.color,
  COMPONENT_META.skills.color,
  COMPONENT_META.placement.color,
];

export function BranchExplorer({ branches }: { branches: BranchData[] }) {
  const router = useRouter();
  const [selectedBranchCode, setSelectedBranchCode] = useState<string>(branches[0]?.branchCode || "CSE");
  const [selectedSection, setSelectedSection] = useState<"all" | "A" | "B">("all");
  const [searchName, setSearchName] = useState("");
  const [filterSegment, setFilterSegment] = useState<string>("all");
  const [filterRisk, setFilterRisk] = useState<string>("all");

  // ── Add Branch modal state ──
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranchCode, setNewBranchCode] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [addBranchError, setAddBranchError] = useState("");
  const [addBranchLoading, setAddBranchLoading] = useState(false);
  const [addBranchDone, setAddBranchDone] = useState("");

  // ── Add Section modal state ──
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [addSectionBranch, setAddSectionBranch] = useState("");
  const [addSectionError, setAddSectionError] = useState("");
  const [addSectionLoading, setAddSectionLoading] = useState(false);
  const [addSectionDone, setAddSectionDone] = useState("");

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddBranchError("");
    if (!newBranchCode.trim() || !newBranchName.trim()) { setAddBranchError("Both code and name are required."); return; }
    setAddBranchLoading(true);
    try {
      const res = await fetch("/api/manage/branches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newBranchCode.trim(), name: newBranchName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setAddBranchError(json.error || "Failed to add branch."); return; }
      setAddBranchDone(json.message || "Branch created!");
      setTimeout(() => { setShowAddBranch(false); setAddBranchDone(""); setNewBranchCode(""); setNewBranchName(""); router.refresh(); }, 1200);
    } catch { setAddBranchError("Network error."); } finally { setAddBranchLoading(false); }
  };

  const openAddSection = (branchCode: string) => {
    setAddSectionBranch(branchCode);
    setNewSectionName("");
    setAddSectionError("");
    setAddSectionDone("");
    setShowAddSection(true);
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSectionError("");
    if (!newSectionName.trim()) { setAddSectionError("Section name is required (e.g. C, D)."); return; }
    setAddSectionLoading(true);
    try {
      const res = await fetch("/api/manage/sections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchCode: addSectionBranch, sectionName: newSectionName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setAddSectionError(json.error || "Failed to add section."); return; }
      setAddSectionDone(json.message || "Section added!");
      setTimeout(() => { setShowAddSection(false); setAddSectionDone(""); router.refresh(); }, 1200);
    } catch { setAddSectionError("Network error."); } finally { setAddSectionLoading(false); }
  };

  const activeBranch = useMemo(() => {
    return branches.find((b) => b.branchCode === selectedBranchCode) || branches[0];
  }, [branches, selectedBranchCode]);

  const secA = activeBranch?.sections.find((s) => s.section === "A");
  const secB = activeBranch?.sections.find((s) => s.section === "B");

  const filteredStudents = useMemo(() => {
    if (!activeBranch) return [];

    let pool: (typeof activeBranch.sections[0]["students"][0] & { section: string; branchCode: string; branchName: string })[] = [];

    activeBranch.sections.forEach((sec) => {
      if (selectedSection === "all" || selectedSection === sec.section) {
        sec.students.forEach((st) => {
          pool.push({
            ...st,
            section: sec.section,
            branchCode: activeBranch.branchCode,
            branchName: activeBranch.branchName,
          });
        });
      }
    });

    if (searchName.trim()) {
      const q = searchName.toLowerCase().trim();
      pool = pool.filter(
        (st) => st.fullName.toLowerCase().includes(q) || st.studentCode.toLowerCase().includes(q)
      );
    }

    if (filterSegment !== "all") {
      pool = pool.filter((st) => st.segment === filterSegment);
    }

    if (filterRisk !== "all") {
      if (filterRisk === "academic") {
        pool = pool.filter((st) => st.academicRisk === "high" || st.academicRisk === "medium");
      } else if (filterRisk === "placement") {
        pool = pool.filter((st) => st.placementRisk === "high" || st.placementRisk === "medium");
      }
    }

    return pool.sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [activeBranch, selectedSection, searchName, filterSegment, filterRisk]);

  return (
    <div className="space-y-7">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-px w-6 bg-[#6366f1]" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-[#6366f1]">
              Branch & Section Intelligence
            </span>
          </div>
          <h1 className="font-display text-[30px] font-bold leading-none tracking-tight text-slate-900">
            Branch & Section Directory
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[#64748b]">
            Separated student analytics organized by <strong>Branch</strong>, <strong>Section (A vs B)</strong>, and <strong>Student Name</strong>.
            Compare class standing, attendance compliance, and placement readiness across departments.
          </p>
        </div>
      </div>

      {/* ── 1. Select Branch Grid ─────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
            Select Branch (Department):
          </span>
          <button
            onClick={() => { setShowAddBranch(true); setAddBranchError(""); setAddBranchDone(""); setNewBranchCode(""); setNewBranchName(""); }}
            className="btn btn-primary !py-1.5 !px-3 !text-[11.5px]"
          >
            <Plus size={13} /> Add New Branch
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {branches.map((b) => {
            const isSelected = b.branchCode === selectedBranchCode;
            return (
              <button
                key={b.branchCode}
                onClick={() => {
                  setSelectedBranchCode(b.branchCode);
                  setSelectedSection("all");
                }}
                className={cn(
                  "card card-hover relative flex flex-col p-4 text-left transition-all",
                  isSelected
                    ? "border-[rgba(99,102,241,0.6)] bg-[rgba(99,102,241,0.12)] shadow-xl shadow-[#6366f1]/10"
                    : "hover:border-[rgba(15,23,42,0.25)]"
                )}
              >
                {isSelected && (
                  <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#6366f1] shadow-sm shadow-[#6366f1]" />
                )}
                <div className="font-mono2 text-[12px] font-bold text-[#6366f1]">{b.branchCode}</div>
                <div className="font-display mt-1 text-[13px] font-bold leading-snug text-slate-900">
                  {b.branchName}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[rgba(15,23,42,0.08)] pt-2.5 text-[11px]">
                  <span className="text-[#64748b]">{b.totalStudents} students</span>
                  <span className="font-mono2 font-bold text-slate-900">{b.avgScore} / 100</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Active Branch Dashboard & Section A vs B ────────── */}
      {activeBranch && (
        <div className="card rise space-y-6 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(15,23,42,0.09)] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[rgba(99,102,241,0.15)] px-2 py-0.5 font-mono2 text-[11px] font-bold text-[#4338ca]">
                  {activeBranch.branchCode}
                </span>
                <h2 className="font-display text-[22px] font-bold text-slate-900">{activeBranch.branchName}</h2>
              </div>
              <p className="mt-1 text-[12px] text-[#64748b]">
                {activeBranch.totalStudents} enrolled students across {activeBranch.sections.length} section{activeBranch.sections.length !== 1 ? "s" : ""}.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => openAddSection(activeBranch.branchCode)}
                className="btn btn-ghost !py-1.5 !px-3 !text-[11.5px] hover:!border-indigo-300"
              >
                <Plus size={12} /> Add Section
              </button>
            </div>
          </div>

          {/* Section Filter — dynamic */}
          <div className="flex flex-wrap rounded-xl border border-slate-200 bg-slate-100/80 p-1">
            <button onClick={() => setSelectedSection("all")} className={cn("rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-all", selectedSection === "all" ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-900")}>
              All ({activeBranch.totalStudents})
            </button>
            {activeBranch.sections.map((sec) => (
              <button key={sec.section} onClick={() => setSelectedSection(sec.section as "A" | "B")} className={cn("rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-all", selectedSection === sec.section ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-900")}>
                Sec {sec.section} ({sec.totalStudents})
              </button>
            ))}
          </div>

          {/* Section Cards — renders ALL sections dynamically */}
          <div className={cn("grid gap-4", activeBranch.sections.length <= 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3")}>
            {activeBranch.sections.map((sec, idx) => {
              const palette = ["#6366f1","#8b5cf6","#0891b2","#10b981","#ea580c","#db2777","#d97706"];
              const sColor = palette[idx % palette.length];
              const active = selectedSection === sec.section;
              return (
                <div key={sec.section} onClick={() => setSelectedSection(sec.section as "A" | "B")} className={cn("cursor-pointer rounded-2xl border p-5 transition-all", active ? "border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-400" : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:shadow-sm")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-lg font-display text-[12px] font-bold text-white" style={{ background: sColor }}>{sec.section}</span>
                      <span className="font-display text-[16px] font-bold text-slate-900">Section {sec.section}</span>
                    </div>
                    <Chip color={sColor}>{sec.totalStudents} Students</Chip>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                    <div><div className="text-[10px] uppercase text-slate-400">Avg Score</div><div className="font-mono2 text-[16px] font-bold text-slate-900">{sec.avgScore || 0}</div></div>
                    <div><div className="text-[10px] uppercase text-slate-400">Attendance</div><div className="font-mono2 text-[16px] font-bold text-emerald-600">{sec.avgAttendance || 0}%</div></div>
                    <div><div className="text-[10px] uppercase text-slate-400">Avg CGPA</div><div className="font-mono2 text-[16px] font-bold text-indigo-700">{sec.avgCGPA || 0}</div></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Academic flags: <strong className="text-rose-500">{sec.academicRiskCount || 0}</strong></span>
                    <span>Placement gap: <strong className="text-cyan-600">{sec.placementGapCount || 0}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 3. Filter and Search by Student Name & Roll No ─── */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative min-w-[240px] flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                type="text"
                placeholder="Search by student name or roll number…"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="input w-full !pl-9 text-[12.5px]"
              />
            </div>

            <select
              value={filterSegment}
              onChange={(e) => setFilterSegment(e.target.value)}
              className="input text-[12px]"
            >
              <option value="all">All Actionable Segments</option>
              {Object.keys(SEGMENT_META).map((k) => (
                <option key={k} value={k}>
                  {SEGMENT_META[k as SegmentKey].label}
                </option>
              ))}
            </select>

            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="input text-[12px]"
            >
              <option value="all">All Risk Levels</option>
              <option value="academic">Academic Risk (High / Review)</option>
              <option value="placement">Placement Risk (High / Review)</option>
            </select>
          </div>

          {/* ── 4. Students Directory Roster ───────────────────── */}
          <div className="overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.12)]">
            <div className="bg-[#f8fafc] px-5 py-3 text-[11.5px] font-semibold text-[#64748b]">
              Showing <strong className="text-slate-900">{filteredStudents.length}</strong> students in {activeBranch.branchName}{" "}
              {selectedSection !== "all" && `(Section ${selectedSection})`}
            </div>

            <div className="max-h-[550px] overflow-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-[#ffffff]">
                  <tr className="border-b border-[rgba(15,23,42,0.12)] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                    <th className="px-5 py-3">Student Name</th>
                    <th className="px-3 py-3">Section</th>
                    <th className="px-3 py-3">Success Score</th>
                    <th className="px-3 py-3">CGPA</th>
                    <th className="px-3 py-3">Attendance</th>
                    <th className="px-3 py-3">Segment</th>
                    <th className="px-3 py-3">Risk Status</th>
                    <th className="px-3 py-3">Mentor</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((st) => {
                    const seg = SEGMENT_META[st.segment as SegmentKey] || SEGMENT_META["on-track"];
                    const ar = RISK_META[st.academicRisk] || RISK_META.low;
                    const pr = RISK_META[st.placementRisk] || RISK_META.low;

                    return (
                      <tr
                        key={st.studentCode}
                        className="group border-b border-[rgba(15,23,42,0.06)] transition-colors hover:bg-[rgba(99,102,241,0.05)]"
                      >
                        <td className="px-5 py-3.5">
                          <Link href={`/students/${st.studentCode}`} className="flex items-center gap-3">
                            <Avatar name={st.fullName} size={32} />
                            <div>
                              <div className="text-[13px] font-semibold text-slate-900 group-hover:text-[#4338ca]">
                                {st.fullName}
                              </div>
                              <div className="font-mono2 text-[10.5px] text-[#94a3b8]">
                                {st.studentCode} · Sem {st.semester}
                              </div>
                            </div>
                          </Link>
                        </td>

                        <td className="px-3 py-3.5">
                          <span className="rounded-md bg-[rgba(15,23,42,0.1)] px-2 py-0.5 font-display text-[11px] font-bold text-slate-900">
                            Sec {st.section}
                          </span>
                        </td>

                        <td className="px-3 py-3.5">
                          <span className="font-mono2 text-[14px] font-bold" style={{ color: (st.score || 0) >= 80 ? "#10b981" : (st.score || 0) >= 60 ? "#d97706" : "#f43f5e" }}>
                            {st.score != null ? Math.round(st.score) : "—"}
                          </span>
                        </td>

                        <td className="px-3 py-3.5">
                          <span className="font-mono2 text-[12px] font-bold text-slate-900">
                            {st.cgpa ? st.cgpa.toFixed(2) : "—"}
                          </span>
                        </td>

                        <td className="px-3 py-3.5">
                          <span
                            className="font-mono2 text-[12px] font-bold"
                            style={{ color: (st.attendancePct || 0) >= 75 ? "#10b981" : "#f43f5e" }}
                          >
                            {st.attendancePct ? `${Math.round(st.attendancePct)}%` : "—"}
                          </span>
                        </td>

                        <td className="px-3 py-3.5">
                          <Chip color={seg.color} dot={false} className="!text-[10px]">
                            {seg.label}
                          </Chip>
                        </td>

                        <td className="px-3 py-3.5">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10.5px]" style={{ color: ar.color }}>
                              • Acad: {ar.label}
                            </span>
                            <span className="text-[10.5px]" style={{ color: pr.color }}>
                              • Place: {pr.label}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-3.5">
                          <span className="text-[11.5px] text-[#64748b]">{st.mentor || "—"}</span>
                        </td>

                        <td className="px-3 py-3.5 text-right">
                          <Link
                            href={`/students/${st.studentCode}`}
                            className="btn btn-ghost !py-1.5 !px-2.5 !text-[11px] hover:!text-slate-900"
                          >
                            View Profile <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredStudents.length === 0 && (
                <div className="p-8 text-center text-[12.5px] text-[#64748b]">
                  No students found matching the selected Branch, Section, or Search filter.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Branch Modal ──────────────────────────────────── */}
      {showAddBranch && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
          <div className="fade-in absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !addBranchLoading && setShowAddBranch(false)} />
          <div className="modal-in relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8">
            <button onClick={() => setShowAddBranch(false)} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={16} /></button>
            {addBranchDone ? (
              <div className="py-8 text-center">
                <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
                <h3 className="font-display mt-3 text-[18px] font-bold text-slate-900">Branch Created</h3>
                <p className="mt-1.5 text-[12.5px] text-slate-500">{addBranchDone}</p>
              </div>
            ) : (
              <form onSubmit={handleAddBranch} className="space-y-4">
                <div>
                  <h3 className="font-display text-[20px] font-bold text-slate-900">Add New Branch</h3>
                  <p className="mt-1 text-[12.5px] text-slate-500">Create a new department with default Sections A & B.</p>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Branch Code</span>
                  <input type="text" placeholder="e.g. AIDS, BIO, PHY" value={newBranchCode} onChange={(e) => { setNewBranchCode(e.target.value); setAddBranchError(""); }} className="input w-full font-mono2 !text-[14px] uppercase" maxLength={6} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Full Branch Name</span>
                  <input type="text" placeholder="e.g. AI & Data Science" value={newBranchName} onChange={(e) => { setNewBranchName(e.target.value); setAddBranchError(""); }} className="input w-full" />
                </label>
                {addBranchError && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11.5px] font-medium text-rose-600">
                    <AlertTriangle size={14} className="shrink-0" /> {addBranchError}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddBranch(false)} className="btn btn-ghost flex-1 !py-2.5" disabled={addBranchLoading}>Cancel</button>
                  <button type="submit" disabled={addBranchLoading} className="btn btn-primary flex-1 !py-2.5">
                    {addBranchLoading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Create Branch
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Add Section Modal ─────────────────────────────────── */}
      {showAddSection && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
          <div className="fade-in absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !addSectionLoading && setShowAddSection(false)} />
          <div className="modal-in relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8">
            <button onClick={() => setShowAddSection(false)} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={16} /></button>
            {addSectionDone ? (
              <div className="py-8 text-center">
                <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
                <h3 className="font-display mt-3 text-[18px] font-bold text-slate-900">Section Added</h3>
                <p className="mt-1.5 text-[12.5px] text-slate-500">{addSectionDone}</p>
              </div>
            ) : (
              <form onSubmit={handleAddSection} className="space-y-4">
                <div>
                  <h3 className="font-display text-[20px] font-bold text-slate-900">Add Section to {addSectionBranch}</h3>
                  <p className="mt-1 text-[12.5px] text-slate-500">Add a new section (e.g. C, D, E) to this branch.</p>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Section Name</span>
                  <input type="text" placeholder="e.g. C" value={newSectionName} onChange={(e) => { setNewSectionName(e.target.value); setAddSectionError(""); }} className="input w-full font-mono2 !text-[16px] uppercase" maxLength={4} />
                </label>
                {addSectionError && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11.5px] font-medium text-rose-600">
                    <AlertTriangle size={14} className="shrink-0" /> {addSectionError}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddSection(false)} className="btn btn-ghost flex-1 !py-2.5" disabled={addSectionLoading}>Cancel</button>
                  <button type="submit" disabled={addSectionLoading} className="btn btn-primary flex-1 !py-2.5">
                    {addSectionLoading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add Section
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
