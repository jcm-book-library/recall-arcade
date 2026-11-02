// The seven stages of Earth & Sky, a journey UP from the middle of the Earth to the clouds:
// the layers of the Earth, the plates, a volcano, the rock cycle, the water cycle, clouds and the
// air, and last of all weather and climate.
// Each stage is drawn on a 1000 x 560 view, like Inner Space and Infinity & Beyond.
//
// How the pieces are drawn:
// - Parts that are NOT questions (the sky, the ground, the sea, the labels on a scale) are drawn by
//   `drawEarthBackdrop` at the bottom of this file. Coastlines that sit on top of the questions are
//   drawn by `drawEarthOverlay`.
// - Each question is a ZoomItem. Most are "custom": a `draw` function builds the picture out of
//   paths, circles and lines. Parts that change colour once named use class "mark", with
//   `data-color` (the fill) or `data-stroke` (for lines). Plain decoration uses class "z-deco".
// - x and y are where the label hangs from. A label can have a thin leader line (`to`) to the part
//   it names, which appears once the part is named.
// - Stages 2 and 7 sit on a flat map of the world. That map (the plates and the coastlines) is
//   made by earthsky-world.ts, which loads before the game opens.
// - Everything except the plate shapes and coastlines is drawn in code. Nothing is copied.

import { el, type ZoomItem, type ZoomStage } from "../boards/zoomBoard";
import { WORLD, WX, ausXY, bigXY, latBand, lineThrough, smallXY } from "./earthsky-world";

export const EARTH_STAGES: ZoomStage[] = [
  { n: 1, title: "Inside the Earth", scale: "Across this view: the whole Earth, 12,742 km.", fact: "The inner core is about 5,200 °C, nearly as hot as the surface of the Sun, but the pressure squeezes it solid." },
  { n: 2, title: "The plates", scale: "The whole world, flattened onto a map.", fact: "Plates move about as fast as your fingernails grow. Australia is heading north at about 7 cm a year." },
  { n: 3, title: "A volcano", scale: "Across this view: about 10 km.", fact: "Melted rock underground is called magma. Once it comes out of the volcano, it's called lava." },
  { n: 4, title: "The rock cycle", scale: "Not to scale: rock takes millions of years to go round the cycle.", fact: "Uluru is sedimentary rock: sand laid down over 500 million years ago, pressed hard, then tipped on its side." },
  { n: 5, title: "The water cycle", scale: "Across this view: about 10 km of sea, land and sky.", fact: "Water keeps going round and round. Some of the water in your glass may once have been drunk by a dinosaur." },
  { n: 6, title: "Clouds and the air", scale: "Height not to scale: the bottom 12 km is stretched so you can see the clouds.", fact: "Almost all weather happens in the troposphere, the bottom layer. Jets cruise near its top, about 11 km up." },
  { n: 7, title: "Weather and climate", scale: "The whole world, flattened onto a map, plus a weather map.", fact: "On a weather map, a cold front has triangles and a warm front has half-circles. Highs usually bring fine weather, lows bring rain." },
];

/** Stages are played in order, straight up. */
export const EARTH_ORDER = [1, 2, 3, 4, 5, 6, 7];

// ---------- small drawing helpers ----------
type G = SVGGElement;
type Attrs = Record<string, string | number>;
type Pt = [number, number];

/** A filled shape that takes its real colour once named. */
const fillMark = (g: G, tag: "circle" | "ellipse" | "path" | "rect" | "polygon", attrs: Attrs, color: string) =>
  el(tag, { ...attrs, class: attrs.class ? `mark ${attrs.class}` : "mark", "data-color": color }, g);

/** A line-shaped marker (a river, an arrow). Rounded ends; takes its colour once named. */
const lineMark = (g: G, d: string, width: number, color: string, cls = "") =>
  el("path", { d, class: `mark line ${cls}`, "data-stroke": color, style: `stroke-width:${width}px` }, g);

/** Decoration that never changes. `cls` picks the look. */
const deco = (g: G, tag: "circle" | "ellipse" | "path" | "rect" | "line" | "polygon", attrs: Attrs, cls = "z-deco") => el(tag, { ...attrs, class: cls }, g);

/** An invisible, easy-to-hit stroke along a path, so thin things are simple to click. */
const hitLine = (g: G, d: string, width: number) => el("path", { d, class: "hit", style: `stroke-width:${width}px` }, g);

/** Small text on the picture that is not a question (a height, a note). */
const note = (g: G, x: number, y: number, text: string, cls = "z-small z-centre") => {
  el("text", { x, y, class: cls }, g).textContent = text;
};

const pts = (list: Pt[]) => list.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

