"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Music, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/header";
import { toast } from "sonner";

function parseCzechDate(input: string): string | null {
  const match = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export default function NewGigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [dateError, setDateError] = useState("");
  const [location, setLocation] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const date = parseCzechDate(dateInput);
    if (!date) {
      setDateError("Zadej datum ve formátu dd.mm.yyyy");
      return;
    }
    setDateError("");
    setLoading(true);

    try {
      const res = await fetch("/api/gigs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, date, location }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Nepodařilo se vytvořit koncert");
        return;
      }

      const gig = await res.json();
      toast.success("Koncert vytvořen!");
      router.push(`/gig/${gig.id}`);
    } catch {
      toast.error("Chyba připojení");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Zpět na seznam
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Nový koncert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1.5 text-base">
                  <Music className="h-4 w-4" />
                  Název akce
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="např. Koncert v Lucerně"
                  required
                  autoFocus
                  className="h-11 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-1.5 text-base">
                  <Calendar className="h-4 w-4" />
                  Datum
                </Label>
                <Input
                  id="date"
                  value={dateInput}
                  onChange={(e) => { setDateInput(e.target.value); setDateError(""); }}
                  placeholder="dd.mm.yyyy"
                  required
                  inputMode="numeric"
                  className="h-11 text-base"
                />
                {dateError && (
                  <p className="text-sm text-destructive font-medium">{dateError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-1.5 text-base">
                  <MapPin className="h-4 w-4" />
                  Místo
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="např. Lucerna Music Bar, Praha"
                  required
                  className="h-11 text-base"
                />
              </div>

              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                {loading ? "Vytvářím..." : "Vytvořit koncert"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
