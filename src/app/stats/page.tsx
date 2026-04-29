"use client";

import { useEffect, useState } from "react";
import { Trophy, Target, TrendingUp, Medal, Star } from "lucide-react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getPositionPoints } from "@/lib/constants";
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

function computeStats(gigs: Gig[], members: Member[]): { stats: MemberStats[]; completedCount: number } {
  const completed = gigs.filter((g) => g.actualCount != null);
  if (completed.length === 0) return { stats: [], completedCount: 0 };

  const data: Record<string, { wins: number; totalPoints: number; gigs: number }> = {};
  members.forEach((m) => { data[m.id] = { wins: 0, totalPoints: 0, gigs: 0 }; });

  for (const gig of completed) {
    const ranked = members
      .filter((m) => gig.guesses[m.id] != null && gig.guesses[m.id]! > 0)
      .map((m) => ({ id: m.id, delta: Math.abs(gig.guesses[m.id]! - gig.actualCount!) }))
      .sort((a, b) => a.delta - b.delta);

    ranked.forEach((r, idx) => {
      const pts = getPositionPoints(idx + 1);
      data[r.id].totalPoints += pts;
      data[r.id].gigs += 1;
      if (idx === 0) data[r.id].wins += 1;
    });
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

  return { stats, completedCount: completed.length };
}

const rankIcons = [
  <Trophy key="1" className="h-4 w-4 text-primary" />,
  <Medal key="2" className="h-4 w-4 text-muted-foreground" />,
  <Medal key="3" className="h-4 w-4 text-muted-foreground/60" />,
];

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

  const { stats, completedCount } = computeStats(gigs, members);

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
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{completedCount}</div>
                  <div className="text-xs text-muted-foreground">koncertů</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{stats[0].name}</div>
                  <div className="text-xs text-muted-foreground">nejlepší tipér</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{stats[0].totalPoints}b</div>
                  <div className="text-xs text-muted-foreground">bodů</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">🏆 Žebříček</CardTitle>
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
                      <TableHead className="text-center pr-4">Tipů</TableHead>
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
                        <TableCell className="text-center text-muted-foreground pr-4">{s.totalGigs}/{s.totalAllGigs}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </>
  );
}