/** A point on a curve with one bend (a "quadratic Bezier"), for t from 0 to 1. */
const bend = (a: Pt, c: Pt, b: Pt, t: number): Pt => [
  (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
  (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
];
/** The part of such a curve between two values of t, as a list of points. */
const bendPoints = (a: Pt, c: Pt, b: Pt, from: number, to: number, steps = 14): Pt[] =>
  Array.from({ length: steps + 1 }, (_, i) => bend(a, c, b, from + ((to - from) * i) / steps));

/** A little puff-of-cloud made of circles. Each circle is [x, y, radius]. */
const puffs = (g: G, list: [number, number, number][], color: string, unnamed: string) => {
  // No outline, so the circles join up into one soft cloud.
  for (const [x, y, r] of list) fillMark(g, "circle", { cx: x, cy: y, r, class: "mark puff", style: `--unnamed:${unnamed}` }, color);
};

/** An arrow from one point to another: a line, with a triangle at the tip. */
function arrow(g: G, from: Pt, to: Pt, color: string, width = 9) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const head = 20;
  lineMark(g, `M${from[0]} ${from[1]} L${to[0] - ux * (head - 4)} ${to[1] - uy * (head - 4)}`, width, color);
  // Two corners of the triangle sit either side of the line, a little way back from the tip.
  const bx = to[0] - ux * head;
  const by = to[1] - uy * head;
  const px = -uy * (head * 0.55);
  const py = ux * (head * 0.55);
  fillMark(g, "polygon", { points: `${to[0]},${to[1]} ${bx + px},${by + py} ${bx - px},${by - py}` }, color);
  hitLine(g, `M${from[0]} ${from[1]} L${to[0]} ${to[1]}`, 26);
}

// =====================================================================================
// 1. Inside the Earth
// =====================================================================================
// A half disc, cut through the middle. Real sizes (radius 6,371 km) are drawn at 400 px, so 1 px
// is about 16 km: the mantle is about 2,900 km thick, the outer core about 2,200 km, and the
// inner core has a radius of about 1,220 km. The crust is only 5 to 70 km thick, which would be
// under 3 px, so it is drawn about 5 times too thick.
const CX = 500;
const CY = 505;
const R_SURFACE = 400;
const R_CRUST = 390;
const R_MANTLE = 219; // (6,371 - 2,890) km
const R_OUTER = 77; // 1,220 km

/** The top half of a ring (or of a disc, when r2 is 0). */
const halfRing = (r1: number, r2: number) =>
  r2 === 0
    ? `M${CX - r1} ${CY} A${r1} ${r1} 0 0 1 ${CX + r1} ${CY} Z`
    : `M${CX - r1} ${CY} A${r1} ${r1} 0 0 1 ${CX + r1} ${CY} L${CX + r2} ${CY} A${r2} ${r2} 0 0 0 ${CX - r2} ${CY} Z`;
/** A point on the disc, by angle (degrees from the right, going up) and distance from the middle. */
const onDisc = (deg: number, r: number): Pt => [CX + r * Math.cos((deg * Math.PI) / 180), CY - r * Math.sin((deg * Math.PI) / 180)];

const INSIDE: ZoomItem[] = [
  {
    id: "crust", name: "Crust", aliases: ["the crust", "continental crust", "oceanic crust"], stage: 1, shape: "custom",
    x: 130, y: 128, label: "above", gap: 0, to: onDisc(140, 395),
    draw: (g) => fillMark(g, "path", { d: halfRing(R_SURFACE, R_CRUST), style: "--unnamed:#6d5a49" }, "#a47a4f"),
  },
  {
    id: "mantle", name: "Mantle", aliases: ["the mantle", "upper mantle", "lower mantle"], stage: 1, shape: "custom",
    x: 500, y: 196, label: "below", gap: 0,
    draw: (g) => fillMark(g, "path", { d: halfRing(R_CRUST, R_MANTLE), style: "--unnamed:#7b5448" }, "#d2602f"),
  },
  {
    id: "outercore", name: "Outer core", aliases: ["liquid core", "the outer core"], stage: 1, shape: "custom",
    x: 500, y: 336, label: "below", gap: 0,
    draw: (g) => fillMark(g, "path", { d: halfRing(R_MANTLE, R_OUTER), style: "--unnamed:#8a6a45" }, "#f2a02e"),
  },
  {
    id: "innercore", name: "Inner core", aliases: ["solid core", "the inner core"], stage: 1, shape: "custom",
    x: 500, y: 462, label: "below", gap: 0,
    draw: (g) => fillMark(g, "path", { d: halfRing(R_OUTER, 0), style: "--unnamed:#94804f" }, "#ffd966"),
  },
];

// =====================================================================================
// 2. The plates
// =====================================================================================
// [muted colour while unnamed, colour once named]. Neighbours get different hues so the edges show.
const PLATE_COLORS: Record<string, [string, string]> = {
  pacific: ["#4d6f8f", "#3f9bdc"],
  northamerican: ["#7d7656", "#e0b84a"],
  southamerican: ["#5f8465", "#4cc26b"],
  eurasian: ["#86666f", "#e0607a"],
  african: ["#96794f", "#f08a3c"],
  indoaustralian: ["#77689a", "#a76de0"],
  antarctic: ["#7f98a4", "#bfe8f5"],
  nazca: ["#94705a", "#d9784e"],
  arabian: ["#8c8a52", "#d6d84a"],
  philippine: ["#5f9190", "#38cfc0"],
  cocos: ["#98667a", "#f06ab8"],
  caribbean: ["#6a8e9a", "#50c8f0"],
};

/** One plate: its shape is drawn when the board opens, from the data loaded by earthsky-world.ts. */
const plate = (id: string, name: string, aliases: string[], x: number, y: number, rest: Partial<ZoomItem> = {}): ZoomItem => ({
  id, name, aliases, stage: 2, shape: "custom", x, y, label: "below", gap: 0, ...rest,
  draw: (g) => {
    const [muted, found] = PLATE_COLORS[id];
    // The outline matches the fill, so the borders between the pieces of one plate barely show.
    el("path", { d: WORLD.plates[id], class: "mark plate", "data-color": found, "data-stroke": found, style: `--unnamed:${muted}` }, g);
  },
});

// The Ring of Fire follows the edge of the Pacific. It crosses the date line twice, so it is drawn
// in four pieces: the far east of the map, the far west, the Indonesian arc, and Tonga.
const RING_PIECES: Pt[][] = [
  [[-180, 51.5], [-172, 52.5], [-162, 54.5], [-154, 58], [-148, 60.5], [-141, 60], [-135, 56], [-130, 51], [-125, 48], [-124.5, 42], [-122, 37], [-118, 33.5], [-114, 28], [-108, 23], [-105, 19.5], [-98, 16.2], [-92, 14.2], [-87, 12.6], [-84, 10.5], [-81, 8], [-79, 5], [-80, 0], [-81, -4], [-79, -9], [-76, -13.5], [-72, -17.5], [-70.5, -25], [-71.5, -33], [-73, -40], [-74, -46], [-74, -52]],
  [[180, 51.5], [172, 53], [165, 55.5], [160, 53.5], [156, 50], [150, 46.5], [145, 43.5], [142, 39.5], [140, 36], [136, 34], [131, 31.5], [128, 27.5], [124, 23], [121.5, 18], [122, 13], [125.5, 8], [127, 3], [130, -2], [135, -3.5], [141, -3], [147, -5.5], [152, -5], [156, -6.5], [160, -9], [166, -15], [170, -21], [176, -25], [178.5, -30], [178.5, -35], [177, -38.5], [174, -41.5], [167, -45.5]],
  [[95, 5.5], [98, 2], [101, -1.5], [104, -5], [107, -7], [111, -8.4], [115, -8.7], [120, -8.8], [124, -8.2], [128, -6.5], [131, -4], [135, -3.5]],
  [[-179, -37], [-178, -31], [-176.5, -25], [-175, -20], [-174, -16]],
];

// The order here is the order they are drawn in, so a label is never hidden by a plate drawn after it.
const PLATES: ZoomItem[] = [
  plate("pacific", "Pacific Plate", ["Pacific"], 108, 336),
  plate("antarctic", "Antarctic Plate", ["Antarctic"], 505, 517),
  plate("eurasian", "Eurasian Plate", ["Eurasian"], 680, 120),
  plate("northamerican", "North American Plate", ["North American"], 302, 150),
  plate("african", "African Plate", ["African"], 540, 288),
  plate("indoaustralian", "Indo-Australian Plate", ["Australian Plate", "Indian Plate", "Indo-Australian", "Australian", "Indian"], 790, 395, { to: [830, 345] }),
  plate("southamerican", "South American Plate", ["South American"], 430, 452, { to: [350, 385] }),
  plate("nazca", "Nazca Plate", ["Nazca"], 262, 392),
  plate("arabian", "Arabian Plate", ["Arabian"], 676, 262, { label: "right", gap: 10, to: [626, 226] }),
  plate("philippine", "Philippine Sea Plate", ["Philippine"], 905, 188, { label: "above", to: [852, 224] }),
  plate("cocos", "Cocos Plate", ["Cocos"], 160, 274, { label: "left", gap: 8, to: [242, 266] }),
  plate("caribbean", "Caribbean Plate", ["Caribbean"], 318, 205, { to: [308, 247] }),
  {
    id: "ringoffire", name: "Ring of Fire", aliases: ["the Ring of Fire", "Pacific Ring of Fire"], stage: 2, shape: "custom",
    x: 92, y: 222, label: "below", gap: 0, to: bigXY(-122, 37),
    draw: (g) => {
      for (const piece of RING_PIECES) {
        const d = lineThrough(bigXY, piece);
        lineMark(g, d, 9, "#ff7a2e", "fire");
        hitLine(g, d, 22);
      }
    },
  },
];

// =====================================================================================
// 3. A volcano (cut away)
// =====================================================================================
// The mountain's two sides curve like a ski jump. The left side is the mirror of the right.
const RIGHT_FLANK = { from: [556, 118] as Pt, bend: [604, 205] as Pt, to: [1000, 292] as Pt };
const LEFT_FLANK = { from: [444, 118] as Pt, bend: [396, 205] as Pt, to: [0, 292] as Pt };
const GROUND = `M0 292 Q${LEFT_FLANK.bend.join(" ")} ${LEFT_FLANK.from.join(" ")} L470 144 L530 144 L${RIGHT_FLANK.from.join(" ")} Q${RIGHT_FLANK.bend.join(" ")} 1000 292 L1000 560 L0 560 Z`;
const SIDE_VENT_TOP = bend(RIGHT_FLANK.from, RIGHT_FLANK.bend, RIGHT_FLANK.to, 0.62);

const VOLCANO: ZoomItem[] = [
  {
    id: "magmachamber", name: "Magma chamber", aliases: ["chamber"], stage: 3, shape: "custom", x: 500, y: 470, label: "below", gap: 0,
    draw: (g) =>
      fillMark(g, "path", { d: "M340 482 Q326 432 400 420 Q450 406 500 412 Q560 405 610 420 Q676 436 662 486 Q640 538 560 532 Q500 542 430 534 Q356 532 340 482 Z", style: "--unnamed:#8a5a4a" }, "#ff5a1f"),
  },
  {
    id: "vent", name: "Vent", aliases: ["main vent", "conduit", "pipe"], stage: 3, shape: "custom", x: 330, y: 300, label: "left", gap: 10, to: [488, 300],
    draw: (g) => fillMark(g, "path", { d: "M486 424 L489 146 L511 146 L514 424 Z", style: "--unnamed:#8a6a55" }, "#ff7a2a"),
  },
  {
    id: "crater", name: "Crater", stage: 3, shape: "custom", x: 330, y: 106, label: "left", gap: 10, to: [462, 128],
    draw: (g) => {
      // The bowl at the top of the mountain.
      fillMark(g, "path", { d: "M438 112 L470 144 L530 144 L562 112 Z", style: "--unnamed:#7a5a4a" }, "#8a2f22");
      lineMark(g, "M444 118 L470 144 L530 144 L556 118", 5, "#c0482e");
    },
  },
  {
    id: "lava", name: "Lava", aliases: ["lava flow"], stage: 3, shape: "custom", x: 760, y: 150, label: "right", gap: 10, to: bend(RIGHT_FLANK.from, RIGHT_FLANK.bend, RIGHT_FLANK.to, 0.32),
    draw: (g) => {
      // A glowing pool in the crater, a river of lava down each side of the cone.
      fillMark(g, "ellipse", { cx: 500, cy: 140, rx: 24, ry: 6 }, "#ffa42b");
      const right = pts(bendPoints(RIGHT_FLANK.from, RIGHT_FLANK.bend, RIGHT_FLANK.to, 0, 0.5).map(([x, y]) => [x + 1, y - 3] as Pt));
      const left = pts(bendPoints(LEFT_FLANK.from, LEFT_FLANK.bend, LEFT_FLANK.to, 0, 0.22).map(([x, y]) => [x - 1, y - 3] as Pt));
      lineMark(g, right, 11, "#ff9a1f");
      lineMark(g, left, 9, "#ff9a1f");
      hitLine(g, right, 24);
    },
  },
  {
    id: "ashcloud", name: "Ash cloud", aliases: ["ash", "ash plume", "eruption column", "plume"], stage: 3, shape: "custom", x: 395, y: 52, label: "left", gap: 10,
    draw: (g) =>
      puffs(g, [[500, 102, 15], [498, 82, 19], [505, 60, 24], [545, 44, 28], [462, 44, 26], [590, 52, 22], [420, 54, 20], [510, 26, 24], [560, 20, 20], [470, 22, 18]], "#8d8681", "#6b6870"),
  },
  {
    id: "sidevent", name: "Side vent", aliases: ["secondary vent"], stage: 3, shape: "custom", x: 840, y: 330, label: "right", gap: 10, to: [SIDE_VENT_TOP[0], SIDE_VENT_TOP[1] + 4],
    draw: (g) => {
      const d = `M512 372 Q650 346 ${SIDE_VENT_TOP[0]} ${SIDE_VENT_TOP[1] + 6}`;
      lineMark(g, d, 11, "#ff7a2a");
      hitLine(g, d, 26);
      // A small bump on the slope where it opens, and a splash of lava.
      fillMark(g, "circle", { cx: SIDE_VENT_TOP[0], cy: SIDE_VENT_TOP[1] - 2, r: 9 }, "#ffa42b");
    },
  },
];

// =====================================================================================
// 4. The rock cycle
// =====================================================================================
// Four stations at the corners of a square, and an arrow for each process. Each station is a
// rounded box 230 wide and 100 tall. The thin crossing arrows are the shortcuts: igneous rock can
// be squeezed straight into metamorphic rock, and sedimentary rock can melt straight to magma.
const BOX_W = 230;
const BOX_H = 100;
const STATION = {
  igneous: [190, 150] as Pt,
  sedimentary: [810, 150] as Pt,
  magma: [190, 420] as Pt,
  metamorphic: [810, 420] as Pt,
};

/** A rounded box for a rock station. The texture on top says what kind of rock it is. */
function station(g: G, [cx, cy]: Pt, color: string, unnamed: string, texture: (x: number, y: number) => void) {
  const x = cx - BOX_W / 2;
  const y = cy - BOX_H / 2;
  fillMark(g, "rect", { x, y, width: BOX_W, height: BOX_H, rx: 22, style: `--unnamed:${unnamed}` }, color);
  texture(x, y);
}

const ROCK_CYCLE: ZoomItem[] = [
  {
    id: "igneous", name: "Igneous rock", aliases: ["igneous"], stage: 4, shape: "custom", x: STATION.igneous[0], y: STATION.igneous[1], label: "below", gap: 0,
    draw: (g) =>
      station(g, STATION.igneous, "#6b6d7a", "#6e6a70", (x, y) => {
        // Crystals: small, tightly packed speckles.
        for (const [dx, dy] of [[28, 20], [70, 70], [110, 26], [160, 76], [200, 30], [40, 52], [190, 62], [128, 80], [86, 40], [22, 80]]) {
          deco(g, "polygon", { points: `${x + dx},${y + dy - 6} ${x + dx + 6},${y + dy} ${x + dx},${y + dy + 6} ${x + dx - 6},${y + dy}` }, "z-crystal");
        }
      }),
  },
  {
    id: "sedimentary", name: "Sedimentary rock", aliases: ["sedimentary"], stage: 4, shape: "custom", x: STATION.sedimentary[0], y: STATION.sedimentary[1], label: "below", gap: 0,
    draw: (g) =>
      station(g, STATION.sedimentary, "#d4a86a", "#8a7358", (x, y) => {
        // Layers of sand and mud, one on top of the other.
        for (const dy of [24, 42, 60, 78]) deco(g, "path", { d: `M${x + 14} ${y + dy} q50 -6 100 0 t100 0` }, "z-layer");
      }),
  },
  {
    id: "metamorphic", name: "Metamorphic rock", aliases: ["metamorphic"], stage: 4, shape: "custom", x: STATION.metamorphic[0], y: STATION.metamorphic[1], label: "below", gap: 0,
    draw: (g) =>
      station(g, STATION.metamorphic, "#9b6fa8", "#7d6482", (x, y) => {
        // Bands that have been squeezed and folded.
        for (const dy of [26, 44, 62, 80]) deco(g, "path", { d: `M${x + 14} ${y + dy} q25 -16 50 0 t50 0 t50 0 t50 0` }, "z-layer");
      }),
  },
  {
    id: "magma", name: "Magma", stage: 4, shape: "custom", x: STATION.magma[0], y: STATION.magma[1], label: "below", gap: 0,
    draw: (g) =>
      station(g, STATION.magma, "#ff6a2a", "#8c5a45", (x, y) => {
        // Bubbles.
        for (const [dx, dy, r] of [[34, 70, 7], [64, 30, 5], [190, 66, 8], [158, 24, 6], [210, 34, 4]]) deco(g, "circle", { cx: x + dx, cy: y + dy, r }, "z-bubble");
      }),
  },
  {
    id: "cooling", name: "Cooling", aliases: ["cooling and hardening", "crystallisation", "crystallization"], stage: 4, shape: "custom", x: 190, y: 288, label: "right", gap: 14,
    draw: (g) => arrow(g, [190, 366], [190, 208], "#5fb4f0"),
  },
  {
    id: "erosion", name: "Erosion", aliases: ["weathering", "weathering and erosion"], stage: 4, shape: "custom", x: 500, y: 150, label: "above", gap: 22,
    draw: (g) => {
      arrow(g, [308, 150], [690, 150], "#d9b26f");
      // The sediment that wears off the rock: a little heap, under the arrow.
      deco(g, "path", { d: "M462 190 Q482 166 500 166 Q518 166 538 190 Z" }, "z-heap");
    },
  },
  {
    id: "pressure", name: "Heat and pressure", aliases: ["pressure"], stage: 4, shape: "custom", x: 792, y: 286, label: "left", gap: 6,
    draw: (g) => {
      arrow(g, [810, 206], [810, 366], "#e8704a");
      // The shortcut: igneous rock squeezed straight into metamorphic rock.
      const d = "M300 196 L684 392";
      lineMark(g, d, 4, "#e8704a", "shortcut");
      hitLine(g, d, 22);
    },
  },
  {
    id: "melting", name: "Melting", aliases: ["melt"], stage: 4, shape: "custom", x: 500, y: 420, label: "above", gap: 22,
    draw: (g) => {
      arrow(g, [692, 420], [310, 420], "#ff9a3c");
      // The shortcut: sedimentary rock can melt too.
      const d = "M700 196 L316 380";
      lineMark(g, d, 4, "#ff9a3c", "shortcut");
      hitLine(g, d, 22);
    },
  },
];

// =====================================================================================
// 5. The water cycle
// =====================================================================================
// The mountain's left slope, used again for the rain and the river.
const MOUNTAIN = "M400 342 L470 338 Q560 334 640 244 L770 112 L825 152 L885 232 Q950 292 1000 304 L1000 560 L400 560 Z";

/** A wavy line going up, like heat shimmer, with an arrowhead on top. */
function risingArrow(g: G, x: number, y: number, rise: number, color: string) {
  const waves = Math.round(rise / 26);
  const d = `M${x} ${y} q9 -13 0 -26 ${"t0 -26 ".repeat(waves - 1)}`;
  const top = y - waves * 26;
  lineMark(g, d, 5, color);
  fillMark(g, "polygon", { points: `${x},${top - 14} ${x - 9},${top + 4} ${x + 9},${top + 4}` }, color);
  hitLine(g, `M${x} ${y} L${x} ${top}`, 26);
}

const WATER: ZoomItem[] = [
  {
    id: "evaporation", name: "Evaporation", aliases: ["evaporate"], stage: 5, shape: "custom", x: 200, y: 246, label: "above", gap: 22,
    draw: (g) => {
      for (const x of [110, 200, 290]) risingArrow(g, x, 332, 78, "#8fd3ff");
    },
  },
  {
    id: "transpiration", name: "Transpiration", aliases: ["transpire"], stage: 5, shape: "custom", x: 478, y: 262, label: "left", gap: 6,
    draw: (g) => {
      for (const x of [496, 535, 574]) risingArrow(g, x, 288, 52, "#7fe0a8");
    },
  },
  {
    id: "condensation", name: "Condensation", aliases: ["condense"], stage: 5, shape: "custom", x: 630, y: 70, label: "below", gap: 0,
    draw: (g) =>
      puffs(g, [[520, 98, 26], [564, 80, 34], [616, 66, 40], [668, 74, 36], [716, 88, 30], [756, 100, 22], [584, 108, 28], [646, 104, 30], [696, 108, 26]], "#eef4ff", "#c4cfdf"),
  },
  {
    id: "precipitation", name: "Precipitation", aliases: ["rain", "snow", "rainfall"], stage: 5, shape: "custom", x: 524, y: 178, label: "left", gap: 6,
    draw: (g) => {
      // Streaks of rain, each leaning a little. Three rows, shorter toward the hill so none lands in the rock.
      const rows: [number, number][] = [[132, 700], [172, 662], [214, 622]];
      for (const [y0, xMax] of rows) {
        for (let x = 548 + (y0 % 16); x <= xMax; x += 21) lineMark(g, `M${x} ${y0} l-9 34`, 4, "#5aa5ff");
      }
      // A little snow on the peak.
      for (const [x, y] of [[742, 122], [768, 100], [790, 130], [760, 148]]) fillMark(g, "circle", { cx: x, cy: y, r: 4.5 }, "#ffffff");
    },
  },
  {
    id: "runoff", name: "Runoff", aliases: ["surface runoff", "run-off"], stage: 5, shape: "custom", x: 520, y: 372, label: "below", gap: 0, to: [548, 328],
    draw: (g) => {
      const d = "M742 142 L700 190 L655 232 Q600 300 530 331 L450 341 L404 344";
      lineMark(g, d, 7, "#4aa3e0");
      hitLine(g, d, 24);
    },
  },
  {
    id: "groundwater", name: "Groundwater", aliases: ["ground water", "infiltration"], stage: 5, shape: "custom", x: 700, y: 508, label: "below", gap: 0,
    draw: (g) => {
      // Water soaking down into the rock, and the underground water that fills the gaps.
      fillMark(g, "path", { d: "M404 478 Q520 456 640 470 Q780 486 900 462 L1000 458 L1000 556 L404 556 Z", style: "--unnamed:#6b7b8c" }, "#2f7fc4");
      for (const x of [560, 640, 760, 880]) lineMark(g, `M${x} 358 L${x} 440`, 4, "#4aa3e0", "dotted");
    },
  },
];

// =====================================================================================
// 6. Clouds and the air
// =====================================================================================
// Heights are NOT to scale. Going up from the ground (y = 530):
//   troposphere   0-12 km    y 530 to 270   stretched: about 22 px a kilometre
//   stratosphere  12-50 km   y 270 to 170   about 2.6 px a kilometre
//   mesosphere    50-85 km   y 170 to 105   about 1.9 px a kilometre
//   thermosphere  85 km up   y 105 to 12    squeezed hard (the Space Station is at 400 km)
const Y_GROUND = 530;
const Y_TROPOPAUSE = 270;
const Y_STRATOPAUSE = 170;
const Y_MESOPAUSE = 105;
const Y_TOP = 12;
const band = (yTop: number, yBottom: number) => `M0 ${yTop} L1000 ${yTop} L1000 ${yBottom} L0 ${yBottom} Z`;

const SKY: ZoomItem[] = [
  {
    id: "troposphere", name: "Troposphere", stage: 6, shape: "custom", x: 975, y: 425, label: "left", gap: 0,
    draw: (g) => fillMark(g, "path", { d: band(Y_TROPOPAUSE, Y_GROUND), class: "layer" }, "rgba(120, 200, 255, 0.28)"),
  },
  {
    id: "stratosphere", name: "Stratosphere", stage: 6, shape: "custom", x: 975, y: 222, label: "left", gap: 0,
    draw: (g) => fillMark(g, "path", { d: band(Y_STRATOPAUSE, Y_TROPOPAUSE) }, "rgba(110, 120, 230, 0.34)"),
  },
  {
    // The ozone layer is INSIDE the stratosphere (about 15 to 35 km), so it's a stripe within that band.
    id: "ozone", name: "Ozone layer", aliases: ["ozone"], stage: 6, shape: "custom", x: 640, y: 236, label: "right", gap: 8,
    // It stops short of the right-hand side, so you can see the stratosphere around it.
    draw: (g) => fillMark(g, "path", { d: `M0 ${Y_TROPOPAUSE - 23 * 2.6} L620 ${Y_TROPOPAUSE - 23 * 2.6} Q640 ${Y_TROPOPAUSE - 13 * 2.6} 620 ${Y_TROPOPAUSE - 3 * 2.6} L0 ${Y_TROPOPAUSE - 3 * 2.6} Z` }, "rgba(192, 130, 240, 0.55)"),
  },
  {
    id: "mesosphere", name: "Mesosphere", stage: 6, shape: "custom", x: 975, y: 140, label: "left", gap: 0,
    draw: (g) => fillMark(g, "path", { d: band(Y_MESOPAUSE, Y_STRATOPAUSE) }, "rgba(90, 150, 240, 0.34)"),
  },
  {
    id: "thermosphere", name: "Thermosphere", stage: 6, shape: "custom", x: 975, y: 66, label: "left", gap: 0,
    draw: (g) => fillMark(g, "path", { d: band(Y_TOP - 12, Y_MESOPAUSE) }, "rgba(60, 200, 190, 0.3)"),
  },
  {
    id: "cumulus", name: "Cumulus", aliases: ["cumulus cloud"], stage: 6, shape: "custom", x: 185, y: 433, label: "above", gap: 0,
    draw: (g) => puffs(g, [[120, 482, 20], [160, 466, 28], [205, 460, 32], [248, 474, 24], [180, 484, 26], [226, 486, 22]], "#ffffff", "#cdd3df"),
  },
  {
    id: "stratus", name: "Stratus", aliases: ["stratus cloud"], stage: 6, shape: "custom", x: 435, y: 442, label: "above", gap: 0,
    draw: (g) => {
      // A flat grey sheet in a few layers.
      for (const [y, w] of [[466, 250], [480, 270], [494, 240]]) fillMark(g, "rect", { x: 435 - w / 2, y: y - 7, width: w, height: 14, rx: 7, class: "puff", style: "--unnamed:#a4a9b6" }, "#b9bec8");
    },
  },
  {
    id: "cirrus", name: "Cirrus", aliases: ["cirrus cloud"], stage: 6, shape: "custom", x: 400, y: 297, label: "above", gap: 0,
    draw: (g) => {
      // Thin wisps, like brush strokes, high up.
      for (const [x, y, w] of [[290, 330, 150], [340, 314, 170], [410, 334, 150], [470, 320, 110]]) {
        const d = `M${x} ${y} q${w * 0.4} -20 ${w * 0.8} -4 q${w * 0.1} 4 ${w * 0.2} 10`;
        lineMark(g, d, 6, "#f4f8ff");
        hitLine(g, d, 20);
      }
    },
  },
  {
    id: "cumulonimbus", name: "Cumulonimbus", aliases: ["thunderstorm cloud", "storm cloud"], stage: 6, shape: "custom", x: 590, y: 400, label: "left", gap: 4,
    draw: (g) => {
      // A tall tower with a flat anvil on top, where it hits the top of the troposphere.
      const grey = "#dde1ea";
      const unnamed = "#c3c8d3";
      fillMark(g, "rect", { x: 664, y: 300, width: 76, height: 190, class: "puff", style: `--unnamed:${unnamed}` }, grey);
      puffs(g, [[664, 468, 30], [740, 468, 30], [676, 418, 26], [730, 418, 26], [672, 368, 24], [732, 368, 24], [676, 326, 22], [728, 326, 22], [702, 470, 34]], grey, unnamed);
      fillMark(g, "path", { d: "M560 296 Q620 268 700 274 Q790 268 842 296 Q790 320 700 314 Q620 320 560 296 Z", class: "puff", style: `--unnamed:${unnamed}` }, grey);
      puffs(g, [[640, 286, 16], [700, 272, 22], [764, 286, 16]], grey, unnamed);
      // The dark flat base.
      fillMark(g, "rect", { x: 650, y: 490, width: 104, height: 14, rx: 7, style: "--unnamed:#6d7384" }, "#6d7384");
    },
  },
];

// =====================================================================================
// 7. Weather and climate
// =====================================================================================
const CAPRICORN = -23.4;
const climateBand = (south: number, north: number) => latBand(smallXY, south, north);

// A weather map's fronts, and the marks along them.
const COLD_FRONT: Pt[] = [[144, -43], [141, -36], [137, -28], [134, -19]];
const WARM_FRONT: Pt[] = [[148, -43], [154, -40], [159, -35], [162, -28]];
const HIGH_AT: Pt = [124, -33];
const LOW_AT: Pt = [146, -43.5];

/** A smooth curve through a few places on the weather map, as a list of x, y points. */
function frontPoints(places: Pt[]): Pt[] {
  const p = places.map(([lon, lat]) => ausXY(lon, lat));
  const out: Pt[] = [];
  // Catmull-Rom spline: a smooth line that passes through every point.
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)];
    const b = p[i];
    const c = p[i + 1];
    const d = p[Math.min(p.length - 1, i + 2)];
    for (let s = 0; s < 12; s++) {
      const t = s / 12;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * b[0] + (-a[0] + c[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 + (-a[0] + 3 * b[0] - 3 * c[0] + d[0]) * t3),
        0.5 * (2 * b[1] + (-a[1] + c[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 + (-a[1] + 3 * b[1] - 3 * c[1] + d[1]) * t3),
      ]);
    }
  }
  out.push(p[p.length - 1]);
  return out;
}

