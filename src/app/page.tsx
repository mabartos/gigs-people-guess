"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { GigCard } from "@/components/gig-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Gig, Member } from "@/types";
import { getGigStatus } from "@/lib/constants";

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

  const upcoming = gigs.filter((g) => getGigStatus(g) !== "completed");
  const past = gigs.filter((g) => getGigStatus(g) === "completed");

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
            {upcoming.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Nadcházející
                </h2>
                <div className="space-y-2">
                  {upcoming.map((gig) => (
                    <GigCard key={gig.id} gig={gig} members={members} />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Proběhlé
                </h2>
                <div className="space-y-2">
                  {past.map((gig) => (
                    <GigCard key={gig.id} gig={gig} members={members} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </>
  );
}
