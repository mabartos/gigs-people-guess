import { NextRequest, NextResponse } from "next/server";
import { deleteMember } from "@/lib/google-sheets";
import { checkPassword } from "@/lib/auth";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.password || !checkPassword(body.password)) {
      return NextResponse.json({ error: "Špatné heslo" }, { status: 401 });
    }

    await deleteMember(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete member:", error);
    return NextResponse.json({ error: "Nepodařilo se smazat člena" }, { status: 500 });
  }
}
