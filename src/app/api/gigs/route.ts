import { NextRequest, NextResponse } from "next/server";
import { getAllGigs, createGig } from "@/lib/google-sheets";

export async function GET() {
  try {
    const gigs = await getAllGigs();
    return NextResponse.json(gigs);
  } catch (error) {
    console.error("Failed to fetch gigs:", error);
    return NextResponse.json({ error: "Nepodařilo se načíst koncerty" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, date, location } = body;

    if (!name || !date || !location) {
      return NextResponse.json({ error: "Vyplň všechna pole" }, { status: 400 });
    }

    const gig = await createGig({ name, date, location });
    return NextResponse.json(gig, { status: 201 });
  } catch (error) {
    console.error("Failed to create gig:", error);
    return NextResponse.json({ error: "Nepodařilo se vytvořit koncert" }, { status: 500 });
  }
}
