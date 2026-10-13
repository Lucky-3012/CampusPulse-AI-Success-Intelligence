"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface StudentUser {
  id: number;
  studentCode: string;
  fullName: string;
  email: string | null;
  department: string;
  section: string;
  semester: number;
  mentor: string | null;
  score?: number | null;
  segment?: string;
  academicRiskLevel?: string;
  placementRiskLevel?: string;
}

export interface TeacherUser {
  name: string;
  department: string;
  section: string;
}

interface AuthContextType {
  role: "teacher" | "student" | null;
  student: StudentUser | null;
  teacher: TeacherUser | null;
  isLoggedIn: boolean;
  loginAsStudent: (data: { rollNumber: string; branch: string; section: string }) => Promise<{ success: boolean; error?: string }>;
  loginAsTeacher: (data: { name: string; branch: string; section: string }) => Promise<{ success: boolean; error?: string }>;
  quickLoginStudent: (studentCode: string) => Promise<boolean>;
  quickLoginTeacher: (teacher: TeacherUser) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole]       = useState<"teacher" | "student" | null>(null);
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);
  const [student, setStudent] = useState<StudentUser | null>(null);
  const [loaded, setLoaded]   = useState(false);

  // Restore UI state from localStorage on mount (cookie auth is handled server-side)
  useEffect(() => {
    try {
      const r = localStorage.getItem("cp_role") as "teacher" | "student" | null;
      const t = localStorage.getItem("cp_teacher");
      const s = localStorage.getItem("cp_student");
      if (r) setRole(r);
      if (t) setTeacher(JSON.parse(t));
      if (s) setStudent(JSON.parse(s));
    } catch { /* ignore */ } finally { setLoaded(true); }
  }, []);

  // Sync UI state to localStorage
  useEffect(() => {
    if (!loaded) return;
    try {
      if (role)    localStorage.setItem("cp_role", role);
      else         localStorage.removeItem("cp_role");
      if (teacher) localStorage.setItem("cp_teacher", JSON.stringify(teacher));
      else         localStorage.removeItem("cp_teacher");
      if (student) localStorage.setItem("cp_student", JSON.stringify(student));
      else         localStorage.removeItem("cp_student");
    } catch { /* ignore */ }
  }, [role, teacher, student, loaded]);

  const loginAsStudent = async ({ rollNumber, branch, section }: { rollNumber: string; branch: string; section: string }) => {
    try {
      const res  = await fetch("/api/auth/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollNumber, branch, section }),
      });
      const json = await res.json();
      if (!res.ok || !json.student) return { success: false, error: json.error || "Student not found." };
      setStudent(json.student);
      setRole("student");
      return { success: true };
    } catch { return { success: false, error: "Network error. Please try again." }; }
  };

  const quickLoginStudent = async (studentCode: string) => {
    try {
      const res  = await fetch("/api/auth/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollNumber: studentCode }),
      });
      const json = await res.json();
      if (res.ok && json.student) { setStudent(json.student); setRole("student"); return true; }
      return false;
    } catch { return false; }
  };

  const loginAsTeacher = async ({ name, branch, section }: { name: string; branch: string; section: string }) => {
    try {
      const res  = await fetch("/api/auth/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, branch, section }),
      });
      const json = await res.json();
      if (!res.ok) return { success: false, error: json.error || "Login failed." };
      setTeacher({ name, department: branch, section });
      setRole("teacher");
      return { success: true };
    } catch { return { success: false, error: "Network error. Please try again." }; }
  };

  const quickLoginTeacher = async (t: TeacherUser) => {
    try {
      const res = await fetch("/api/auth/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: t.name, branch: t.department, section: t.section }),
      });
      if (res.ok) { setTeacher(t); setRole("teacher"); return true; }
      return false;
    } catch { return false; }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* best-effort */ }
    setRole(null); setStudent(null); setTeacher(null);
    localStorage.removeItem("cp_role");
    localStorage.removeItem("cp_teacher");
    localStorage.removeItem("cp_student");
  };

  return (
    <AuthContext.Provider value={{
      role, student, teacher,
      isLoggedIn: role !== null,
      loginAsStudent, loginAsTeacher,
      quickLoginStudent, quickLoginTeacher,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
