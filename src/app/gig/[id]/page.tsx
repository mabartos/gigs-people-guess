"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Trash2 } from "lucide-react";
import { Header } from "@/components/header";
import { GuessForm } from "@/components/guess-form";
import { ResultForm } from "@/components/result-form";
import { ResultDisplay } from "@/components/result-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Gig } from "@/types";
import { getGigStatus, formatDateLong } from "@/lib/constants";
import { toast } from "sonner";

const statusConfig = {
  new: { label: "Nový", className: "border-warning/50 text-warning" },
  guessed: { label: "Tipnuto", className: "border-primary/50 text-primary" },
  completed: { label: "Hotovo", className: "border-success/50 text-success" },
};

export default function GigDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchGig = useCallback(async () => {
    try {
      const res = await fetch(`/api/gigs/${id}`);
      if (res.ok) {
        setGig(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGig();
  }, [fetchGig]);

  async function handleDelete() {
    setDeleteError("");
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/gigs/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error || "Nepodařilo se smazat");
        return;
      }

      toast.success("Koncert smazán");
      router.push("/");
    } catch {
      setDeleteError("Chyba připojení");
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-3xl px-4 py-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </main>
      </>
    );
  }

  if (!gig) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-3xl px-4 py-6">
          <p className="text-center text-muted-foreground py-16">Koncert nenalezen</p>
        </main>
      </>
    );
  }

  const status = getGigStatus(gig);
  const config = statusConfig[status];

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Zpět na seznam
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold">{gig.name}</h1>
              <Badge variant="outline" className={config.className}>
                {config.label}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDateLong(gig.date)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {gig.location}
              </span>
            </div>
          </div>

          <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) { setDeletePassword(""); setDeleteError(""); } }}>
            <DialogTrigger
              render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" />}
            >
              <Trash2 className="h-4 w-4" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Smazat koncert</DialogTitle>
                <DialogDescription>
                  Opravdu chceš smazat <strong>{gig.name}</strong>? Tato akce je nevratná. Pro potvrzení zadej heslo.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="delete-password">Heslo</Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Zadej heslo kapely..."
                  onKeyDown={(e) => { if (e.key === "Enter" && deletePassword) handleDelete(); }}
                />
                {deleteError && (
                  <p className="text-sm text-destructive font-medium">{deleteError}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Zrušit
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading || !deletePassword}>
                  {deleteLoading ? "Mažu..." : "Smazat"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <GuessForm gig={gig} onSaved={fetchGig} />

        {status === "completed" ? (
          <ResultDisplay gig={gig} />
        ) : (
          <ResultForm gig={gig} onSaved={fetchGig} />
        )}
      </main>
    </>
  );
}
