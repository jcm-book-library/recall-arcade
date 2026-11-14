// FILL THE LIST for the History quizzes (wave 3b): Leaders & Changemakers, Eras & Dynasties, Big Moments and
// Who Lived When?. Each function turns a deck's own data into rounds of rows (key, answer, detail), the way
// sport-fill.ts does for the Sport lists. (Box Office does its own, in boxoffice.ts.) The engine is fill-list.ts and
// the page wiring is fill-quiz.ts. Every list here is newest first.
import type { Deck, Item } from "../engine/types";
import type { FillChamp, FillRow } from "./fill-list";
import { leadLetter, type FillBuild, type FillRound, type FillSource } from "./fill-quiz";
import { nameFormsFor, type Person } from "../decks/name-forms";
import { periodAliases } from "../decks/period-aliases";
import type { Period } from "../decks/periods";
import { EVENT_ALIASES } from "../decks/history-aliases";
import { createPhraseMatcher } from "../engine/event-match";

// ---------- years, as people write them ----------

/** 1066, AD 79, 44 BC. */
export const yearLabel = (y: number) => (y < 0 ? `${-y} BC` : y < 1000 ? `AD ${y}` : `${y}`);

/** A span of years: "1939–1945", "27 BC–AD 476", "510–323 BC", "AD 618–907", "1970–" (still going). */
export function spanLabel(start: number, end: number | null): string {
  if (end === null) return `${start < 0 ? yearLabel(start) : start}–`;
  if (start < 0 && end < 0) return `${-start}–${-end} BC`;
  if (start < 0) return `${-start} BC–${end < 1000 ? "AD " : ""}${end}`;
  if (start < 1000) return `AD ${start}–${end}`;
  return `${start}–${end}`;
}

const noOutside: FillRow[] = [];

// ---------- Leaders & Changemakers ----------
// One row per TERM, newest first, so a person with two terms (Menzies, Rudd, Trump) has two rows and naming them
// fills both. The key is the years of that term as the deck writes them ("2022–"). Rounds are the deck's rounds.

interface Term {
  text: string;
  start: number;
  end: number;
}

/** "1949–1966", "2022–", "2013", "27 BC–AD 14", "c. 268–232 BC": one term. Anything else ("19 days") is not. */
const TERM = /^(c\.\s*)?(AD\s*)?(\d{1,4})(?:\s*(BC|AD))?(?:\s*[–-]\s*(AD\s*)?(\d{1,4})?(?:\s*(BC|AD))?)?$/;

export function parseTerms(yearsText: string): { terms: Term[]; notes: string[] } {
  const terms: Term[] = [];
  const notes: string[] = [];
  for (const piece of yearsText.split(/,\s*/).map((s) => s.trim()).filter(Boolean)) {
    const m = piece.match(TERM);
    if (!m) {
      if (!/^(two|three|four|five)\s+terms?$/i.test(piece)) notes.push(piece);
      continue;
    }
    const [, , adA, a, eraA, adB, b, eraB] = m;
    const bcEnd = eraB === "BC";
    const bcStart = eraA === "BC" || (!eraA && !adA && bcEnd && !adB);
    const start = bcStart ? -Number(a) : Number(a);
    const end = b === undefined ? (/[–-]\s*$/.test(piece) ? Infinity : start) : bcEnd ? -Number(b) : Number(b);
    terms.push({ text: piece.replace(/-/g, "–"), start, end });
  }
  return { terms, notes };
}

export function leadersFill(deck: Deck): FillSource {
  const rounds: FillRound[] = deck.variants.map((v) => ({
    id: v.id,
    label: v.label,
    build: () => leadersBuild(deck, v.id, deck.items.filter(v.filter)),
  }));
  return {
    name: "Leaders & Changemakers",
    rounds: () => rounds,
    rangeLabel: "Round",
    anyNote: "Every term of office is shown blank. Type a leader and every term they held fills in.",
    orderNote: "Fill each term in turn, newest first. Tab skips.",
  };
}

