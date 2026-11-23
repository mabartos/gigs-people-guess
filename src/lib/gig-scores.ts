import type { Gig, Member } from "@/types";
import { getPositionPoints } from "./constants";

export function getGigScores(gig: Gig, members: Member[]) {
  const { actualCount, points, guesses } = gig;
  if (actualCount == null) return [];

  if (Object.keys(points).length > 0) {
    const sortedPoints = [...new Set(Object.values(points))].sort((a, b) => b - a);
    return members.flatMap(({ id }) => {
      const score = points[id];
      return score == null ? [] : [{ id, score, rank: sortedPoints.indexOf(score) + 1 }];
    });
  }

  const ranked = members.flatMap(({ id }) => {
    const guess = guesses[id];
    return guess == null ? [] : [{ id, delta: Math.abs(guess - actualCount) }];
  }).sort((a, b) => a.delta - b.delta);

  let rank = 1;
  return ranked.map(({ id, delta }, index) => {
    if (index > 0 && delta > ranked[index - 1].delta) rank = index + 1;
    return { id, score: getPositionPoints(rank), rank };
  });
}
