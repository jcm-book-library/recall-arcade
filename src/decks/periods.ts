// Shared by Big Moments and Eras & Dynasties: reads the two data tables in history-data.ts.
//
// A PERIOD is a stretch of time with a name (World War II, the Victorian era, the Han dynasty).
// An EVENT is one year, and may belong to a period (Pearl Harbor belongs to World War II).
import type { Item } from "../engine/types";
import { EVENT_TABLE, PERIOD_TABLE } from "./history-data";

export interface Period {
  id: string;
  start: number;
  /** The last year. Periods that are still going end "today" (2025), so maths on them just works. */
  end: number;
  /** True when the sheet has no end year: the period is still going. */
  ongoing: boolean;
  name: string;
  approx: boolean;
  /** "event" = a war or movement; "era" = an era or dynasty. */
  kind: "event" | "era";
}

export const TODAY = 2025;

export const PERIODS: Period[] = PERIOD_TABLE.trim()
  .split("\n")
  .map((line) => {
    const [id, start, end, name, approx, kind] = line.split("|");
    return {
      id,
      start: Number(start),
      end: end === "" ? TODAY : Number(end),
      ongoing: end === "",
      name,
      approx: approx === "c",
      kind: kind === "era" ? "era" : "event",
    };
  });

const periodByName = new Map(PERIODS.map((p) => [p.name, p]));
export const periodById = new Map(PERIODS.map((p) => [p.id, p]));

/** The years a period covers, e.g. "1939–1945" or "1970 to today". */
export function periodYears(p: Period): string {
  const a = yr(p.start);
  const b = p.ongoing ? "today" : yr(p.end);
  const c = p.approx ? "about " : "";
  return p.ongoing ? `${c}${a} to today` : `${c}${a}–${b}`;
}

/** Years as people write them: 44 BC, AD 476, 1066. */
export function yr(y: number): string {
  return y < 0 ? `${-y} BC` : y < 1000 ? `AD ${y}` : `${y}`;
}

// Modern is 1900 on, early is 1500 to 1900, everything before is ancient (and medieval).
const eraOf = (year: number) =>
  year >= 1900 ? "modern" : year >= 1500 ? "early" : "ancient";

/** Every Big Moments event. Ids come straight from the table: saved scores use them, never renumber. */
export const EVENT_ITEMS: Item[] = EVENT_TABLE.trim()
  .split("\n")
  .map((line) => {
    const [id, year, name, approx, periodName] = line.split("|");
    const y = Number(year);
    const period = periodName ? periodByName.get(periodName) : undefined;
    if (periodName && !period && import.meta.env?.DEV)
      console.error(
        `history: "${name}" names an unknown period "${periodName}"`,
      );
    return {
      id,
      name,
      tags: [eraOf(y)],
      data: { year: y, approx: approx === "c", period },
    };
  });
