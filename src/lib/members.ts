import type { Member } from "@/types";
import { CREW_CATEGORIES } from "./constants";

export function isTechnician(member: Member): boolean {
  return member.type === "crew" && member.icon === "package";
}

export function getCrewGroups(members: Member[]): { label: string; members: Member[] }[] {
  const crew = members.filter((m) => m.type === "crew" && !isTechnician(m));
  return [
    ...CREW_CATEGORIES.map((category) => ({
      label: category,
      members: crew.filter((m) => m.role === category),
    })),
    { label: "Crew", members: crew.filter((m) => !CREW_CATEGORIES.some((category) => category === m.role)) },
    { label: "Technici", members: members.filter(isTechnician) },
  ].filter((group) => group.members.length > 0);
}
