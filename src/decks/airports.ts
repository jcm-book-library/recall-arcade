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
  subject: "Travel & Transport",
  title: "Airport Codes",
  blurb: "An airport appears. Type its three-letter code. Choose a region, or a world round of 50 drawn at random.",
  noun: "airports",
  mode: "prompt",
  placeholder: (opts) => (opts.cityFirst ? "City or airport…" : "Three-letter code…"),
  items,
  variants: [
    { id: "hubs", label: "The Big Hubs", minutes: 4, starter: true, filter: (i) => i.tags.includes("hub") },
    ...REGIONS.map((r) => ({ id: r.tag, label: r.label, minutes: 5, filter: (i: Item) => i.tags.includes(r.tag) })),
    { id: "world", label: "World: 50 at random", minutes: 10, sample: 50, filter: () => true },
  ],
  options: [
    { id: "cityFirst", label: "Show the code, name the city", hint: "Flip it: see MEL, type Melbourne", default: false },
  ],
  // By default the airport is shown and the code is the answer.
  applyOptions: (list, opts) =>
    opts.cityFirst ? list : list.map((i) => ({ ...i, name: i.id, aliases: [], data: { ...i.data, reverse: true } })),
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
      wrap.innerHTML = `<p class="prompt-city"></p><p class="prompt-airport"></p>`;
      wrap.querySelector(".prompt-city")!.textContent = a.city;
      wrap.querySelector(".prompt-airport")!.textContent =
        a.airport === a.city ? a.country : `${a.airport} · ${a.country}`;
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
