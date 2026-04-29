"use client";

import Link from "next/link";
import { Calendar, MapPin, Users, Trophy, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Gig, Member } from "@/types";
import { getGigStatus, formatDate } from "@/lib/constants";

function getWinners(gig: Gig, members: Member[]): string | null {
  if (gig.actualCount == null) return null;
  let minDelta = Infinity;
  const names: string[] = [];
  for (const member of members) {
    const guess = gig.guesses[member.id];
    if (guess == null || guess === 0) continue;
    const delta = Math.abs(guess - gig.actualCount);
    if (delta < minDelta) { minDelta = delta; names.length = 0; names.push(member.name); }
    else if (delta === minDelta) { names.push(member.name); }
  }
  return names.length > 0 ? names.join(", ") : null;
}

const statusConfig = {
  new: { label: "Nový", variant: "outline" as const, className: "border-warning/50 text-warning" },
  guessed: { label: "Tipnuto", variant: "outline" as const, className: "border-primary/50 text-primary" },
  completed: { label: "Hotovo", variant: "outline" as const, className: "border-success/50 text-success" },
};

export function GigCard({ gig, members }: { gig: Gig; members: Member[] }) {
  const status = getGigStatus(gig);
  const config = statusConfig[status];
  const winner = getWinners(gig, members);

  return (
    <Link href={`/gig/${gig.id}`}>
      <Card className="group cursor-pointer transition-all hover:border-primary/30 hover:bg-card/80">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-semibold truncate">{gig.name}</h3>
              <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />{formatDate(gig.date)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /><span className="truncate">{gig.location}</span>
              </span>
              {gig.actualCount != null && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />{gig.actualCount} lidí
                </span>
              )}
              {winner && (
                <span className="flex items-center gap-1 text-primary">
                  <Trophy className="h-3.5 w-3.5" />{winner}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
