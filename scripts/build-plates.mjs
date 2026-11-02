// Builds src/data/plates.json: the tectonic plates used by the "Earth & Sky" quiz (stage 2, "The
// plates"), cut down from Peter Bird's plate model.
//
// Credit (required): Plate boundaries: Peter Bird (2003), "An updated digital model of plate
// boundaries", via Hugo Ahlenius's tectonicplates collection (github.com/fraxen/tectonicplates),
// Open Data Commons Attribution License (ODC-BY 1.0).
//
// Run with:  node scripts/build-plates.mjs [path to a local PB2002_plates.json]
// Without a path it downloads the file from GitHub.
//
// What it does, in plain words:
// 1. Bird's model has 52 small and large plates. For teaching we want the twelve famous ones, so
//    several are joined to their big neighbour (the Okhotsk plate is part of "North American",
//    the Somali plate is part of "African", and so on). Everything else is lumped together as
//    "other" and drawn grey, not asked as a question.
// 2. Joined plates are NOT merged into one outline (that is hard to do well). Each teaching plate
//    is simply a list of its pieces. The quiz draws the pieces in one colour, so the borders
//    between them hardly show.
// 3. The outlines are made smaller: coordinates are rounded to a tenth of a degree, and points
//    that sit almost on a straight line are dropped (the Douglas-Peucker method).
// The quiz draws the shapes with d3-geo, which handles the date line (longitude 180) properly.
import fs from "node:fs";

const SRC = "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_plates.json";
const OUT = new URL("../src/data/plates.json", import.meta.url);

// teaching plate id -> Bird's plate codes
const MERGES = {
  pacific: ["PA"],
  northamerican: ["NA", "OK"],
  southamerican: ["SA", "AP", "ND"],
  eurasian: ["EU", "AM", "YA", "SU", "ON", "AT", "AS", "BU"],
  african: ["AF", "SO"],
  indoaustralian: ["AU", "IN", "CR"],
  antarctic: ["AN"],
  nazca: ["NZ"],
  arabian: ["AR"],
  philippine: ["PS"],
  cocos: ["CO"],
  caribbean: ["CA"],
};
const TOLERANCE = 0.14; // degrees: how far a dropped point may sit from the simplified line
const MAX_STEP = 7; // never leave a straight run longer than this many degrees
const round1 = (n) => Math.round(n * 10) / 10;

const raw = process.argv[2]
  ? JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
  : await fetch(SRC).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });

/** Distance from point p to the straight line a-b (in degrees, flat). */
function offLine(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (!len2) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Douglas-Peucker: keep the points that matter, drop the ones nearly on a line. */
function simplify(points, tol) {
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    let worst = -1, far = 0;
    for (let k = i + 1; k < j; k++) {
      const d = offLine(points[k], points[i], points[j]);
      if (d > far) { far = d; worst = k; }
    }
    const long = Math.hypot(points[j][0] - points[i][0], points[j][1] - points[i][1]) > MAX_STEP;
    if (worst < 0 && long && j - i > 1) worst = Math.floor((i + j) / 2);
    if (worst >= 0 && (far > tol || long)) {
      keep[worst] = true;
      stack.push([i, worst], [worst, j]);
    }
  }
  return points.filter((_, k) => keep[k]);
}

function ring(r, tol) {
  const pts = r.map((p) => [round1(p[0]), round1(p[1])]);
  // Rounding can repeat a point; drop repeats in a row.
  const clean = pts.filter((p, k) => k === 0 || p[0] !== pts[k - 1][0] || p[1] !== pts[k - 1][1]);
  const out = simplify(clean, tol);
  return out.length >= 4 ? out : null;
}

const plateOf = (code) => Object.keys(MERGES).find((id) => MERGES[id].includes(code)) ?? "other";
const parts = {};
for (const f of raw.features) {
  const id = plateOf(f.properties.Code);
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) {
    const rings = poly.map((r) => ring(r, id === "other" ? TOLERANCE * 1.6 : TOLERANCE));
    if (!rings[0]) continue; // too small to draw
    (parts[id] ??= []).push(rings.filter(Boolean));
  }
}

const plates = {};
for (const [id, polys] of Object.entries(parts)) plates[id] = { type: "MultiPolygon", coordinates: polys };
const missing = Object.keys(MERGES).filter((id) => !plates[id]);
if (missing.length) throw new Error(`No shapes for: ${missing.join(", ")}`);

const out = {
  credit: "Plate boundaries: Peter Bird (2003), 'An updated digital model of plate boundaries', via Hugo Ahlenius's tectonicplates collection, Open Data Commons Attribution License (ODC-BY 1.0).",
  plates,
};
fs.writeFileSync(OUT, JSON.stringify(out));
const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
const points = Object.values(plates).reduce((n, p) => n + JSON.stringify(p.coordinates).split("],[").length, 0);
console.log(`Wrote src/data/plates.json: ${Object.keys(plates).length} plates, ~${points} points, ${kb} KB`);
