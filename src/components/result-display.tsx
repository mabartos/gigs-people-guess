"use client";

import { useEffect, useState } from "react";
import { Trophy, TrendingUp, TrendingDown, Target, Minus, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPositionPoints } from "@/lib/constants";
import type { Gig, Member } from "@/types";
import { cn } from "@/lib/utils";

interface MemberResult {
  id: string;
  name: string;
  guess: number;
  delta: number;
  absDelta: number;
  points: number;
}

export function ResultDisplay({ gig }: { gig: Gig }) {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    fetch("/api/members").then((r) => r.json()).then(setMembers);
  }, []);

  if (gig.actualCount == null || members.length === 0) return null;

  const results: MemberResult[] = members
    .filter((m) => gig.guesses[m.id] != null && gig.guesses[m.id]! > 0)
    .map((m) => {
      const guess = gig.guesses[m.id]!;
      const delta = guess - gig.actualCount!;
      return { id: m.id, name: m.name, guess, delta, absDelta: Math.abs(delta), points: 0 };
    })
    .sort((a, b) => a.absDelta - b.absDelta);

  results.forEach((r, idx) => {
    r.points = getPositionPoints(idx + 1);
  });

  const winnerId = results.length > 0 ? results[0].id : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          🏆 Výsledky
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-3 rounded-lg bg-primary/10 p-4">
          <Target className="h-6 w-6 text-primary" />
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{gig.actualCount}</div>
            <div className="text-xs text-muted-foreground">skutečný počet</div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          {results.map((r, idx) => {
            const isWinner = r.id === winnerId;
            const isOver = r.delta > 0;
            const isUnder = r.delta < 0;

            return (
              <div
                key={r.id}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors",
                  isWinner ? "bg-primary/15 ring-1 ring-primary/30" : "bg-secondary/50"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 text-center text-sm font-medium text-muted-foreground shrink-0">
                    {idx + 1}.
                  </span>
                  {isWinner && <Trophy className="h-4 w-4 text-primary shrink-0" />}
                  <span className={cn("font-medium truncate", isWinner && "text-primary")}>
                    {r.name}
                  </span>
                  {isWinner && (
                    <Badge className="bg-primary/20 text-primary text-xs shrink-0">Vítěz!</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <div className="flex items-center gap-1 text-xs font-medium">
                    <Star className="h-3 w-3 text-primary" />
                    <span className="text-primary">{r.points}b</span>
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{r.guess}</span>
                  <div className={cn(
                    "flex items-center gap-0.5 text-xs font-medium w-14 justify-end",
                    isWinner ? "text-primary" :
                    isOver ? "text-destructive" :
                    isUnder ? "text-blue-400" : "text-primary"
                  )}>
                    {r.delta === 0 ? (
                      <><Minus className="h-3 w-3" />přesně!</>
                    ) : isOver ? (
                      <><TrendingUp className="h-3 w-3" />+{r.delta}</>
                    ) : (
                      <><TrendingDown className="h-3 w-3" />{r.delta}</>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {results.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">Nikdo nezadal tip</p>
        )}
      </CardContent>
    </Card>
  );
}
