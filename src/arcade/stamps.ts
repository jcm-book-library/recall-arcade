// THE STAMP BOOK, saved in the browser. The island reads it to show which arcade stops have been
// done. Most stops give their stamp when you press Play; a game that wants to be FINISHED first
// (The Brawl) calls awardStamp itself when you cross the line.
const STAMPS_KEY = "learning-arcade:stamps";

export function readStamps(): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(STAMPS_KEY) ?? "[]");
    if (Array.isArray(v)) return new Set(v.filter((x) => typeof x === "string"));
  } catch {
    // Storage can be blocked (private windows). Then there are simply no stamps.
  }
  return new Set();
}

export function writeStamps(s: Set<string>) {
  try {
    localStorage.setItem(STAMPS_KEY, JSON.stringify([...s]));
  } catch {
    // Nothing to do: the stamp just is not remembered.
  }
}

/** Add one stamp. Returns true if it is new. */
export function awardStamp(game: string): boolean {
  const s = readStamps();
  if (s.has(game)) return false;
  s.add(game);
  writeStamps(s);
  return true;
}
