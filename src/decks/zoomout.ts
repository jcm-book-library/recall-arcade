import type { Deck, Item } from "../engine/types";
import { createZoomBoard } from "../boards/zoomBoard";
import { STAGES, ZOOM_ITEMS } from "./zoomout-data";

const items: Item[] = ZOOM_ITEMS.map((z) => ({
  id: z.id,
  name: z.name,
  aliases: z.aliases ?? [],
  tags: [`z${z.stage}`],
  data: { ...z },
}));

const stageOf = (i: Item) => (i.data as { stage: number }).stage;
const count = (n: number) => items.filter((i) => stageOf(i) <= n).length;

export const zoomOutDeck: Deck = {
  id: "zoomout",
  title: "Zoom Out",
  blurb: "Start with the planets. Clear a stage and the view zooms out: stars, constellations, the Milky Way, then the galaxies next door.",
  noun: "things in space",
  items,
  variants: [
    { id: "1", label: "The Planets", minutes: 2, starter: true, filter: (i) => stageOf(i) <= 1 },
    { id: "2", label: `Solar System (${count(2)})`, minutes: 5, filter: (i) => stageOf(i) <= 2 },
    { id: "3", label: `Nearest Stars (${count(3)})`, minutes: 7, filter: (i) => stageOf(i) <= 3 },
    { id: "4", label: `Night Sky (${count(4)})`, minutes: 10, filter: (i) => stageOf(i) <= 4 },
    { id: "6", label: `All the Way Out (${count(6)})`, minutes: 15, filter: () => true },
  ],
  options: [],
  progressGroups: STAGES.map((s) => ({ tag: `z${s.n}`, label: s.title })),
  createBoard: ({ container, items: playing, variant }) =>
    createZoomBoard(container, items, playing, Number(variant.id)),
};
