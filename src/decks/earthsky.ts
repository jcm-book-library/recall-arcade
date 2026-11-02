// Earth & Sky: a journey UP, from the middle of the Earth to the clouds. Clear a stage and the
// view moves on: the layers of the Earth, the plates, a volcano, the rock cycle, the water cycle,
// the clouds, and last of all weather and climate.
// It uses the same zoom board as Infinity & Beyond and Inner Space, with warm "earth and sky" colours.
import type { Deck, Item } from "../engine/types";
import { createZoomBoard, type ZoomItem, type ZoomSet } from "../boards/zoomBoard";
import { h } from "../ui/dom";
import { EARTH_ITEMS, EARTH_ORDER, EARTH_STAGES, drawEarthBackdrop, drawEarthOverlay } from "./earthsky-data";
import { loadWorld } from "./earthsky-world";

const items: Item[] = EARTH_ITEMS.map((z) => ({
  id: z.id,
  name: z.name,
  aliases: z.aliases ?? [],
  tags: [`z${z.stage}`],
  data: { ...z },
}));

const EARTH_SET: ZoomSet = {
  stages: EARTH_STAGES,
  order: EARTH_ORDER,
  theme: "zoom-earth",
  drawBackdrop: drawEarthBackdrop,
  drawOverlay: drawEarthOverlay,
  itemOf: (i: Item) => i.data as unknown as ZoomItem,
};

/** Round id -> how many stages it covers. */
const DEPTH: Record<string, number> = { down: 2, rock: 4, all: 7 };
const rank = (i: Item) => EARTH_ORDER.indexOf((i.data as unknown as ZoomItem).stage) + 1;
const count = (n: number) => items.filter((i) => rank(i) <= n).length;

export const earthSkyDeck: Deck = {
  id: "earthsky",
  subject: "Science",
  title: "Earth & Sky",
  blurb: "Start at the centre of the Earth and travel up: the plates, a volcano, the rock cycle, the water cycle, the clouds, and the weather.",
  noun: "parts",
  items,
  variants: [
    { id: "down", label: `Down to Earth (${count(DEPTH.down)})`, minutes: 5, starter: true, filter: (i) => rank(i) <= DEPTH.down },
    { id: "rock", label: `Rock Solid (${count(DEPTH.rock)})`, minutes: 9, filter: (i) => rank(i) <= DEPTH.rock },
    { id: "all", label: `All the Way Up (${count(DEPTH.all)})`, minutes: 15, filter: () => true },
  ],
  options: [],
  progressGroups: EARTH_STAGES.map((s) => ({ tag: `z${s.n}`, label: s.title })),
  tip: "Plate boundaries: Peter Bird (2003), 'An updated digital model of plate boundaries', via Hugo Ahlenius's tectonicplates collection, Open Data Commons Attribution License (ODC-BY 1.0).",
  // The world map's shapes are big, so they load only when this game is opened.
  createBoard: async ({ container, items: playing, variant }) => {
    await loadWorld();
    return createZoomBoard(container, items, playing, DEPTH[variant.id] ?? 1, EARTH_SET);
  },
  // The "learn it first" card: the big ideas, and what the hard words mean.
  learn: () =>
    h(
      "div",
      {},
      h("h3", {}, "From the core to the clouds"),
      h("p", {}, "The Earth is like a peach: a thin skin (the crust), a thick soft middle (the mantle), and a hard stone in the centre (the core)."),
      h("p", {}, "The crust is cracked into giant pieces called plates. They drift a few centimetres a year. Where they meet you get earthquakes, mountains and volcanoes."),
      h("p", {}, "Rock comes in three families. Igneous rock cooled from melted rock. Sedimentary rock is layers of sand and mud pressed together. Metamorphic rock was changed by heat and squeezing."),
      h("p", {}, "Water goes round and round: up from the sea as vapour, into clouds, down as rain, and back to the sea."),
      h("p", {}, "Word tips: 'tropo' means turning (where the weather churns about), 'strato' means layer, 'cumulus' means heap, 'cirrus' means curl of hair, 'nimbus' means rain cloud."),
    ),
};
