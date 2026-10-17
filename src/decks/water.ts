import type { Deck, Item } from "../engine/types";
import { createMapBoard, type MapShape } from "../boards/mapBoard";
import { backgroundLand } from "./countries";

interface WaterPlace {
  id: string;
  name: string;
  kind: "ocean" | "sea" | "gulf" | "lake" | "river";
  aliases: string[];
  geometry: unknown;
}

// The outlines are large, so they load only when this game is opened.
let dataPromise: Promise<WaterPlace[]> | null = null;
const loadData = () =>
  (dataPromise ??= import("../data/water.json").then((m) => m.default as unknown as WaterPlace[]));

// The list of names is small, so it ships with the page; outlines come later.
import NAMES from "../data/water-names.json";

const STARTER = new Set([
  "pacific", "atlantic", "indian", "arctic", "southern", "mediterranean", "caribbean", "red",
  "caspian", "black", "nile", "amazon", "superior", "victoria", "baikal",
]);

/** "the Nile" but "Lake Victoria". */
const inSentence = (name: string) => (/^(Lake |Issyk|Vänern|Tonlé)/.test(name) ? name : `the ${name}`);

const items: Item[] = (NAMES as { id: string; name: string; kind: string; aliases: string[] }[]).map((p) => ({
  id: p.id,
  name: p.name,
  aliases: p.aliases,
  tags: [p.kind, ...(STARTER.has(p.id) ? ["starter"] : [])],
  data: { inSentence: inSentence(p.name) },
}));

const KIND_WORD: Record<string, string> = {
  ocean: "ocean", sea: "sea", gulf: "stretch of water", lake: "lake", river: "river",
};

export const waterDeck: Deck = {
  id: "water",
  title: "Seas, Lakes & Rivers",
  blurb: "A name appears. Find it on the map and click it. Three wrong clicks and it's shown to you.",
  noun: "places",
  mode: "click",
  items,
  variants: [
    { id: "starter", label: "The Big Ones", minutes: 3, starter: true, filter: (i) => i.tags.includes("starter") },
    { id: "seas", label: "Oceans & Seas", minutes: 8, filter: (i) => i.tags.includes("ocean") || i.tags.includes("sea") },
    { id: "gulfs", label: "Gulfs, Bays & Straits", minutes: 6, filter: (i) => i.tags.includes("gulf") },
    { id: "lakes", label: "Lakes", minutes: 6, filter: (i) => i.tags.includes("lake") },
    { id: "rivers", label: "Rivers", minutes: 6, filter: (i) => i.tags.includes("river") },
    { id: "all", label: "Everything", minutes: 20, filter: () => true },
  ],
  options: [],
  progressGroups: [
    { tag: "ocean", label: "Oceans" },
    { tag: "sea", label: "Seas" },
    { tag: "gulf", label: "Gulfs, bays & straits" },
    { tag: "lake", label: "Lakes" },
    { tag: "river", label: "Rivers" },
  ],
  renderPrompt: (item) => {
    const p = document.createElement("p");
    p.className = "prompt-text";
    const kind = item.tags[0];
    p.innerHTML = `Click <strong></strong> <span class="muted"></span>`;
    p.querySelector("strong")!.textContent = item.data!.inSentence as string;
    // "the Nile (river)", but no need to say "(ocean)" after "the Pacific Ocean".
    const obvious = /Ocean|Sea|Lake|Gulf|Bay|Strait|Channel|Passage|Bight|Reef/.test(item.name);
    p.querySelector("span")!.textContent = obvious ? "" : `(${KIND_WORD[kind] ?? kind})`;
    return p;
  },
  createBoard: async ({ container, items: playing }) => {
    const [land, places] = await Promise.all([backgroundLand(), loadData()]);
    const inRound = new Set(playing.map((i) => i.id));
    const shapes: MapShape[] = [...land];
    for (const p of places) {
      const isLake = p.kind === "lake";
      // Lakes always show as water; other places appear only when they're in the round.
      if (!inRound.has(p.id) && !isLake) continue;
      shapes.push({
        id: p.id,
        label: p.name,
        feature: { type: "Feature", properties: {}, geometry: p.geometry } as never,
        kind: p.kind === "river" ? "river" : "water",
        underLand: !isLake,
      });
    }
    return createMapBoard(container, shapes, inRound, { rotate: -10 });
  },
};
