// The two special Mythology games: the Egyptian journey to the afterlife (put the steps in order)
// and the Nine Realms of Norse myth (label Yggdrasil). Both are hidden decks with their own screen,
// reached from the Mythology page. The data lives in myth-data.ts.
import type { Deck, Item } from "../engine/types";
import { renderAfterlife, renderRealms } from "../ui/myth-specials";
import { AFTERLIFE_TABLE, REALM_TABLE } from "./myth-data";

const rows = (table: string) =>
  table
    .trim()
    .split("\n")
    .map((line) => line.split("|").map((s) => s.trim()));

/** The steps in their true order. */
export const afterlifeItems: Item[] = rows(AFTERLIFE_TABLE).map(([id, name, detail]) => ({
  id,
  name,
  tags: ["egypt"],
  data: { detail },
}));

export type RealmLevel = "top" | "middle" | "bottom";

export const realmItems: Item[] = rows(REALM_TABLE).map(([id, name, who, level]) => ({
  id,
  name,
  tags: [level],
  data: { who, level },
}));

export const afterlifeDeck: Deck = {
  id: "afterlife",
  title: "The Journey to the Afterlife",
  subject: "History",
  hidden: true,
  blurb: "Put the steps of an ancient Egyptian's journey to the afterlife in order.",
  noun: "steps",
  items: afterlifeItems,
  variants: [],
  options: [],
  createBoard: () => {
    throw new Error("The Journey to the Afterlife uses its own screen");
  },
  screen: (root, deck) => renderAfterlife(root, deck),
};

export const realmsDeck: Deck = {
  id: "realms",
  title: "The Nine Realms",
  subject: "History",
  hidden: true,
  blurb: "Label Yggdrasil, the Norse world tree, with its nine realms.",
  noun: "realms",
  items: realmItems,
  variants: [],
  options: [],
  createBoard: () => {
    throw new Error("The Nine Realms uses its own screen");
  },
  screen: (root, deck) => renderRealms(root, deck),
};
