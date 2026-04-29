export interface Gig {
  id: string;
  name: string;
  date: string;
  location: string;
  guesses: Record<string, number | null>;
  actualCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export type GigStatus = "new" | "guessed" | "completed";

export type MemberType = "band" | "crew";

export interface Member {
  id: string;
  name: string;
  role: string;
  icon: string;
  type: MemberType;
}
