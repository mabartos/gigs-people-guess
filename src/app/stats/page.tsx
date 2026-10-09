"use client";

import { useEffect, useState } from "react";
import { Trophy, Target, TrendingUp, Star } from "lucide-react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { POINTS_TABLE, getPositionPoints } from "@/lib/constants";
import { PodiumChart } from "@/components/podium-chart";
import { RankingChange } from "@/components/position-change";
import type { PodiumEntry } from "@/components/podium-chart";
import type { Gig, Member, StatsData } from "@/types";
import { cn } from "@/lib/utils";
import { isTechnician } from "@/lib/members";

function avgPointsToPosition(avgPoints: number): string {
  let bestPos = POINTS_TABLE.length + 1;
  for (let i = 0; i < POINTS_TABLE.length; i++) {
    if (POINTS_TABLE[i] >= avgPoints) bestPos = i + 1;
  }
  let worstPos = POINTS_TABLE.length + 1;
  for (let i = 0; i < POINTS_TABLE.length; i++) {
    if (POINTS_TABLE[i] <= avgPoints) { worstPos = i + 1; break; }
  }
  if (bestPos === worstPos) return `${bestPos}.`;
  if (worstPos > POINTS_TABLE.length) return `${bestPos}.+`;
  return `${bestPos}.-${worstPos}.`;
}

interface MemberStats {
  id: string;
  name: string;
  wins: number;
  totalPoints: number;
  totalGigs: number;
  totalAllGigs: number;
  avgPoints: number;
}

function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7); // YYYY-MM
}

