// SPORT: what each list is called, which ways of playing suit it, and how its years are split into ranges.
// The results themselves are in sport-data.ts (generated from the owner's sheet).

import { ENT_DECK_LISTS, ENT_LIST_CONFIG } from "./entertainment-config";

export type ModeId = "year" | "fill" | "decade" | "more" | "order";

export interface SportRange {
  id: string;
  label: string;
  from: number;
  to: number;
  /** Used in questions, e.g. "since 2000". */
  phrase: string;
}

export interface ListConfig {
  id: string;
  /** Short name on the list chip. */
  chip: string;
  modes: ModeId[];
  ranges: SportRange[];
  /** "Year" or "Season": what the big label on a question is. */
  period: string;
  /** What the champion is called: "club", "country", "driver"... */
  who: string;
  whoPlural: string;
  /** Full question for Year by year, given the year label. */
  ask: (label: string) => string;
  /** Question for Who won more? (the range is added under it). */
  more: string;
  /** "won" or "hosted", for the fill-in and results text. */
  verb: string;
  /** What is counted: "premierships", "titles", "Games". */
  count: string;
  /** What an In order card is ordered by, e.g. "first win". */
  firstWord: string;
  /** Years per block in Decade blocks (sparse lists use 20). */
  block: number;
  /** A line shown on the setup screen about the list. */
  about: string;
  /** Optional: the question for a Decade block, given "1990–1999". Otherwise "Who won in 1990–1999?". */
  blockAsk?: (span: string) => string;
  /** Optional: the line under a way of playing on the setup screen, when the standard one doesn't fit. */
  notes?: Partial<Record<ModeId, string>>;
}

const r = (id: string, label: string, from: number, to: number, phrase: string): SportRange => ({ id, label, from, to, phrase });
const ALL = (from: number) => r("all", "All years", from, 2100, "in total");

const since = (y: number) => r(`s${y}`, `Since ${y}`, y, 2100, `since ${y}`);
const between = (a: number, b: number) => r(`${a}-${b}`, `${a}–${b}`, a, b, `from ${a} to ${b}`);
const before = (y: number) => r(`b${y}`, `Before ${y}`, 0, y - 1, `before ${y}`);

