import { NextRequest, NextResponse } from "next/server";
import { getAllMembers, addMember } from "@/lib/google-sheets";
import type { MemberType } from "@/types";

export async function GET() {
  try {
    const members = await getAllMembers();
    return NextResponse.json(members);
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return NextResponse.json({ error: "Nepodařilo se načíst členy" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, icon, type } = body;

    if (!name) {
      return NextResponse.json({ error: "Vyplň jméno" }, { status: 400 });
    }

    const id = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]/g, "");

    const existing = await getAllMembers();
    const nameLower = name.toLowerCase().trim();
    if (existing.some((m) => m.name.toLowerCase() === nameLower)) {
      return NextResponse.json({ error: "Člen s tímto jménem již existuje" }, { status: 409 });
    }

    await addMember({
      id,
      name: name.trim(),
      role: "",
      icon: icon || "music",
      type: (type as MemberType) || "crew",
    });

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error("Failed to add member:", error);
    return NextResponse.json({ error: "Nepodařilo se přidat člena" }, { status: 500 });
  }
}
