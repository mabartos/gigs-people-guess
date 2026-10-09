import { NextRequest, NextResponse } from "next/server";
import { deleteMember } from "@/lib/google-sheets";
import { isAdmin } from "@/lib/auth";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Tato akce je pouze pro administrátora" }, { status: 403 });
    }
    const { id } = await params;
    await deleteMember(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete member:", error);
    return NextResponse.json({ error: "Nepodařilo se smazat člena" }, { status: 500 });
  }
}
