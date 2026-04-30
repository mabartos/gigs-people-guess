import type { Member } from "@/types";

export const DEFAULT_MEMBERS: Member[] = [
  { id: "bender", name: "Bender", role: "Klávesy", icon: "piano", type: "band" },
  { id: "borec", name: "Borec", role: "Saxofon", icon: "music", type: "band" },
  { id: "davos", name: "Davos", role: "Bicí", icon: "drum", type: "band" },
  { id: "martos", name: "Martoš", role: "Kytara", icon: "guitar", type: "band" },
  { id: "michal", name: "Michal", role: "Zpěv", icon: "mic", type: "band" },
  { id: "vlada", name: "Vláďa", role: "Basa", icon: "guitar", type: "band" },
  { id: "doupi", name: "Doupi", role: "Světla", icon: "lightbulb", type: "crew" },
  { id: "filip", name: "Filip", role: "Světla", icon: "lightbulb", type: "crew" },
  { id: "houzvi", name: "Houžvi", role: "Zvuk", icon: "headphones", type: "crew" },
  { id: "kickin", name: "KickIn", role: "Ostatní", icon: "package", type: "crew" },
  { id: "mj", name: "MJ", role: "Zvuk", icon: "headphones", type: "crew" },
];

export const CREW_CATEGORIES = ["Zvuk", "Světla"] as const;

export const MEMBER_CATEGORIES = [
  { value: "band", label: "Kapela" },
  ...CREW_CATEGORIES.map((c) => ({ value: c, label: c })),
  { value: "Ostatní", label: "Ostatní" },
] as const;

export const GIGS_SHEET = "Gigs";
export const POINTS_SHEET = "Body";
export const MEMBERS_SHEET = "Členové";

export const COOKIE_NAME = "thefeet-session";
export const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export const POINTS_TABLE = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1];

export function getPositionPoints(position: number): number {
  if (position <= POINTS_TABLE.length) return POINTS_TABLE[position - 1];
  return 1;
}

export function getGigStatus(gig: { guesses: Record<string, number | null>; actualCount: number | null }): "new" | "guessed" | "completed" {
  if (gig.actualCount != null) return "completed";
  const hasAnyGuess = Object.values(gig.guesses).some((v) => v != null && v > 0);
  if (hasAnyGuess) return "guessed";
  return "new";
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

export function parseCzechDate(input: string): string | null {
  const match = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const weekday = date.toLocaleDateString("cs-CZ", { weekday: "long" });
  const [y, m, d] = dateStr.split("-");
  return `${weekday} ${d}.${m}.${y}`;
}
