import type { Deck, Item } from "../engine/types";
import { createMapBoard, type MapShape } from "../boards/mapBoard";
import { backgroundLand, REGIONS } from "./countries";
import { PEAKS } from "./mountains-data";

interface RangePlace {
  id: string;
  name: string;
  region: string;
  aliases: string[];
  starter: boolean;
  geometry: unknown;
}

// Range outlines load only when this game is opened; their names ship with the page.
let rangesPromise: Promise<RangePlace[]> | null = null;
const loadRanges = () =>
  (rangesPromise ??= import("../data/ranges.json").then((m) => m.default as unknown as RangePlace[]));
import RANGE_NAMES from "../data/range-names.json";

const metres = (m: number) => `${m.toLocaleString("en-AU")} m`;

const items: Item[] = [
  ...PEAKS.map(([id, name, height, lat, lon, region, group, aliases]) => ({
    id,
    name,
    aliases,
    tags: ["peak", group, region],
    data: { height, point: [lon, lat] },
  })),
  ...(RANGE_NAMES as Omit<RangePlace, "geometry">[]).map((r) => ({
    id: r.id,
    name: r.name,
    aliases: r.aliases,
    tags: ["range", r.region, ...(r.starter ? ["bigrange"] : [])],
  })),
];

const isRange = (i: Item) => i.tags.includes("range");

export const mountainsDeck: Deck = {
  id: "mountains",
  subject: "Geography",
  title: "Mountains",
  blurb: "The highest peak on every continent, famous peaks and volcanoes, and the great mountain ranges. A name appears: find it on the map.",
  noun: "mountains",
  mode: "click",
  tip: "Australia has two answers for highest: Kosciuszko is the top of mainland Australia, and Puncak Jaya, on New Guinea, is the highest in Oceania. Climbers' \"Seven Summits\" lists pick one or the other. Zoom in for peaks that sit close together, like Mont Blanc and the Matterhorn.",
  items,
  variants: [
    { id: "summits", label: "Highest on Each Continent", minutes: 2, starter: true, filter: (i) => i.tags.includes("summit") },
    { id: "famous", label: "Famous Peaks", minutes: 5, filter: (i) => i.tags.includes("famous") },
    { id: "bigranges", label: "The Big Ranges", minutes: 3, filter: (i) => i.tags.includes("bigrange") },
    { id: "ranges", label: "All Ranges", minutes: 7, filter: isRange },
    { id: "all", label: "Everything", minutes: 14, filter: () => true },
  ],
  options: [],
  progressGroups: [...REGIONS, { tag: "AN", label: "Antarctica" }],
  describe: (i) => (isRange(i) ? i.name : `${i.name}, ${metres(i.data!.height as number)}`),
  renderPrompt: (item) => {
    const p = document.createElement("p");
    p.className = "prompt-text";
    p.innerHTML = `Click <strong></strong> <span class="muted"></span>`;
    p.querySelector("strong")!.textContent = isRange(item) ? `the ${item.name}` : item.name;
    p.querySelector("span")!.textContent = isRange(item) ? "(range)" : `(${metres(item.data!.height as number)})`;
    return p;
  },
  createBoard: async ({ container, items: playing }) => {
    const inRound = new Set(playing.map((i) => i.id));
    const [land, ranges] = await Promise.all([backgroundLand(true), loadRanges()]);
    const shapes: MapShape[] = [...land];
    for (const r of ranges) {
      if (!inRound.has(r.id)) continue;
      shapes.push({
        id: r.id,
        label: r.name,
        feature: { type: "Feature", properties: {}, geometry: r.geometry } as never,
        kind: "range",
      });
    }
    for (const i of playing) {
      if (isRange(i)) continue;
      const label = `${i.name}, ${metres(i.data!.height as number)}`;
      shapes.push({ id: i.id, label, point: i.data!.point as [number, number], extraClass: "peak" });
    }
    return createMapBoard(container, shapes, inRound, { rotate: -10 });
  },
};
