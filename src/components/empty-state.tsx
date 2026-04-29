import { Music, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Music className="h-10 w-10 text-primary/60" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">Zatím žádné koncerty</h3>
      <p className="mb-6 text-sm text-muted-foreground max-w-xs">
        Přidej první koncert a začněte tipovat, kolik přijde lidí!
      </p>
      <Link href="/gig/new">
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" />
          Přidat první koncert
        </Button>
      </Link>
    </div>
  );
}
