"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { GigCard } from "@/components/gig-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Gig, Member } from "@/types";
import { groupGigs } from "@/lib/gig-groups";

export default function HomePage() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/gigs").then((r) => r.json()),
      fetch("/api/members").then((r) => r.json()),
    ])
      .then(([g, m]) => { setGigs(g); setMembers(m); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { upcoming, stale, past } = groupGigs(gigs);
  const sections = [
    { title: "Nadcházející", concerts: upcoming },
    { title: "Staré nevyhodnocené", concerts: stale },
    { title: "Proběhlé", concerts: past },
  ];

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : gigs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {sections.filter(({ concerts }) => concerts.length > 0).map(({ title, concerts }) => (
              <section key={title}>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  {title}
                </h2>
                <div className="space-y-2">
                  {concerts.map((gig) => (
                    <GigCard key={gig.id} gig={gig} members={members} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
