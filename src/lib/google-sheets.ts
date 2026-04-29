import { google, sheets_v4 } from "googleapis";
import type { Gig, Member } from "@/types";
import { GIGS_SHEET, MEMBERS_SHEET, DEFAULT_MEMBERS } from "./constants";

let sheetsClient: sheets_v4.Sheets | null = null;

function getSheetId(): string {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) throw new Error("GOOGLE_SHEETS_ID is not set");
  return id;
}

function getSheetsClient(): sheets_v4.Sheets {
  if (sheetsClient) return sheetsClient;
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

const CACHE_TTL = 10_000;
let gigsCache: { data: Gig[]; timestamp: number } | null = null;
let membersCache: { data: Member[]; timestamp: number } | null = null;

function invalidateCache() {
  gigsCache = null;
}
function invalidateMembersCache() {
  membersCache = null;
}

// ── Members ──────────────────────────────────────────────────────────

const MEMBER_HEADERS = ["id", "name", "role", "icon", "type"];

async function ensureMembersSheet(): Promise<void> {
  const sheets = getSheetsClient();
  const id = getSheetId();

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: id });
  const exists = spreadsheet.data.sheets?.some(
    (s) => s.properties?.title === MEMBERS_SHEET
  );

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: {
        requests: [{ addSheet: { properties: { title: MEMBERS_SHEET } } }],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${MEMBERS_SHEET}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [MEMBER_HEADERS] },
    });

    const rows = DEFAULT_MEMBERS.map((m) => [m.id, m.name, m.role, m.icon, m.type]);
    await sheets.spreadsheets.values.append({
      spreadsheetId: id,
      range: `${MEMBERS_SHEET}!A:E`,
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });
  }
}

export async function getAllMembers(): Promise<Member[]> {
  if (membersCache && Date.now() - membersCache.timestamp < CACHE_TTL) {
    return membersCache.data;
  }

  const sheets = getSheetsClient();
  const id = getSheetId();
  await ensureMembersSheet();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${MEMBERS_SHEET}!A2:E`,
  });

  const rows = res.data.values || [];
  const seen = new Set<string>();
  const members: Member[] = [];
  for (const r of rows) {
    if (!r[0]) continue;
    const name = (r[1] || "").toLowerCase();
    if (seen.has(name)) continue;
    seen.add(name);
    members.push({
      id: r[0] || "",
      name: r[1] || "",
      role: r[2] || "",
      icon: r[3] || "music",
      type: (r[4] as Member["type"]) || "crew",
    });
  }

  membersCache = { data: members, timestamp: Date.now() };
  return members;
}

export async function addMember(member: Member): Promise<void> {
  const sheets = getSheetsClient();
  const id = getSheetId();
  await ensureMembersSheet();

  await sheets.spreadsheets.values.append({
    spreadsheetId: id,
    range: `${MEMBERS_SHEET}!A:E`,
    valueInputOption: "RAW",
    requestBody: { values: [[member.id, member.name, member.role, member.icon, member.type]] },
  });

  await ensureGigGuessColumn(member.id);
  invalidateMembersCache();
  invalidateCache();
}

export async function deleteMember(memberId: string): Promise<void> {
  const sheets = getSheetsClient();
  const id = getSheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${MEMBERS_SHEET}!A:A`,
  });
  const rows = res.data.values || [];
  let rowIdx: number | null = null;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === memberId) { rowIdx = i; break; }
  }
  if (rowIdx == null) throw new Error("Member not found");

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: id });
  const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === MEMBERS_SHEET);
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) throw new Error("Sheet not found");

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: id,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId: sheet.properties.sheetId, dimension: "ROWS", startIndex: rowIdx, endIndex: rowIdx + 1 },
        },
      }],
    },
  });

  invalidateMembersCache();
}

// ── Gigs ─────────────────────────────────────────────────────────────

async function getGigsHeaders(): Promise<string[]> {
  const sheets = getSheetsClient();
  const id = getSheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${GIGS_SHEET}!1:1`,
  });

  return (res.data.values?.[0] as string[]) || [];
}

async function ensureGigsSheet(members: Member[]): Promise<void> {
  const sheets = getSheetsClient();
  const id = getSheetId();

  const headers = await getGigsHeaders();
  if (headers.length === 0) {
    const fullHeaders = [
      "id", "name", "date", "location",
      ...members.map((m) => `guess_${m.id}`),
      "actual_count", "created_at", "updated_at",
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${GIGS_SHEET}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [fullHeaders] },
    });
    return;
  }

  for (const member of members) {
    const col = `guess_${member.id}`;
    if (!headers.includes(col)) {
      await ensureGigGuessColumn(member.id);
    }
  }
}

async function ensureGigGuessColumn(memberId: string): Promise<void> {
  const sheets = getSheetsClient();
  const id = getSheetId();
  const headers = await getGigsHeaders();
  const col = `guess_${memberId}`;
  if (headers.includes(col)) return;

  const actualIdx = headers.indexOf("actual_count");
  if (actualIdx === -1) {
    headers.push(col);
  } else {
    headers.splice(actualIdx, 0, col);
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: id,
    range: `${GIGS_SHEET}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers] },
  });
}

