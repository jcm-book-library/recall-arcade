// History map quizzes: Europe in 1914 and the Ancient World (AD 100).
// Borders come from "historical-basemaps" by André Ourednik (GPL-3.0), loaded from
// its GitHub page while you play rather than copied into this project.
import { geoArea } from "d3-geo";
import type { Deck, Item } from "../engine/types";
import { createMapBoard, type MapShape, type MapView } from "../boards/mapBoard";

const SOURCE = "https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/";

interface Feature {
  type: "Feature";
  properties: { NAME: string | null };
  geometry: { type: string; coordinates: number[][][] | number[][][][] } | null;
}

const cache = new Map<string, Promise<Feature[]>>();
function load(file: string) {
  if (!cache.has(file)) {
    cache.set(
      file,
      fetch(`${SOURCE}${file}.geojson`)
        .then((r) => {
          if (!r.ok) throw new Error(`Couldn't load the ${file} map (HTTP ${r.status}).`);
          return r.json();
        })
        .then((j: { features: Feature[] }) => j.features.filter((f) => f.geometry).map(rewind)),
    );
  }
  return cache.get(file)!;
}

/** Some outlines are stored the other way round, which would colour the whole globe. Flip those. */
function rewind(f: Feature): Feature {
  if (geoArea(f as never) <= 2 * Math.PI) return f;
  const g = f.geometry!;
  const flip = (poly: number[][][]) => poly.map((ring) => [...ring].reverse());
  const coordinates = g.type === "Polygon" ? flip(g.coordinates as number[][][]) : (g.coordinates as number[][][][]).map(flip);
  return { ...f, geometry: { ...g, coordinates } as Feature["geometry"] };
}

interface Pick {
  sources: string[];
  name: string;
  aliases: string[];
  starter?: boolean;
}

function historyMapDeck(cfg: {
  id: string;
  title: string;
  blurb: string;
  file: string;
  view: MapView;
  picks: Pick[];
  minutes: number;
}): Deck {
  const items: Item[] = cfg.picks.map((p, i) => ({
    id: `${cfg.id}${i}`,
    name: p.name,
    aliases: p.aliases,
    tags: p.starter ? ["starter"] : [],
    data: { sources: p.sources },
  }));
  const bySource = new Map<string, Item>();
  for (const it of items) for (const s of it.data!.sources as string[]) bySource.set(s, it);

  return {
    id: cfg.id,
    subject: "History",
    title: cfg.title,
    blurb: cfg.blurb,
    noun: "states",
    items,
    variants: [
      { id: "starter", label: "The Big Ones", minutes: Math.ceil(cfg.minutes / 2), starter: true, filter: (i) => i.tags.includes("starter") },
      { id: "all", label: `All ${items.length}`, minutes: cfg.minutes, filter: () => true },
    ],
    options: [],
    tip: "Historical borders: historical-basemaps by André Ourednik (GPL-3.0), loaded from GitHub. Hover any area after the round to see what it was called.",
    createBoard: async ({ container, items: playing }) => {
      const features = await load(cfg.file);
      const inRound = new Set(playing.map((i) => i.id));
      const shapes: MapShape[] = features.map((f) => {
        const item = f.properties.NAME ? bySource.get(f.properties.NAME) : undefined;
        return { id: item?.id ?? null, label: item?.name ?? f.properties.NAME ?? "", feature: f as never };
      });
      return createMapBoard(container, shapes, inRound, cfg.view);
    },
  };
}