function leadersBuild(deck: Deck, roundId: string, people: Item[]): FillBuild {
  const forms = nameFormsFor(people.map((p): Person => ({ id: p.id, name: p.name, aliases: p.aliases })));
  const countries = new Set<string>();
  const parsed = people.map((p) => {
    // Originals: "12th · 1939–1941, 1949–1966" or "Prime Minister · 1940–1945"; newcomers: "role · country · years".
    const parts = String(p.data!.clue).split(" · ");
    const years = parts[parts.length - 1];
    const country = (p.data!.country as string | undefined) ?? (parts.length === 3 ? parts[1] : undefined);
    if (country) countries.add(country);
    return { p, parts, years, country };
  });
  const mixed = countries.size > 1;
  const rows: { row: FillRow; start: number; end: number }[] = [];
  for (const { p, parts, years, country } of parsed) {
    const { terms, notes } = parseTerms(years);
    const office = p.data!.office as string | undefined;
    const ordinal = parts.length >= 2 && /^\d+(st|nd|rd|th)/.test(parts[0]) ? parts[0] : "";
    const role = parts.length === 3 ? parts[0] : office ? `${ordinal ? `${ordinal} ` : ""}${office}` : parts.length === 2 && !ordinal ? parts[0] : "";
    const detail = [role, mixed ? country : ""].filter(Boolean).join(" · ") || undefined;
    terms.forEach((t, k) => {
      rows.push({
        start: t.start,
        end: t.end,
        row: {
          id: terms.length > 1 ? `${p.id}#${k + 1}` : p.id,
          key: t.text,
          who: [p.id],
          shown: p.name,
          detail,
          note: notes.length ? notes.join(", ") : undefined,
          hint: leadLetter(p.name),
        },
      });
    });
  }
  // Newest first: the later start comes first; the same start year goes by the later end (so a short stint is below a long one).
  rows.sort((a, b) => b.start - a.start || b.end - a.end);
  return {
    rows: rows.map((r) => r.row),
    outside: noOutside,
    champs: people.map((p): FillChamp => ({ id: p.id, name: p.name, accept: forms.get(p.id)!.accept, loose: forms.get(p.id)!.loose })),
    keyHeading: "Years",
    whoWord: "leader",
    nounOne: "term",
    nounMany: "terms",
    rangePhrase: `in ${roundId === "all-leaders" ? "this list" : "this round"}`,
  };
}

// ---------- Eras & Dynasties ----------
// One row per period, the latest start first; the key is its span. Rounds are the three groupings the quiz already
// uses to place periods on a line (what fits on the ancient line, the recent line, or all of history).

const kindText = (p: Period) => (p.kind === "era" ? "Era or dynasty" : "War or movement");

export function erasFill(deck: Deck): FillSource {
  const periods = deck.items.map((i) => i.data!.period as Period);
  const round = (id: string, label: string, fits: (p: Period) => boolean): FillRound => ({
    id,
    label,
    build: () => erasBuild(periods, periods.filter(fits)),
  });
  const rounds = [
    round("all", "All of History", () => true),
    round("ancient", "Ancient and Medieval", (p) => p.start >= -3300 && p.end <= 1500),
    round("recent", "1300 to Today", (p) => p.start >= 1300),
  ];
  return {
    name: "Eras & Dynasties",
    rounds: () => rounds,
    rangeLabel: "Range",
    anyNote: "Every span of years is shown blank. Type an era, war or movement and it fills its span.",
    orderNote: "Fill each span in turn, newest first. Tab skips.",
  };
}

function erasBuild(all: Period[], inRound: Period[]): FillBuild {
  const sorted = [...inRound].sort((a, b) => b.start - a.start || b.end - a.end || a.name.localeCompare(b.name));
  const inIds = new Set(inRound.map((p) => p.id));
  const row = (p: Period): FillRow => {
    const key = `${p.approx ? "c. " : ""}${spanLabel(p.start, p.ongoing ? null : p.end)}`;
    // Periods with the very same span (the Vietnam War and the Space Race) are interchangeable In Order.
    return { id: p.id, key, who: [p.id], shown: p.name, detail: kindText(p), hint: leadLetter(p.name), group: key };
  };
  return {
    rows: sorted.map(row),
    outside: all.filter((p) => !inIds.has(p.id)).map(row),
    champs: all.map((p) => ({ id: p.id, name: p.name, accept: periodAliases(p, all) })),
    keyHeading: "Span",
    whoWord: "period",
    nounOne: "period",
    nounMany: "periods",
    rangePhrase: "in this range",
  };
}

// ---------- Big Moments ----------
// One row per event, newest first within the round, the key its year. Answers are long phrases, so they are matched
// by key words (engine/event-match.ts) with a short alias list (decks/history-aliases.ts). Events in the same year
// are interchangeable In Order (you are told "3 events" under the year).

interface EraLike {
  id: string;
  label: string;
  filter?: (i: Item) => boolean;
  inside?: unknown;
}

const yearOf = (i: Item) => i.data!.year as number;

