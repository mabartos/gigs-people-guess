"use client";

import { useState, useEffect } from "react";
import { Guitar, Mic, Music, Drum, Piano, Headphones, Lightbulb, Package, Camera, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Gig, Member } from "@/types";
import { CREW_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  guitar: Guitar, mic: Mic, music: Music, drum: Drum,
  piano: Piano, headphones: Headphones, lightbulb: Lightbulb, package: Package, camera: Camera,
};

export function GuessForm({ gig, onSaved }: { gig: Gig; onSaved: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [initialGuesses, setInitialGuesses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((data: Member[]) => {
        setMembers(data);
        const initial: Record<string, string> = {};
        data.forEach((m) => {
          initial[m.id] = gig.guesses[m.id] != null ? String(gig.guesses[m.id]) : "";
        });
        setGuesses(initial);
        setInitialGuesses(initial);
      });
  }, [gig]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const changed: Record<string, number | null> = {};
    for (const [id, val] of Object.entries(guesses)) {
      if (val !== initialGuesses[id]) {
        changed[id] = val !== "" ? Number(val) : null;
      }
    }

    if (Object.keys(changed).length === 0) {
      toast.info("Žádné změny k uložení");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/gigs/${gig.id}/guesses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guesses: changed }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Nepodařilo se uložit tipy");
        return;
      }

      toast.success("Tipy uloženy!");
      onSaved();
    } catch {
      toast.error("Chyba připojení");
    } finally {
      setLoading(false);
    }
  }

  const band = members.filter((m) => m.type === "band");
  const crewGroups: { label: string; members: Member[] }[] = CREW_CATEGORIES
    .map((cat) => ({ label: cat, members: members.filter((m) => m.type === "crew" && m.role === cat) }))
    .filter((g) => g.members.length > 0);
  const crewOther = members.filter((m) => m.type === "crew" && !CREW_CATEGORIES.includes(m.role as typeof CREW_CATEGORIES[number]));
  if (crewOther.length > 0) crewGroups.push({ label: "Ostatní", members: crewOther });

  function renderInput(member: Member) {
    const Icon = iconMap[member.icon] || Music;
    return (
      <div key={member.id} className="flex items-center gap-3">
        <Label
          htmlFor={`guess-${member.id}`}
          className="flex w-32 shrink-0 items-center gap-2 text-base"
        >
          <Icon className="h-5 w-5 text-primary" />
          {member.name}
        </Label>
        <Input
          id={`guess-${member.id}`}
          type="number"
          inputMode="numeric"
          min="0"
          value={guesses[member.id] || ""}
          onChange={(e) => setGuesses({ ...guesses, [member.id]: e.target.value })}
          placeholder="?"
          className="max-w-32 h-11 text-base"
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          🎯 Tipy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {band.length > 0 && (
            <div className="space-y-3">
              <Badge className="bg-primary/20 text-primary">Kapela</Badge>
              {band.map(renderInput)}
            </div>
          )}

          {crewGroups.map((group) => (
            <div key={group.label} className="space-y-3">
              <Badge variant="outline">{group.label}</Badge>
              {group.members.map(renderInput)}
            </div>
          ))}

          <Button type="submit" className="w-full gap-2 h-12 text-base" disabled={loading}>
            <Save className="h-5 w-5" />
            {loading ? "Ukládám..." : "Uložit tipy"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