/** Marks every `gap` pixels along a line: calls `put` with the spot and the direction the line is heading. */
function alongLine(line: Pt[], gap: number, put: (x: number, y: number, ux: number, uy: number) => void) {
  let next = gap * 0.6;
  let run = 0;
  for (let i = 1; i < line.length; i++) {
    const dx = line[i][0] - line[i - 1][0];
    const dy = line[i][1] - line[i - 1][1];
    const len = Math.hypot(dx, dy);
    if (!len) continue;
    while (run + len >= next) {
      const f = (next - run) / len;
      put(line[i - 1][0] + dx * f, line[i - 1][1] + dy * f, dx / len, dy / len);
      next += gap;
    }
    run += len;
  }
}

const WEATHER_CLIP = "es-weather-clip";
/** A group inside an item that cuts off whatever sticks out of the weather map (the item's label stays outside it). */
const clipped = (g: G) => el("g", { "clip-path": `url(#${WEATHER_CLIP})` }, g);

/** The rings round a high or a low: lines of equal air pressure, called isobars. */
function isobars(g: G, [lon, lat]: Pt, radii: number[], color: string) {
  const [x, y] = ausXY(lon, lat);
  for (const r of radii) lineMark(g, `M${x - r} ${y} a${r} ${r * 0.78} 0 1 0 ${r * 2} 0 a${r} ${r * 0.78} 0 1 0 ${-r * 2} 0`, 2.5, color, "isobar");
}

