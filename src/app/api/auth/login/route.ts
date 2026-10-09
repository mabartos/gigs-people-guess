import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, checkPassword, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body;

  if (
    typeof password !== "string" ||
    !password ||
    (!checkPassword(password) && !checkAdminPassword(password))
  ) {
    return NextResponse.json({ error: "Špatné heslo" }, { status: 401 });
  }

  await setAuthCookie();
  return NextResponse.json({ success: true });
}
