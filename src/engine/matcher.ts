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

export type MatchResult =
  | { kind: "none" }
  | { kind: "match"; item: Item }
  /** Typed text is correct, but also the start of another answer (Niger / Nigeria). */
  | { kind: "wait"; item: Item };

export class Matcher {
  private byKey = new Map<string, Item>();
  private found = new Set<string>();

  constructor(items: Item[]) {
    for (const item of items) {
      for (const label of [item.name, ...(item.aliases ?? [])]) {
        const key = normalize(label);
        if (key && !this.byKey.has(key)) this.byKey.set(key, item);
      }
    }
  }

  markFound(id: string) {
    this.found.add(id);
  }

  check(text: string): MatchResult {
    const key = normalize(text);
    if (!key) return { kind: "none" };
    const item = this.byKey.get(key);
    if (!item || this.found.has(item.id)) return { kind: "none" };
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
}
