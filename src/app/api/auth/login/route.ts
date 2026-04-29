import { NextRequest, NextResponse } from "next/server";
import { checkPassword, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body;

  if (!password || !checkPassword(password)) {
    return NextResponse.json({ error: "Špatné heslo" }, { status: 401 });
  }

  await setAuthCookie();
  return NextResponse.json({ success: true });
}
