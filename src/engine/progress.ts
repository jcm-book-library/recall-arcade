// PROGRESS: how the quizzes open up the arcade (see docs/arcade-design.md, section 4).
//
// Every quiz has one Easy CHALLENGE. Finishing any round that meets it ticks it off.
// Doing a challenge in any quiz of a subject counts that subject as "cleared".
// The number of cleared subjects decides which arcade games are open and which track
// (difficulty) you're on. Nothing is ever fully locked: a locked game can still be
// played as a Preview.
//
// Nothing new is saved: the answer is worked out from the scores already kept by storage.ts.

import { allGames, type GameRecord } from "./storage";

export interface Challenge {
  /** Shown on the quiz card, e.g. "Name 25 countries". */
  label: string;
  /** Does this finished round meet the challenge? */
  met: (g: GameRecord) => boolean;
}

/** At least `n` right in one round (any round). */
const count = (n: number, label: string): Challenge => ({ label, met: (g) => g.score >= n });
/** At least this fraction of the round's points (for timelines, multiple choice, pairs, hangman). */
const share = (p: number, label: string): Challenge => ({ label, met: (g) => g.total > 0 && g.score / g.total >= p });

// The EASY challenge for each quiz, by deck id. Deliberately gentle: the Easy track is
// "one quiz in each subject", and Countries starts at 25, not 50% (that would be about 120).
// To change a target, edit the number and the words together.
export const CHALLENGES: Record<string, Challenge> = {
  // Geography
  countries: count(25, "Name 25 countries"),
  flags: count(15, "Name 15 flags"),
  capitals: count(12, "Name 12 capitals"),
  water: count(10, "Find 10 seas, lakes or rivers"),
  neighbours: count(5, "Name 5 neighbours"),
  cityshapes: count(5, "Name 5 cities from their shapes"),
  mountains: count(6, "Find 6 mountains"),
  // Science
  zoomout: count(8, "Name 8 things in space"),
  innerspace: count(6, "Name 6 things in Inner Space"),
  elements: count(10, "Name 10 elements"),
  cells: count(5, "Label 5 parts of a cell"),
  body: count(6, "Label 6 body parts"),
  units: count(5, "Get 5 units right"),
  scale: share(0.6, "Get 60% right"),
  earthsky: count(6, "Name 6 parts of Earth & Sky"),
  // History
  history: share(0.5, "Score half marks on a timeline"),
  people: share(0.5, "Score half marks on a timeline"),
  pms: count(10, "Name 10 leaders"),
  eras: share(0.5, "Score half marks"),
  empires: count(6, "Name 6 empires"),
  myths: count(5, "Name 5 gods"),
  famousfor: share(0.5, "Match half the pairs"),
  mythpairs: share(0.5, "Score half marks"),
  afterlife: share(0.6, "Get 60% of the steps in place"),
  realms: share(0.6, "Label 6 realms first time"),
  mythwho: share(0.6, "Get 60% right"),
  mythsymbols: share(0.6, "Get 60% right"),
  // Travel & Transport
  airports: count(10, "Get 10 airport codes"),
  airlines: count(8, "Get 8 airline codes"),
  tailfins: count(8, "Spot 8 tail fins"),
  nato: count(13, "Get half the alphabet"),
  currencies: count(10, "Name 10 currencies"),
  landmarks: count(6, "Name 6 landmarks"),
  // Nature & Animals
  ausanimals: count(15, "Name 15 animals"),
  life: share(0.6, "Get 60% right"),
  pets: count(6, "Spot 6 breeds"),
  babies: share(0.5, "Score half marks"),
  dinosaurs: count(5, "Name 5 dinosaurs"),
  // Music
  keyboard: count(5, "Name 5 keys"),
  treble: count(4, "Name 4 notes"),
  bass: count(4, "Name 4 notes"),
  rhythm: count(3, "Name 3 note lengths"),
  symbols: count(5, "Name 5 signs"),
  ear: share(0.6, "Get 60% right"),
  // Sport
  nrl: share(0.5, "Score half marks in any round"),
  afl: share(0.5, "Score half marks in any round"),
  football: share(0.5, "Score half marks in any round"),
  motorsport: share(0.5, "Score half marks in any round"),
  olympics: share(0.5, "Score half marks in any round"),
  sprint: share(0.5, "Score half marks in any round"),
};

export const SUBJECT_NAMES = ["Geography", "Science", "History", "Travel & Transport", "Nature & Animals", "Music", "Sport", "Entertainment"];

// Ticked challenges are also kept in their own list, because storage.ts only keeps the
// last 200 rounds and a challenge must never "untick" itself.
const DONE_KEY = "learning-arcade:challenges";
function loadDone(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DONE_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}
function saveDone(done: Set<string>) {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify([...done]));
  } catch {
    /* storage unavailable */
  }
}

/** Has this quiz's challenge been met in any saved round? */
export function challengeDone(deckId: string, games: GameRecord[] = allGames(), done: Set<string> = loadDone()): boolean {
  if (done.has(deckId)) return true;
  const c = CHALLENGES[deckId];
  if (!c || !games.some((g) => g.deck === deckId && c.met(g))) return false;
  done.add(deckId);
  saveDone(done);
  return true;
}

/** The subjects with at least one challenge done. `deckSubjects` maps deck id to subject. */
export function clearedSubjects(deckSubjects: Record<string, string>): Set<string> {
  const games = allGames();
  const ticked = loadDone();
  const cleared = new Set<string>();
  for (const [id, subject] of Object.entries(deckSubjects)) {
    if (challengeDone(id, games, ticked)) cleared.add(subject);
  }
  return cleared;
}

export type Track = "easy" | "intermediate" | "hard";

/**
 * Every subject cleared finishes the Easy track. The Hard track's targets are still to be set.
 * A track once reached is never taken away: when Sport became the 7th subject, players who had
 * already cleared the first six stayed on Intermediate (decided 7 Nov 2026).
 */
export function trackFor(cleared: number): Track {
  const earned: Track = cleared >= SUBJECT_NAMES.length ? "intermediate" : "easy";
  const saved = currentTrack();
  return saved !== "easy" && earned === "easy" ? saved : earned;
}

// How many cleared subjects open each arcade game. Missing = always open.
export const ARCADE_OPENS_AT: Record<string, number> = { labyrinth: 3, flyover: 5 };

// The arcade games can't see the deck list, so the home page leaves the current track here
// each time it draws. Saved in the browser like everything else; Easy if unknown.
const TRACK_KEY = "learning-arcade:track";
export function rememberTrack(t: Track) {
  try {
    localStorage.setItem(TRACK_KEY, t);
  } catch {
    /* storage unavailable */
  }
}
export function currentTrack(): Track {
  try {
    const t = localStorage.getItem(TRACK_KEY);
    if (t === "intermediate" || t === "hard") return t;
  } catch {
    /* storage unavailable */
  }
  return "easy";
}
