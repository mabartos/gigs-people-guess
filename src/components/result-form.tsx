"use client";

import { useState } from "react";
import { Users, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Gig } from "@/types";
import { toast } from "sonner";

export function ResultForm({ gig, onSaved }: { gig: Gig; onSaved: () => void }) {
  const [actualCount, setActualCount] = useState(
    gig.actualCount != null ? String(gig.actualCount) : ""
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(actualCount);
    if (isNaN(num) || num < 0) {
      toast.error("Zadej platný počet");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/gigs/${gig.id}/result`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualCount: num }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Nepodařilo se uložit výsledek");
        return;
      }

      toast.success("Výsledek uložen!");
      onSaved();
    } catch {
      toast.error("Chyba připojení");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Skutečný počet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="actualCount">Kolik přišlo lidí?</Label>
            <Input
              id="actualCount"
              type="number"
              inputMode="numeric"
              min="0"
              value={actualCount}
              onChange={(e) => setActualCount(e.target.value)}
              placeholder="např. 175"
              className="text-2xl h-14 text-center font-bold"
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full gap-2 h-12 text-base" disabled={loading || !actualCount}>
            <Save className="h-5 w-5" />
            {loading ? "Ukládám..." : "Uložit výsledek"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
