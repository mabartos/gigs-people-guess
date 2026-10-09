"use client";

import { useState } from "react";
import { Users, Save, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Gig } from "@/types";
import { toast } from "sonner";

export function ResultForm({ gig, onSaved, onCancel }: { gig: Gig; onSaved: () => void; onCancel?: () => void }) {
  const [actualCount, setActualCount] = useState(
    gig.actualCount != null ? String(gig.actualCount) : ""
  );
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingResult, setDeletingResult] = useState(false);

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(actualCount);
    if (isNaN(num) || num < 0) {
      toast.error("Zadej platný počet");
      return;
    }
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    setConfirmOpen(false);
    const num = Number(actualCount);
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

  async function handleDeleteResult() {
    setDeletingResult(true);

    try {
      const res = await fetch(`/api/gigs/${gig.id}/result`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Nepodařilo se smazat výsledek");
        return;
      }

      toast.success("Výsledek smazán a body odebrány!");
      setDeleteDialogOpen(false);
      onSaved();
    } catch {
      toast.error("Chyba připojení");
    } finally {
      setDeletingResult(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Skutečný počet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
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

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 gap-2 h-12 text-base" disabled={loading || !actualCount}>
                <Save className="h-5 w-5" />
                {loading ? "Ukládám..." : "Uložit výsledek"}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" className="gap-2 h-12 text-base" onClick={onCancel}>
                  <X className="h-5 w-5" />
                  Zrušit
                </Button>
              )}
            </div>

            {gig.actualCount != null && (
              <Button
                type="button"
                variant="destructive"
                className="w-full gap-2 h-12 text-base"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-5 w-5" />
                Smazat výsledek (admin)
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Potvrzení výsledku</DialogTitle>
            <DialogDescription>
              Opravdu bylo <strong>{actualCount}</strong> lidí?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Ne
            </Button>
            <Button onClick={handleConfirm}>
              Ano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat výsledek</DialogTitle>
            <DialogDescription>
              Tato akce smaže výsledek a odebere všechny přidělené body. Opravdu chceš pokračovat?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
              }}
              disabled={deletingResult}
            >
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteResult}
              disabled={deletingResult}
            >
              {deletingResult ? "Mažu..." : "Smazat výsledek"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
