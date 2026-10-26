import type { Deck, Item } from "../engine/types";
import { createZoomBoard } from "../boards/zoomBoard";
import { STAGES, STAGE_ORDER, ZOOM_ITEMS, rankOf } from "./zoomout-data";

const items: Item[] = ZOOM_ITEMS.map((z) => ({
  id: z.id,
  name: z.name,
  aliases: z.aliases ?? [],
  tags: [`z${z.stage}`],
  data: { ...z },
}));

const rank = (i: Item) => rankOf((i.data as { stage: number }).stage);
const count = (n: number) => items.filter((i) => rank(i) <= n).length;
/** Round id -> how many stages it covers. */
const DEPTH: Record<string, number> = { sky: 1, planets: 2, solar: 3, stars: 4, all: 6 };

export const zoomOutDeck: Deck = {
  id: "zoomout",
  subject: "Science",
  title: "Infinity & Beyond",
  blurb: "Start with the night sky. Then clear a stage and the view zooms out: planets, the solar system, nearby stars, the Milky Way, then the galaxies next door.",
  noun: "things in space",
  items,
  variants: [
    { id: "sky", label: "The Night Sky", minutes: 4, starter: true, filter: (i) => rank(i) <= 1 },
    { id: "planets", label: `Out to the Planets (${count(2)})`, minutes: 6, filter: (i) => rank(i) <= 2 },
    { id: "solar", label: `Out to the Solar System (${count(3)})`, minutes: 9, filter: (i) => rank(i) <= 3 },
    { id: "stars", label: `Out to the Nearest Stars (${count(4)})`, minutes: 11, filter: (i) => rank(i) <= 4 },
    { id: "all", label: `All the Way Out (${count(6)})`, minutes: 15, filter: () => true },
  ],
  options: [],
  progressGroups: STAGE_ORDER.map((n) => ({ tag: `z${n}`, label: STAGES.find((s) => s.n === n)!.title })),
  createBoard: ({ container, items: playing, variant }) =>
    createZoomBoard(container, items, playing, DEPTH[variant.id] ?? 1),
};