const COLD_LINE = frontPoints(COLD_FRONT);
const WARM_LINE = frontPoints(WARM_FRONT);
const lastOf = (line: Pt[]): Pt => line[line.length - 1];

/** Which way a front is heading: the side of the line that faces east. Returns the push and the arc direction. */
function eastSide(ux: number, uy: number) {
  const flip = -uy < 0; // (-uy, ux) points west, so use the other side
  return { nx: flip ? uy : -uy, ny: flip ? -ux : ux, sweep: flip ? 1 : 0 };
}

const CLIMATE: ZoomItem[] = [
  {
    id: "tropical", name: "Tropical zone", aliases: ["tropical", "tropics"], stage: 7, shape: "custom", x: smallXY(-28, 7)[0], y: smallXY(-28, 7)[1], label: "below", gap: 0,
    draw: (g) => fillMark(g, "path", { d: climateBand(-23.4, 23.4), class: "zone" }, "rgba(34, 170, 96, 0.62)"),
  },
  {
    id: "dry", name: "Dry zone", aliases: ["dry", "desert zone", "arid zone", "desert"], stage: 7, shape: "custom", x: smallXY(-45, 29)[0], y: smallXY(-45, 29)[1], label: "below", gap: 0,
    draw: (g) => fillMark(g, "path", { d: `${climateBand(23.4, 35)} ${climateBand(-35, -23.4)}`, class: "zone" }, "rgba(236, 190, 80, 0.7)"),
  },
  {
    id: "temperate", name: "Temperate zone", aliases: ["temperate"], stage: 7, shape: "custom", x: smallXY(-35, 48)[0], y: smallXY(-35, 48)[1], label: "below", gap: 0,
    draw: (g) => fillMark(g, "path", { d: `${climateBand(35, 63)} ${climateBand(-63, -35)}`, class: "zone" }, "rgba(150, 205, 90, 0.62)"),
  },
  {
    id: "polar", name: "Polar zone", aliases: ["polar"], stage: 7, shape: "custom", x: smallXY(0, 76)[0], y: smallXY(0, 76)[1], label: "below", gap: 0,
    draw: (g) => fillMark(g, "path", { d: `${climateBand(63, 90)} ${climateBand(-90, -63)}`, class: "zone" }, "rgba(205, 236, 250, 0.8)"),
  },
  {
    id: "equator", name: "Equator", aliases: ["the equator"], stage: 7, shape: "custom", x: smallXY(-150, 0)[0], y: smallXY(-150, 0)[1] - 13, label: "above", gap: 0,
    draw: (g) => {
      const d = lineThrough(smallXY, [[-180, 0], [180, 0]]);
      lineMark(g, d, 3, "#ffffff", "parallel");
      hitLine(g, d, 18);
    },
  },
  {
    id: "capricorn", name: "Tropic of Capricorn", aliases: ["Capricorn"], stage: 7, shape: "custom", x: smallXY(-100, CAPRICORN)[0], y: smallXY(-100, CAPRICORN)[1] + 13, label: "below", gap: 0,
    draw: (g) => {
      const d = lineThrough(smallXY, [[-180, CAPRICORN], [180, CAPRICORN]]);
      lineMark(g, d, 3, "#ffe08a", "parallel");
      hitLine(g, d, 18);
    },
  },
  {
    // The weather-map labels sit just above and below the weather map, each with a leader line.
    id: "high", name: "High pressure", aliases: ["high", "H", "anticyclone"], stage: 7, shape: "custom", x: 775, y: WX.y + WX.h + 36, label: "below", gap: 14,
    to: [ausXY(...HIGH_AT)[0], ausXY(...HIGH_AT)[1] + 17],
    draw: (item) => {
      const g = clipped(item);
      isobars(g, HIGH_AT, [30, 52], "#6aa8ff");
      const [x, y] = ausXY(...HIGH_AT);
      fillMark(g, "circle", { cx: x, cy: y, r: 17 }, "#4a90e2");
      note(g, x, y + 7, "H", "z-hl");
    },
  },
  {
    id: "low", name: "Low pressure", aliases: ["low", "L", "depression"], stage: 7, shape: "custom", x: 905, y: WX.y + WX.h + 36, label: "below", gap: 14,
    to: [ausXY(...LOW_AT)[0], ausXY(...LOW_AT)[1] + 17],
    draw: (item) => {
      const g = clipped(item);
      isobars(g, LOW_AT, [26, 46], "#ff8a80");
      const [x, y] = ausXY(...LOW_AT);
      fillMark(g, "circle", { cx: x, cy: y, r: 17 }, "#e0524f");
      note(g, x, y + 7, "L", "z-hl");
    },
  },
  {
    id: "coldfront", name: "Cold front", stage: 7, shape: "custom", x: 830, y: WX.y - 30, label: "above", gap: 6, to: lastOf(COLD_LINE),
    draw: (item) => {
      const g = clipped(item);
      lineMark(g, pts(COLD_LINE), 4, "#4a90e2");
      hitLine(g, pts(COLD_LINE), 20);
      // Triangles along the line, on the side the front is moving toward.
      alongLine(COLD_LINE, 24, (x, y, ux, uy) => {
        const { nx, ny } = eastSide(ux, uy);
        fillMark(g, "polygon", { points: `${x - ux * 7},${y - uy * 7} ${x + ux * 7},${y + uy * 7} ${x + nx * 13},${y + ny * 13}` }, "#4a90e2");
      });
    },
  },
  {
    id: "warmfront", name: "Warm front", stage: 7, shape: "custom", x: 930, y: WX.y - 30, label: "above", gap: 6, to: lastOf(WARM_LINE),
    draw: (item) => {
      const g = clipped(item);
      lineMark(g, pts(WARM_LINE), 4, "#e0524f");
      hitLine(g, pts(WARM_LINE), 20);
      // Half-circles along the line, on the side the front is moving toward.
      alongLine(WARM_LINE, 26, (x, y, ux, uy) => {
        const { sweep } = eastSide(ux, uy);
        const r = 8;
        fillMark(g, "path", { d: `M${x - ux * r} ${y - uy * r} A${r} ${r} 0 0 ${sweep} ${x + ux * r} ${y + uy * r} Z` }, "#e0524f");
      });
    },
  },
];

