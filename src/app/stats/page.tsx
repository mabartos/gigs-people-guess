"use client";

import { useEffect, useState } from "react";
import { Trophy, Target, TrendingUp, Medal, Star } from "lucide-react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { POINTS_TABLE, getPositionPoints } from "@/lib/constants";
import type { Gig, Member } from "@/types";
import { cn } from "@/lib/utils";

interface MemberStats {
  id: string;
  name: string;
  wins: number;
  totalPoints: number;
  totalGigs: number;
  totalAllGigs: number;
  avgPoints: number;
}

function computeStats(gigs: Gig[], members: Member[]): { stats: MemberStats[]; completedCount: number; perGigPoints: Record<string, number[]> } {
  const completed = gigs.filter((g) => g.actualCount != null);
  if (completed.length === 0) return { stats: [], completedCount: 0, perGigPoints: {} };

  const data: Record<string, { wins: number; totalPoints: number; gigs: number }> = {};
  const perGigPoints: Record<string, number[]> = {};
  members.forEach((m) => { data[m.id] = { wins: 0, totalPoints: 0, gigs: 0 }; perGigPoints[m.id] = []; });

  for (const gig of completed) {
    const hasStoredPoints = Object.keys(gig.points).length > 0;

    if (hasStoredPoints) {
      const maxPts = Math.max(...Object.values(gig.points));
      for (const m of members) {
        const pts = gig.points[m.id];
        if (pts == null) continue;
        data[m.id].totalPoints += pts;
        data[m.id].gigs += 1;
        perGigPoints[m.id].push(pts);
        if (pts === maxPts && pts === POINTS_TABLE[0]) data[m.id].wins += 1;
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
        if (rank === 1) data[ranked[i].id].wins += 1;
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

  return { stats, completedCount: completed.length, perGigPoints };
}

const rankIcons = [
  <Trophy key="1" className="h-4 w-4 text-primary" />,
  <Medal key="2" className="h-4 w-4 text-muted-foreground" />,
  <Medal key="3" className="h-4 w-4 text-muted-foreground/60" />,
];

function StatsTable({ title, subtitle, stats, hideGigs }: { title: string; subtitle?: string; stats: MemberStats[]; hideGigs?: boolean }) {
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
              <TableHead className="text-center">
                <span className="hidden sm:inline">Body</span>
                <Star className="h-3.5 w-3.5 sm:hidden mx-auto" />
              </TableHead>
              <TableHead className="text-center">
                <span className="hidden sm:inline">Výhry</span>
                <Trophy className="h-3.5 w-3.5 sm:hidden mx-auto" />
              </TableHead>
              <TableHead className="text-center hidden sm:table-cell">Prům.</TableHead>
              {!hideGigs && <TableHead className="text-center pr-4">Tipů</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((s, idx) => (
              <TableRow key={s.id} className={cn(idx === 0 && "bg-primary/5")}>
                <TableCell className="font-medium pl-4">
                  {rankIcons[idx] || <span className="text-muted-foreground">{idx + 1}</span>}
                </TableCell>
                <TableCell className={cn("font-medium", idx === 0 && "text-primary")}>{s.name}</TableCell>
                <TableCell className="text-center font-bold text-primary">{s.totalPoints}</TableCell>
                <TableCell className="text-center font-semibold">{s.wins}</TableCell>
                <TableCell className="text-center text-muted-foreground hidden sm:table-cell">{s.avgPoints}</TableCell>
                {!hideGigs && <TableCell className="text-center text-muted-foreground pr-4">{s.totalGigs}/{s.totalAllGigs}</TableCell>}
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

  useEffect(() => {
    Promise.all([
      fetch("/api/gigs").then((r) => r.json()),
      fetch("/api/members").then((r) => r.json()),
    ])
      .then(([g, m]) => { setGigs(g); setMembers(m); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { stats, completedCount, perGigPoints } = computeStats(gigs, members);
  const bandIds = new Set(members.filter((m) => m.type === "band").map((m) => m.id));
  const crewIds = new Set(members.filter((m) => m.type === "crew").map((m) => m.id));
  const bandStats = stats.filter((s) => bandIds.has(s.id));
  const crewStats = stats.filter((s) => crewIds.has(s.id));
  const minGigs = Math.max(1, completedCount - 3);
  const regulars = stats
    .filter((s) => s.totalGigs >= minGigs)
    .map((s) => {
      const best = (perGigPoints[s.id] || []).sort((a, b) => b - a).slice(0, minGigs);
      const totalPoints = best.reduce((sum, p) => sum + p, 0);
      return { ...s, totalPoints, avgPoints: best.length ? Math.round(totalPoints / best.length * 10) / 10 : 0 };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || b.avgPoints - a.avgPoints);

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
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-primary">{completedCount}</div>
                      <div className="text-xs text-muted-foreground">koncertů</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className={`font-bold text-primary ${topNames.length > 2 ? "text-base" : topNames.length > 1 ? "text-xl" : "text-2xl"}`}>{topNames.join(", ")}</div>
                      <div className="text-xs text-muted-foreground">{topNames.length > 1 ? "nejlepší tipéři" : "nejlepší tipér"}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-primary">{topPoints}b</div>
                      <div className="text-xs text-muted-foreground">bodů</div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            <StatsTable title="🏆 Celkový žebříček" stats={stats} />
            {regulars.length > 0 && <StatsTable title="🎯 Stálí tipéři" subtitle={`Počítá se ${minGigs} nejlepších tipů od každého`} stats={regulars} hideGigs />}
            <StatsTable title="🎧 Crew" stats={crewStats} />
            <StatsTable title="🎸 Kapela" stats={bandStats} />

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
