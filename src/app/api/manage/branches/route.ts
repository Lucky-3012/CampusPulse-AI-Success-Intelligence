import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customBranches, customSections } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** GET — list all custom branches and their sections */
export async function GET() {
  try {
    const branches = await db.select().from(customBranches).orderBy(customBranches.code);
    const sections = await db.select().from(customSections).orderBy(customSections.sectionName);

    const result = branches.map((b) => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
      sections: sections.filter((s) => s.branchCode === b.code).map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
    }));

    return NextResponse.json({ branches: result });
  } catch (e) {
    console.error("Failed to load custom branches:", e);
    return NextResponse.json({ error: "Failed to load branches" }, { status: 500 });
  }
}

/** POST — add a new branch */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body.code ?? "").trim().toUpperCase();
    const name = String(body.name ?? "").trim();

    if (!code || code.length < 2 || code.length > 6) {
      return NextResponse.json({ error: "Branch code must be 2–6 characters (e.g. CSE, AIDS, BIO)." }, { status: 400 });
    }
    if (!name || name.length < 3) {
      return NextResponse.json({ error: "Branch name must be at least 3 characters." }, { status: 400 });
    }

    // Check for duplicate code
    const existing = await db.select().from(customBranches).where(eq(customBranches.code, code)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: `Branch code "${code}" already exists.` }, { status: 409 });
    }

    const [created] = await db.insert(customBranches).values({ code, name }).returning();

    // Also create default sections A and B
    await db.insert(customSections).values([
      { branchCode: code, sectionName: "A" },
      { branchCode: code, sectionName: "B" },
    ]);

    return NextResponse.json({
      branch: { ...created, createdAt: created.createdAt.toISOString() },
      message: `Branch "${code} — ${name}" created with default Sections A & B.`,
    }, { status: 201 });
  } catch (e) {
    console.error("Failed to create branch:", e);
    return NextResponse.json({ error: "Failed to create branch" }, { status: 500 });
  }
}

/** DELETE — remove a custom branch */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body.code ?? "").trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "Branch code required." }, { status: 400 });

    await db.delete(customSections).where(eq(customSections.branchCode, code));
    await db.delete(customBranches).where(eq(customBranches.code, code));

    return NextResponse.json({ message: `Branch "${code}" and its sections removed.` });
  } catch (e) {
    console.error("Failed to delete branch:", e);
    return NextResponse.json({ error: "Failed to delete branch" }, { status: 500 });
  }
}
