export const GUESS_DEADLINE_TIME = "21:30";

const pragueOffset = new Intl.DateTimeFormat("en", {
  timeZone: "Europe/Prague",
  timeZoneName: "longOffset",
});

export function getGuessDeadline(gigDate: unknown): number | null {
  if (typeof gigDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(gigDate)) return null;

  const localDeadline = `${gigDate}T${GUESS_DEADLINE_TIME}:00`;
  const utc = new Date(`${localDeadline}Z`);
  if (Number.isNaN(utc.getTime()) || utc.toISOString().slice(0, 10) !== gigDate) return null;

  const offset = pragueOffset.formatToParts(utc).find((part) => part.type === "timeZoneName")?.value;
  if (!offset) return null;
  const deadline = Date.parse(`${localDeadline}${offset.slice(3) || "Z"}`);
  return Number.isFinite(deadline) ? deadline : null;
}
