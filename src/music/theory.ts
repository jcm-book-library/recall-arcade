// Note names, MIDI numbers and answer matching for the music quizzes.
// MIDI 60 is middle C (C4). Each step is one semitone (one piano key).

export const SHARP_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const FLAT_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];

export const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
export const noteName = (midi: number) => SHARP_NAMES[((midi % 12) + 12) % 12];
export const octaveOf = (midi: number) => Math.floor(midi / 12) - 1;
export const fullName = (midi: number) => `${noteName(midi)}${octaveOf(midi)}`;

/** Every way of writing a note's name: "C♯" also counts as "C#", "D♭", "Db", "C sharp"… */
export function noteAliases(midi: number): string[] {
  const pc = ((midi % 12) + 12) % 12;
  const s = SHARP_NAMES[pc];
  const f = FLAT_NAMES[pc];
  const out = new Set([s, `${s}${octaveOf(midi)}`]);
  if (s !== f) {
    out.add(f);
    out.add(`${s[0]} sharp`);
    out.add(`${f[0]} flat`);
  }
  return [...out];
}

/**
 * Compares note names so "C#", "C♯" and "C sharp" match, and "Db"/"D♭" mean D flat,
 * while a plain "B" still means the note B. Anything else is compared as plain words.
 */
export function noteKey(text: string): string {
  let t = text.trim().toLowerCase().replace(/♮/g, "");
  t = t.replace(/[♯#]/g, "sharp").replace(/♭/g, "flat");
  // "db", "eb", "bb4": a letter followed by b means flat.
  t = t.replace(/^([a-g])\s*b(?![a-z])/, "$1flat");
  return t.replace(/[^a-z0-9]/g, "");
}

/** Staff position: C4 = 28, D4 = 29 … (7 letter steps per octave). Sharps sit on their letter's line. */
export function diatonicIndex(midi: number): number {
  const letterOfPc = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  const pc = ((midi % 12) + 12) % 12;
  return letterOfPc[pc] + 7 * Math.floor(midi / 12) - 7;
}
