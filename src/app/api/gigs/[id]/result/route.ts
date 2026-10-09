import { NextRequest, NextResponse } from "next/server";
import { updateResult, clearResult } from "@/lib/google-sheets";
import { isAdmin } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Tato akce je pouze pro administrátora" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const { actualCount } = body;

    if (actualCount == null || typeof actualCount !== "number" || actualCount < 0) {
      return NextResponse.json({ error: "Neplatný počet" }, { status: 400 });
    }

    await updateResult(id, actualCount);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update result:", error);
    return NextResponse.json({ error: "Nepodařilo se uložit výsledek" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Tato akce je pouze pro administrátora" }, { status: 403 });
    }
    const { id } = await params;
    await clearResult(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to clear result:", error);
    return NextResponse.json({ error: "Nepodařilo se smazat výsledek" }, { status: 500 });
  }
}
