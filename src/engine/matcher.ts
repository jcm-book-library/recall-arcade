import type { Item } from "./types";

/**
 * Turns whatever the player typed into a simple comparable form:
 * "Côte d'Ivoire" -> "cotedivoire", "Saint Lucia" -> "stlucia".
 */
export function normalize(text: string): string {
  let s = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bsaint\b/g, "st")
    .replace(/\bst\./g, "st")
    .trim()
    .replace(/^the\s+/, "");
  return s.replace(/[^a-z0-9]/g, "");
}

/** How many single-letter edits turn a into b (insert, delete, swap a letter). */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

export type MatchResult =
  | { kind: "none" }
  | { kind: "match"; item: Item }
  /** Typed text is correct, but also the start of another answer (Niger / Nigeria). */
  | { kind: "wait"; item: Item }
  /** A real answer from this deck, just not part of this round. */
  | { kind: "outside"; item: Item };

export class Matcher {
  private byKey = new Map<string, Item>();
  private outside = new Map<string, Item>();
  private found = new Set<string>();

  /** `allItems` lets the matcher recognise answers that belong to other rounds. */
  constructor(items: Item[], allItems: Item[] = []) {
    const index = (list: Item[], into: Map<string, Item>) => {
      for (const item of list) {
        for (const label of [item.name, ...(item.aliases ?? [])]) {
          const key = normalize(label);
          if (key && !into.has(key)) into.set(key, item);
        }
      }
    };
    index(items, this.byKey);
    const playing = new Set(items.map((i) => i.id));
    index(allItems.filter((i) => !playing.has(i.id)), this.outside);
  }

  markFound(id: string) {
    this.found.add(id);
  }

  check(text: string): MatchResult {
    const key = normalize(text);
    if (!key) return { kind: "none" };
    const item = this.byKey.get(key);
    if (!item) {
      const other = this.outside.get(key);
      return other ? { kind: "outside", item: other } : { kind: "none" };
    }
    if (this.found.has(item.id)) return { kind: "none" };
    for (const [other, otherItem] of this.byKey) {
      if (
        other.length > key.length &&
        other.startsWith(key) &&
        otherItem.id !== item.id &&
        !this.found.has(otherItem.id)
      ) {
        return { kind: "wait", item };
      }
    }
    return { kind: "match", item };
  }

  /** True when the text is a near-miss spelling of an answer still to find. */
  isClose(text: string): boolean {
    const key = normalize(text);
    if (key.length < 4) return false;
    const max = key.length >= 8 ? 2 : 1;
    for (const [k, item] of this.byKey) {
      if (!this.found.has(item.id) && editDistance(key, k, max) <= max) return true;
    }
    return false;
  }
}
