import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Deck, Item } from "../engine/types";
import { createMapBoard, type MapShape, type MapView } from "../boards/mapBoard";
import { COUNTRY_TABLE, EXTRA_POINTS } from "./countries-data";

const REGIONS = [
  { tag: "AF", label: "Africa" },
  { tag: "AS", label: "Asia" },
  { tag: "EU", label: "Europe" },
  { tag: "NA", label: "North America" },
  { tag: "SA", label: "South America" },
  { tag: "OC", label: "Oceania" },
];

const VIEWS: Record<string, MapView> = {
  world: { rotate: -10 },
  AF: { rotate: -15, bbox: [-26, -36, 58, 38] },
  AS: { rotate: -90, bbox: [26, -12, 150, 56] },
  EU: { rotate: -15, bbox: [-25, 34, 45, 71] },
  NA: { rotate: 95, bbox: [-170, 6, -12, 83] },
  SA: { rotate: 60, bbox: [-93, -56, -33, 13] },
  OC: { rotate: -170, bbox: [110, -48, 230, 20] },
};

interface Row {
  mapName: string;
  item: Item;
  type: "s" | "t" | "x";
}

const rows: Row[] = COUNTRY_TABLE.trim()
  .split("\n")
  .map((line) => {
    const [mapName, name, regions, type, aliases] = line.split("|");
    const tags = regions.split(",");
    if (type === "t") tags.push("territory");
    return {
      mapName,
      type: type as Row["type"],
      item: {
        id: mapName,
        name,
        aliases: aliases ? aliases.split(";") : [],
        tags,
      },
    };
  });

const items = rows.filter((r) => r.type !== "x").map((r) => r.item);
const hiddenLabels = new Map(rows.filter((r) => r.type === "x").map((r) => [r.mapName, r.item.name]));

let topoPromise: Promise<Topology> | null = null;
const loadTopo = () =>
  (topoPromise ??= import("world-atlas/countries-50m.json").then((m) => m.default as unknown as Topology));

export const countriesDeck: Deck = {
  id: "countries",
  title: "Countries of the World",
  blurb: "Type every country you can before the clock runs out. Each one lights up on the map.",
  noun: "places",
  items,
  variants: [
    { id: "world", label: "World", minutes: 15, filter: () => true },
    ...REGIONS.map((r) => ({
      id: r.tag,
      label: r.label,
      minutes: r.tag === "SA" ? 2 : r.tag === "OC" || r.tag === "NA" ? 4 : 6,
      filter: (i: Item) => i.tags.includes(r.tag),
    })),
  ],
  options: [
    {
      id: "territories",
      label: "Include territories",
      hint: "Adds 39 dependencies such as Greenland, New Caledonia and Puerto Rico",
      default: false,
    },
  ],
  applyOptions: (list, opts) => (opts.territories ? list : list.filter((i) => !i.tags.includes("territory"))),
  progressGroups: REGIONS,
  async createBoard({ container, items: playing, variant }) {
    const topo = await loadTopo();
    const fc = feature(topo, topo.objects.countries as GeometryCollection) as unknown as {
      features: { properties: { name: string } }[];
    };
    const known = new Set(items.map((i) => i.id));
    const shapes: MapShape[] = fc.features
      .filter((f) => f.properties.name !== "Antarctica")
      .map((f) => {
        const n = f.properties.name;
        return {
          id: known.has(n) ? n : null,
          label: items.find((i) => i.id === n)?.name ?? hiddenLabels.get(n) ?? n,
          feature: f as never,
        };
      });
    for (const [id, point] of Object.entries(EXTRA_POINTS)) {
      shapes.push({ id, label: items.find((i) => i.id === id)?.name ?? id, point });
    }
    return createMapBoard(container, shapes, new Set(playing.map((i) => i.id)), VIEWS[variant.id] ?? VIEWS.world);
  },
};
