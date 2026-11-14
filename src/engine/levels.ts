// EASY / MEDIUM / HARD: what each level means for a quiz (docs/quiz-standard.md, rule 6).
//
//   Easy   = study the board first, then play with hints on.
//   Medium = exactly how the quiz always played. Its saved best scores keep their old keys.
//   Hard   = hints off. (Click games: one guess.) A quiz can add its own details with `deck.levels`.
//
// A level a quiz can't offer yet comes back as null: the page shows it dashed and it can't be picked.
// Hard only exists where something can be taken away: a Hint button, a click game's guesses, or a tweak.
//
// SAVED SCORES: Medium uses the round's id as before ("world", "world+territories"). Easy and Hard add
// "+easy" or "+hard" on the end, so nothing earned before levels existed is lost or mixed up.

import type { Deck, Level } from "./types";
import { allGames } from "./storage";

export const LEVELS: Level[] = ["easy", "medium", "hard"];
export const LEVEL_LABEL: Record<Level, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

/** Wrong clicks allowed in a click game before the answer is shown. */
export const DEFAULT_GUESSES = 3;

export interface ResolvedLevel {
  /** Show the board with every name on it before the round. */
  study: boolean;
  /** "on": first-letter help already showing; "available": a Hint button; "off": no hints. */
  hints: "on" | "available" | "off";
  guesses: number;
  options: Record<string, boolean>;
  note?: string;
}

/**
 * The three levels for a quiz. `click` says whether the quiz is being played by clicking
 * (a quiz with a type/click switch has different rules for each).
 */
export function resolveLevels(deck: Deck, click: boolean): Record<Level, ResolvedLevel | null> {
  const set = deck.levels ?? {};
  const make = (level: Level): ResolvedLevel | null => {
    const tweak = set[level];
    if (tweak === false) return null;
    const base: ResolvedLevel = {
      study: level === "easy",
      hints: level === "easy" ? "on" : level === "medium" ? "available" : "off",
      guesses: DEFAULT_GUESSES,
      options: {},
    };
    if (level === "hard") {
      // Hard needs something to take away. Without a tweak, only quizzes with hints or guesses have it.
      if (!tweak && !deck.hasHints && !click) return null;
      if (click) base.guesses = 1;
    }
    if (tweak) Object.assign(base, { ...tweak, options: tweak.options ?? {} });
    return base;
  };
  return { easy: make("easy"), medium: make("medium"), hard: make("hard") };
}

/** What gets added to a saved-score key for this level (nothing for Medium). */
export const levelSuffix = (level: Level) => (level === "medium" ? "" : `+${level}`);

/** Splits a saved key into its round and its level. "world+territories+hard" is round "world", level hard. */
export function parseKey(key: string): { round: string; level: Level } {
  const parts = key.split("+");
  const last = parts[parts.length - 1];
  if (parts.length > 1 && (last === "easy" || last === "hard")) return { round: parts[0], level: last };
  return { round: parts[0], level: "medium" };
}

/** A level counts as done once a finished round at that level scored at least this share. */
export const DONE_SHARE = 0.5;

/** Which levels of a round have been done (any saved game, any options). */
export function doneLevels(deckId: string, roundId: string): Set<Level> {
  const done = new Set<Level>();
  for (const g of allGames()) {
    if (g.deck !== deckId || g.total <= 0 || g.score / g.total < DONE_SHARE) continue;
    const k = parseKey(g.variant);
    if (k.round === roundId) done.add(k.level);
  }
  return done;
}

/** A plain-English line about each level, for the Rules pop-over. */
export function levelNotes(deck: Deck, click: boolean): string[] {
  const r = resolveLevels(deck, click);
  const lines: string[] = [];
  const say = (level: Level, text: string) => {
    const l = r[level];
    lines.push(`${LEVEL_LABEL[level]}: ${l ? `${text}${l.note ? ` ${l.note}` : ""}` : "not built for this quiz yet."}`);
  };
  say("easy", deck.learn ? "learn it first, then play with hints on." : "look over the board first, then play with hints on.");
  say("medium", "just the quiz, with hints if there are any.");
  say("hard", click ? "no hints, and one guess." : "no hints.");
  return lines;
}

/** The same, for the simple quiz types (multiple choice, pairs, hangman) that only offer some levels. */
export function levelNotesFor(available: Level[], hard?: string): string[] {
  return LEVELS.map((l) => {
    if (!available.includes(l)) return `${LEVEL_LABEL[l]}: not built for this quiz yet.`;
    if (l === "medium") return "Medium: the quiz as it is.";
    return `${LEVEL_LABEL[l]}: ${hard ?? "a harder way to play."}`;
  });
}
