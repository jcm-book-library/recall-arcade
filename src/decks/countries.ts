import { feature } from "topojson-client";
import { geoArea, geoBounds } from "d3-geo";
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

/**
 * Draws the world map for any deck whose item ids are country map names.
 * `labelFor` sets the name shown when hovering after a round.
 */
export async function createCountryMap(
  container: HTMLElement,
  playing: Item[],
  viewId: string,
  labelFor: (countryName: string, mapName: string) => string = (n) => n,
  extra: { hub?: string; fitTo?: string[] } = {},
) {
  const topo = await loadTopo();
  const fc = feature(topo, topo.objects.countries as GeometryCollection) as unknown as {
    features: { properties: { name: string } }[];
  };
  const known = new Set(items.map((i) => i.id));
  const nameOf = (n: string) => items.find((i) => i.id === n)?.name ?? hiddenLabels.get(n) ?? n;
  const shapes: MapShape[] = fc.features
    .filter((f) => f.properties.name !== "Antarctica")
    .map((f) => {
      const n = f.properties.name;
      return {
        id: known.has(n) ? n : null,
        label: labelFor(nameOf(n), n),
        feature: f as never,
        extraClass: n === extra.hub ? "hub" : undefined,
      };
    });
  for (const [id, point] of Object.entries(EXTRA_POINTS)) {
    shapes.push({ id, label: labelFor(nameOf(id), id), point });
  }
  let view = VIEWS[viewId] ?? VIEWS.world;
  if (extra.fitTo?.length) {
    // Fit the map to a group of countries, e.g. a country and its neighbours.
    const fc = { type: "FeatureCollection", features: fc_features(extra.fitTo) } as never;
    let [[w, s], [e, n]] = geoBounds(fc);
    if (w > e) e += 360; // crosses the 180° line (Russia)
    if (e - w > 300) [w, e] = [-180, 180];
    const pad = Math.max(3, (e - w) * 0.12);
    view = { rotate: -(w + e) / 2, bbox: [w - pad, Math.max(-85, s - pad), e + pad, Math.min(85, n + pad)] };
  }
  return createMapBoard(container, shapes, new Set(playing.map((i) => i.id)), view);

  /** Each country's largest landmass only, so overseas islands don't stretch the view. */
  function fc_features(ids: string[]) {
    return shapes
      .filter((sh) => sh.feature && ids.includes((sh.feature as unknown as { properties: { name: string } }).properties.name))
      .map((sh) => {
        const g = (sh.feature as unknown as { geometry: { type: string; coordinates: unknown[] } }).geometry;
        if (g.type !== "MultiPolygon") return sh.feature;
        // Ignore any piece that reads as "most of the globe" (an outline stored inside out).
        const polys = g.coordinates
          .map((c) => ({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: c } }) as never)
          .filter((poly) => geoArea(poly) < 2 * Math.PI);
        return polys.length ? polys.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a)) : sh.feature;
      });
  }
}

/** Every country as plain background land, for maps that quiz something else. */
export async function backgroundLand(withAntarctica = false): Promise<MapShape[]> {
  const topo = await loadTopo();
  const fc = feature(topo, topo.objects.countries as GeometryCollection) as unknown as {
    features: { properties: { name: string } }[];
  };
  return fc.features
    .filter((f) => withAntarctica || f.properties.name !== "Antarctica")
    .map((f) => {
      const n = f.properties.name;
      return { id: null, label: items.find((i) => i.id === n)?.name ?? hiddenLabels.get(n) ?? n, feature: f as never };
    });
}

export { REGIONS, items as countryItems };

export const countriesDeck: Deck = {
  id: "countries",
  subject: "Geography",
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
  outsideHint: (item, opts) =>
    item.tags.includes("territory") && !opts.territories
      ? `${item.name} is a territory, not a country. Tick "Include territories" to count these.`
      : null,
  createBoard: ({ container, items: playing, variant }) =>
    createCountryMap(container, playing, variant.id),
};
