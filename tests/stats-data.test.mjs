import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function harness() {
  const tables = {
    "Členové": [["id", "name", "role", "icon", "type"], ["a", "Alice", "", "mic", "band"], ["b", "Bob", "Ostatní", "package", "crew"]],
    Gigs: [["id", "name", "date", "location", "actual_count", "created_at", "updated_at", "guess_a", "guess_b"], ["old", "Older", "2026-01-01", "Prague", "100", "2026-01-01", "2026-01-01", "100", "110"], ["latest", "Latest", "2026-02-01", "Brno", "200", "2026-01-01", "2026-01-01", "180", "200"]],
    Body: [["gig_id", "a", "b"], ["old", "12", "10"], ["latest", "10", "12"]],
  };
  const calls = [];
  const writes = [];
  let now = Date.now();
  let deferred = null;
  let failure = null;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const values = {
    get: async ({ range }) => {
      calls.push(range);
      const [sheet, cells] = range.split("!");
      const rows = tables[sheet];
      if (cells === "1:1") return { data: { values: clone([rows[0]]) } };
      if (cells === "A:A") return { data: { values: rows.map((row) => [row[0]]) } };
      return { data: { values: clone(rows.slice(1)) } };
    },
    batchGet: async ({ ranges }) => {
      calls.push(ranges);
      if (failure) { const error = failure; failure = null; throw error; }
      const response = { data: { valueRanges: ranges.map((range) => ({ values: clone(tables[range.match(/^'([^']+)'/)[1]]) })) } };
      if (deferred) { const wait = deferred; deferred = null; await wait; }
      return response;
    },
    update: async (request) => { writes.push(request); },
    append: async (request) => { writes.push(request); },
  };
  const sheets = { spreadsheets: {
    values,
    get: async () => {
      calls.push("metadata");
      return { data: { sheets: Object.keys(tables).map((title, sheetId) => ({ properties: { title, sheetId } })) } };
    },
    batchUpdate: async (request) => { writes.push(request); },
  } };
  const google = { auth: { GoogleAuth: class {} }, sheets: () => sheets };
  function load(file, imports) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, {
      exports, Date: class extends Date { static now() { return now; } },
      process: { env: { GOOGLE_SHEETS_ID: "test-sheet" } },
      require: (name) => { assert.ok(name in imports); return imports[name]; },
    });
    return exports;
  }
  const constants = load("src/lib/constants.ts", {});
  const api = load("src/lib/google-sheets.ts", { googleapis: { google }, "./constants": constants });
  return { api, calls, writes, clone, tables, advance: (ms) => { now += ms; },
    defer: (promise) => { deferred = promise; }, fail: (error) => { failure = error; } };
}

test("stats data matches the existing readers using one read-only batch instead of sequential calls", async () => {
  const baseline = harness();
  const expected = { gigs: await baseline.api.getAllGigs(), members: await baseline.api.getAllMembers() };
  assert.ok(baseline.calls.length >= 8);
  const h = harness();
  const actual = await h.api.getStatsData();
  assert.deepEqual(h.clone(actual), h.clone(expected));
  assert.equal(h.calls.length, 1);
  assert.equal(h.writes.length, 0);
});

test("concurrent stats reads share a request, cache expires after a minute, and gig edits invalidate it", async () => {
  const h = harness();
  const results = await Promise.all([h.api.getStatsData(), h.api.getStatsData(), h.api.getStatsData()]);
  assert.equal(results[0], results[1]);
  assert.equal(h.calls.length, 1);
  h.advance(59999);
  await h.api.getStatsData();
  assert.equal(h.calls.length, 1);
  h.advance(1);
  await h.api.getStatsData();
  assert.equal(h.calls.length, 2);
  await h.api.updateGig("latest", { name: "Updated" });
  h.tables.Gigs[2][1] = "Updated";
  assert.equal((await h.api.getStatsData()).gigs[0].name, "Updated");
  assert.equal(h.calls.filter(Array.isArray).length, 3);
});

test("an old in-flight read cannot repopulate the cache after an edit", async () => {
  const h = harness();
  let release;
  h.defer(new Promise((resolve) => { release = resolve; }));
  const old = h.api.getStatsData();
  await h.api.updateGig("latest", { name: "Updated" });
  h.tables.Gigs[2][1] = "Updated";
  const fresh = await h.api.getStatsData();
  release();
  assert.equal((await old).gigs[0].name, "Latest");
  assert.equal(fresh.gigs[0].name, "Updated");
  assert.equal((await h.api.getStatsData()).gigs[0].name, "Updated");
  assert.equal(h.calls.filter(Array.isArray).length, 2);
});

test("member deletion invalidates the stats cache and removes deleted members from guesses", async () => {
  const h = harness();
  await h.api.getStatsData();
  await h.api.deleteMember("b");
  h.tables["Členové"].splice(2, 1);
  const data = await h.api.getStatsData();
  assert.deepEqual(h.clone(data.members.map((member) => member.id)), ["a"]);
  assert.equal(data.gigs[0].guesses.b, undefined);
  assert.equal(h.calls.filter(Array.isArray).length, 2);
});

test("a missing points sheet falls back to guesses without writing, while other failures retry normally", async () => {
  const h = harness();
  h.fail(Object.assign(new Error("Unable to parse range: 'Body'"), { code: 400 }));
  const data = await h.api.getStatsData();
  assert.deepEqual(h.clone(data.gigs[0].points), {});
  assert.equal(data.gigs[0].guesses.b, 200);
  assert.equal(h.writes.length, 0);
  assert.equal(h.calls.length, 2);
  const failed = harness();
  failed.fail(Object.assign(new Error("Permission denied"), { code: 403 }));
  await assert.rejects(failed.api.getStatsData(), /Permission denied/);
  await failed.api.getStatsData();
  assert.equal(failed.calls.length, 2);
});
