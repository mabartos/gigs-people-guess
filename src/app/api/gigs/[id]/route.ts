import { NextRequest, NextResponse } from "next/server";
import { getGigById, deleteGig } from "@/lib/google-sheets";
import { checkPassword } from "@/lib/auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const gig = await getGigById(id);

    if (!gig) {
      return NextResponse.json({ error: "Koncert nenalezen" }, { status: 404 });
    }

    return NextResponse.json(gig);
  } catch (error) {
    console.error("Failed to fetch gig:", error);
    return NextResponse.json({ error: "Nepodařilo se načíst koncert" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password || !checkPassword(password)) {
      return NextResponse.json({ error: "Špatné heslo" }, { status: 401 });
    }

    await deleteGig(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete gig:", error);
    return NextResponse.json({ error: "Nepodařilo se smazat koncert" }, { status: 500 });
  }
}