function rowToGig(row: string[], headers: string[], members: Member[]): Gig {
  const get = (name: string) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? row[idx] || "" : "";
  };

  const guesses: Record<string, number | null> = {};
  for (const m of members) {
    const val = get(`guess_${m.id}`);
    guesses[m.id] = val ? Number(val) : null;
  }

  const actual = get("actual_count");

  return {
    id: get("id"),
    name: get("name"),
    date: get("date"),
    location: get("location"),
    guesses,
    actualCount: actual ? Number(actual) : null,
    createdAt: get("created_at"),
    updatedAt: get("updated_at"),
  };
}

export async function getAllGigs(): Promise<Gig[]> {
  if (gigsCache && Date.now() - gigsCache.timestamp < CACHE_TTL) {
    return gigsCache.data;
  }

  const sheets = getSheetsClient();
  const id = getSheetId();
  const members = await getAllMembers();
  await ensureGigsSheet(members);

  const headers = await getGigsHeaders();
  const lastCol = String.fromCharCode("A".charCodeAt(0) + headers.length - 1);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${GIGS_SHEET}!A2:${lastCol}`,
  });

  const rows = res.data.values || [];
  const gigs = rows
    .filter((r) => r[0])
    .map((r) => rowToGig(r, headers, members))
    .sort((a, b) => b.date.localeCompare(a.date));

  gigsCache = { data: gigs, timestamp: Date.now() };
  return gigs;
}

export async function getGigById(gigId: string): Promise<Gig | null> {
  const gigs = await getAllGigs();
  return gigs.find((g) => g.id === gigId) || null;
}

async function findGigRowIndex(gigId: string): Promise<number | null> {
  const sheets = getSheetsClient();
  const id = getSheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${GIGS_SHEET}!A:A`,
  });
  const rows = res.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === gigId) return i + 1;
  }
  return null;
}

export async function createGig(data: { name: string; date: string; location: string }): Promise<Gig> {
  const sheets = getSheetsClient();
  const id = getSheetId();
  const members = await getAllMembers();
  await ensureGigsSheet(members);

  const headers = await getGigsHeaders();
  const now = new Date().toISOString();
  const gigId = `g_${Date.now()}`;

  const row = headers.map((h) => {
    if (h === "id") return gigId;
    if (h === "name") return data.name;
    if (h === "date") return data.date;
    if (h === "location") return data.location;
    if (h === "created_at") return now;
    if (h === "updated_at") return now;
    return "";
  });

  const lastCol = String.fromCharCode("A".charCodeAt(0) + headers.length - 1);
  await sheets.spreadsheets.values.append({
    spreadsheetId: id,
    range: `${GIGS_SHEET}!A:${lastCol}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  invalidateCache();
  return rowToGig(row, headers, members);
}

export async function updateGuesses(gigId: string, guesses: Record<string, number>): Promise<void> {
  const sheets = getSheetsClient();
  const id = getSheetId();
  const rowIdx = await findGigRowIndex(gigId);
  if (!rowIdx) throw new Error("Gig not found");

  const headers = await getGigsHeaders();

  for (const [memberId, value] of Object.entries(guesses)) {
    const colName = `guess_${memberId}`;
    const colIdx = headers.indexOf(colName);
    if (colIdx === -1) continue;
    const col = String.fromCharCode("A".charCodeAt(0) + colIdx);
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${GIGS_SHEET}!${col}${rowIdx}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[value]] },
    });
  }

  const updatedIdx = headers.indexOf("updated_at");
  if (updatedIdx >= 0) {
    const col = String.fromCharCode("A".charCodeAt(0) + updatedIdx);
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${GIGS_SHEET}!${col}${rowIdx}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[new Date().toISOString()]] },
    });
  }

  invalidateCache();
}

export async function updateResult(gigId: string, actualCount: number): Promise<void> {
  const sheets = getSheetsClient();
  const id = getSheetId();
  const rowIdx = await findGigRowIndex(gigId);
  if (!rowIdx) throw new Error("Gig not found");

  const headers = await getGigsHeaders();
  const actualIdx = headers.indexOf("actual_count");
  if (actualIdx === -1) throw new Error("actual_count column not found");

  const col = String.fromCharCode("A".charCodeAt(0) + actualIdx);
  await sheets.spreadsheets.values.update({
    spreadsheetId: id,
    range: `${GIGS_SHEET}!${col}${rowIdx}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[actualCount]] },
  });

  const updatedIdx = headers.indexOf("updated_at");
  if (updatedIdx >= 0) {
    const updCol = String.fromCharCode("A".charCodeAt(0) + updatedIdx);
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${GIGS_SHEET}!${updCol}${rowIdx}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[new Date().toISOString()]] },
    });
  }

  invalidateCache();
}

export async function deleteGig(gigId: string): Promise<void> {
  const sheets = getSheetsClient();
  const id = getSheetId();
  const rowIdx = await findGigRowIndex(gigId);
  if (!rowIdx) throw new Error("Gig not found");

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: id });
  const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === GIGS_SHEET);
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) throw new Error("Sheet not found");

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: id,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId: sheet.properties.sheetId, dimension: "ROWS", startIndex: rowIdx - 1, endIndex: rowIdx },
        },
      }],
    },
  });

  invalidateCache();
}
