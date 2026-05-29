"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface PodiumEntry {
  id: string;
  name: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

export function PodiumChart({ podiums }: { podiums: PodiumEntry[] }) {
  if (podiums.length === 0) return null;

  const maxTotal = podiums[0].total;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">🏅 Pódia</CardTitle>
        <p className="text-xs text-muted-foreground">Umístění v top 3</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {podiums.map((p, idx) => (
          <div key={p.id} className={cn("rounded-lg p-3", idx === 0 ? "bg-primary/5 ring-1 ring-primary/20" : "bg-secondary/30")}>
            <div className="flex items-center justify-between mb-2">
              <span className={cn("font-medium", idx === 0 && "text-primary")}>{p.name}</span>
              <span className="text-sm font-bold text-muted-foreground">{p.total}x</span>
            </div>
            <div className="flex gap-1 h-5">
              {p.gold > 0 && (
                <div
                  className="bg-amber-400 rounded-sm flex items-center justify-center text-xs font-bold text-amber-900 min-w-6 transition-all"
                  style={{ width: `${(p.gold / maxTotal) * 100}%` }}
                >
                  🥇{p.gold}
                </div>
              )}
              {p.silver > 0 && (
                <div
                  className="bg-slate-300 rounded-sm flex items-center justify-center text-xs font-bold text-slate-700 min-w-6 transition-all"
                  style={{ width: `${(p.silver / maxTotal) * 100}%` }}
                >
                  🥈{p.silver}
                </div>
              )}
              {p.bronze > 0 && (
                <div
                  className="bg-amber-700 rounded-sm flex items-center justify-center text-xs font-bold text-amber-100 min-w-6 transition-all"
                  style={{ width: `${(p.bronze / maxTotal) * 100}%` }}
                >
                  🥉{p.bronze}
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
