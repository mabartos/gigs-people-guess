"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Users, Trophy, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Gig, Member } from "@/types";
import { getGigStatus, formatDate } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { isViceCityDate } from "@/lib/vice-city";

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
  const viceCity = isViceCityDate(gig.date);

  return (
    <Link href={`/gig/${gig.id}`} className="block rounded-xl">
      <Card className={cn(
        "group cursor-pointer transition-all max-sm:py-0",
        viceCity
          ? "bg-linear-to-r from-[#302034] to-[#53243e] ring-pink-300/25 hover:from-[#38233b] hover:to-[#622b4a]"
          : "hover:border-primary/30 hover:bg-card/80",
      )}>
        <CardContent className="flex items-center gap-3 px-4 py-3 max-sm:min-h-24 sm:gap-4 sm:py-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-semibold truncate">{gig.name}</h3>
              <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
            </div>
            <div className={cn(
              "grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-2 gap-y-1 text-sm sm:flex sm:flex-wrap sm:gap-x-4",
              viceCity ? "text-[#edcbd7]" : "text-muted-foreground",
            )}>
              <span className="flex items-center gap-1 whitespace-nowrap tabular-nums">
                <Calendar className="size-3.5 shrink-0" />{formatDate(gig.date)}
              </span>
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="size-3.5 shrink-0" /><span className="truncate">{gig.location}</span>
              </span>
              {gig.actualCount != null && (
                <span className="flex items-center gap-1 whitespace-nowrap tabular-nums">
                  <Users className="size-3.5 shrink-0" />{gig.actualCount} lidí
                </span>
              )}
              {winner && (
                <span className={cn("flex min-w-0 items-start gap-1", viceCity ? "text-[#ff9fbb]" : "text-primary")}>
                  <Trophy className="mt-[3px] size-3.5 shrink-0" /><span className="wrap-anywhere">{winner}</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {viceCity && (
              <Image src="/gtaVI.svg" alt="Koncert v soutěži Vice City" width={132} height={100} unoptimized className="h-auto w-7 drop-shadow-sm sm:w-8" />
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
