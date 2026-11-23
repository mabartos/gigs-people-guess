import type { Gig, Member } from "@/types";
import { getGigScores } from "./gig-scores";

export const VICE_CITY_START = "2026-11-19";
export const VICE_CITY_END = "2026-12-27";
export const VICE_CITY_TARGET = 6;
export const VICE_CITY_PODIUM_STARS = [3, 2, 1] as const;

const pragueDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" });

interface StarTotal {
  id: string;
  name: string;
  stars: number;
}

export interface ViceCityStanding extends StarTotal {
  position: number;
}

function rankStandings(entries: StarTotal[]): ViceCityStanding[] {
  const sorted = entries.sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name, "cs"));
  let position = 1;
  return sorted.map((standing, index) => {
    if (index > 0 && standing.stars < sorted[index - 1].stars) position = index + 1;
    return { ...standing, position };
  });
}

export function isViceCityDate(date: string): boolean {
  return date >= VICE_CITY_START && date <= VICE_CITY_END;
}

export function isViceCityGig(gig: Gig): boolean {
  return gig.actualCount != null && isViceCityDate(gig.date);
}

export function getViceCityMedalStars(rank?: number): number {
  return rank == null ? 0 : VICE_CITY_PODIUM_STARS[rank - 1] ?? 0;
}

export function getViceCityStats(gigs: Gig[], members: Member[], now = new Date()) {
  const starsById = new Map<string, number>();

  for (const gig of gigs.filter(isViceCityGig)) {
    for (const { id, rank } of getGigScores(gig, members)) {
      starsById.set(id, (starsById.get(id) ?? 0) + getViceCityMedalStars(rank));
    }
  }

  const participants = members.flatMap(({ id, name }) => {
    const stars = starsById.get(id);
    return stars == null ? [] : [{ id, name, stars }];
  });
  const finalGigs = gigs.filter(({ date }) => date === VICE_CITY_END);
  const finalResultsReady = finalGigs.length > 0 && finalGigs.every(({ actualCount }) => actualCount != null);
  const phase: "active" | "awaitingResult" | "finished" = pragueDate.format(now) <= VICE_CITY_END
    ? "active"
    : finalResultsReady ? "finished" : "awaitingResult";

  return {
    club: rankStandings(participants.filter(({ stars }) => stars >= VICE_CITY_TARGET)),
    challengers: rankStandings(participants.filter(({ stars }) => stars < VICE_CITY_TARGET)),
    phase,
  };
}
