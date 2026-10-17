import type { Deck, Item } from "../engine/types";
import { createMapBoard, type MapView } from "../boards/mapBoard";
import { backgroundLand } from "./countries";
import { AIRPORT_TABLE, HUBS } from "./airports-data";

const REGIONS = [
  { tag: "AP", label: "Australia & Pacific" },
  { tag: "AS", label: "Asia" },
  { tag: "EU", label: "Europe" },
  { tag: "AM", label: "Americas" },
  { tag: "ME", label: "Middle East & Africa" },
];

const VIEWS: Record<string, MapView> = {
  AP: { rotate: -160, bbox: [110, -48, 215, -8] },
  AS: { rotate: -100, bbox: [65, -12, 145, 45] },
  EU: { rotate: -10, bbox: [-25, 36, 32, 66] },
  AM: { rotate: 95, bbox: [-160, -56, -35, 62] },
  ME: { rotate: -25, bbox: [-20, -36, 62, 40] },
};

interface Airport {
  code: string;
  city: string;
  airport: string;
  country: string;
  point: [number, number];
}

const items: Item[] = AIRPORT_TABLE.trim()
  .split("\n")
  .map((line) => {
    const [code, city, airport, country, region, lat, lon, extra] = line.split("|");
    const a: Airport = { code, city, airport, country, point: [Number(lon), Number(lat)] };
    const aliases = [airport, `${city} ${airport}`, `${airport} ${city}`, ...(extra ? extra.split(";") : [])];
    return {
      id: code,
      name: city,
      aliases,
      tags: [region, ...(HUBS.includes(code) ? ["hub"] : [])],
      data: { ...a },
    };
  });

const info = (i: Item) => i.data as unknown as Airport;
const fullName = (a: Airport) => (a.airport === a.city ? a.city : `${a.city} ${a.airport}`);

export const airportsDeck: Deck = {
  id: "airports",
  title: "Airport Codes",
  blurb: "Three letters appear. Name the city. Choose a region, or a world round of 50 drawn at random.",
  noun: "airports",
  mode: "prompt",
  placeholder: "City or airport…",
  items,
  variants: [
    { id: "hubs", label: "The Big Hubs", minutes: 4, starter: true, filter: (i) => i.tags.includes("hub") },
    ...REGIONS.map((r) => ({ id: r.tag, label: r.label, minutes: 5, filter: (i: Item) => i.tags.includes(r.tag) })),
    { id: "world", label: "World: 50 at random", minutes: 10, sample: 50, filter: () => true },
  ],
  options: [
    { id: "reverse", label: "Type the code instead", hint: "See the airport, type its three-letter code", default: false },
  ],
  // Reverse mode swaps question and answer: the code becomes the thing to type.
  applyOptions: (list, opts) =>
    opts.reverse ? list.map((i) => ({ ...i, name: i.id, aliases: [], data: { ...i.data, reverse: true } })) : list,
  progressGroups: REGIONS,
  describe: (i) => {
    const a = info(i);
    return `${a.code}: ${fullName(a)}`;
  },
  renderPrompt: (item) => {
    const a = info(item);
    const wrap = document.createElement("div");
    wrap.className = "prompt-code";
    if (item.data!.reverse) {
      wrap.innerHTML = `<p class="prompt-text"><strong></strong> <span class="muted"></span></p>`;
      wrap.querySelector("strong")!.textContent = fullName(a);
      wrap.querySelector("span")!.textContent = `(${a.country})`;
    } else {
      wrap.innerHTML = `<span class="code"></span>`;
      wrap.querySelector(".code")!.textContent = a.code;
    }
    return wrap;
  },
  createBoard: async ({ container, items: playing, variant }) => {
    const land = await backgroundLand();
    const shapes = [
      ...land,
      ...playing.map((i) => ({ id: i.id, label: `${i.id}: ${fullName(info(i))}`, point: info(i).point })),
    ];
    return createMapBoard(container, shapes, new Set(playing.map((i) => i.id)), VIEWS[variant.id] ?? { rotate: -10 });
  },
};
