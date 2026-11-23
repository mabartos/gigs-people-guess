import { Star } from "lucide-react";

export function ViceCityStars({ stars }: { stars: number }) {
  if (stars === 0) return null;

  const label = `${stars} ${stars === 1 ? "hvězda" : "hvězdy"}`;
  return (
    <span className="inline-flex items-center gap-0.5 align-middle text-amber-300" role="img" aria-label={label} title={label}>
      {Array.from({ length: stars }, (_, index) => (
        <Star key={index} aria-hidden="true" className="size-3 fill-current" />
      ))}
    </span>
  );
}
