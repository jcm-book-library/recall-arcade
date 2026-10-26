// Builds src/data/ranges.json: the mountain range outlines used by the "Mountains" quiz,
// cut down from Natural Earth's geography regions (public domain).
//
// Run with:  node scripts/build-ranges.mjs [folder with downloaded .geojson files]
// Without a folder it downloads the file from the Natural Earth GitHub mirror.
import fs from "node:fs";
import path from "node:path";
import { geoArea } from "d3-geo";

const SRC = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";
const localDir = process.argv[2];

async function load(name) {
  if (localDir) return JSON.parse(fs.readFileSync(path.join(localDir, `${name}.geojson`), "utf8"));
  const res = await fetch(`${SRC}${name}.geojson`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}

// id: [display name, continent tag, [source names...], [other accepted answers], starter?]
const PICKS = {
  himalayas: ["Himalayas", "AS", ["HIMALAYAS"], ["Himalaya", "The Himalayas", "Himalayan Mountains"], true],
  karakoram: ["Karakoram", "AS", ["KARAKORAM RA."], ["Karakoram Range"]],
  hindukush: ["Hindu Kush", "AS", ["HINDU KUSH"], []],
  pamirs: ["Pamirs", "AS", ["PAMIRS"], ["Pamir", "Pamir Mountains"]],
  tianshan: ["Tian Shan", "AS", ["TIAN SHAN"], ["Tien Shan", "Tianshan"]],
  kunlun: ["Kunlun Mountains", "AS", ["KUNLUN MOUNTAINS"], ["Kunlun"]],
  altai: ["Altai Mountains", "AS", ["ALTAY MOUNTAINS"], ["Altai", "Altay", "Altay Mountains"]],
  zagros: ["Zagros Mountains", "AS", ["ZAGROS MOUNTAINS"], ["Zagros"]],
  westernghats: ["Western Ghats", "AS", ["WESTERN GHATS"], ["Sahyadri"]],
  urals: ["Ural Mountains", "EU", ["URAL MOUNTAINS"], ["Urals", "The Urals", "Ural"], true],
  alps: ["Alps", "EU", ["ALPS"], ["The Alps", "European Alps"], true],
  pyrenees: ["Pyrenees", "EU", ["PYRENEES"], ["The Pyrenees", "Pyrénées"]],
  carpathians: ["Carpathian Mountains", "EU", ["CARPATHIAN MOUNTAINS", "Transylvanian Alps", "Tatra Mts."], ["Carpathians", "The Carpathians"]],
  caucasus: ["Caucasus Mountains", "EU", ["CAUCASUS MTS.", "Lesser Caucasus"], ["Caucasus", "The Caucasus"]],
  apennines: ["Apennines", "EU", ["APPENNINI"], ["Apennine Mountains", "Appennini", "The Apennines"]],
  scandes: ["Scandinavian Mountains", "EU", ["KJØLEN MOUNTAINS"], ["Scandes", "Kjølen", "Kjolen", "Kjølen Mountains"]],
  dinaric: ["Dinaric Alps", "EU", ["Dinaric Alps"], ["Dinarides"]],
  atlas: ["Atlas Mountains", "AF", ["ATLAS MOUNTAINS", "HAUT ATLAS", "Moyen Atlas", "Anti Atlas", "ATLAS SAHARIEN", "Atlas Tellien"], ["Atlas", "The Atlas"], true],
  drakensberg: ["Drakensberg", "AF", ["DRAKENSBERG"], ["Drakensberg Mountains", "uKhahlamba"]],
  ethiopian: ["Ethiopian Highlands", "AF", ["ETHIOPIAN HIGHLANDS"], ["Abyssinian Highlands", "Roof of Africa"]],
  rwenzori: ["Rwenzori Mountains", "AF", ["Ruwenzori Range"], ["Rwenzori", "Ruwenzori", "Mountains of the Moon"]],
  rockies: ["Rocky Mountains", "NA", ["ROCKY MOUNTAINS"], ["Rockies", "The Rockies"], true],
  appalachians: ["Appalachian Mountains", "NA", ["APPALACHIAN MTS."], ["Appalachians", "The Appalachians"]],
  sierranevada: ["Sierra Nevada", "NA", ["SIERRA NEVADA"], ["Sierra Nevada Mountains"]],
  cascades: ["Cascade Range", "NA", ["CASCADE RANGE"], ["Cascades", "The Cascades"]],
  alaskarange: ["Alaska Range", "NA", ["ALASKA RANGE"], []],
  sierramadre: ["Sierra Madre Occidental", "NA", ["SIERRA MADRE OCCIDENTAL"], ["Sierra Madre"]],
  andes: ["Andes", "SA", ["ANDES", "CORDILLERA OCCIDENTAL", "CORDILLERA ORIENTAL", "CORDILLERA  REAL", "CORD. CENTRAL", "CORD. OCCIDENTAL"], ["The Andes", "Andes Mountains", "Andean Mountains"], true],
  guiana: ["Guiana Highlands", "SA", ["GUIANA HIGHLANDS"], ["Guiana Shield"]],
  greatdividing: ["Great Dividing Range", "OC", ["GREAT DIVIDING RANGE"], ["Eastern Highlands", "The Great Divide"], true],
  australianalps: ["Australian Alps", "OC", ["Australian Alps"], ["Snowy Mountains", "The Snowies", "Victorian Alps"]],
  flinders: ["Flinders Ranges", "OC", ["Flinders Ranges"], ["Flinders Range", "Ikara"]],
  macdonnell: ["MacDonnell Ranges", "OC", ["MacDonnell Ranges"], ["MacDonnell Range", "Macdonnell Ranges", "Tjoritja"]],
  southernalps: ["Southern Alps", "OC", ["SOUTHERN ALPS"], ["Kā Tiritiri o te Moana", "Ka Tiritiri o te Moana"], true],
  newguinea: ["New Guinea Highlands", "OC", ["NEW GUINEA HIGHLANDS", "Maoke Mts."], ["Central Range", "Maoke Mountains"]],
};

const round = (n) => Math.round(n * 100) / 100;
const roundCoords = (c) => (typeof c[0] === "number" ? [round(c[0]), round(c[1])] : c.map(roundCoords));

// Drop points closer than ~0.03° to the previous one, to keep the file small.
function thin(ring) {
  if (typeof ring[0][0] !== "number") return ring.map(thin);
  const out = [ring[0]];
  for (const p of ring.slice(1, -1)) {
    const q = out[out.length - 1];
    if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) > 0.03) out.push(p);
  }
  out.push(ring[ring.length - 1]);
  return out;
}