export function momentsFill(deck: Deck, eras: EraLike[]): FillSource {
  let matcher: ReturnType<typeof createPhraseMatcher> | null = null;
  const matchers = () =>
    (matcher ??= createPhraseMatcher(deck.items.map((i) => ({ id: i.id, text: i.name, aliases: EVENT_ALIASES[i.id], extra: [String(Math.abs(yearOf(i)))] }))));
  const rounds: FillRound[] = eras
    .filter((e) => !e.inside)
    .map((e) => ({
      id: e.id,
      label: e.label,
      build: () => {
        const inRound = deck.items.filter((i) => (e.filter ? e.filter(i) : e.id === "all" || i.tags.includes(e.id)));
        return momentsBuild(deck.items, inRound, matchers().match);
      },
    }));
  return {
    name: "Big Moments",
    rounds: () => rounds,
    rangeLabel: "Era",
    anyNote: "Every year is shown blank. Type what happened, in a few key words, and it fills its year.",
    orderNote: "Fill each year in turn, newest first. Events in the same year can go in either order. Tab skips.",
  };
}

function momentsBuild(all: Item[], inRound: Item[], match: (t: string) => { ids: string[]; loose: string[] }): FillBuild {
  // Newest first; the table's order is kept within a year.
  const sorted = [...inRound].map((i, n) => ({ i, n })).sort((a, b) => yearOf(b.i) - yearOf(a.i) || a.n - b.n).map((x) => x.i);
  const perYear = new Map<number, number>();
  sorted.forEach((i) => perYear.set(yearOf(i), (perYear.get(yearOf(i)) ?? 0) + 1));
  const inIds = new Set(inRound.map((i) => i.id));
  const row = (i: Item): FillRow => {
    const key = `${i.data!.approx ? "c. " : ""}${yearLabel(yearOf(i))}`;
    const n = perYear.get(yearOf(i)) ?? 1;
    return { id: i.id, key, sub: n > 1 ? `${n} events` : undefined, who: [i.id], shown: i.name, hint: leadLetter(i.name), group: String(yearOf(i)) };
  };
  return {
    rows: sorted.map(row),
    outside: all.filter((i) => !inIds.has(i.id)).map(row),
    champs: all.map((i) => ({ id: i.id, name: i.name, accept: [i.name] })),
    keyHeading: "Year",
    whoWord: "event",
    nounOne: "event",
    nounMany: "events",
    rangePhrase: "in this era",
    matchChamps: match,
    moreHint: "Add another key word.",
  };
}

// ---------- Who Lived When? ----------
// One row per person, the latest birth first, the key their lifespan ("1912–1954"); the detail is their "who they
// were" line. Surnames count when unique within the round (decks/name-forms.ts).

export function peopleFill(deck: Deck, eras: EraLike[]): FillSource {
  const rounds: FillRound[] = eras.map((e) => ({
    id: e.id,
    label: e.label,
    build: () => peopleBuild(deck.items, deck.items.filter((i) => (e.filter ? e.filter(i) : e.id === "all" || i.tags.includes(e.id)))),
  }));
  return {
    name: "Who Lived When?",
    rounds: () => rounds,
    rangeLabel: "Round",
    anyNote: "Every lifespan is shown blank. Type a person and it fills their years.",
    orderNote: "Fill each lifespan in turn, newest born first. Tab skips.",
  };
}

function peopleBuild(all: Item[], inRound: Item[]): FillBuild {
  const from = (i: Item) => i.data!.from as number;
  const to = (i: Item) => i.data!.to as number;
  const sorted = [...inRound].sort((a, b) => from(b) - from(a) || to(b) - to(a));
  const inIds = new Set(inRound.map((i) => i.id));
  // Names are compared within the round (so a surname that is unique here is accepted), and over everyone for the
  // people outside the round, just to name them in the "not in this round" message.
  const here = nameFormsFor(inRound.map((i): Person => ({ id: i.id, name: i.name })));
  const everyone = nameFormsFor(all.map((i): Person => ({ id: i.id, name: i.name })));
  const row = (i: Item): FillRow => ({
    id: i.id,
    key: `${i.data!.approx ? "c. " : ""}${spanLabel(from(i), to(i))}`,
    who: [i.id],
    shown: i.name,
    detail: i.data!.note as string,
    hint: leadLetter(i.name),
  });
  return {
    rows: sorted.map(row),
    outside: all.filter((i) => !inIds.has(i.id)).map(row),
    champs: all.map((i) => {
      const f = (inIds.has(i.id) ? here : everyone).get(i.id)!;
      return { id: i.id, name: i.name, accept: f.accept, loose: f.loose };
    }),
    keyHeading: "Lived",
    whoWord: "person",
    nounOne: "person",
    nounMany: "people",
    rangePhrase: "in this round",
  };
}
