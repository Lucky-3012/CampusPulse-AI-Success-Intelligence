import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customSections } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** POST — add a new section to a branch */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const branchCode = String(body.branchCode ?? "").trim().toUpperCase();
    const sectionName = String(body.sectionName ?? "").trim().toUpperCase();

    if (!branchCode) return NextResponse.json({ error: "Branch code is required." }, { status: 400 });
    if (!sectionName || sectionName.length > 4) {
      return NextResponse.json({ error: "Section name must be 1–4 characters (e.g. C, D, E)." }, { status: 400 });
    }

    // Check for duplicate
    const existing = await db
      .select()
      .from(customSections)
      .where(and(eq(customSections.branchCode, branchCode), eq(customSections.sectionName, sectionName)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: `Section "${sectionName}" already exists in branch "${branchCode}".` }, { status: 409 });
    }

    const [created] = await db.insert(customSections).values({ branchCode, sectionName }).returning();

    return NextResponse.json({
      section: { ...created, createdAt: created.createdAt.toISOString() },
      message: `Section "${sectionName}" added to branch "${branchCode}".`,
    }, { status: 201 });
  } catch (e) {
    console.error("Failed to create section:", e);
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}

/** DELETE — remove a section */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const branchCode = String(body.branchCode ?? "").trim().toUpperCase();
    const sectionName = String(body.sectionName ?? "").trim().toUpperCase();

    if (!branchCode || !sectionName) {
      return NextResponse.json({ error: "branchCode and sectionName are required." }, { status: 400 });
    }

    await db
      .delete(customSections)
      .where(and(eq(customSections.branchCode, branchCode), eq(customSections.sectionName, sectionName)));

    return NextResponse.json({ message: `Section "${sectionName}" removed from "${branchCode}".` });
  } catch (e) {
    console.error("Failed to delete section:", e);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}
