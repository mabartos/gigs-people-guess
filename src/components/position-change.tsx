import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const medals = ["🥇", "🥈", "🥉"];
const medalLabels = ["Zlatá medaile", "Stříbrná medaile", "Bronzová medaile"];

export function RankingChange({ change, medal }: { change: number | null; medal?: number }) {
  return (
    <span className="inline-grid grid-cols-[1.25rem_3rem] items-center gap-0.5">
      <span className="flex items-center justify-center">
        {medal && (
          <span
            role="img"
            aria-label={`${medalLabels[medal - 1]} z posledního dokončeného koncertu`}
            title={`${medalLabels[medal - 1]} z posledního dokončeného koncertu`}
          >
            {medals[medal - 1]}
          </span>
        )}
      </span>
      <span className="flex justify-center">
        <PositionChange change={change} />
      </span>
    </span>
  );
}

export function PositionChange({ change }: { change: number | null }) {
  if (change == null) {
    return <span className="text-xs text-muted-foreground" title="Nový v žebříčku">Nový</span>;
  }
  if (change === 0) {
    return (
      <span className="grid grid-cols-[0.875rem_2rem] items-center gap-0.5" title="Beze změny">
        <Minus className="h-3.5 w-3.5 text-muted-foreground" role="img" aria-label="Beze změny" />
        <span aria-hidden="true" />
      </span>
    );
  }
  const Icon = change > 0 ? ArrowUp : ArrowDown;
  const label = `${change > 0 ? "Posun nahoru" : "Posun dolů"} o ${Math.abs(change)}`;
  return (
    <span
      className={cn("grid grid-cols-[0.875rem_2rem] items-center gap-0.5 text-xs font-semibold tabular-nums", change > 0 ? "text-success" : "text-destructive")}
      title={label}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="text-left">{change > 0 ? `+${change}` : change}</span>
    </span>
  );
}