export const europe1914Deck = historyMapDeck({
  id: "europe1914",
  title: "Europe in 1914",
  blurb: "The map on the eve of World War I. Name every country and empire. Hardly any match today's borders.",
  file: "world_1914",
  view: { rotate: -15, bbox: [-11, 35, 42, 66] },
  minutes: 5,
  picks: [
    { sources: ["German Empire"], name: "German Empire", aliases: ["Germany", "Imperial Germany"], starter: true },
    { sources: ["Austro-Hungarian Empire"], name: "Austria-Hungary", aliases: ["Austro-Hungarian Empire", "Austria Hungary", "Austro-Hungary"], starter: true },
    { sources: ["Russian Empire"], name: "Russian Empire", aliases: ["Russia", "Imperial Russia"], starter: true },
    { sources: ["Ottoman Empire"], name: "Ottoman Empire", aliases: ["Ottomans", "Turkey"], starter: true },
    { sources: ["United Kingdom of Great Britain and Ireland"], name: "United Kingdom", aliases: ["UK", "Britain", "Great Britain", "United Kingdom of Great Britain and Ireland"], starter: true },
    { sources: ["France"], name: "France", aliases: [], starter: true },
    { sources: ["Kingdom of Italy"], name: "Italy", aliases: ["Kingdom of Italy"], starter: true },
    { sources: ["Spain"], name: "Spain", aliases: [] },
    { sources: ["Portugal"], name: "Portugal", aliases: [] },
    { sources: ["Switzerland"], name: "Switzerland", aliases: [] },
    { sources: ["Belgium"], name: "Belgium", aliases: [] },
    { sources: ["Netherlands"], name: "Netherlands", aliases: ["Holland"] },
    { sources: ["Luxembourg"], name: "Luxembourg", aliases: [] },
    { sources: ["Denmark"], name: "Denmark", aliases: [] },
    { sources: ["Norway"], name: "Norway", aliases: [] },
    { sources: ["Sweden"], name: "Sweden", aliases: [] },
    { sources: ["Serbia"], name: "Serbia", aliases: [], starter: true },
    { sources: ["Montenegro"], name: "Montenegro", aliases: [] },
    { sources: ["Albania"], name: "Albania", aliases: [] },
    { sources: ["Greece"], name: "Greece", aliases: [] },
    { sources: ["Bulgaria"], name: "Bulgaria", aliases: [] },
    { sources: ["Romania"], name: "Romania", aliases: [] },
  ],
});

export const ancientDeck = historyMapDeck({
  id: "ancient",
  title: "The Ancient World",
  blurb: "The world in AD 100, when Rome was at its height. Name the great empires and kingdoms.",
  file: "world_100",
  view: { rotate: -30, bbox: [-115, -30, 150, 58] },
  minutes: 5,
  picks: [
    { sources: ["Roman Empire"], name: "Roman Empire", aliases: ["Rome", "Romans"], starter: true },
    { sources: ["Parthian Empire"], name: "Parthian Empire", aliases: ["Parthia", "Parthians"], starter: true },
    { sources: ["Han"], name: "Han Empire", aliases: ["Han", "Han China", "Han dynasty", "China"], starter: true },
    { sources: ["Kushan Empire"], name: "Kushan Empire", aliases: ["Kushan", "Kushans"], starter: true },
    { sources: ["Axum"], name: "Kingdom of Aksum", aliases: ["Aksum", "Axum"], starter: true },
    { sources: ["Meroe"], name: "Kingdom of Kush", aliases: ["Kush", "Meroe", "Meroë"] },
    { sources: ["Dacia"], name: "Dacia", aliases: ["Dacians"] },
    { sources: ["Armenia"], name: "Armenia", aliases: ["Kingdom of Armenia"] },
    { sources: ["Satavahanihara"], name: "Satavahana Empire", aliases: ["Satavahana", "Satavahanas"] },
    { sources: ["Southern Xiongnu"], name: "Xiongnu", aliases: ["Southern Xiongnu", "Huns"] },
    { sources: ["Nabatean Kingdom"], name: "Nabataean Kingdom", aliases: ["Nabataeans", "Nabatean Kingdom", "Nabateans", "Petra"] },
    { sources: ["Teotihuacan"], name: "Teotihuacan", aliases: ["Teotihuacán"] },
    { sources: ["Maya chiefdoms and states"], name: "Maya", aliases: ["Mayans", "Maya civilisation", "Maya civilization"], starter: true },
    { sources: ["Moche"], name: "Moche", aliases: ["Mochica"] },
    { sources: ["Nazca"], name: "Nazca", aliases: ["Nasca"] },
    { sources: ["Koguryo"], name: "Goguryeo", aliases: ["Koguryo"] },
    { sources: ["Yayoi"], name: "Yayoi Japan", aliases: ["Yayoi", "Japan"] },
  ],
});
