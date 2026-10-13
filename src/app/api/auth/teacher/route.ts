import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const KNOWN_FACULTY = new Set([
  "Dr. Kavitha Rao",
  "Prof. Arun Menon",
  "Dr. Sunita Deshmukh",
  "Dr. Neha Kulkarni",
  "Prof. Rakesh Iyer",
  "Prof. Vivek Chauhan",
  "Dr. Radhika Bose",
]);

const MAX_NAME_LEN  = 80;
const MAX_DEPT_LEN  = 120;
const MAX_SEC_LEN   = 6;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name    = String(body.name    ?? "").trim().slice(0, MAX_NAME_LEN);
    const branch  = String(body.branch  ?? "").trim().slice(0, MAX_DEPT_LEN);
    const section = String(body.section ?? "").trim().toUpperCase().slice(0, MAX_SEC_LEN);

    if (!name) {
      return NextResponse.json({ error: "Faculty name is required." }, { status: 400 });
    }

    // Validate against known faculty list (prototype — real systems use an identity provider)
    if (!KNOWN_FACULTY.has(name)) {
      return NextResponse.json(
        { error: "Faculty name not recognised. Please select from the provided list." },
        { status: 401 }
      );
    }

    // Set server-side HttpOnly session cookie
    await setSession({
      role: "teacher",
      dept: branch,
      section,
    });

    return NextResponse.json({ success: true, teacher: { name, department: branch, section } });
  } catch (e) {
    console.error("[auth/teacher] Error:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
  }
}
