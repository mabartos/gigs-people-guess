import Image from "next/image";
import { Crown, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ViceCityStars } from "@/components/vice-city-stars";
import { cn } from "@/lib/utils";
import { getViceCityStats, VICE_CITY_END, VICE_CITY_PODIUM_STARS, VICE_CITY_START, VICE_CITY_TARGET } from "@/lib/vice-city";
import type { ViceCityStanding } from "@/lib/vice-city";
import type { Gig, Member } from "@/types";
import miamiSunset from "../../public/vice-city-miami.webp";

const dateRange = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeZone: "UTC" })
  .formatRange(new Date(VICE_CITY_START), new Date(VICE_CITY_END));

const medals = ["🥇", "🥈", "🥉"];
const contestStatus = {
  active: `Za ${VICE_CITY_TARGET} hvězd do klubu`,
  awaitingResult: "Čeká se na vyhodnocení posledního koncertu",
  finished: "Soutěž skončila",
};

function ViceCityTable({ entries, headingId, emptyMessage, highlightLeaders }: {
  entries: ViceCityStanding[];
  headingId: string;
  emptyMessage: string;
  highlightLeaders?: boolean;
}) {
  if (entries.length === 0) {
    return <p className="px-4 pb-4 text-[#f6d5de] sm:px-6">{emptyMessage}</p>;
  }

  return (
    <Table aria-labelledby={headingId} className="table-fixed">
      <TableHeader>
        <TableRow className="border-pink-300/15 hover:bg-transparent">
          <TableHead scope="col" className="w-12 pl-4 text-[#f6d5de] sm:w-16 sm:pl-6">#</TableHead>
          <TableHead scope="col" className="text-[#f6d5de]">Jméno</TableHead>
          <TableHead scope="col" className="w-37 pr-4 text-right text-[#f6d5de] sm:w-48 sm:pr-6">Hvězdy</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map(({ id, name, position, stars }) => (
          <TableRow key={id} className={cn("border-pink-300/10 hover:bg-pink-400/10", highlightLeaders && position === 1 && "bg-pink-400/10")}>
            <TableCell className="pl-4 tabular-nums text-[#f6d5de] sm:pl-6">{position}.</TableCell>
            <TableCell className="whitespace-normal wrap-anywhere font-medium">
              {name}
              {position === 1 && highlightLeaders && (
                <Crown role="img" aria-label="Vede klub" className="ml-1.5 inline size-3.5 text-[#ffcc9d]" />
              )}
            </TableCell>
            <TableCell className="pr-4 text-right sm:pr-6">
              <div className="flex items-center justify-end gap-2 sm:gap-3">
                <span aria-hidden="true" className="flex gap-0.5 sm:gap-1">
                  {Array.from({ length: VICE_CITY_TARGET }, (_, index) => (
                    <Star key={index} className={cn("size-3.5 sm:size-4", index < stars ? "fill-current text-[#ffcc9d]" : "text-[#ab829f]")} />
                  ))}
                </span>
                <span className="w-5 font-bold tabular-nums text-[#ffcc9d]">{stars}</span>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ViceCityLeaderboard({ gigs, members }: { gigs: Gig[]; members: Member[] }) {
  const { club, challengers, phase } = getViceCityStats(gigs, members);

  return (
    <>
      <Card className="gap-2 bg-linear-to-r from-[#281631] to-[#40234a] px-3 py-3 text-[#fff0ed] ring-pink-300/25 sm:px-4">
        <h2 className="text-center text-xs font-bold tracking-[0.2em] text-[#ffb3c3]">GTA VI · Vice City</h2>
        <dl className="grid grid-cols-[minmax(5.5rem,1fr)_minmax(0,2fr)] text-center">
          <div className="flex min-w-0 flex-col justify-center gap-1 px-2">
            <dt className="order-last text-xs text-[#f6d5de]">Členů v klubu</dt>
            <dd className="text-2xl leading-none font-bold tabular-nums">{club.length}</dd>
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-1 border-l border-pink-200/20 px-2 sm:px-4">
            <dt className="order-last text-xs text-[#f6d5de]">Členové klubu</dt>
            <dd className="wrap-anywhere text-lg leading-tight font-bold">
              {club.length ? club.map(({ name }) => name).join(", ") : "Zatím nikdo"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="gap-0 bg-[#221627] pt-0 pb-3 text-[#fff0ed] ring-pink-300/25">
        <div className="relative isolate flex min-h-24 items-center justify-between gap-3 overflow-hidden bg-[#281631] px-4 py-3 sm:min-h-28 sm:px-6">
          <div className="absolute inset-y-0 right-0 -z-20 w-[82%] sm:w-[72%]">
            <Image src={miamiSunset} alt="" fill unoptimized className="object-cover object-[center_68%]" />
          </div>
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-[#281631] via-[#281631]/85 via-43% to-[#281631]/15" />
          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-tight min-[360px]:text-2xl sm:text-3xl">O Krále Vice City</h2>
            <p className="mt-1 text-xs text-[#f6d5de] sm:text-sm">{dateRange}</p>
          </div>
          <Image src="/gtaVI.svg" alt="GTA VI" width={132} height={100} unoptimized className="h-auto w-16 shrink-0 drop-shadow-md sm:w-24" />
        </div>

        <CardContent className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-pink-300/15 py-3 sm:px-6">
          <p className="font-medium text-[#f6d5de]">
            {contestStatus[phase]}
          </p>
          <ol className="flex items-center gap-3 text-xs text-[#ffdfbd]">
            {VICE_CITY_PODIUM_STARS.map((stars, index) => (
              <li key={stars} className="flex items-center gap-1">
                <span className="sr-only">{index + 1}. místo</span>
                <span aria-hidden="true">{medals[index]}</span>
                <ViceCityStars stars={stars} />
              </li>
            ))}
          </ol>
        </CardContent>

        <section aria-labelledby="vice-city-club" className="border-b border-pink-300/20 bg-[#302036]">
          <h3 id="vice-city-club" className="px-4 pt-4 pb-2 font-bold text-[#ffcc9d] sm:px-6">Klub králů Vice City</h3>
          <ViceCityTable
            entries={club}
            headingId="vice-city-club"
            emptyMessage="Klub zatím nemá žádné členy."
            highlightLeaders
          />
        </section>

        <section aria-labelledby="vice-city-challengers">
          <h3 id="vice-city-challengers" className="px-4 pt-4 pb-2 font-bold sm:px-6">O vstup do klubu</h3>
          <ViceCityTable
            entries={challengers}
            headingId="vice-city-challengers"
            emptyMessage={club.length ? "Všichni tipéři jsou v klubu." : "V soutěži zatím nejsou žádné vyhodnocené tipy."}
          />
        </section>

        <p className="px-4 pt-2 text-right text-[0.6875rem] text-[#c8a8bd] sm:px-6">
          Foto <a href="https://commons.wikimedia.org/wiki/File:Miami_Beach_at_Sunset.jpg" className="underline underline-offset-2">rboed</a>
          {" · ořez · "}
          <a href="https://creativecommons.org/licenses/by/2.0/" className="underline underline-offset-2">CC BY 2.0</a>
        </p>
      </Card>
    </>
  );
}
