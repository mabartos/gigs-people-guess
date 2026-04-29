"use client";

import { useEffect, useState } from "react";
import { Guitar, Mic, Music, Drum, Piano, Headphones, Lightbulb, Package, UserPlus, Trash2, Users } from "lucide-react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import type { Member, MemberType } from "@/types";
import { toast } from "sonner";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  guitar: Guitar, mic: Mic, music: Music, drum: Drum,
  piano: Piano, headphones: Headphones, lightbulb: Lightbulb, package: Package,
};

const iconOptions = [
  { value: "guitar", label: "Kytara" },
  { value: "mic", label: "Zpěv" },
  { value: "music", label: "Hudba" },
  { value: "drum", label: "Bicí" },
  { value: "piano", label: "Klávesy" },
  { value: "headphones", label: "Zvuk" },
  { value: "lightbulb", label: "Světla" },
  { value: "package", label: "Bedňák" },
];

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("music");
  const [type, setType] = useState<MemberType>("crew");
  const [addLoading, setAddLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function fetchMembers() {
    fetch("/api/members")
      .then((r) => r.json())
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchMembers(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icon, type }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Nepodařilo se přidat");
        return;
      }
      toast.success("Člen přidán!");
      setAddOpen(false);
      setName(""); setIcon("music"); setType("crew");
      fetchMembers();
    } catch {
      toast.error("Chyba připojení");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteError("");
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/members/${deleteId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error || "Nepodařilo se smazat");
        return;
      }
      toast.success("Člen smazán");
      setDeleteId(null);
      setDeletePassword("");
      fetchMembers();
    } catch {
      setDeleteError("Chyba připojení");
    } finally {
      setDeleteLoading(false);
    }
  }

  const band = members.filter((m) => m.type === "band");
  const crew = members.filter((m) => m.type === "crew");

  function renderMember(m: Member) {
    const Icon = iconMap[m.icon] || Music;
    return (
      <div key={m.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-medium">{m.name}</span>
        </div>
        <Button
          variant="ghost" size="icon"
          className="text-muted-foreground hover:text-destructive h-9 w-9"
          onClick={() => setDeleteId(m.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Členové
          </h1>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={<Button className="gap-2 h-10 px-4" />}>
              <UserPlus className="h-5 w-5" />
              <span className="hidden sm:inline">Přidat člena</span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nový člen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base">Jméno</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="např. Pepa" required className="h-11 text-base" />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Ikona</Label>
                  <div className="flex flex-wrap gap-2">
                    {iconOptions.map((opt) => {
                      const I = iconMap[opt.value] || Music;
                      return (
                        <button
                          key={opt.value} type="button"
                          onClick={() => setIcon(opt.value)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${icon === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                        >
                          <I className="h-4 w-4" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Typ</Label>
                  <div className="flex gap-2">
                    {(["band", "crew"] as const).map((t) => (
                      <button
                        key={t} type="button"
                        onClick={() => setType(t)}
                        className={`rounded-lg border px-4 py-2 text-sm transition-colors ${type === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                      >
                        {t === "band" ? "Kapela" : "Crew"}
                      </button>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Zrušit</Button>
                  <Button type="submit" disabled={addLoading || !name}>
                    {addLoading ? "Přidávám..." : "Přidat"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <Skeleton className="h-48 w-full rounded-lg" />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary">Kapela</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {band.length === 0 ? <p className="text-muted-foreground text-sm">Žádní členové kapely</p> : band.map(renderMember)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant="outline">Crew</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {crew.length === 0 ? <p className="text-muted-foreground text-sm">Žádní členové crew</p> : crew.map(renderMember)}
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeletePassword(""); setDeleteError(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Smazat člena</DialogTitle>
              <DialogDescription>Pro potvrzení zadej heslo.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                type="password" value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Heslo kapely..."
                className="h-11 text-base"
                onKeyDown={(e) => { if (e.key === "Enter" && deletePassword) handleDelete(); }}
              />
              {deleteError && <p className="text-sm text-destructive font-medium">{deleteError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>Zrušit</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading || !deletePassword}>
                {deleteLoading ? "Mažu..." : "Smazat"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
