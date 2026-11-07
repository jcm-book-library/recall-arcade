import type { Deck, Item } from "../engine/types";
import { renderEras } from "../ui/eras";
import { PERIODS } from "./periods";

// Every period in the sheet, both kinds: wars and movements ("event") and eras and dynasties ("era").
// The item id is the period's own id (e155 is World War II), so it stays the same if the list grows.
const items: Item[] = PERIODS.map((p) => ({
  id: p.id,
  name: p.name,
  tags: [p.kind],
  data: { period: p },
}));

export const erasDeck: Deck = {
  id: "eras",
  title: "Eras & Dynasties",
  subject: "History",
  blurb:
    "Put eras in order, drag out where each one started and ended, and work out which era a moment belongs to.",
  noun: "eras",
  items,
  variants: [],
  options: [],
  related: { href: "#empires", label: "Empires on the map ▸" },
  createBoard: () => {
    throw new Error("Eras & Dynasties uses its own screen");
  },
  screen: (root, deck) => renderEras(root, deck),
};