function getMonthName(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const name = date.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getPreviousMonthKey(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

function computeStats(gigs: Gig[], members: Member[]): { stats: MemberStats[]; completedCount: number; perGigPoints: Record<string, number[]>; podiums: PodiumEntry[] } {
  const completed = gigs.filter((g) => g.actualCount != null);
  if (completed.length === 0) return { stats: [], completedCount: 0, perGigPoints: {}, podiums: [] };

  const data: Record<string, { wins: number; totalPoints: number; gigs: number }> = {};
  const perGigPoints: Record<string, number[]> = {};
  const podiumData: Record<string, { gold: number; silver: number; bronze: number }> = {};
  members.forEach((m) => {
    data[m.id] = { wins: 0, totalPoints: 0, gigs: 0 };
    perGigPoints[m.id] = [];
    podiumData[m.id] = { gold: 0, silver: 0, bronze: 0 };
  });

  for (const gig of completed) {
    const hasStoredPoints = Object.keys(gig.points).length > 0;

    if (hasStoredPoints) {
      const sortedPts = [...new Set(Object.values(gig.points))].sort((a, b) => b - a);
      for (const m of members) {
        const pts = gig.points[m.id];
        if (pts == null) continue;
        data[m.id].totalPoints += pts;
        data[m.id].gigs += 1;
        perGigPoints[m.id].push(pts);
        const rank = sortedPts.indexOf(pts) + 1;
        if (rank === 1) { data[m.id].wins += 1; podiumData[m.id].gold += 1; }
        else if (rank === 2) podiumData[m.id].silver += 1;
        else if (rank === 3) podiumData[m.id].bronze += 1;
      }
    } else {
      const ranked = members
        .filter((m) => gig.guesses[m.id] != null)
        .map((m) => ({ id: m.id, delta: Math.abs(gig.guesses[m.id]! - gig.actualCount!) }))
        .sort((a, b) => a.delta - b.delta);

      let rank = 1;
      for (let i = 0; i < ranked.length; i++) {
        if (i > 0 && ranked[i].delta > ranked[i - 1].delta) rank = i + 1;
        const pts = getPositionPoints(rank);
        data[ranked[i].id].totalPoints += pts;
        data[ranked[i].id].gigs += 1;
        perGigPoints[ranked[i].id].push(pts);
        if (rank === 1) { data[ranked[i].id].wins += 1; podiumData[ranked[i].id].gold += 1; }
        else if (rank === 2) podiumData[ranked[i].id].silver += 1;
        else if (rank === 3) podiumData[ranked[i].id].bronze += 1;
      }
    }
  }

  const stats = members
    .map((m) => ({
      id: m.id,
      name: m.name,
      wins: data[m.id]?.wins || 0,
      totalPoints: data[m.id]?.totalPoints || 0,
      totalGigs: data[m.id]?.gigs || 0,
      totalAllGigs: completed.length,
      avgPoints: data[m.id]?.gigs ? Math.round(data[m.id].totalPoints / data[m.id].gigs * 10) / 10 : 0,
    }))
    .filter((s) => s.totalGigs > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints || b.wins - a.wins);

  const podiums = members
    .map((m) => {
      const p = podiumData[m.id];
      return { id: m.id, name: m.name, gold: p.gold, silver: p.silver, bronze: p.bronze, total: p.gold + p.silver + p.bronze };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total || b.gold - a.gold || b.silver - a.silver);

  return { stats, completedCount: completed.length, perGigPoints, podiums };
}

function getLatestCompletedGig(gigs: Gig[]): Gig | undefined {
  return gigs
    .filter((g) => g.actualCount != null)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
}

function getPreviousGigs(gigs: Gig[]): Gig[] {
  const latestGig = getLatestCompletedGig(gigs);
  return latestGig ? gigs.filter((g) => g.id !== latestGig.id) : gigs;
}

function getLatestMedals(gigs: Gig[], members: Member[]): Record<string, number> {
  const latestGig = getLatestCompletedGig(gigs);
  if (!latestGig) return {};
  const { podiums } = computeStats([latestGig], members);
  return Object.fromEntries(podiums.map((p) => [p.id, p.gold ? 1 : p.silver ? 2 : 3]));
}

function getPositionChanges(stats: { id: string }[], previousStats: { id: string }[]): Record<string, number | null> {
  const previousPositions = new Map(previousStats.map((s, index) => [s.id, index]));
  return Object.fromEntries(stats.map((s, index) => {
    const previousPosition = previousPositions.get(s.id);
    return [s.id, previousPosition == null ? null : previousPosition - index];
  }));
}

function getRegularStats(stats: MemberStats[], perGigPoints: Record<string, number[]>, minGigs: number): MemberStats[] {
  return stats
    .filter((s) => s.totalGigs >= minGigs)
    .map((s) => {
      const best = [...(perGigPoints[s.id] || [])].sort((a, b) => b - a).slice(0, minGigs);
      const totalPoints = best.reduce((sum, p) => sum + p, 0);
      return { ...s, totalPoints, avgPoints: best.length ? Math.round(totalPoints / best.length * 10) / 10 : 0 };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || b.avgPoints - a.avgPoints);
}

function getEfficientStats(stats: MemberStats[], minParticipation: number): MemberStats[] {
  return stats
    .filter((s) => s.totalGigs >= minParticipation)
    .sort((a, b) => b.avgPoints - a.avgPoints || b.wins - a.wins);
}

const rankMedals = ["🥇", "🥈", "🥉"];
const SHOW_EFFICIENT_STATS = false;
const SHOW_BAND_STATS = false;

function StatsTable({ title, subtitle, stats, hideGigs, hidePoints, hideAvg, minimal, showBothAvg, positionChanges, latestMedals }: { title: string; subtitle?: string; stats: MemberStats[]; hideGigs?: boolean; hidePoints?: boolean; hideAvg?: boolean; minimal?: boolean; showBothAvg?: boolean; positionChanges?: Record<string, number | null>; latestMedals?: Record<string, number> }) {
  if (stats.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-4">#</TableHead>
              <TableHead>Jméno</TableHead>
              {!hidePoints && <TableHead className="text-center">
                <span className="hidden sm:inline">Body</span>
                <Star className="h-3.5 w-3.5 sm:hidden mx-auto" />
              </TableHead>}
              <TableHead className="text-center">
                <span className="hidden sm:inline">Výhry</span>
                <Trophy className="h-3.5 w-3.5 sm:hidden mx-auto" />
              </TableHead>
              {!hideAvg && <TableHead className="text-center hidden sm:table-cell">{minimal ? "Prům. body" : "Prům. místo"}</TableHead>}
              {!hideAvg && showBothAvg && <TableHead className="text-center hidden sm:table-cell">Prům. místo</TableHead>}
              {!hideGigs && !minimal && <TableHead className={cn("text-center", !positionChanges && "pr-4")}>Tipů</TableHead>}
              {positionChanges && <TableHead className="w-24 pr-4 text-center" title="Změna pořadí oproti stavu před posledním koncertem a medaile z tohoto koncertu">Změna</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((s, idx) => (
              <TableRow key={s.id} className={cn(idx === 0 && "bg-primary/5")}>
                <TableCell className="font-medium pl-4">
                  {rankMedals[idx] ?? <span className="text-muted-foreground">{idx + 1}</span>}
                </TableCell>
                <TableCell className={cn("font-medium", idx < 3 && "font-bold", idx === 0 && "text-primary")}>{s.name}</TableCell>
                {!hidePoints && <TableCell className="text-center font-bold text-primary">{s.totalPoints}</TableCell>}
                <TableCell className="text-center font-semibold">{s.wins}</TableCell>
                {!hideAvg && <TableCell className="text-center text-muted-foreground hidden sm:table-cell">{minimal ? s.avgPoints : avgPointsToPosition(s.avgPoints)}</TableCell>}
                {!hideAvg && showBothAvg && <TableCell className="text-center text-muted-foreground hidden sm:table-cell">{avgPointsToPosition(s.avgPoints)}</TableCell>}
                {!hideGigs && !minimal && <TableCell className={cn("text-center text-muted-foreground", !positionChanges && "pr-4")}>{s.totalGigs}/{s.totalAllGigs}</TableCell>}
                {positionChanges && (
                  <TableCell className="pr-4 text-center">
                    <RankingChange change={positionChanges[s.id] ?? null} medal={latestMedals?.[s.id]} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function StatsPage() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stats")
      .then(async (response) => {
        if (!response.ok) throw new Error("Nepodařilo se načíst statistiky");
        return response.json() as Promise<StatsData>;
      })
      .then((data) => { setGigs(data.gigs); setMembers(data.members); })
      .catch(() => { setError("Nepodařilo se načíst statistiky. Zkus obnovit stránku."); })
      .finally(() => setLoading(false));
  }, []);

  const { stats, completedCount, perGigPoints, podiums } = computeStats(gigs, members);
  const previous = computeStats(getPreviousGigs(gigs), members);
  const positionChanges = getPositionChanges(stats, previous.stats);
  const podiumChanges = getPositionChanges(podiums, previous.podiums);
  const latestMedals = getLatestMedals(gigs, members);
  
  // Monthly stats
  const currentMonthKey = getCurrentMonthKey();
  const previousMonthKey = getPreviousMonthKey();
  const currentMonthGigs = gigs.filter((g) => getMonthKey(g.date) === currentMonthKey);
  const previousMonthGigs = gigs.filter((g) => getMonthKey(g.date) === previousMonthKey);
  const currentMonthStats = computeStats(currentMonthGigs, members).stats;
  const previousMonthStats = computeStats(previousMonthGigs, members).stats;
  const currentMonthChanges = getPositionChanges(currentMonthStats, computeStats(getPreviousGigs(currentMonthGigs), members).stats);
  const currentMonthMedals = getLatestMedals(currentMonthGigs, members);
  
  const bandIds = new Set(members.filter((m) => m.type === "band").map((m) => m.id));
  const crewIds = new Set(members.filter((m) => m.type === "crew").map((m) => m.id));
  const technicianIds = new Set(
    members
      .filter(isTechnician)
      .map((m) => m.id)
  );
  const bandStats = stats.filter((s) => bandIds.has(s.id));
  const crewStats = stats.filter((s) => crewIds.has(s.id) && !technicianIds.has(s.id));
  const technicianStats = stats.filter((s) => technicianIds.has(s.id));
  const bandChanges = getPositionChanges(bandStats, previous.stats.filter((s) => bandIds.has(s.id)));
  const crewChanges = getPositionChanges(crewStats, previous.stats.filter((s) => crewIds.has(s.id) && !technicianIds.has(s.id)));
  const technicianChanges = getPositionChanges(technicianStats, previous.stats.filter((s) => technicianIds.has(s.id)));
  const minGigs = Math.max(1, completedCount - 5);
  const regulars = getRegularStats(stats, perGigPoints, minGigs);
  const previousRegulars = getRegularStats(previous.stats, previous.perGigPoints, Math.max(1, previous.completedCount - 5));
  const regularChanges = getPositionChanges(regulars, previousRegulars);

  const minParticipation = Math.ceil(completedCount * 0.3);
  const efficient = getEfficientStats(stats, minParticipation);
  const previousEfficient = getEfficientStats(previous.stats, Math.ceil(previous.completedCount * 0.3));
  const efficientChanges = getPositionChanges(efficient, previousEfficient);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Statistiky
        </h1>

        {loading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-destructive" role="alert">{error}</CardContent>
          </Card>
        ) : stats.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Target className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">
                Zatím žádné dokončené koncerty.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {(() => {
              const topPoints = stats[0].totalPoints;
              const topNames = stats.filter((s) => s.totalPoints === topPoints).map((s) => s.name);
              return (
                <div className="grid grid-cols-3 gap-3">
                  <Card className="col-span-2 min-w-0 py-2">
                    <CardContent className="grid flex-1 content-center items-center gap-1 px-3 text-center sm:px-4">
                      <div className={`min-w-0 break-words font-bold text-primary ${topNames.length > 2 ? "text-base" : topNames.length > 1 ? "text-xl" : "text-2xl"}`}>
                        <span aria-hidden="true">👑 </span>
                        {topNames.join(", ")}
                      </div>
                      <div className="text-xs text-muted-foreground">{topNames.length > 1 ? "nejlepší tipéři" : "nejlepší tipér"}</div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0 py-2">
                    <CardContent className="grid flex-1 content-center items-center gap-1 px-3 text-center sm:px-4">
                      <div className="text-2xl font-bold text-primary">{topPoints}b</div>
                      <div className="text-xs text-muted-foreground">bodů</div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            <StatsTable title="🏆 Celkový žebříček" stats={stats} hideAvg positionChanges={positionChanges} latestMedals={latestMedals} />
            
            {currentMonthStats.length > 0 && (
              <StatsTable 
                title={`📅 ${getMonthName(currentMonthKey)}`} 
                subtitle="Aktuální měsíc"
                stats={currentMonthStats} 
                hideAvg
                positionChanges={currentMonthChanges}
                latestMedals={currentMonthMedals}
              />
            )}
            
            {previousMonthStats.length > 0 && (
              <StatsTable 
                title={`📅 ${getMonthName(previousMonthKey)}`} 
                subtitle="Předchozí měsíc"
                stats={previousMonthStats} 
              />
            )}
            
            {SHOW_EFFICIENT_STATS && efficient.length > 0 && <StatsTable title="🎖️ Nejefektivnější" subtitle={`Podle průměrného umístění (min. ${minParticipation} tipů z ${completedCount})`} stats={efficient} hidePoints minimal showBothAvg positionChanges={efficientChanges} latestMedals={latestMedals} />}
            {regulars.length > 0 && <StatsTable title="🎯 Stálí tipéři" subtitle={`Počítá se ${minGigs} nejlepších tipů od každého`} stats={regulars} hideGigs minimal positionChanges={regularChanges} latestMedals={latestMedals} />}
            {SHOW_BAND_STATS && <StatsTable title="🎸 Kapela" stats={bandStats} positionChanges={bandChanges} latestMedals={latestMedals} />}
            <StatsTable title="🎧 Crew" stats={crewStats} positionChanges={crewChanges} latestMedals={latestMedals} />
            <StatsTable title="📦 Technici" stats={technicianStats} positionChanges={technicianChanges} latestMedals={latestMedals} />
            <PodiumChart podiums={podiums} positionChanges={podiumChanges} latestMedals={latestMedals} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">📊 Bodování</CardTitle>
                <p className="text-xs text-muted-foreground">Stejný tip = stejné body</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                  {POINTS_TABLE.map((pts, i) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    const isMedal = i < 3;
                    return (
                      <div key={i} className={cn(
                        "flex flex-col items-center rounded-lg py-2",
                        isMedal ? "bg-primary/10 ring-1 ring-primary/20" : "bg-secondary/50",
                      )}>
                        <span className={cn("text-lg", isMedal && "text-xl")}>{medals[i] ?? `${i + 1}.`}</span>
                        <span className={cn("font-bold", isMedal ? "text-primary text-base" : "text-muted-foreground text-sm")}>{pts}b</span>
                      </div>
                    );
                  })}
                  <div className="flex flex-col items-center rounded-lg bg-secondary/50 py-2">
                    <span className="text-lg">{POINTS_TABLE.length + 1}.+</span>
                    <span className="font-bold text-muted-foreground text-sm">1b</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </>
  );
}
