import { cookies } from "next/headers";
import { COOKIE_NAME, COOKIE_MAX_AGE } from "./constants";

type SessionRole = "admin" | "member";

interface Session {
  authenticated: true;
  role: SessionRole;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array<ArrayBuffer> {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function sign(payload: string): Promise<string> {
  const key = await getKey();
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toBase64Url(sig);
}

export async function createToken(role: SessionRole = "member"): Promise<string> {
  const payload = btoa(
    JSON.stringify({ authenticated: true, role, exp: Date.now() + COOKIE_MAX_AGE * 1000 })
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

async function readToken(token: string): Promise<Session | null> {
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra !== undefined) return null;
    const key = await getKey();
    const valid = await crypto.subtle.verify(
      "HMAC", key, fromBase64Url(signature), new TextEncoder().encode(payload)
    );
    if (!valid) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(json);
    if (data.authenticated !== true || typeof data.exp !== "number" || data.exp <= Date.now()) return null;
    if (data.role !== undefined && data.role !== "admin" && data.role !== "member") return null;
    return { authenticated: true, role: data.role ?? "member", exp: data.exp };
  } catch {
    return null;
  }
}

export async function verifyToken(token: string): Promise<boolean> {
  return (await readToken(token)) !== null;
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return token ? readToken(token) : null;
}

export async function isAdmin(): Promise<boolean> {
  return (await getSession())?.role === "admin";
}

export function checkPassword(password: string): boolean {
  return password === process.env.SHARED_PASSWORD;
}

export function checkAdminPassword(password: string): boolean {
  return typeof password === "string" && password.length > 0 && password === process.env.ADMIN_PASSWORD;
}

export async function setAuthCookie(role: SessionRole = "member") {
  const token = await createToken(role);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearAuthCookie() {
  (await cookies()).delete(COOKIE_NAME);
}
