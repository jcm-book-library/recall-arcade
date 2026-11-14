// Turns a Sport/Entertainment list (decks/sport-data.ts) into the rows Fill the List needs (ui/fill-list.ts).
// This is the only place that knows how each list's results become a key, an answer and a detail.
import type { SportList, SportWin } from "../decks/sport-data";
import type { ListConfig, SportRange } from "../decks/sport-config";
import type { FillChamp, FillRow } from "./fill-list";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

const ordinal = (n: number) => {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

/** "titles" -> "title", "Gold Logies" -> "Gold Logie", "number ones" -> "number one", "Games" -> "Game". */
export const singular = (plural: string) => (/ies$/i.test(plural) ? plural.replace(/ies$/i, "y") : plural.replace(/s$/i, ""));

const askable = (w: SportWin) => !w.stripped && !w.cancelled && w.who.length > 0;

/** Lists whose `extra` line is a label ("Film: Sinners", "Artist: Olivia Dean"): how each reads in the detail column. */
function extraText(extra: string): string {
  const m = extra.match(/^(Artist|Author): (.+)$/);
  return m ? `by ${m[2]}` : extra;
}

/** Oscars: "2026 ceremony (films of 2025)" -> "films of 2025" under the year. */
function subText(sub: string | undefined): string | undefined {
  if (!sub) return undefined;
  const m = sub.match(/^\d{4} ceremony \((.+)\)$/);
  return m ? m[1] : sub;
}

export interface FillData {
  rows: FillRow[];
  /** Results on the full list that are outside the chosen range (for "not in this range" messages). */
  outside: FillRow[];
  champs: FillChamp[];
}

/** The rows for one list over one range of years: newest first. */
export function buildFillData(listId: string, list: SportList, cfg: ListConfig, range: SportRange): FillData {
  const sprint = listId === "sprint";
  const wins = [...list.wins].sort((a, b) => (sprint ? b.rec!.date.localeCompare(a.rec!.date) : b.year - a.year));

  // How many times each champion has won up to and including each result (for "3rd title"). Counted over the
  // whole list, oldest first, so the number is the same whichever range is on screen.
  const nth = new Map<string, number>();
  const seen = new Map<string, number>();
  for (const w of [...wins].reverse()) {
    if (!askable(w) || w.who.length !== 1) continue;
    const n = (seen.get(w.who[0]) ?? 0) + 1;
    seen.set(w.who[0], n);
    nth.set(w.id, n);
  }

  const perYear = new Map<number, number>();
  for (const w of wins) perYear.set(w.year, (perYear.get(w.year) ?? 0) + 1);
  const seenYear = new Map<number, number>();

  const toRow = (w: SportWin): FillRow => {
    const ok = askable(w);
    const row: FillRow = { id: w.id, key: w.label, who: ok ? w.who : [], shown: w.shown };
    if (sprint) {
      const r = w.rec!;
      row.key = shortDate(r.date);
      row.detail = `${w.rec!.hand ? w.label : `${w.label} s`} · ${r.place} (${r.country})`;
    } else {
      const sub = subText(w.sub);
      const same = perYear.get(w.year) ?? 1;
      const k = (seenYear.get(w.year) ?? 0) + 1;
      seenYear.set(w.year, k);
      row.sub = sub ?? (same > 1 && !w.gid ? `${k} of ${same}` : undefined);
      if (w.extra) row.detail = extraText(w.extra);
      else if (ok && nth.has(w.id)) {
        const n = nth.get(w.id)!;
        row.detail = cfg.verb === "hosted" ? `${ordinal(n)} time hosting` : `${ordinal(n)} ${singular(cfg.count)}`;
      }
      if (w.extra && w.extra.startsWith("Artist: ")) row.alt = [w.extra.slice("Artist: ".length)];
    }
    if (w.note) row.note = w.note;
    if (!ok) row.off = w.cancelled ? (w.off ?? "Cancelled") : "Stripped";
    // Easy and Hint show the first letter of each name when two people share a result (Bathurst co-drivers).
    if (ok && w.who.length > 1) row.hint = w.who.map((id) => (list.champs[id]?.name ?? "?")[0].toUpperCase()).join(" & ");
    return row;
  };

  const inRange = (w: SportWin) => w.year >= range.from && w.year <= range.to;
  return {
    rows: wins.filter(inRange).map(toRow),
    outside: wins.filter((w) => !inRange(w) && askable(w)).map(toRow),
    champs: Object.entries(list.champs).map(([id, c]) => ({ id, name: c.name, accept: c.accept, loose: c.loose })),
  };
}

/** A sensible time limit in minutes, from the size of the list. Any order is quicker (one name fills many rows). */
export const FILL_TIME_CHOICES = [2, 3, 4, 6, 10, 15, 20, 30, 0];
export function defaultFillMinutes(data: FillData, order: boolean): number {
  const asked = data.rows.filter((r) => !r.off && r.who.length);
  const names = new Set(asked.flatMap((r) => r.who)).size;
  const seconds = order ? asked.length * 9 + 30 : names * 14 + 30;
  const need = Math.ceil(seconds / 60);
  return FILL_TIME_CHOICES.filter((m) => m > 0).find((m) => m >= need) ?? 30;
}
