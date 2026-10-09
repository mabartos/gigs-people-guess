import assert from "node:assert/strict";
import { createHmac, webcrypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

function harness() {
  const env = { SHARED_PASSWORD: "shared", ADMIN_PASSWORD: "admin", SESSION_SECRET: "test-secret", NODE_ENV: "production" };
  const jar = new Map();
  const writes = [];
  const mutations = [];
  const cookieStore = {
    get: (name) => jar.has(name) ? { value: jar.get(name) } : undefined,
    set: (name, value, options) => { jar.set(name, value); writes.push(options); },
    delete: (name) => jar.delete(name),
  };
  function load(file, imports) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(projectRoot, file), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, {
      exports, process: { env }, crypto: webcrypto, TextEncoder, Uint8Array, btoa, atob, console,
      require: (name) => { assert.ok(name in imports, `Unexpected import: ${name}`); return imports[name]; },
    });
    return exports;
  }
  const constants = load("src/lib/constants.ts", {});
  const auth = load("src/lib/auth.ts", {
    "next/headers": { cookies: async () => cookieStore },
    "./constants": constants,
  });
  const sheets = {
    getAllMembers: async () => [],
    addMember: async (member) => { mutations.push(["add", member.id]); },
    deleteMember: async (id) => { mutations.push(["delete", id]); },
    updateResult: async (id, count) => { mutations.push(["result", id, count]); },
    clearResult: async (id) => { mutations.push(["clear", id]); },
  };
  const route = (file) => load(file, {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "@/lib/auth": auth, "@/lib/google-sheets": sheets,
  });
  const login = route("src/app/api/auth/login/route.ts").POST;
  const session = route("src/app/api/auth/session/route.ts").GET;
  const logout = route("src/app/api/auth/logout/route.ts").POST;
  const add = route("src/app/api/members/route.ts").POST;
  const remove = route("src/app/api/members/[id]/route.ts").DELETE;
  const result = route("src/app/api/gigs/[id]/result/route.ts");
  const request = (body) => ({ json: async () => body });
  const params = { params: Promise.resolve({ id: "test" }) };
  const actions = [
    () => add(request({ name: "Test", adminPassword: "admin" })),
    () => remove(request({ password: "shared", adminPassword: "admin" }), params),
    () => result.PUT(request({ actualCount: 100, adminPassword: "admin" }), params),
    () => result.DELETE(request({ adminPassword: "admin" }), params),
  ];
  function setToken(token) { jar.set(constants.COOKIE_NAME, token); }
  function signed(payload) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${encoded}.${createHmac("sha256", env.SESSION_SECRET).update(encoded).digest("base64url")}`;
  }
  return { env, auth, writes, mutations, login, session, logout, request, actions, setToken, signed };
}

test("login assigns a signed role based only on the password and keeps the 365-day cookie", async () => {
  const h = harness();
  assert.equal((await h.login(h.request({ password: "admin", role: "member" }))).status, 200);
  assert.equal(await h.auth.isAdmin(), true);
  assert.equal((await h.login(h.request({ password: "shared", role: "admin" }))).status, 200);
  assert.equal(await h.auth.isAdmin(), false);
  assert.deepEqual({ ...h.writes[0] }, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 365 * 86400 });
  for (const password of ["wrong", "", undefined, null, 123, {}]) {
    assert.equal((await h.login(h.request({ password }))).status, 401);
  }
  assert.equal(h.writes.length, 2);
});

test("member and result mutations reject missing or regular sessions before database writes", async () => {
  const h = harness();
  for (const action of h.actions) assert.equal((await action()).status, 403);
  await h.login(h.request({ password: "shared" }));
  for (const action of h.actions) assert.equal((await action()).status, 403);
  assert.equal(h.mutations.length, 0);
  await h.login(h.request({ password: "admin" }));
  for (const [index, action] of h.actions.entries()) assert.equal((await action()).status, index === 0 ? 201 : 200);
  assert.deepEqual(h.mutations.map(([kind]) => kind), ["add", "delete", "result", "clear"]);
});

test("expired, malformed, and tampered role cookies cannot grant admin access", async () => {
  const h = harness();
  const memberToken = await h.auth.createToken("member");
  const [payload, signature] = memberToken.split(".");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString());
  const forged = `${Buffer.from(JSON.stringify({ ...data, role: "admin" })).toString("base64url")}.${signature}`;
  const invalid = [forged, "invalid", `${memberToken}.extra`, h.signed({ authenticated: true, role: "admin", exp: Date.now() - 1 })];
  for (const token of invalid) {
    h.setToken(token);
    assert.equal(await h.auth.verifyToken(token), false);
    for (const action of h.actions) assert.equal((await action()).status, 403);
  }
  assert.equal(h.mutations.length, 0);
});

test("old cookies without a role remain regular sessions", async () => {
  const h = harness();
  const legacy = h.signed({ authenticated: true, exp: Date.now() + 60000 });
  h.setToken(legacy);
  assert.equal(await h.auth.verifyToken(legacy), true);
  assert.equal(await h.auth.isAdmin(), false);
  for (const action of h.actions) assert.equal((await action()).status, 403);
});

test("session status is not cached and logout removes admin access", async () => {
  const h = harness();
  await h.login(h.request({ password: "admin" }));
  const response = await h.session();
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { authenticated: true, isAdmin: true });
  assert.equal((await h.logout()).status, 200);
  assert.equal(await h.auth.isAdmin(), false);
  assert.deepEqual(await (await h.session()).json(), { authenticated: false, isAdmin: false });
  for (const action of h.actions) assert.equal((await action()).status, 403);
});
