import type { Gig } from "@/types";
import { getGigStatus } from "./constants";

const pragueDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" });
const STALE_AFTER_DAYS = 14;

export function groupGigs(gigs: Gig[], now = new Date()) {
  const cutoffDate = new Date(`${pragueDate.format(now)}T00:00:00Z`);
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - STALE_AFTER_DAYS);
  const cutoff = cutoffDate.toISOString().slice(0, 10);

  const upcoming: Gig[] = [];
  const stale: Gig[] = [];
  const past: Gig[] = [];
  for (const gig of gigs) {
    const status = getGigStatus(gig);
    if (status === "completed") past.push(gig);
    else if (status === "guessed" && gig.date && gig.date <= cutoff) stale.push(gig);
    else upcoming.push(gig);
  }

  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  return { upcoming, stale, past };
}
