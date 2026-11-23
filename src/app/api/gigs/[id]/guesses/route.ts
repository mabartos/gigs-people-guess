import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { GUESS_DEADLINE_TIME } from "@/lib/guess-deadline";
import { updateGuesses } from "@/lib/google-sheets";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Přihlas se pro uložení tipů" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { guesses } = body;

    if (!guesses || typeof guesses !== "object") {
      return NextResponse.json({ error: "Neplatné tipy" }, { status: 400 });
    }

    const result = await updateGuesses(id, guesses, session.role === "admin");
    if (result === "not-found") {
      return NextResponse.json({ error: "Koncert nenalezen" }, { status: 404 });
    }
    if (result === "missing-date") {
      return NextResponse.json({ error: "Tipování je uzavřené, koncert nemá platné datum." }, { status: 409 });
    }
    if (result === "closed") {
      return NextResponse.json({ error: `Tipování se uzavírá v ${GUESS_DEADLINE_TIME} v den koncertu.` }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update guesses:", error);
    return NextResponse.json({ error: "Nepodařilo se uložit tipy" }, { status: 500 });
  }
}