/** d3 reads a ring wound the "wrong" way as the whole globe minus the shape; flip those. */
function fixWinding(polygon) {
  const area = geoArea({ type: "Polygon", coordinates: polygon });
  return area > 2 * Math.PI ? polygon.map((ring) => [...ring].reverse()) : polygon;
}

const regions = await load("ne_10m_geography_regions_polys");

const out = [];
const missing = [];
for (const [id, [name, region, sources, aliases, starter]] of Object.entries(PICKS)) {
  const feats = regions.features.filter(
    (f) => sources.includes(f.properties.NAME ?? f.properties.name) && /Range/.test(f.properties.FEATURECLA ?? f.properties.featurecla ?? ""),
  );
  if (!feats.length) {
    missing.push(name);
    continue;
  }
  const polygons = [];
  for (const f of feats) {
    const g = f.geometry;
    if (g.type === "Polygon") polygons.push(g.coordinates);
    else polygons.push(...g.coordinates);
  }
  out.push({
    id,
    name,
    region,
    aliases,
    starter: !!starter,
    geometry: { type: "MultiPolygon", coordinates: polygons.map((p) => fixWinding(roundCoords(thin(p)))) },
  });
}

fs.writeFileSync(new URL("../src/data/ranges.json", import.meta.url), JSON.stringify(out));
// A names-only copy, so the home page can count ranges without loading outlines.
const names = out.map(({ id, name, region, aliases, starter }) => ({ id, name, region, aliases, starter }));
fs.writeFileSync(new URL("../src/data/range-names.json", import.meta.url), JSON.stringify(names));
console.log(`Wrote ${out.length} ranges.`, missing.length ? `Not found: ${missing.join(", ")}` : "");
