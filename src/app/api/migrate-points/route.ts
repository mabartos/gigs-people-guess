import { NextResponse } from "next/server";
import { recalculateAllPoints } from "@/lib/google-sheets";

export async function POST() {
  try {
    const updated = await recalculateAllPoints();
    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Failed to recalculate points:", error);
    return NextResponse.json({ error: "Nepodařilo se přepočítat body" }, { status: 500 });
  }
}