// Which stage each item belongs to is set above; here they are in play order.
export const EARTH_ITEMS: ZoomItem[] = [...INSIDE, ...PLATES, ...VOLCANO, ...ROCK_CYCLE, ...WATER, ...SKY, ...CLIMATE];

// ---------- backdrops: the parts that are not questions ----------
/** A vertical colour gradient, as the fill for a rectangle. */
function gradient(g: G, id: string, stops: [number, string][]) {
  const defs = el("defs", {}, g);
  const lg = el("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  for (const [offset, color] of stops) el("stop", { offset, "stop-color": color }, lg);
  return `url(#${id})`;
}
const fullRect = (g: G, fill: string) => el("rect", { x: 0, y: 0, width: 1000, height: 560, fill }, g);

export function drawEarthBackdrop(stage: number, g: G) {
  if (stage === 1) {
    fullRect(g, "#0d1018");
    for (const [x, y, r] of [[60, 40, 1.4], [160, 90, 1], [260, 30, 1.6], [380, 60, 1], [620, 40, 1.4], [740, 70, 1], [860, 30, 1.6], [940, 100, 1], [820, 150, 1.2], [90, 160, 1.2]]) {
      el("circle", { cx: x, cy: y, r, fill: "#cfd6ff", opacity: 0.7 }, g);
    }
    note(g, 500, 66, "The crust is drawn about 5 times too thick, so you can see it.");
    // How far across the whole Earth is.
    el("path", { d: `M${CX - R_SURFACE} 532 H${CX + R_SURFACE} M${CX - R_SURFACE} 524 V540 M${CX + R_SURFACE} 524 V540`, class: "z-measure" }, g);
    note(g, 500, 552, "12,742 km across");
  }
  if (stage === 2) {
    fullRect(g, "#10283e");
    // The small plates and fragments that aren't questions.
    el("path", { d: WORLD.plates.other ?? "", class: "plate-other" }, g);
  }
  if (stage === 3) {
    fullRect(g, gradient(g, "es-volcano-sky", [[0, "#3b5b8c"], [0.55, "#c98f86"], [0.8, "#f0b37e"]]));
    // The ground, with layers of rock in it, each a different brown, cut to the shape of the mountain.
    el("path", { d: GROUND, fill: "#85633f" }, g);
    const defs = el("defs", {}, g);
    el("path", { d: GROUND }, el("clipPath", { id: "es-ground" }, defs));
    const layers = el("g", { "clip-path": "url(#es-ground)" }, g);
    for (const [y, color] of [[300, "#74553a"], [390, "#654b35"], [480, "#563f2d"]] as [number, string][]) {
      el("path", { d: `M0 ${y} Q250 ${y - 18} 500 ${y} T1000 ${y} V560 H0 Z`, fill: color }, layers);
    }
    el("path", { d: GROUND, class: "z-outline" }, g);
  }
  if (stage === 4) {
    fullRect(g, "#2a2230");
    note(g, 500, 520, "Rock goes round and round", "z-caption");
    // The sediment label, for the heap under the Erosion arrow.
    note(g, 500, 210, "sediment");
  }
  if (stage === 5) {
    fullRect(g, gradient(g, "es-water-sky", [[0, "#4f9fe0"], [0.6, "#bfe0f5"], [0.62, "#bfe0f5"]]));
    el("circle", { cx: 88, cy: 76, r: 34, fill: "#ffd84a" }, g);
    // The sea, with a few waves on it.
    el("path", { d: "M0 340 L410 340 L410 560 L0 560 Z", fill: "#2f78b5" }, g);
    for (const [x, y] of [[50, 360], [160, 382], [280, 362], [330, 410], [90, 430], [220, 450]]) {
      el("path", { d: `M${x} ${y} q10 -9 20 0 t20 0`, class: "z-wave" }, g);
    }
    // Land and the mountain, with layers of rock and a snow cap.
    el("path", { d: MOUNTAIN, fill: "#8b6a46" }, g);
    el("path", { d: "M400 440 Q520 424 650 438 Q780 452 1000 430 V560 H400 Z", fill: "#76573a" }, g);
    el("path", { d: "M740 143 L770 112 L797 134 L781 128 L770 142 L758 130 Z", fill: "#ffffff" }, g);
    el("path", { d: "M400 342 L470 338 Q560 334 640 244 L770 112 L825 152 L885 232 Q950 292 1000 304", class: "z-outline" }, g);
    // Trees on the flat land (where Transpiration takes place).
    for (const x of [486, 520, 556, 590]) {
      el("rect", { x: x - 3, y: 316, width: 6, height: 24, fill: "#5a3d24" }, g);
      el("circle", { cx: x, cy: 306, r: 17, fill: "#3f8f4a" }, g);
      el("circle", { cx: x - 9, cy: 314, r: 12, fill: "#3f8f4a" }, g);
      el("circle", { cx: x + 9, cy: 314, r: 12, fill: "#3f8f4a" }, g);
    }
  }
  if (stage === 6) {
    // The whole sky, dark at the top and pale blue near the ground.
    fullRect(g, gradient(g, "es-air", [[0, "#04061a"], [0.3, "#1a2150"], [0.55, "#36509a"], [0.75, "#7fb0e6"], [1, "#cfe8f8"]]));
    el("rect", { x: 0, y: Y_GROUND, width: 1000, height: 30, fill: "#4c8a4a" }, g);
    // Where one layer ends and the next begins.
    for (const y of [Y_GROUND, Y_TROPOPAUSE, Y_STRATOPAUSE, Y_MESOPAUSE]) el("line", { x1: 0, y1: y, x2: 1000, y2: y, class: "z-layerline" }, g);
    // A jet near the top of the troposphere, about 11 km up.
    el("path", { d: "M870 296 l24 -3 l12 -9 l5 1 l-6 9 l9 -1 l3 3 l-11 3 l-5 8 l-5 -1 l2 -8 l-24 2 Z", fill: "#ffffff" }, g);
    // A shooting star burns up in the mesosphere.
    el("path", { d: "M300 112 L372 150", class: "z-meteor" }, g);
    el("circle", { cx: 372, cy: 150, r: 3.5, fill: "#fff6c8" }, g);
    // The Space Station, at about 400 km, and an aurora lower down.
    el("rect", { x: 536, y: 40, width: 40, height: 6, fill: "#e8e8ee" }, g);
    el("rect", { x: 520, y: 33, width: 12, height: 20, fill: "#3b6fc4" }, g);
    el("rect", { x: 580, y: 33, width: 12, height: 20, fill: "#3b6fc4" }, g);
    el("path", { d: "M80 100 Q110 70 140 98 T200 96 T260 98 T320 94 V104 H80 Z", class: "z-aurora" }, g);
    el("path", { d: "M100 98 Q112 68 124 98 M150 98 Q162 60 176 98 M210 98 Q222 66 234 98 M270 98 Q282 64 296 96", class: "z-aurora-rays" }, g);
  }
  if (stage === 7) {
    fullRect(g, "#10283e");
    // The land, as a dim shape under the bands.
    el("path", { d: WORLD.landSmall, class: "z-landfill" }, g);
    // The weather map: a frame with the sea, and Australia.
    const defs = el("defs", {}, g);
    el("rect", { x: WX.x, y: WX.y, width: WX.w, height: WX.h, rx: 6 }, el("clipPath", { id: WEATHER_CLIP }, defs));
    el("rect", { x: WX.x, y: WX.y, width: WX.w, height: WX.h, rx: 6, class: "z-wx-frame" }, g);
    const inside = el("g", { "clip-path": `url(#${WEATHER_CLIP})` }, g);
    el("path", { d: WORLD.landAus, class: "z-wx-land" }, inside);
    note(g, WX.x + 8, WX.y + 18, "Weather map", "z-small z-left");
    note(g, 350, 484, "Simplified: real climate zones follow the land and sea, not straight lines.", "z-small z-centre");
  }
}

/**
 * Drawn after the questions so nothing covers it: the coastlines on the maps, and the small notes
 * that sit on top of a question's shape.
 */
export function drawEarthOverlay(stage: number, g: G) {
  if (stage === 1) {
    // The thickness of each layer, written in the layer itself.
    note(g, 500, 222, "about 2,900 km thick");
    note(g, 500, 362, "about 2,200 km thick");
    note(g, 500, 490, "radius 1,220 km");
  }
  if (stage === 2) {
    el("path", { d: WORLD.land, class: "z-coast" }, g);
  }
  if (stage === 6) {
    // Heights down the left side, and what the little pictures are.
    for (const [y, label] of [[Y_GROUND, "0 km"], [Y_TROPOPAUSE, "12 km"], [Y_STRATOPAUSE, "50 km"], [Y_MESOPAUSE, "85 km"]] as [number, string][]) {
      el("text", { x: 8, y: y - 6, class: "z-small z-height" }, g).textContent = label;
    }
    note(g, 8, 36, "400 km (squeezed)", "z-small z-height z-left");
    note(g, 8, 238, "15–35 km", "z-small z-height z-left");
    note(g, 862, 322, "jet, 11 km", "z-small z-height z-left");
    note(g, 302, 166, "shooting star", "z-small z-height z-left");
    note(g, 596, 34, "Space Station", "z-small z-height z-left");
    note(g, 200, 62, "aurora", "z-small z-height");
  }
  if (stage === 7) {
    el("path", { d: WORLD.landSmall, class: "z-coast" }, g);
  }
}
