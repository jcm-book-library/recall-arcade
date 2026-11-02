// THE SCALE OF THINGS (Science): put things in order by speed, mass, size, temperature, time,
// loudness, energy, and weight on other worlds. The facts are in scale-data.ts and the game
// screen is in ui/scale.ts. Like the other games with their own screen, this deck only lists
// the items (so progress and weak spots work) and the rounds (one per quantity).
import type { Deck, Item, Variant } from "../engine/types";
import { QUANTITIES } from "./scale-data";
import { learnCard, renderScale } from "../ui/scale";

// One item per thing. The id is "quantity-thing" because the same thing (the Moon, a lightning
// bolt) can turn up under more than one quantity. Never change these ids: they key saved scores.
const items: Item[] = QUANTITIES.flatMap((q) =>
  q.items.map((t) => ({ id: `${q.id}-${t.id}`, name: t.name, tags: [q.id], data: { value: t.value, show: t.show } })),
);

const variants: Variant[] = QUANTITIES.map((q) => ({
  id: q.id,
  label: q.label,
  minutes: 5,
  starter: q.id === "speed",
  filter: (i) => i.tags.includes(q.id),
}));

export const scaleDeck: Deck = {
  id: "scale",
  title: "The Scale of Things",
  subject: "Science",
  blurb: "Slowest to fastest, lightest to heaviest, coldest to hottest. Put things in order, from a snail to the speed of light.",
  noun: "things",
  items,
  variants,
  options: [],
  related: { href: "#units", label: "The old Units & Forces quiz ▸" },
  learn: learnCard,
  createBoard: () => {
    throw new Error("The Scale of Things uses its own screen");
  },
  screen: (root, deck) => renderScale(root, deck),
};
