"use client";

import { useState, useEffect } from "react";
import { Guitar, Mic, Music, Drum, Piano, Headphones, Lightbulb, Package, Camera, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Gig, Member } from "@/types";
import { getGuessDeadline, GUESS_DEADLINE_TIME } from "@/lib/guess-deadline";
import { getCrewGroups } from "@/lib/members";
import { toast } from "sonner";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  guitar: Guitar, mic: Mic, music: Music, drum: Drum,
  piano: Piano, headphones: Headphones, lightbulb: Lightbulb, package: Package, camera: Camera,
};

export function GuessForm({ gig, isAdmin, onSaved }: { gig: Gig; isAdmin: boolean; onSaved: () => void }) {
  const isCompleted = gig.actualCount != null;
  const deadline = getGuessDeadline(gig.date);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const [rejectedDate, setRejectedDate] = useState<string | null>(null);
  const deadlinePassed = deadline === null || checkedAt >= deadline || rejectedDate === gig.date;
  const canEdit = isAdmin || !deadlinePassed;
  const [members, setMembers] = useState<Member[]>([]);
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [initialGuesses, setInitialGuesses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showGuesses, setShowGuesses] = useState(isCompleted);
  const [confirmShowOpen, setConfirmShowOpen] = useState(false);

  useEffect(() => {
    if (deadline === null || deadlinePassed) return;

    let timer: ReturnType<typeof setTimeout>;
    const scheduleCheck = () => {
      const delay = Math.min(Math.max(0, deadline - Date.now()), 2_147_483_647);
      timer = setTimeout(() => {
        const now = Date.now();
        if (now >= deadline) setCheckedAt(now);
        else scheduleCheck();
      }, delay);
    };
    scheduleCheck();
    return () => clearTimeout(timer);
  }, [deadline, deadlinePassed]);

  useEffect(() => {
    if (isCompleted) setShowGuesses(true);
  }, [isCompleted]);

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
    if (!canEdit) return;

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
        if (res.status === 409) setRejectedDate(gig.date);
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
  const crewGroups = getCrewGroups(members);

  function renderInput(member: Member) {
    const Icon = iconMap[member.icon] || Music;
    const savedValue = initialGuesses[member.id] ?? "";
    const edited = canEdit && guesses[member.id] !== savedValue;
    const displayValue = edited ? (guesses[member.id] ?? "") : showGuesses ? savedValue : "";
    const placeholder = !showGuesses && savedValue && !edited ? "XXX" : "?";

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
          value={displayValue}
          disabled={!canEdit}
          onChange={(e) => setGuesses({ ...guesses, [member.id]: e.target.value })}
          placeholder={placeholder}
          className="max-w-32 h-11 text-base"
        />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">🎯 Tipy</span>
            {!isCompleted && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => {
                  if (showGuesses) {
                    setShowGuesses(false);
                  } else {
                    setConfirmShowOpen(true);
                  }
                }}
              >
                {showGuesses ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showGuesses ? "Skrýt" : "Zobrazit"}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground" role="status">
            {deadlinePassed
              ? deadline === null
                ? "Tipování je uzavřené, koncert nemá platné datum."
                : `Tipování je uzavřené. Uzávěrka byla v ${GUESS_DEADLINE_TIME} v den koncertu.`
              : `Tipy můžeš uložit do ${GUESS_DEADLINE_TIME} v den koncertu.`}
            {deadlinePassed && isAdmin && " Jako admin můžeš tipy dál zadávat a upravovat."}
          </p>
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

            {canEdit && (
              <Button type="submit" className="w-full gap-2 h-12 text-base" disabled={loading}>
                <Save className="h-5 w-5" />
                {loading ? "Ukládám..." : "Uložit tipy"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Dialog open={confirmShowOpen} onOpenChange={setConfirmShowOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Zobrazit tipy</DialogTitle>
            <DialogDescription>
              Opravdu chceš vidět tipy ostatních a být jimi ovlivněn?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmShowOpen(false)}>
              Ne
            </Button>
            <Button onClick={() => { setShowGuesses(true); setConfirmShowOpen(false); }}>
              Ano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
