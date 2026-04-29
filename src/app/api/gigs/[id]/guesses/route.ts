import { NextRequest, NextResponse } from "next/server";
import { updateGuesses } from "@/lib/google-sheets";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { guesses } = body;

    if (!guesses || typeof guesses !== "object") {
      return NextResponse.json({ error: "Neplatné tipy" }, { status: 400 });
    }

    await updateGuesses(id, guesses);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update guesses:", error);
    return NextResponse.json({ error: "Nepodařilo se uložit tipy" }, { status: 500 });
  }
}
