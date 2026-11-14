// Matching a typed name against a list of accepted names (used by the Sport engine and Fill the List).
// Case, accents and punctuation never matter, and a single slip in a long name is forgiven.
import { normalize } from "./matcher";

/** True when a and b are the same, or differ by one letter (insert, delete or change). */
export function withinOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** Does `text` match any of `names`? One slip is allowed when both are 7 or more letters long. */
export function namesMatch(names: string[], text: string): boolean {
  const t = normalize(text);
  if (!t) return false;
  return names.some((n) => {
    const m = normalize(n);
    return m === t || (t.length >= 7 && m.length >= 7 && withinOne(t, m));
  });
}