const SPORT_LIST_CONFIG: Record<string, ListConfig> = {
  nrl: {
    id: "nrl", chip: "NRL premiers", modes: ["year", "fill", "decade", "more", "order"],
    ranges: [since(2000), between(1970, 1999), before(1970), ALL(0)],
    period: "Year", who: "club", whoPlural: "clubs",
    ask: (y) => `Who won the NRL premiership in ${y}?`,
    more: "Which club won more premierships?", verb: "won", count: "premierships", firstWord: "first premiership", block: 10,
    about: "Premiers of the Sydney competition and, since 1998, the NRL. Years go back to 1908.",
  },
  afl: {
    id: "afl", chip: "AFL premiers", modes: ["year", "fill", "decade", "more", "order"],
    ranges: [since(2000), between(1970, 1999), before(1970), ALL(0)],
    period: "Year", who: "club", whoPlural: "clubs",
    ask: (y) => `Who won the AFL premiership in ${y}?`,
    more: "Which club won more premierships?", verb: "won", count: "premierships", firstWord: "first premiership", block: 10,
    about: "Premiers of the VFL and then the AFL (the league changed its name in 1990). Years go back to 1897.",
  },
  epl: {
    id: "epl", chip: "English champions", modes: ["year", "fill", "decade", "more", "order"],
    ranges: [since(1993), between(1950, 1992), before(1950), ALL(0)],
    period: "Season", who: "club", whoPlural: "clubs",
    ask: (s) => `Who were the English champions in ${s}?`,
    more: "Which club won more league titles?", verb: "won", count: "titles", firstWord: "first title", block: 10,
    about: "Champions of England's top division. It was called the Premier League from 1993. There was no season during the wars.",
  },
  cl: {
    id: "cl", chip: "Champions League", modes: ["year", "fill", "decade", "more", "order"],
    ranges: [since(2000), between(1980, 1999), before(1980), ALL(0)],
    period: "Season", who: "club", whoPlural: "clubs",
    ask: (s) => `Who won the Champions League (European Cup) in ${s}?`,
    more: "Which club won more European Cups?", verb: "won", count: "European Cups", firstWord: "first win", block: 10,
    about: "The European Cup began in 1955–56. It became the Champions League in 1992–93.",
  },
  wc: {
    id: "wc", chip: "World Cup", modes: ["year", "fill", "decade", "more", "order"],
    ranges: [since(1990), between(1950, 1989), before(1950), ALL(0)],
    period: "Year", who: "country", whoPlural: "countries",
    ask: (y) => `Who won the men's World Cup in ${y}?`,
    more: "Which country won more World Cups?", verb: "won", count: "World Cups", firstWord: "first win", block: 20,
    about: "Winners of the men's FIFA World Cup. There was no tournament in 1942 or 1946.",
  },
  f1: {
    id: "f1", chip: "F1 world champions", modes: ["year", "fill", "decade", "more", "order"],
    ranges: [since(2000), between(1980, 1999), before(1980), ALL(0)],
    period: "Year", who: "driver", whoPlural: "drivers",
    ask: (y) => `Who was the Formula 1 world champion in ${y}?`,
    more: "Which driver won more world titles?", verb: "won", count: "titles", firstWord: "first title", block: 10,
    about: "Drivers' world champions since the championship began in 1950.",
  },
  bathurst: {
    id: "bathurst", chip: "Bathurst 1000", modes: ["year", "fill", "decade", "more", "order"],
    ranges: [since(2000), between(1980, 1999), before(1980), ALL(0)],
    period: "Year", who: "driver", whoPlural: "drivers",
    ask: (y) => `Who won the Bathurst 1000 in ${y}? Name either driver.`,
    more: "Which driver won Bathurst more often?", verb: "won", count: "Bathursts", firstWord: "first win", block: 10,
    about: "Each car has two or three drivers. Name any one of them and you are right. 1960 to 1962 were held at Phillip Island.",
  },
  olympics: {
    id: "olympics", chip: "Olympic hosts", modes: ["year", "decade", "more", "order"],
    ranges: [since(1980), between(1920, 1979), before(1920), ALL(0)],
    period: "Year", who: "city", whoPlural: "cities",
    ask: (y) => `Which city hosted the Olympic Games in ${y}?`,
    more: "Which city has hosted more Games?", verb: "hosted", count: "Games", firstWord: "first time hosting", block: 20,
    about: "Summer Games from 1896. Years with no Games are shown as cancelled and never asked. 1956 had two hosts, and either one is right.",
  },
  sprint: {
    id: "sprint", chip: "100 m records", modes: ["year", "more", "order"],
    ranges: [since(1980), between(1950, 1979), before(1950), ALL(0)],
    period: "Record", who: "runner", whoPlural: "runners",
    ask: (l) => l,
    more: "Who was faster?", verb: "set", count: "records", firstWord: "first record", block: 10,
    about: "Every men's 100 m world record. Early marks were timed by hand, which was less exact than electronic timing.",
  },
};

/** Sport and Entertainment lists together (the Oscars and Aussie Awards run on this screen too). */
export const LIST_CONFIG: Record<string, ListConfig> = { ...SPORT_LIST_CONFIG, ...ENT_LIST_CONFIG };

/** Which lists each Sport game uses, in the order of its list chips. */
export const DECK_LISTS: Record<string, string[]> = {
  ...ENT_DECK_LISTS,
  nrl: ["nrl"],
  afl: ["afl"],
  football: ["epl", "cl", "wc"],
  motorsport: ["f1", "bathurst"],
  olympics: ["olympics"],
  sprint: ["sprint"],
};

export const MODE_INFO: Record<ModeId, { label: string; note: string }> = {
  year: { label: "Year by year", note: "A year appears. Type the winner. A fresh round has 10 questions." },
  fill: { label: "Fill in their years", note: "A champion appears. Tap every year they won. A right tap scores, a wrong tap loses a point." },
  decade: { label: "Decade blocks", note: "A block of years appears. Type winners in any order, and each name fills every year it won." },
  more: { label: "Who won more?", note: "Two names appear. Pick the one with more wins. 10 questions." },
  order: { label: "In order", note: "Five names appear. Put them in the order they first won. Drag, tap or use the keyboard." },
};
