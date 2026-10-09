import { NextResponse } from "next/server";
import { getStatsData } from "@/lib/google-sheets";

export async function GET() {
  try {
    const data = await getStatsData();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json({ error: "Nepodařilo se načíst statistiky" }, { status: 500 });
  }
}
