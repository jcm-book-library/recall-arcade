// The flat world map that stages 2 (the plates) and 7 (climate) of Earth & Sky are drawn on.
// It uses the same tools as the Countries map: world-atlas for the coastlines, and d3-geo to turn
// longitude and latitude into points on a 1000 x 560 picture. d3-geo also deals with the date line
// (longitude 180) for us, so the Pacific Plate, which straddles it, is drawn in both halves.
//
// The two data files are big, so they only load when the game is opened (see loadWorld).
import { geoEquirectangular, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

type Corners = [[number, number], [number, number]];

/** The stage 2 map fills the picture; the stage 7 map leaves room for the weather map. */
export const BIG_BOX: Corners = [[12, 44], [988, 540]];
export const SMALL_BOX: Corners = [[10, 92], [690, 452]];
/** The weather map's frame (x, y, width, height) in the stage 7 picture. */
export const WX = { x: 712, y: 118, w: 278, h: 200 };

const sphere = { type: "Sphere" } as const;
// The weather map: Australia and the seas around it, centred on the middle of the country. At this
// size a plain longitude-and-latitude grid ("equirectangular") looks right. 60 degrees of
// longitude fill the frame's width.
// The projections are cheap, so they are ready at once. Only the shapes below wait for the data.
const big = geoNaturalEarth1().fitExtent(BIG_BOX, sphere);
const small = geoNaturalEarth1().fitExtent(SMALL_BOX, sphere);
const aus = geoEquirectangular().center([135, -27]).scale(WX.w / ((60 * Math.PI) / 180)).translate([WX.x + WX.w / 2, WX.y + WX.h / 2]);

/** What the drawing code reads once loadWorld() has finished. */
export const WORLD = {
  ready: false,
  /** plate id -> SVG path text (full-width map, stage 2) */
  plates: {} as Record<string, string>,
  /** coastlines for the stage 2 map */
  land: "",
  /** coastlines for the smaller stage 7 map */
  landSmall: "",
  /** coastlines for the weather map */
  landAus: "",
};

let loading: Promise<void> | null = null;

export function loadWorld(): Promise<void> {
  loading ??= (async () => {
    const [platesFile, topo] = await Promise.all([
      import("../data/plates.json"),
      import("world-atlas/land-110m.json"),
    ]);
    const plates = (platesFile.default as { plates: Record<string, unknown> }).plates;
    const bigPath = geoPath(big);
    for (const [id, geo] of Object.entries(plates)) WORLD.plates[id] = bigPath(geo as never) ?? "";

    const t = topo.default as unknown as Topology;
    const land = feature(t, t.objects.land as GeometryCollection);
    WORLD.land = bigPath(land) ?? "";
    WORLD.landSmall = geoPath(small)(land) ?? "";
    WORLD.landAus = geoPath(aus)(land) ?? "";
    WORLD.ready = true;
  })();
  return loading;
}

/** Longitude and latitude of a point to x and y on the stage 2 map. */
export const bigXY = (lon: number, lat: number): [number, number] => big([lon, lat]) as [number, number];
export const smallXY = (lon: number, lat: number): [number, number] => small([lon, lat]) as [number, number];
export const ausXY = (lon: number, lat: number): [number, number] => aus([lon, lat]) as [number, number];

/** A line through a list of places, as SVG path text. Break it into several lines to cross the date line. */
export const lineThrough = (xy: (lon: number, lat: number) => [number, number], places: [number, number][]) =>
  places.map(([lon, lat], i) => `${i ? "L" : "M"}${xy(lon, lat).map((n) => n.toFixed(1)).join(" ")}`).join(" ");

/**
 * A band of the map between two latitudes, from edge to edge, as SVG path text.
 * (Natural Earth's lines of latitude are straight and level, but its left and right edges curve, so
 * we follow the edge in small steps.)
 */
export function latBand(xy: (lon: number, lat: number) => [number, number], south: number, north: number) {
  const side = (lon: number, from: number, to: number) => {
    const pts: [number, number][] = [];
    const steps = Math.max(2, Math.ceil(Math.abs(to - from) / 4));
    for (let i = 0; i <= steps; i++) pts.push(xy(lon, from + ((to - from) * i) / steps));
    return pts;
  };
  const pts = [...side(-180, south, north), ...side(180, north, south)];
  return `${pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")} Z`;
}
