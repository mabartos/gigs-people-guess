import { NextRequest, NextResponse } from "next/server";
import { updateResult } from "@/lib/google-sheets";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
