// MATCHING A TYPED PHRASE TO AN EVENT (Fill the List on Big Moments).
//
// Big Moments names are whole phrases ("Humans first walk on the Moon", "Britain passes the Slavery Abolition Act"),
// so a typed answer is judged by its KEY WORDS, not by the whole text:
//
//   1. Both sides are cut into words. Little words (the, of, is, on...) are dropped, endings are trimmed
//      (landing, lands, landed -> land), and a small table makes common synonyms one word (dies, death, died -> die;
//      begins, starts, outbreak -> begin; falls, collapse -> fall; built, construction -> build; ...).
//   2. Each event has a VOCABULARY: its own words, the words of a few hand-written aliases (history-aliases.ts),
//      and its year ("1066"). Aliases never need to be whole sentences; a few words that a person would say are enough.
//   3. A typed answer fits an event when EVERY content word you typed is in that event's vocabulary (a typo is
//      forgiven in words of 5 or more letters, never in a number). So "Battle of Hastings", "Hastings 1066" and
//      "Norman conquest" fit the same event, and "Moon landing" fits the Moon walk once it has that alias.
//   4. If the words fit exactly one event, it is an exact match. If they fit several ("Berlin Wall": built or fell?),
//      none is filled in Any Order and the player is asked for more; In Order, where the row is already known, they
//      count (provided the words aren't hopelessly common: one of them is in 3 or fewer events, or you typed 3 or more).
//   5. The whole title (or a whole alias) typed out always matches that event, as everywhere else in the site.
import { normalize } from "./matcher";
import { namesMatch, withinOne } from "./names";

const STOP = new Set([
  "a", "an", "the", "of", "is", "are", "was", "were", "in", "on", "at", "to", "and", "by", "for", "with", "from", "that", "as",
  "it", "its", "his", "her", "their", "be", "becomes", "become", "into", "after", "over", "up", "out", "when", "which", "who", "s",
]);

/** Words that mean the same thing for our purposes, folded to one. */
const SYN: Record<string, string> = {
  begins: "begin", begin: "begin", began: "begin", begun: "begin", start: "begin", starts: "begin", started: "begin", outbreak: "begin", commence: "begin", commences: "begin", beginning: "begin",
  ends: "end", end: "end", ended: "end", ending: "end", finish: "end", finishes: "end",
  falls: "fall", fall: "fall", fell: "fall", falling: "fall", collapse: "fall", collapses: "fall", collapsed: "fall", collapsing: "fall",
  dies: "die", die: "die", died: "die", death: "die", dead: "die", dying: "die",
  built: "build", build: "build", builds: "build", building: "build", construction: "build", constructed: "build", construct: "build", erected: "build", erect: "build",
  opens: "open", open: "open", opened: "open", opening: "open",
  discover: "discover", discovers: "discover", discovered: "discover", discovery: "discover",
  invent: "invent", invents: "invent", invented: "invent", invention: "invent", inventor: "invent",
  assassinated: "assassinate", assassinate: "assassinate", assassination: "assassinate", assassinates: "assassinate",
  murdered: "murder", murder: "murder", killed: "murder", kill: "murder", killing: "murder",
  founded: "found", founding: "found", foundation: "found", founds: "found",
  crowned: "crown", crowning: "crown", coronation: "crown", crown: "crown",
  published: "publish", publishes: "publish", publication: "publish", publish: "publish",
  sinks: "sink", sinking: "sink", sank: "sink", sunk: "sink", sink: "sink",
  defeated: "defeat", defeats: "defeat", defeat: "defeat",
  wwi: "ww1", wwii: "ww2",
};

/** Cuts a phrase into content words (see above). "World War I" becomes world, war, 1; "WWII" becomes ww2. */
export function contentWords(text: string): string[] {
  const raw = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const out: string[] = [];
  raw.forEach((w, i) => {
    // The numerals after "war": World War I, World War II, World War One, World War Two.
    if (raw[i - 1] === "war") {
      if (w === "i" || w === "one") w = "1";
      else if (w === "ii" || w === "two") w = "2";
    }
    if (STOP.has(w)) return;
    out.push(stem(SYN[w] ?? w));
  });
  return out;
}

function stem(w: string): string {
  if (SYN[w] || /\d/.test(w) || w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("ss")) return w;
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);
  return w;
}

export interface PhraseEntry {
  id: string;
  /** The title, as shown. */
  text: string;
  /** Other things a person would say (a few words each). */
  aliases?: string[];
  /** Extra words that identify it and aren't in the text ("1066"). */
  extra?: string[];
}

export interface PhraseMatcher {
  match: (typed: string) => { ids: string[]; loose: string[] };
  /** For tests and the docs: how many events each word is in. */
  df: Map<string, number>;
}

export function createPhraseMatcher(entries: PhraseEntry[]): PhraseMatcher {
  const vocab = new Map<string, Set<string>>();
  const phrases = new Map<string, string[]>();
  const df = new Map<string, number>();
  for (const e of entries) {
    const words = new Set<string>([...contentWords(e.text), ...(e.aliases ?? []).flatMap(contentWords), ...(e.extra ?? []).flatMap(contentWords)]);
    vocab.set(e.id, words);
    phrases.set(e.id, [e.text, ...(e.aliases ?? [])]);
    words.forEach((w) => df.set(w, (df.get(w) ?? 0) + 1));
  }
  const has = (v: Set<string>, t: string) => {
    if (v.has(t)) return true;
    if (t.length < 5 || /\d/.test(t)) return false;
    for (const w of v) if (w.length >= 5 && !/\d/.test(w) && withinOne(t, w)) return true;
    return false;
  };

  const match = (typed: string) => {
    if (!normalize(typed)) return { ids: [], loose: [] };
    // 5. A whole title or alias typed out.
    // Spelt out exactly first; failing that, one slip is forgiven, but only if it points to a single event
    // ("World War I" and "World War II" are one letter apart).
    const n = normalize(typed);
    const exact = entries.filter((e) => phrases.get(e.id)!.some((p) => normalize(p) === n)).map((e) => e.id);
    if (exact.length) return { ids: exact, loose: [] };
    const slip = entries.filter((e) => namesMatch(phrases.get(e.id)!, typed)).map((e) => e.id);
    if (slip.length === 1) return { ids: slip, loose: [] };
    const t = [...new Set(contentWords(typed))];
    if (!t.length) return { ids: [], loose: [] };
    // 3. Every word you typed is in the event's vocabulary.
    const fits = entries.filter((e) => t.every((w) => has(vocab.get(e.id)!, w))).map((e) => e.id);
    // 4. One event: exact. Several: loose (In Order only), unless the words are too common to mean anything.
    if (fits.length === 1) return { ids: fits, loose: [] };
    const meaningful = t.length >= 3 || t.some((w) => (df.get(w) ?? 0) <= 3);
    return { ids: [], loose: meaningful ? fits : [] };
  };
  return { match, df };
}
