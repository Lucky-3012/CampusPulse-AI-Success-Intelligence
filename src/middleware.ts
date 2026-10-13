import { NextRequest, NextResponse } from "next/server";

/**
 * CampusPulse AI — Server-side route protection middleware.
 *
 * Runs on the Next.js edge before every matching request.
 * Reads the cp_session cookie set by the auth API routes (HttpOnly, SameSite=Lax).
 *
 * NOTE: This middleware enforces AUTHENTICATION (is there a valid session?).
 * AUTHORIZATION (can this role perform this action?) is enforced inside each
 * API route handler using getSession() from @/lib/session.
 */

const PUBLIC_PAGES       = new Set(["/login"]);
const PUBLIC_API_PREFIXES = ["/api/auth/", "/api/health"];

function parseSessionRole(req: NextRequest): string | null {
  try {
    const raw = req.cookies.get("cp_session")?.value;
    if (!raw) return null;
    // Edge-compatible base64 decode
    const decoded = atob(decodeURIComponent(raw));
    const parsed  = JSON.parse(decoded);
    return parsed?.role ?? null;
  } catch {
    return null;
  }
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    /\.\w{1,6}$/.test(pathname) // file extensions
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isStaticAsset(pathname)) return NextResponse.next();
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const role = parseSessionRole(req);

  // ── API protection ───────────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    if (!role) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in at /login." },
        { status: 401 }
      );
    }
    // Students may only call specific whitelisted API endpoints
    // (detailed authorization is handled inside each route handler)
    const STUDENT_API_WHITELIST = [
      "/api/auth/student",
      "/api/auth/logout",
      "/api/interventions",  // POST only — handler enforces student-to-self restriction
    ];
    if (role === "student" && !STUDENT_API_WHITELIST.some((p) => pathname.startsWith(p))) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    return NextResponse.next();
  }

  // ── Page protection ──────────────────────────────────────────────────
  if (PUBLIC_PAGES.has(pathname)) return NextResponse.next();

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Role-based page routing
  const isStudentPortalRoute = pathname === "/student" || pathname.startsWith("/student/");

  if (role === "student" && !isStudentPortalRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/student";
    return NextResponse.redirect(url);
  }
  if (role === "teacher" && isStudentPortalRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
