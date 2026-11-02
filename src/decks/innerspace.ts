// Inner Space: the mirror of Infinity & Beyond. Clear a stage and the view zooms IN, a little
// further each time: skin, cells, one cell, the nucleus, molecules, and last of all an atom.
// It uses the same zoom board as Infinity & Beyond, with the "microscope" colours.
import type { Deck, Item } from "../engine/types";
import { createZoomBoard, type ZoomItem, type ZoomSet } from "../boards/zoomBoard";
import { h } from "../ui/dom";
import { INNER_ITEMS, INNER_ORDER, INNER_STAGES, drawInnerBackdrop } from "./innerspace-data";

const items: Item[] = INNER_ITEMS.map((z) => ({
  id: z.id,
  name: z.name,
  aliases: z.aliases ?? [],
  tags: [`z${z.stage}`],
  data: { ...z },
}));

const INNER_SET: ZoomSet = {
  stages: INNER_STAGES,
  order: INNER_ORDER,
  theme: "zoom-micro",
  drawBackdrop: drawInnerBackdrop,
  itemOf: (i: Item) => i.data as unknown as ZoomItem,
};

/** Round id -> how many stages it covers. */
const DEPTH: Record<string, number> = { skin: 1, cells: 3, dna: 4, all: 6 };
const count = (n: number) => items.filter((i) => INNER_ORDER.indexOf((i.data as unknown as ZoomItem).stage) + 1 <= n).length;
const rank = (i: Item) => INNER_ORDER.indexOf((i.data as unknown as ZoomItem).stage) + 1;

export const innerSpaceDeck: Deck = {
  id: "innerspace",
  subject: "Science",
  title: "Inner Space",
  blurb: "Start with your skin. Clear a stage and the view zooms in: cells, the cell's insides, DNA, molecules, and down to a single atom.",
  noun: "parts",
  items,
  variants: [
    { id: "skin", label: "Skin Deep", minutes: 4, starter: true, filter: (i) => rank(i) <= DEPTH.skin },
    { id: "cells", label: `Down to the Cell (${count(DEPTH.cells)})`, minutes: 8, filter: (i) => rank(i) <= DEPTH.cells },
    { id: "dna", label: `Down to DNA (${count(DEPTH.dna)})`, minutes: 10, filter: (i) => rank(i) <= DEPTH.dna },
    { id: "all", label: `All the Way In (${count(DEPTH.all)})`, minutes: 14, filter: () => true },
  ],
  options: [],
  progressGroups: INNER_STAGES.map((s) => ({ tag: `z${s.n}`, label: s.title })),
  related: { href: "#cells", label: "Zoom in further: Cells & Life ▸" },
  createBoard: ({ container, items: playing, variant }) =>
    createZoomBoard(container, items, playing, DEPTH[variant.id] ?? 1, INNER_SET),
  // The "learn it first" card: the sizes involved, since nobody can guess them cold.
  learn: () =>
    h(
      "div",
      {},
      h("h3", {}, "How small does it get?"),
      h("p", {}, "Each stage zooms in between ten and a thousand times further than the last."),
      h(
        "ul",
        {},
        h("li", {}, "Skin: millimetres"),
        h("li", {}, "Cells: a tenth of a millimetre"),
        h("li", {}, "One cell: a fiftieth of a millimetre"),
        h("li", {}, "Nucleus: a few thousandths of a millimetre"),
        h("li", {}, "Molecules: millionths of a millimetre"),
        h("li", {}, "Atom: ten-millionths of a millimetre"),
      ),
      h("p", {}, "Tip: the names are often Latin or Greek. 'Cyto' means cell, 'derm' means skin, 'nucleus' means little nut."),
    ),
};
