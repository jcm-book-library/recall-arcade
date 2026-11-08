import { makeCanvas, noise } from "./kit";

// THE ISLAND'S PICTURES: every tile and building is drawn here, in code, with no image files.
// Like the Labyrinth garden, each picture is made of little coloured squares (pixels). A tile
// is 16 x 16 pixels. A building is a bigger picture that covers several tiles. Everything is
// drawn ONCE when the island opens and then stamped onto the screen (drawing 40 buildings of
// squares every frame would be wasteful). If you would rather draw a building yourself, the
// plan is for a picture in public/arcade/island/ to replace it (see docs/island-design.md).

export const TILE = 16;
type G = CanvasRenderingContext2D;

/** The sprite's picture and where it goes: top-left tile, and how many tiles it covers. */
export interface Sprite { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number }

// ---------- palettes ----------
const OUT = "#2a2018"; // the dark outline colour used on buildings, like the hero's outline
const GRASS = { base: "#62b34c", light: "#79c75e", dark: "#4d9c40", tuft: "#3d8a36" };
const SAND = { base: "#ecd9a0", light: "#f6e9bd", dark: "#d9c488", speck: "#c4ad6e" };
const WATER = { base: "#2f7fc4", light: "#4b9be2", dark: "#2670b0", foam: "#eaf6ff" };
const RIVER = { base: "#3b8fd6", light: "#62adec", dark: "#2f7cc0", foam: "#eaf6ff" };
const GRAVEL = { base: "#cbb98c", light: "#ddcda3", dark: "#b5a276", pebble: "#9c8a60" };
const DIRT = { base: "#b98e5f", light: "#c9a073", dark: "#a47a4d" };
const WOOD = { base: "#a8763c", light: "#c28d4e", dark: "#7d5428" };
const TREE = { trunk: "#6b4423", leaf: "#2f7a30", dark: "#1d5a24", lit: "#48a843", hi: "#86d466" };

// ---------- small drawing helpers ----------
const ctxOf = (c: HTMLCanvasElement) => {
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  return g;
};
function R(g: G, x: number, y: number, w: number, h: number, colour: string) {
  g.fillStyle = colour;
  g.fillRect(Math.round(x), Math.round(y), w, h);
}
/** A filled circle with hard pixel edges (the canvas's own arc() would blur the edge). */
function disc(g: G, cx: number, cy: number, r: number, colour: string, keep?: (x: number, y: number) => boolean) {
  g.fillStyle = colour;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r && (!keep || keep(x, y))) g.fillRect(x, y, 1, 1);
    }
  }
}
/** A filled ellipse with hard pixel edges. */
function oval(g: G, cx: number, cy: number, rx: number, ry: number, colour: string) {
  g.fillStyle = colour;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1);
    }
  }
}
/** A straight line of thick pixels (used for the telescope). */
function thickLine(g: G, x0: number, y0: number, x1: number, y1: number, t: number, colour: string) {
  g.fillStyle = colour;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
    g.fillRect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t);
  }
}
function fillPixels(c: HTMLCanvasElement, pixel: (x: number, y: number) => string | null) {
  const g = ctxOf(c);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const colour = pixel(x, y);
      if (colour) { g.fillStyle = colour; g.fillRect(x, y, 1, 1); }
    }
  }
  return c;
}

// ---------- a tiny 3 x 5 pixel alphabet, for the name boards ----------
// Each letter is five rows of three squares ("1" is painted). Using our own alphabet means the
// boards never depend on a web font having loaded.
const FONT: Record<string, string> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
  K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
  P: "110101110100100", Q: "010101101111011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101010010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
  Z: "111001010100111", "&": "010101010101011", " ": "000000000000000",
};
function textWidth(s: string) {
  return [...s].reduce((n, ch) => n + (ch === " " ? 2 : 4), 0) - 1;
}
function text(g: G, s: string, x: number, y: number, colour: string) {
  g.fillStyle = colour;
  let cx = x;
  for (const ch of s) {
    if (ch === " ") { cx += 2; continue; }
    const rows = FONT[ch] ?? FONT[" "];
    for (let i = 0; i < 15; i++) if (rows[i] === "1") g.fillRect(cx + (i % 3), y + Math.floor(i / 3), 1, 1);
    cx += 4;
  }
}
/** A little wooden name board, centred on `cx`, with its top edge at `y`. */
function board(g: G, s: string, cx: number, y: number, face = "#f3e6c4", ink = "#4a2f16") {
  const w = textWidth(s) + 6;
  const x = Math.round(cx - w / 2);
  R(g, x, y, w, 9, OUT);
  R(g, x + 1, y + 1, w - 2, 7, WOOD.base);
  R(g, x + 1, y + 1, w - 2, 1, WOOD.light);
  R(g, x + 2, y + 2, w - 4, 5, face);
  text(g, s, x + 3, y + 2, ink);
}

// ---------- ground tiles ----------
export function makeGrass(variant: number, flower: string | null = null) {
  const c = fillPixels(makeCanvas(TILE, TILE), (x, y) => {
    const n = noise(x, y, variant);
    if (n % 11 === 0) return GRASS.light;
    if (n % 7 === 0) return GRASS.dark;
    return GRASS.base;
  });
  const g = ctxOf(c);
  g.fillStyle = GRASS.tuft; // a few blades
  for (let k = 0; k < 3; k++) {
    const x = 1 + (noise(k, variant, 21) % 13), y = 2 + (noise(k, variant, 22) % 12);
    g.fillRect(x, y, 1, 2);
    g.fillRect(x + 1, y + 1, 1, 1);
  }
  if (flower) {
    const x = 3 + (noise(variant, 1, 5) % 9), y = 3 + (noise(variant, 2, 5) % 9);
    g.fillStyle = flower;
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) g.fillRect(x + dx, y + dy, 1, 1);
    g.fillStyle = "#ffe85a";
    g.fillRect(x, y, 1, 1);
    g.fillStyle = GRASS.tuft;
    g.fillRect(x, y + 2, 1, 2);
  }
  return c;
}
export function makeSand(variant: number) {
  const c = fillPixels(makeCanvas(TILE, TILE), (x, y) => {
    const n = noise(x, y, variant + 40);
    if (n % 9 === 0) return SAND.light;
    if (n % 6 === 0) return SAND.dark;
    return SAND.base;
  });
  const g = ctxOf(c);
  g.fillStyle = SAND.speck;
  for (let k = 0; k < 4; k++) g.fillRect(noise(k, variant, 31) % 15, noise(k, variant, 32) % 15, 1, 1);
  return c;
}
export function makeGravel(variant: number) {
  const c = fillPixels(makeCanvas(TILE, TILE), (x, y) => {
    if (noise(x, y, variant) % 8 === 0) return GRAVEL.light;
    if (noise(x, y, variant + 5) % 6 === 0) return GRAVEL.dark;
    return GRAVEL.base;
  });
  const g = ctxOf(c);
  g.fillStyle = GRAVEL.pebble;
  for (let k = 0; k < 4; k++) g.fillRect(noise(k, variant, 7) % 14, noise(k, variant, 8) % 14, 2, 1);
  return c;
}
export function makeDirt(variant: number) {
  return fillPixels(makeCanvas(TILE, TILE), (x, y) => {
    const n = noise(x, y, variant + 60);
    if (n % 8 === 0) return DIRT.light;
    if (n % 5 === 0) return DIRT.dark;
    return DIRT.base;
  });
}
/** Water in two frames: lighter ripples that slide along, so the sea seems to move. */
export function makeWater(frame: number, variant: number, river: boolean) {
  const P = river ? RIVER : WATER;
  const c = fillPixels(makeCanvas(TILE, TILE), (x, y) => (noise(x, y, variant + 80) % 13 === 0 ? P.dark : P.base));
  const g = ctxOf(c);
  g.fillStyle = P.light;
  for (let k = 0; k < 3; k++) {
    const y = 2 + k * 5 + (noise(k, variant, 90) % 3);
    const x = (noise(k, variant, 91) % 8) + frame * 3 + (river ? frame * 2 : 0);
    g.fillRect(x % 13, y, 3, 1);
    g.fillRect((x + 1) % 13, y + 1, 1, 1);
  }
  return c;
}
/** A white foam fringe along one edge (0 up, 1 right, 2 down, 3 left) of a water tile that touches land. */
export function makeFoam(side: number, frame: number) {
  const c = makeCanvas(TILE, TILE);
  const g = ctxOf(c);
  for (let i = 0; i < TILE; i++) {
    const depth = 1 + ((noise(i, side, 3 + frame) % 5) < 2 ? 1 : 0) + (frame === 1 && i % 5 === 2 ? 1 : 0);
    for (let d = 0; d < depth; d++) {
      g.fillStyle = d === 0 ? WATER.foam : "#bfe0f7";
      if (side === 0) g.fillRect(i, d, 1, 1);
      if (side === 2) g.fillRect(i, TILE - 1 - d, 1, 1);
      if (side === 3) g.fillRect(d, i, 1, 1);
      if (side === 1) g.fillRect(TILE - 1 - d, i, 1, 1);
    }
  }
  return c;
}
/** A soft darker lip where grass meets sand, so the beach has an edge. side as in makeFoam. */
export function makeGrassLip(side: number) {
  const c = makeCanvas(TILE, TILE);
  const g = ctxOf(c);
  g.fillStyle = "#7fbf5a";
  for (let i = 0; i < TILE; i++) {
    if (noise(i, side, 12) % 3 === 0) continue;
    if (side === 0) g.fillRect(i, 0, 1, 1);
    if (side === 2) g.fillRect(i, TILE - 1, 1, 1);
    if (side === 3) g.fillRect(0, i, 1, 1);
    if (side === 1) g.fillRect(TILE - 1, i, 1, 1);
  }
  return c;
}

// ---------- scenery on top of grass ----------
export function makeTree(variant: number) {
  const c = makeCanvas(TILE, TILE);
  const g = ctxOf(c);
  R(g, 4, 13, 8, 2, "rgba(0,0,0,0.18)"); // shadow
  R(g, 7, 10, 3, 5, TREE.trunk);
  R(g, 7, 10, 1, 5, "#82552c");
  const pine = variant % 3 === 2;
  if (pine) { // a pointy pine
    for (let i = 0; i < 4; i++) {
      const w = 4 + i * 3;
      R(g, 8 - w / 2, 2 + i * 3, w, 4, i % 2 ? TREE.leaf : TREE.dark);
      R(g, 8 - w / 2 + 1, 2 + i * 3, 1, 2, TREE.lit);
    }
  } else { // a round tree
    disc(g, 8, 7, 6.2, TREE.dark);
    disc(g, 7.5, 6.5, 5.6, TREE.leaf);
    disc(g, 6.5, 5, 3.2, TREE.lit);
    R(g, 5, 3, 2, 1, TREE.hi);
    if (variant % 3 === 1) { g.fillStyle = "#e8584a"; for (const [x, y] of [[9, 6], [5, 8], [10, 9]]) g.fillRect(x, y, 2, 2); } // apples
  }
  return c;
}
export function makeRock() {
  const c = makeCanvas(TILE, TILE);
  const g = ctxOf(c);
  oval(g, 8, 11.5, 6, 3.2, "rgba(0,0,0,0.18)");
  oval(g, 8, 9.5, 5.5, 4.2, "#6e7076");
  oval(g, 7.5, 8.8, 4.6, 3.4, "#9a9ca3");
  R(g, 5, 7, 3, 1, "#c9cbd0");
  R(g, 10, 11, 3, 1, "#55575d");
  return c;
}
export function makeSign() {
  const c = makeCanvas(TILE, TILE);
  const g = ctxOf(c);
  R(g, 7, 9, 2, 6, WOOD.dark);
  R(g, 2, 2, 12, 8, OUT);
  R(g, 3, 3, 10, 6, "#e9d3a0");
  R(g, 3, 3, 10, 1, "#f6e6bd");
  R(g, 4, 5, 8, 1, "#7d5428");
  R(g, 4, 7, 6, 1, "#7d5428");
  return c;
}
export function makeFence(left: boolean, right: boolean, up: boolean, down: boolean) {
  const c = makeCanvas(TILE, TILE);
  const g = ctxOf(c);
  const rail = "#d9b777", edge = WOOD.dark;
  if (left) { R(g, 0, 5, 8, 2, rail); R(g, 0, 10, 8, 2, rail); R(g, 0, 7, 8, 1, edge); R(g, 0, 12, 8, 1, edge); }
  if (right) { R(g, 8, 5, 8, 2, rail); R(g, 8, 10, 8, 2, rail); R(g, 8, 7, 8, 1, edge); R(g, 8, 12, 8, 1, edge); }
  if (up) { R(g, 7, 0, 2, 8, rail); R(g, 8, 0, 1, 8, edge); }
  if (down) { R(g, 7, 8, 2, 8, rail); R(g, 8, 8, 1, 8, edge); }
  R(g, 6, 2, 4, 12, edge); // the post
  R(g, 7, 2, 2, 11, "#e8c98b");
  R(g, 6, 2, 4, 1, "#f6e2b4");
  return c;
}
export function makeBridge() {
  // The path crosses a river that runs up and down, so the planks run up and down and the rails are on the sides.
  const c = fillPixels(makeCanvas(TILE, TILE), (x) => (x % 4 === 3 ? WOOD.dark : x % 4 === 0 ? WOOD.light : WOOD.base));
  const g = ctxOf(c);
  R(g, 0, 0, TILE, 2, OUT);
  R(g, 0, 14, TILE, 2, OUT);
  R(g, 0, 2, TILE, 1, "#e8c98b");
  R(g, 0, 13, TILE, 1, "#e8c98b");
  for (const x of [1, 14]) { R(g, x, 0, 2, 3, "#e8c98b"); R(g, x, 13, 2, 3, "#e8c98b"); }
  return c;
}
export function makePier(edgeUp: boolean, edgeDown: boolean) {
  const c = fillPixels(makeCanvas(TILE, TILE), (_x, y) => (y % 4 === 3 ? WOOD.dark : y % 4 === 0 ? WOOD.light : WOOD.base));
  const g = ctxOf(c);
  for (const [x, y] of [[1, 2], [14, 2], [1, 9], [14, 9], [7, 6], [8, 13]]) R(g, x, y, 1, 1, "#4f3418"); // nail heads
  if (edgeUp) R(g, 0, 0, TILE, 1, OUT);
  if (edgeDown) R(g, 0, 15, TILE, 1, OUT);
  return c;
}
/** The glowing pad that marks an arcade stop. Two frames, swapped, make it pulse. */
export function makeStopPad(frame: number) {
  const c = makeCanvas(TILE, TILE);
  const g = ctxOf(c);
  const a = frame === 0 ? "#ffd24a" : "#ffb52b";
  oval(g, 8, 8, 7, 5.5, OUT);
  oval(g, 8, 8, 6, 4.5, a);
  oval(g, 8, 8, 4, 3, "#fff1b0");
  // a small star in the middle
  R(g, 7, 6, 2, 5, a); R(g, 5, 8, 6, 1, a);
  return c;
}

/** The pad again once its game has been played: green, with a tick, so you can see you have been. */
export function makeStampedPad() {
  const c = makeCanvas(TILE, TILE);
  const g = ctxOf(c);
  oval(g, 8, 8, 7, 5.5, OUT);
  oval(g, 8, 8, 6, 4.5, "#3fae6a");
  oval(g, 8, 8, 4, 3, "#bff0cf");
  for (const [x, y] of [[5, 8], [6, 9], [7, 10], [8, 9], [9, 8], [10, 7], [11, 6]]) R(g, x, y - 1, 2, 2, "#1f7a44"); // the tick
  return c;
}

/**
 * A gate across the path. `along` says which way the path runs through the tile: "x" for left to
 * right (the gate then runs top to bottom) and "y" for up and down. Closed: a striped bar with a
 * padlock. Open: the bar is swung back against the post, so the way is clear.
 */
export function makeGate(open: boolean, along: "x" | "y") {
  const c = makeCanvas(TILE, TILE);
  const g = ctxOf(c);
  // We draw as if the path runs left to right. For the other way round, every box is flipped.
  const B = (x: number, y: number, w: number, h: number, colour: string) => (along === "x" ? R(g, x, y, w, h, colour) : R(g, y, x, h, w, colour));
  for (const y of [0, 13]) { B(4, y, 8, 3, OUT); B(5, y + 1, 6, 1, "#e8c98b"); B(5, y + 2, 6, 1, WOOD.dark); } // the two posts
  if (open) {
    B(0, 2, 16, 4, OUT);
    for (let x = 1; x < 15; x += 4) { B(x, 3, 2, 2, "#d8402f"); B(x + 2, 3, 2, 2, "#f4efe6"); }
    B(12, 6, 3, 2, "#3fae6a"); // a small green marker
  } else {
    B(5, 3, 6, 10, OUT);
    for (let y = 0; y < 5; y++) { B(6, 4 + y * 2, 4, 1, y % 2 ? "#f4efe6" : "#d8402f"); B(6, 5 + y * 2, 4, 1, y % 2 ? "#e0d8c4" : "#a82f22"); }
    B(6, 6, 4, 4, OUT); B(7, 7, 2, 2, "#ffd24a"); B(7, 5, 2, 1, "#ffd24a"); // the padlock
  }
  return c;
}

/** The finish line: a chequered strip across the path. While it is shut there is a rope in front. */
export function makeFinish(open: boolean, along: "x" | "y") {
  const c = makeCanvas(TILE, TILE);
  const g = ctxOf(c);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) R(g, x * 4, y * 4, 4, 4, (x + y) % 2 ? "#2a2018" : "#f4efe6");
  if (!open) {
    if (along === "x") { R(g, 7, 0, 2, 16, "#d8402f"); R(g, 6, 0, 4, 2, OUT); R(g, 6, 14, 4, 2, OUT); }
    else { R(g, 0, 7, 16, 2, "#d8402f"); R(g, 0, 6, 2, 4, OUT); R(g, 14, 6, 2, 4, OUT); }
  }
  return c;
}

// ---------- the buildings ----------
// Each drawing function paints one building onto a fresh canvas of (w x h) tiles. `door` is the
// column of the door tile inside the building, so the doorway is drawn where the map says.
const WALL = { light: "#f1e6cc", base: "#e2d3ae", dark: "#c3b189" };

function doorway(g: G, x: number, y: number, w: number, h: number, colour = "#6b4423") {
  R(g, x - 1, y - 1, w + 2, h + 1, OUT);
  R(g, x, y, w, h, colour);
  R(g, x, y, w, 1, "rgba(255,255,255,0.18)");
  R(g, x + w - 3, y + Math.floor(h / 2), 1, 1, "#ffd24a"); // knob
}

function lighthouse(w: number, h: number, door: number) {
  const c = makeCanvas(w * TILE, h * TILE);
  const g = ctxOf(c);
  const cx = 40; // the middle of the 80 pixel wide picture
  // the tower: red and white stripes, narrower at the top
  for (let y = 44; y < 82; y++) {
    const half = 8 + Math.round(((y - 44) / 38) * 4);
    const stripe = Math.floor((y - 44) / 7) % 2 === 0;
    R(g, cx - half - 1, y, half * 2 + 2, 1, OUT);
    R(g, cx - half, y, half * 2, 1, stripe ? "#d8402f" : "#f4efe6");
    R(g, cx + half - 4, y, 4, 1, stripe ? "#a82f22" : "#d3ccbd"); // shade on the right
    R(g, cx - half, y, 2, 1, stripe ? "#ee6a55" : "#ffffff");
  }
  for (const y of [58, 70]) { R(g, cx - 2, y, 4, 6, OUT); R(g, cx - 1, y + 1, 2, 4, "#2a3b60"); } // two little windows
  // the gallery (the walkway round the top) and the cradle that holds the globe
  R(g, cx - 14, 40, 28, 5, OUT);
  R(g, cx - 13, 41, 26, 3, "#8c8f99");
  R(g, cx - 13, 41, 26, 1, "#c4c7cf");
  for (let x = cx - 13; x <= cx + 12; x += 4) R(g, x, 36, 1, 4, OUT);
  R(g, cx - 13, 36, 26, 1, OUT);
  R(g, cx - 9, 33, 18, 4, OUT);
  R(g, cx - 8, 34, 16, 2, "#5b6070");
  // THE GIANT GLOBE
  const gx = cx, gy = 17, gr = 16;
  disc(g, gx, gy, gr + 1, OUT);
  disc(g, gx, gy, gr, "#2f7fc4");
  const inside = (x: number, y: number) => (x + 0.5 - gx) ** 2 + (y + 0.5 - gy) ** 2 <= gr * gr;
  disc(g, gx + 3, gy + 4, gr - 3, "#2670b0", inside); // shaded side
  disc(g, gx - 3, gy - 3, gr - 5, "#3a90d6", inside); // lit side
  for (const [lx, ly, lr] of [[-7, -5, 5.5], [-9, -9, 3], [-2, -9, 3.5], [3, 1, 5.5], [6, 8, 3.5], [-6, 7, 3.2], [9, -4, 3], [8, -9, 2.5]]) {
    disc(g, gx + lx, gy + ly, lr, "#5aae48", inside); // continents
    disc(g, gx + lx - 1, gy + ly - 1, lr - 1.5, "#7fcc5a", inside);
  }
  disc(g, gx - 1, gy - gr + 2, 3.2, "#f4f8fb", inside); // the polar ice
  disc(g, gx, gy + gr - 2, 3, "#f4f8fb", inside);
  // lines of latitude and the bright glint
  g.fillStyle = "rgba(255,255,255,0.28)";
  for (const dy of [-8, 0, 8]) for (let x = gx - gr; x < gx + gr; x++) { const y = gy + dy + Math.round(Math.abs(x - gx) ** 2 / 40); if (inside(x, y)) g.fillRect(x, y, 1, 1); }
  R(g, gx - 11, gy - 9, 3, 1, "#ffffff"); R(g, gx - 12, gy - 8, 1, 3, "#ffffff");
  R(g, gx - gr - 3, gy + 2, 3, 3, OUT); R(g, gx + gr, gy + 2, 3, 3, OUT); // the axle pegs
  // the keeper's house with a red roof
  const top = 76; // the roof starts here (the picture is 112 tall)
  R(g, 8, top + 10, 64, 26, OUT);
  R(g, 9, top + 10, 62, 25, WALL.light);
  R(g, 9, top + 28, 62, 7, WALL.base);
  R(g, 62, top + 10, 9, 25, WALL.dark);
  for (let i = 0; i < 12; i++) { // the roof: narrow at the top, wider lower down
    const left = 26 - i * 2;
    R(g, left, top + i - 2, 80 - left * 2, 1, i === 11 ? OUT : "#c4452f");
    R(g, left, top + i - 2, 1, 1, OUT); R(g, 79 - left, top + i - 2, 1, 1, OUT);
    R(g, left + 1, top + i - 2, 2, 1, "#e0644c");
    R(g, 80 - left - 5, top + i - 2, 4, 1, "#a53a28");
  }
  board(g, "GEOGRAPHY", cx, top + 12);
  doorway(g, door * TILE + 4, h * TILE - 13, 8, 13, "#6b4423");
  R(g, 11, top + 14, 8, 9, OUT); R(g, 12, top + 15, 6, 7, "#9ed3ef"); R(g, 61, top + 14, 8, 9, OUT); R(g, 62, top + 15, 6, 7, "#9ed3ef");
  return c;
}

function observatory(w: number, h: number, door: number) {
  const c = makeCanvas(w * TILE, h * TILE);
  const g = ctxOf(c);
  const cx = 40;
  // the round white building
  R(g, 8, 42, 64, h * TILE - 42, OUT);
  R(g, 9, 42, 62, h * TILE - 42, "#ece8df");
  R(g, 58, 42, 13, h * TILE - 42, "#cfc9bb");
  R(g, 9, 42, 62, 3, "#fbf9f3");
  for (const x of [14, 62]) { R(g, x, 56, 5, 8, OUT); R(g, x + 1, 57, 3, 6, "#9ed3ef"); }
  board(g, "SCIENCE", cx, 54);
  doorway(g, door * TILE + 4, h * TILE - 13, 8, 13, "#3d4a7a");
  // the dome
  const dy = 42;
  disc(g, cx, dy, 30, OUT, (_x, y) => y < dy + 1);
  disc(g, cx, dy, 29, "#8396bf", (_x, y) => y < dy + 1);
  disc(g, cx - 5, dy + 4, 22, "#a3b4d9", (_x, y) => y < dy + 1);
  disc(g, cx + 12, dy + 2, 18, "#6f82ad", (x, y) => y < dy + 1 && x > cx + 14);
  for (let i = -2; i <= 2; i++) { // ribs
    if (i === 0) continue;
    for (let y = 14; y < dy; y++) { const t = (dy - y) / 29; const x = Math.round(cx + i * 11 * Math.sqrt(Math.max(0, 1 - t * t * 0.5))); if ((x - cx) ** 2 + (y - dy) ** 2 < 28 * 28) R(g, x, y, 1, 1, "rgba(30,40,80,0.35)"); }
  }
  // the open slit, with night sky in it, and the telescope poking out
  R(g, cx - 5, 12, 11, dy - 12, OUT);
  R(g, cx - 4, 12, 9, dy - 12, "#1a2350");
  for (const [sx, sy] of [[cx - 2, 18], [cx + 2, 24], [cx - 1, 31], [cx + 3, 15]]) R(g, sx, sy, 1, 1, "#ffffff");
  thickLine(g, cx - 2, dy - 8, cx + 17, 8, 7, OUT);
  thickLine(g, cx - 2, dy - 8, cx + 17, 8, 5, "#d7dbe3");
  thickLine(g, cx - 3, dy - 9, cx + 15, 9, 1, "#ffffff");
  thickLine(g, cx + 14, 10, cx + 19, 5, 7, OUT);
  thickLine(g, cx + 14, 10, cx + 19, 5, 5, "#b9bfcc");
  thickLine(g, cx + 19, 5, cx + 20, 4, 3, "#7fd3ff");
  return c;
}

function museum(w: number, h: number, door: number) {
  const c = makeCanvas(w * TILE, h * TILE);
  const g = ctxOf(c);
  const W = w * TILE;
  const stone = "#efe7d3", shade = "#d3c8ae", dark = "#b7ab91";
  // the triangular pediment on top
  for (let i = 0; i < 17; i++) {
    const inset = 4 + Math.round((16 - i) * ((W / 2 - 14) / 16));
    R(g, inset, i, W - inset * 2, 1, i === 16 ? OUT : stone);
    R(g, inset, i, 1, 1, OUT); R(g, W - inset - 1, i, 1, 1, OUT);
  }
  for (let i = 5; i < 16; i++) { // the sunk triangle inside
    const inset = 18 + Math.round((15 - i) * ((W / 2 - 28) / 10));
    R(g, inset, i, W - inset * 2, 1, shade);
  }
  disc(g, W / 2, 12, 3, "#c7a54a"); disc(g, W / 2, 12, 1.5, "#f0d27a"); // a golden sun carved in it
  // the beam under it with the name
  R(g, 2, 17, W - 4, 10, OUT);
  R(g, 3, 18, W - 6, 8, stone);
  R(g, 3, 25, W - 6, 1, shade);
  text(g, "HISTORY", Math.round(W / 2 - textWidth("HISTORY") / 2), 20, "#6e5a2b");
  // the back wall and the door
  R(g, 8, 27, W - 16, 29, dark);
  doorway(g, door * TILE + 4, 36, 8, 20, "#4a3322");
  R(g, door * TILE + 2, 31, 12, 5, shade); R(g, door * TILE + 4, 32, 8, 3, "#3a2a1c");
  // columns
  for (const x of [8, 20, 32, 70, 82, 94]) {
    R(g, x - 1, 27, 11, 28, OUT);
    R(g, x, 27, 9, 28, stone);
    R(g, x + 6, 27, 3, 28, shade);
    for (const fx of [x + 2, x + 4]) R(g, fx, 31, 1, 21, shade); // the flutes
    R(g, x - 2, 27, 13, 3, stone); R(g, x - 2, 29, 13, 1, OUT); // capital
    R(g, x - 2, 52, 13, 3, stone); R(g, x - 2, 54, 13, 1, OUT); // base
  }
  // the steps
  for (let s = 0; s < 3; s++) {
    R(g, 2 + s * 2, 55 + s * 3, W - 4 - s * 4, 3, s === 0 ? OUT : OUT);
    R(g, 3 + s * 2, 56 + s * 3, W - 6 - s * 4, 2, s % 2 ? shade : stone);
  }
  return c;
}

function terminal(w: number, h: number, door: number) {
  const c = makeCanvas(w * TILE, h * TILE);
  const g = ctxOf(c);
  const W = w * TILE, H = h * TILE;
  // the low terminal building
  R(g, 3, 38, 80, H - 38, OUT);
  R(g, 4, 39, 78, H - 39, "#dfe4ea");
  R(g, 70, 39, 12, H - 39, "#b9c1cc");
  R(g, 0, 33, 88, 8, OUT); // the flat roof sticking out
  R(g, 1, 34, 86, 6, "#8d95a3");
  R(g, 1, 34, 86, 1, "#c4cad4");
  R(g, 5, 41, 76, 7, OUT);
  R(g, 6, 42, 74, 5, "#2f6fb5");
  text(g, "TRAVEL", Math.round(43 - textWidth("TRAVEL") / 2), 43, "#ffffff");
  // the glass front
  R(g, 6, 50, 74, 12, OUT);
  for (let x = 7; x < 79; x += 12) { R(g, x, 51, 11, 10, "#9ed3ef"); R(g, x, 51, 11, 2, "#c9ecfb"); R(g, x + 8, 51, 2, 10, "rgba(255,255,255,0.35)"); }
  doorway(g, door * TILE + 3, H - 15, 10, 15, "#7fc4e6");
  R(g, door * TILE + 7, H - 14, 1, 14, OUT);
  // the control tower
  R(g, 90, 24, 12, H - 24, OUT);
  R(g, 91, 24, 10, H - 24, "#e8ebef");
  R(g, 97, 24, 4, H - 24, "#c3c9d2");
  R(g, 84, 10, 24, 14, OUT);
  R(g, 85, 11, 22, 8, "#7fc4e6");
  R(g, 85, 11, 22, 2, "#c9ecfb");
  R(g, 85, 19, 22, 4, "#d8402f");
  R(g, 94, 3, 4, 7, OUT); R(g, 95, 1, 1, 4, "#5b6070"); // a mast
  R(g, 82, 8, 28, 3, OUT); R(g, 83, 8, 26, 2, "#8d95a3");
  R(g, 90, 56, 12, 5, "#2f6fb5");
  // the windsock on its pole, on the left of the roof
  R(g, 8, 6, 2, 28, OUT);
  R(g, 8, 6, 1, 28, "#d0d4dc");
  disc(g, 9, 6, 2, OUT);
  const sock = ["#ff7a1e", "#ffffff"];
  for (let i = 0; i < 5; i++) {
    const hgt = 7 - Math.round(i * 1.1);
    R(g, 11 + i * 4, 6 + Math.floor(i * 0.6), 4, hgt + 2, OUT);
    R(g, 11 + i * 4, 7 + Math.floor(i * 0.6), 4, hgt, sock[i % 2]);
  }
  void W;
  return c;
}

function zoo(w: number, h: number, door: number) {
  const c = makeCanvas(w * TILE, h * TILE);
  const g = ctxOf(c);
  const H = h * TILE;
  // THE GREENHOUSE, on the left: a glass building with a curved roof and plants inside
  const gw = 62;
  R(g, 0, 14, gw + 2, H - 14, OUT);
  R(g, 1, 16, gw, H - 17, "#bfe8e0");
  R(g, 1, 16, gw, 5, "#dff5f0");
  for (let y = 16; y < H - 1; y++) { const t = (y - 16) / (H - 17); if (t > 0.35) { R(g, 2, y, gw - 2, 1, `rgba(40,120,60,${0.15 + t * 0.35})`); } }
  // leaves and a palm inside
  R(g, 14, 30, 3, 24, "#7a5a33");
  for (const [lx, ly, lw] of [[6, 26, 12], [14, 22, 12], [16, 29, 12], [4, 32, 10]]) { R(g, lx, ly, lw, 3, "#3f8a36"); R(g, lx + 2, ly - 1, lw - 4, 1, "#62b34c"); }
  disc(g, 40, 44, 7, "#2f7a30"); disc(g, 38, 42, 4, "#48a843"); disc(g, 50, 48, 5, "#3f8a36");
  R(g, 44, 36, 3, 3, "#e8584a"); R(g, 34, 46, 3, 3, "#f2c230"); R(g, 52, 44, 3, 3, "#e8584a");
  // the white frame
  for (let x = 1; x <= gw; x += 12) R(g, x, 16, 2, H - 17, "#ffffff");
  R(g, 1, 36, gw, 2, "#ffffff");
  R(g, 0, 14, gw + 2, 3, "#ffffff"); R(g, 0, 14, gw + 2, 1, OUT);
  // curved ridge
  oval(g, 31, 16, 30, 7, "rgba(255,255,255,0)");
  R(g, 1, 56, gw, 7, "#8d95a3"); R(g, 1, 56, gw, 1, "#c4cad4");
  board(g, "NATURE", 31, 30, "#dff5f0", "#2a5a30");
  // THE ZOO GATE, on the right: two brick pillars, bars, and a name arch
  const px = [66, 96];
  for (const x of px) {
    R(g, x - 1, 22, 16, H - 22, OUT);
    R(g, x, 23, 14, H - 23, "#b6573a");
    R(g, x, 23, 14, 2, "#d9785a");
    for (let y = 30; y < H - 2; y += 6) R(g, x, y, 14, 1, "#8c3f29");
    for (let y = 33; y < H - 2; y += 12) R(g, x + 6, y - 3, 1, 3, "#8c3f29");
    R(g, x + 10, 25, 4, H - 25, "#9a4a31");
    R(g, x - 2, 20, 18, 4, "#d9c9a8"); R(g, x - 2, 20, 18, 1, "#f2e8d0");
  }
  // an elephant on the left pillar, a giraffe on the right
  oval(g, 73, 14, 6, 4.5, OUT); oval(g, 73, 14, 5, 3.5, "#9aa1ab");
  disc(g, 68, 13, 3, "#9aa1ab"); R(g, 64, 14, 2, 6, "#9aa1ab"); R(g, 67, 12, 1, 1, OUT); R(g, 70, 16, 2, 4, "#8a919b");
  R(g, 101, 6, 3, 14, OUT); R(g, 102, 7, 1, 13, "#e8b830"); R(g, 99, 14, 9, 6, OUT); R(g, 100, 15, 7, 4, "#e8b830");
  R(g, 100, 6, 6, 3, OUT); R(g, 101, 7, 4, 1, "#e8b830"); R(g, 104, 5, 1, 2, OUT); R(g, 102, 5, 1, 2, OUT);
  for (const [sx, sy] of [[102, 10], [101, 16], [104, 17]]) R(g, sx, sy, 1, 1, "#8a5a1e");
  // iron bars with the arch over the gateway
  R(g, 80, 24, 16, H - 24, "#1f3a22");
  for (let x = 80; x < 96; x += 3) R(g, x, 26, 1, 12, "#0e1f11");
  R(g, 78, 16, 20, 9, OUT);
  R(g, 79, 17, 18, 7, "#2f7a30");
  R(g, 79, 17, 18, 1, "#62b34c");
  text(g, "ZOO", 88 - Math.round(textWidth("ZOO") / 2), 19, "#fff3b0");
  void door;
  return c;
}

function bandstand(w: number, h: number, door: number) {
  const c = makeCanvas(w * TILE, h * TILE);
  const g = ctxOf(c);
  const cx = 40, H = h * TILE;
  // the concert shell: a big scallop, red outside and lit cream inside
  disc(g, cx, 42, 36, OUT, (_x, y) => y < 43);
  disc(g, cx, 42, 35, "#c0503a", (_x, y) => y < 43);
  disc(g, cx, 42, 29, "#f1e2bf", (_x, y) => y < 43);
  disc(g, cx, 42, 20, "#e8d29b", (_x, y) => y < 43);
  disc(g, cx, 42, 11, "#c7a96a", (_x, y) => y < 43);
  for (let a = 1; a < 8; a++) { // the ribs spreading from the middle
    const ang = (Math.PI * a) / 8;
    for (let r = 4; r < 35; r++) R(g, Math.round(cx - Math.cos(ang) * r), Math.round(42 - Math.sin(ang) * r), 1, 1, r > 29 ? "#8c3623" : "rgba(160,120,60,0.55)");
  }
  R(g, cx - 4, 2, 9, 1, OUT);
  board(g, "MUSIC", cx, 2);
  // the stage floor
  R(g, 2, 44, 76, 14, OUT);
  R(g, 3, 45, 74, 12, WOOD.base);
  R(g, 3, 45, 74, 2, WOOD.light);
  for (let x = 8; x < 76; x += 10) R(g, x, 47, 1, 10, WOOD.dark);
  R(g, 3, 56, 74, 1, WOOD.dark);
  // a drum, a music stand and some notes
  disc(g, 12, 50, 4, OUT); disc(g, 12, 50, 3, "#d8402f"); R(g, 9, 49, 6, 1, "#f4efe6");
  R(g, 66, 47, 1, 8, OUT); R(g, 63, 46, 7, 4, OUT); R(g, 64, 47, 5, 2, "#f4efe6");
  for (const [nx, ny] of [[27, 22], [50, 18], [58, 28]]) { R(g, nx, ny, 3, 2, "#2a3b60"); R(g, nx + 2, ny - 6, 1, 7, "#2a3b60"); R(g, nx + 3, ny - 6, 3, 1, "#2a3b60"); }
  // the steps up to the stage, where the door is
  const dx = door * TILE;
  for (let s = 0; s < 3; s++) { R(g, dx + 1, 58 + s * 2, 14, 2, s % 2 ? "#cfc2a0" : "#efe5c8"); R(g, dx, 58 + s * 2, 1, 2, OUT); R(g, dx + 15, 58 + s * 2, 1, 2, OUT); }
  R(g, dx, H - 1, 16, 1, OUT);
  return c;
}

function stadium(w: number, h: number, door: number) {
  const c = makeCanvas(w * TILE, h * TILE);
  const g = ctxOf(c);
  const W = w * TILE, H = h * TILE;
  const cx = Math.round(W / 2);
  // the oval stands: a dark rim, grey concrete, then a ring of red and blue seats
  oval(g, cx, 40, 53, 29, OUT);
  oval(g, cx, 40, 52, 28, "#aab2c0");
  oval(g, cx, 41, 47, 24, OUT);
  oval(g, cx, 41, 46, 23, "#c0503a");
  // blue seats on the sides, so the crowd looks mixed
  for (let y = 22; y < 62; y++) for (let x = 6; x < W - 6; x++) {
    const dx = (x + 0.5 - cx) / 46, dy = (y + 0.5 - 41) / 23;
    if (dx * dx + dy * dy <= 1 && (Math.abs(x - cx) > 28)) R(g, x, y, 1, 1, "#2f6fb5");
  }
  // crowd dots
  for (let x = 12; x < W - 12; x += 4) for (const y of [24, 28, 54, 58]) {
    const dx = (x - cx) / 44, dy = (y - 41) / 21;
    if (dx * dx + dy * dy < 0.9 && dx * dx + dy * dy > 0.35) R(g, x + (y % 8 === 0 ? 1 : 0), y, 2, 2, ["#f6e6bd", "#ffd24a", "#ffffff"][(x + y) % 3]);
  }
  // the green field with stripes, white lines and a centre circle
  oval(g, cx, 41, 36, 16, OUT);
  oval(g, cx, 41, 35, 15, GRASS.base);
  for (let x = cx - 33; x < cx + 33; x += 12) {
    for (let y = 27; y < 56; y++) for (let xx = x; xx < x + 6; xx++) {
      const dx = (xx + 0.5 - cx) / 35, dy = (y + 0.5 - 41) / 15;
      if (dx * dx + dy * dy <= 1) R(g, xx, y, 1, 1, GRASS.light);
    }
  }
  R(g, cx, 27, 1, 29, "#f4efe6");
  disc(g, cx, 41, 6, "#f4efe6"); disc(g, cx, 41, 5, GRASS.base);
  R(g, cx - 1, 40, 3, 3, "#f4efe6");
  R(g, cx - 31, 36, 6, 1, "#f4efe6"); R(g, cx - 31, 46, 6, 1, "#f4efe6"); R(g, cx - 31, 36, 1, 11, "#f4efe6");
  R(g, cx + 26, 36, 6, 1, "#f4efe6"); R(g, cx + 26, 46, 6, 1, "#f4efe6"); R(g, cx + 31, 36, 1, 11, "#f4efe6");
  // the scoreboard on top
  R(g, cx - 17, 1, 34, 12, OUT);
  R(g, cx - 16, 2, 32, 10, "#1d2a3a");
  R(g, cx - 16, 2, 32, 1, "#3a4a60");
  for (const [px, py] of [[-12, 5], [-12, 8], [-9, 5], [-9, 8], [8, 5], [8, 8], [11, 5]]) R(g, cx + px, py, 2, 2, "#ffd24a");
  R(g, cx - 1, 6, 3, 1, "#ffd24a");
  R(g, cx - 12, 13, 2, 5, OUT); R(g, cx + 10, 13, 2, 5, OUT);
  // two light towers, one on each side
  for (const lx of [7, W - 9]) {
    R(g, lx, 12, 3, 40, OUT);
    R(g, lx + 1, 12, 1, 40, "#d0d4dc");
    R(g, lx - 5, 3, 13, 9, OUT);
    R(g, lx - 4, 4, 11, 7, "#8d95a3");
    for (let i = 0; i < 3; i++) { R(g, lx - 3 + i * 4, 5, 3, 2, "#fff6c0"); R(g, lx - 3 + i * 4, 8, 3, 2, "#fff6c0"); }
  }
  // the front wall, with a wide tunnel entrance where the door is
  R(g, 8, 56, W - 16, H - 56, OUT);
  R(g, 9, 57, W - 18, H - 58, "#dcd3bd");
  R(g, 9, 57, W - 18, 3, "#efe7d2");
  for (let x = 14; x < W - 14; x += 14) R(g, x, 62, 1, H - 64, "#c3b189");
  R(g, 8, 56, W - 16, 1, OUT);
  for (const fx of [16, W - 24]) { R(g, fx, 52, 1, 9, OUT); R(g, fx + 1, 52, 7, 4, "#d8402f"); R(g, fx + 1, 52, 7, 1, "#ff7a5c"); } // flags
  doorway(g, door * TILE + 2, H - 17, 12, 17, "#3a2f2a");
  R(g, door * TILE + 2, H - 17, 12, 3, "#c0503a");
  board(g, "SPORT", cx, 61);
  R(g, door * TILE, H - 1, 16, 1, OUT);
  return c;
}

/** Text twice as big (each pixel is a 2 x 2 square), for the marquee. */
function bigText(g: G, s: string, x: number, y: number, colour: string) {
  g.fillStyle = colour;
  let cx = x;
  for (const ch of s) {
    if (ch === " ") { cx += 4; continue; }
    const rows = FONT[ch] ?? FONT[" "];
    for (let i = 0; i < 15; i++) if (rows[i] === "1") g.fillRect(cx + (i % 3) * 2, y + Math.floor(i / 3) * 2, 2, 2);
    cx += 8;
  }
}

function theatre(w: number, h: number, door: number) {
  const c = makeCanvas(w * TILE, h * TILE);
  const g = ctxOf(c);
  const W = w * TILE, H = h * TILE;
  const cx = Math.round(W / 2);
  const BRICK = { light: "#b5493f", base: "#963a35", dark: "#6f2a2a" };
  // the roof edge, then the red brick front
  R(g, 2, 14, W - 4, 4, OUT);
  R(g, 3, 15, W - 6, 2, "#4a3a52");
  R(g, 2, 18, W - 4, H - 18, OUT);
  R(g, 3, 19, W - 6, H - 20, BRICK.base);
  for (let y = 22; y < H - 2; y += 4) for (let x = 4 + ((y >> 2) % 2) * 4; x < W - 5; x += 8) R(g, x, y, 1, 4, BRICK.dark);
  for (let y = 22; y < H - 2; y += 4) R(g, 4, y, W - 8, 1, BRICK.light);
  R(g, 3, 19, W - 6, 2, "#f1e6cc"); // cream trim under the roof
  // the marquee: a tall lit sign with a ring of bulbs and big letters
  R(g, cx - 31, 1, 62, 24, OUT);
  R(g, cx - 30, 2, 60, 22, "#7a1f2b");
  R(g, cx - 28, 4, 56, 18, OUT);
  R(g, cx - 27, 5, 54, 16, "#1d1a2e");
  for (let x = cx - 29; x <= cx + 27; x += 4) {
    const on = ((x - cx) / 4) % 2 === 0;
    R(g, x, 2, 2, 2, on ? "#ffe066" : "#fff6c0");
    R(g, x, 22, 2, 2, on ? "#fff6c0" : "#ffe066");
  }
  for (const y of [8, 14, 20]) { R(g, cx - 31, y - 1, 2, 2, "#ffe066"); R(g, cx + 29, y - 1, 2, 2, "#ffe066"); }
  bigText(g, "MOVIES", cx - 23, 9, "#ffe066");
  R(g, cx - 23, 20, 46, 1, "#c0503a");
  // searchlight beams from the roof corners
  for (const [bx, dir] of [[8, 1], [W - 9, -1]]) {
    R(g, bx - 2, 8, 5, 6, OUT); R(g, bx - 1, 9, 3, 4, "#8d95a3"); R(g, bx, 9, 1, 1, "#fff6c0");
    for (let i = 0; i < 6; i++) R(g, bx + dir * (i * 2 + 2), 7 - i, 2, 1, "rgba(255,246,192,0.7)");
  }
  // four posters in lit frames, two each side of the door
  const poster = (px: number, kind: number) => {
    const py = 29;
    R(g, px - 1, py - 1, 18, 25, OUT);
    R(g, px, py, 16, 23, "#ffe066");
    const bg = ["#2f6fb5", "#6b3fa0", "#2a7a4f", "#c0503a"][kind];
    R(g, px + 1, py + 1, 14, 21, bg);
    if (kind === 0) { disc(g, px + 8, py + 9, 4, "#f4efe6"); disc(g, px + 10, py + 8, 3, bg); R(g, px + 3, py + 4, 1, 1, "#fff"); R(g, px + 12, py + 14, 1, 1, "#fff"); } // moon
    else if (kind === 1) { R(g, px + 7, py + 3, 2, 12, "#f4efe6"); R(g, px + 5, py + 12, 6, 3, "#d8402f"); R(g, px + 6, py + 6, 4, 1, "#9fd0ff"); R(g, px + 7, py + 1, 2, 2, "#f4efe6"); } // rocket
    else if (kind === 2) { disc(g, px + 8, py + 9, 5, "#ffd24a"); R(g, px + 6, py + 8, 1, 1, OUT); R(g, px + 10, py + 8, 1, 1, OUT); R(g, px + 6, py + 11, 5, 1, OUT); } // smiling face
    else { for (let i = 0; i < 5; i++) { R(g, px + 7 - i, py + 3 + i * 2, 1 + i * 2, 2, i % 2 ? "#ffd24a" : "#ffb52b"); } } // a big star-ish triangle
    R(g, px + 2, py + 17, 12, 2, "#f4efe6"); // title scrawl
    R(g, px + 4, py + 20, 8, 1, "#f4efe6");
  };
  poster(6, 0); poster(26, 1); poster(W - 22, 2); poster(W - 42, 3);
  // the red carpet, with gold rope posts, and the doorway
  const dx = door * TILE;
  R(g, dx - 4, H - 24, 24, 5, OUT); // awning over the door
  for (let i = 0; i < 6; i++) R(g, dx - 3 + i * 4, H - 23, 4, 3, i % 2 ? "#f4efe6" : "#d8402f");
  doorway(g, dx + 2, H - 18, 12, 18, "#2a1d2e");
  R(g, dx + 3, H - 17, 10, 14, "#ffd98a"); // the warm light inside
  R(g, dx + 3, H - 17, 10, 3, "#ffefc0");
  R(g, dx + 7, H - 17, 2, 18, OUT); // the two doors meet
  R(g, dx + 1, H - 5, 14, 5, "#b3202c");
  R(g, dx + 1, H - 5, 14, 1, "#d8404c");
  R(g, dx, H - 1, 1, 1, OUT); R(g, dx + 15, H - 1, 1, 1, OUT);
  for (const px of [dx - 3, dx + 18]) { R(g, px, H - 10, 2, 10, "#ffd24a"); R(g, px - 1, H - 11, 4, 2, "#ffe066"); R(g, px - 1, H - 11, 4, 1, OUT); }
  R(g, dx - 2, H - 7, 3, 1, "#b3202c"); R(g, dx + 15, H - 7, 3, 1, "#b3202c");
  // the ticket booth on the left: striped awning and a lit window
  R(g, 6, H - 28, 30, 28, OUT);
  R(g, 7, H - 22, 28, 22, "#f1e6cc");
  for (let i = 0; i < 7; i++) R(g, 7 + i * 4, H - 27, 4, 6, i % 2 ? "#f4efe6" : "#2f6fb5");
  R(g, 12, H - 17, 18, 11, OUT); R(g, 13, H - 16, 16, 9, "#ffd98a"); R(g, 13, H - 16, 16, 2, "#ffefc0");
  R(g, 16, H - 11, 10, 2, WOOD.base); R(g, 16, H - 11, 10, 1, WOOD.light);
  R(g, 19, H - 15, 4, 3, "#e8b890"); // a very patient face
  R(g, 14, H - 5, 14, 1, OUT);
  // the popcorn stand on the right: red and white stripes with a heap of popcorn
  const px = W - 36;
  R(g, px, H - 24, 30, 24, OUT);
  R(g, px + 1, H - 18, 28, 18, "#f1e6cc");
  for (let i = 0; i < 7; i++) R(g, px + 1 + i * 4, H - 23, 4, 6, i % 2 ? "#f4efe6" : "#d8402f");
  for (let i = 0; i < 7; i++) R(g, px + 1 + i * 4, H - 17, 4, 12, i % 2 ? "#f4efe6" : "#d8402f");
  R(g, px + 7, H - 14, 16, 8, OUT); R(g, px + 8, H - 13, 14, 6, "#ffe066");
  for (const [qx, qy] of [[9, -17], [13, -19], [17, -17], [21, -19], [11, -21], [19, -21]]) disc(g, px + qx, H + qy, 2, "#fff6dc");
  R(g, px + 6, H - 1, 18, 1, OUT);
  return c;
}

// ---------- the arcade stops ----------
function cabinet(w: number, h: number): HTMLCanvasElement {
  const c = makeCanvas(w * TILE, h * TILE);
  const g = ctxOf(c);
  const x0 = Math.round((w * TILE - 22) / 2); // the cabinet is 22 wide, in the middle of its tiles
  R(g, x0 + 2, 29, 18, 3, "rgba(0,0,0,0.2)"); // shadow on the planks
  R(g, x0, 0, 22, 31, OUT);
  R(g, x0 + 1, 1, 20, 29, "#2b3a8f");
  R(g, x0 + 1, 1, 2, 29, "#4a5cc0");
  R(g, x0 + 3, 2, 16, 7, OUT);
  text(g, "PONG", x0 + 3 + Math.round((16 - textWidth("PONG")) / 2), 3, "#ffd24a");
  R(g, x0 + 4, 10, 14, 11, OUT);
  R(g, x0 + 5, 11, 12, 9, "#0d1a14");
  R(g, x0 + 6, 13, 1, 4, "#86f0a8"); R(g, x0 + 15, 14, 1, 4, "#86f0a8"); R(g, x0 + 10, 15, 2, 2, "#ffffff");
  R(g, x0 + 4, 22, 14, 6, "#1c2560");
  R(g, x0 + 6, 23, 1, 3, "#c9cbd0"); R(g, x0 + 5, 22, 3, 1, "#d8402f"); R(g, x0 + 11, 24, 2, 2, "#ffd24a"); R(g, x0 + 14, 24, 2, 2, "#d8402f");
  R(g, x0 + 1, 29, 20, 2, "#1c2560");
  return c;
}

function gate(w: number, h: number): HTMLCanvasElement {
  const c = makeCanvas(w * TILE, h * TILE);
  const g = ctxOf(c);
  const W = w * TILE;
  const hedge = "#2f7a30", dark = "#1d5a24", lit = "#48a843", hi = "#86d466";
  // a hedge wall across the whole top and down both sides
  const body = (x: number, y: number, ww: number, hh: number) => {
    R(g, x, y, ww, hh, OUT);
    R(g, x + 1, y + 1, ww - 2, hh - 2, hedge);
    R(g, x + 1, y + 1, ww - 2, 2, lit);
    for (let i = 0; i < ww * hh / 14; i++) {
      const px = x + 1 + (noise(i, x, 1) % (ww - 2)), py = y + 2 + (noise(i, y, 2) % (hh - 3));
      R(g, px, py, 1, 1, i % 3 ? dark : hi);
    }
  };
  body(0, 0, W, 16);
  body(0, 14, 16, 18);
  body(W - 16, 14, 16, 18);
  // carve a rounded archway above the spot
  const cx = W / 2;
  for (let y = 4; y < 32; y++) for (let x = 16; x < W - 16; x++) {
    const dx = (x + 0.5 - cx) / 12, dy = (y + 0.5 - 17) / 13;
    if (y >= 17 || dx * dx + dy * dy <= 1) g.clearRect(x, y, 1, 1);
  }
  // a peek of the maze inside the arch
  for (let y = 5; y < 17; y++) for (let x = 12 + 4; x < W - 16; x++) {
    const dx = (x + 0.5 - cx) / 11, dy = (y + 0.5 - 17) / 12;
    if (dx * dx + dy * dy <= 1) R(g, x, y, 1, 1, y < 9 ? "#16401b" : "#25602a");
  }
  R(g, cx - 5, 12, 10, 5, "#3a8a3a");
  R(g, cx - 3, 10, 6, 2, "#3a8a3a");
  board(g, "LABYRINTH", cx, 1);
  return c;
}

function airstrip(w: number, h: number, spot: [number, number], plane: [number, number]): HTMLCanvasElement {
  const c = makeCanvas(w * TILE, h * TILE);
  const g = ctxOf(c);
  const W = w * TILE, H = h * TILE;
  // tarmac
  fillPixels(c, (x, y) => {
    const n = noise(x, y, 123);
    return n % 9 === 0 ? "#5d636d" : n % 7 === 0 ? "#444a53" : "#4f555f";
  });
  R(g, 0, 0, W, 1, "#d8d2c0"); R(g, 0, H - 1, W, 1, "#d8d2c0");
  for (let x = 2; x < W; x += 14) R(g, x, H / 2 - 1, 8, 2, "#f4efe6"); // the dashed centre line
  text(g, "FLYOVER", 20, 4, "#f4efe6");
  // the parked plane (nose to the right), in the tiles marked Y
  const px = plane[0] * TILE, py = plane[1] * TILE;
  R(g, px + 3, py + 2, 28, 14, "rgba(0,0,0,0.22)"); // shadow
  R(g, px + 12, py + 0, 7, 16, OUT); R(g, px + 13, py + 1, 5, 14, "#f4f4f4"); // wings
  R(g, px + 2, py + 3, 4, 10, OUT); R(g, px + 3, py + 4, 2, 8, "#f4f4f4"); // tail
  R(g, px + 3, py + 5, 27, 6, OUT); R(g, px + 4, py + 6, 25, 4, "#f4f4f4"); // fuselage
  R(g, px + 4, py + 8, 25, 1, "#d8402f");
  R(g, px + 21, py + 6, 4, 2, "#7fc4e6"); // windscreen
  R(g, px + 30, py + 3, 1, 10, "#c9cbd0"); // propeller blur
  R(g, px + 13, py + 1, 1, 14, "#d8402f");
  void spot;
  return c;
}

function mirror(w: number, h: number): HTMLCanvasElement {
  const c = makeCanvas(w * TILE, h * TILE);
  const g = ctxOf(c);
  const cx = (w * TILE) / 2;
  // the mirror: a tall oval in a wooden frame, with a stand
  oval(g, cx, 7.5, 10, 8, OUT);
  oval(g, cx, 7.5, 9, 7, WOOD.light);
  oval(g, cx, 7.5, 7.5, 6, "#b9e3f5");
  oval(g, cx - 2, 6, 4, 3.5, "#dff4fc");
  // a hero's reflection: a head and a green shirt
  disc(g, cx + 1, 5.5, 2.4, "#f2c9a0"); R(g, cx - 1, 3, 5, 2, "#6b3f1d"); R(g, cx - 1, 8, 5, 4, "#3fae6a");
  R(g, cx - 6, 4, 2, 1, "#ffffff"); R(g, cx - 7, 5, 1, 2, "#ffffff");
  // flower pots at the sides
  for (const x of [3, w * TILE - 11]) { R(g, x, 4, 8, 8, OUT); R(g, x + 1, 5, 6, 6, "#c4452f"); R(g, x + 2, 0, 4, 4, "#2f7a30"); R(g, x + 3, 0, 2, 2, "#ffd24a"); }
  board(g, "HERO", cx, 14, "#f3e6c4", "#4a2f16");
  board(g, "WORKSHOP", cx, 22, "#f3e6c4", "#4a2f16");
  return c;
}


/** The arcade hall: a big blue building with a red striped roof, glowing screens and a double door. */
function hall(w: number, h: number, door: number): HTMLCanvasElement {
  const c = makeCanvas(w * TILE, h * TILE);
  const g = ctxOf(c);
  const W = w * TILE, H = h * TILE;
  // the roof, with stripes and a row of bulbs along its edge
  R(g, 0, 8, W, 20, OUT);
  R(g, 1, 9, W - 2, 18, "#c0392b");
  R(g, 1, 9, W - 2, 3, "#e0584a");
  for (let x = 5; x < W - 4; x += 12) R(g, x, 12, 6, 14, "#a82f22");
  for (let x = 4; x < W - 2; x += 8) { R(g, x, 25, 3, 3, OUT); R(g, x, 25, 2, 2, x % 16 === 4 ? "#ffd24a" : "#fff1b0"); }
  // the sign on the roof, in letters twice the usual size
  const label = "ARCADE";
  const lw = textWidth(label) * 2;
  R(g, W / 2 - lw / 2 - 5, 0, lw + 10, 16, OUT);
  R(g, W / 2 - lw / 2 - 4, 1, lw + 8, 14, "#1c2560");
  g.fillStyle = "#ffd24a";
  let cx = W / 2 - lw / 2;
  for (const ch of label) {
    const rows = FONT[ch] ?? FONT[" "];
    for (let i = 0; i < 15; i++) if (rows[i] === "1") g.fillRect(cx + (i % 3) * 2, 3 + Math.floor(i / 3) * 2, 2, 2);
    cx += 8;
  }
  // the walls
  R(g, 2, 28, W - 4, H - 28, OUT);
  R(g, 3, 29, W - 6, H - 29, "#3b4a7a");
  R(g, 3, 29, W - 6, 2, "#5566a0");
  R(g, 3, 29, 2, H - 29, "#5566a0");
  // the glowing screens either side of the door
  for (const x of [10, 28, 74, 92]) {
    R(g, x - 1, 38, 14, 18, OUT);
    R(g, x, 39, 12, 16, "#0d1a14");
    R(g, x + 1, 41, 3, 1, "#86f0a8"); R(g, x + 6, 44, 4, 1, "#ffd24a"); R(g, x + 2, 48, 2, 3, "#ff7a8a"); R(g, x + 7, 50, 3, 2, "#7fc4e6");
  }
  // the double door, with a step
  const dx = door * TILE;
  R(g, dx + 1, H - 28, 14, 28, OUT);
  R(g, dx + 2, H - 27, 12, 27, "#ffd24a");
  R(g, dx + 8, H - 27, 1, 27, OUT);
  R(g, dx + 4, H - 20, 3, 8, "#7fc4e6"); R(g, dx + 10, H - 20, 3, 8, "#7fc4e6");
  R(g, dx + 6, H - 12, 1, 2, OUT); R(g, dx + 10, H - 12, 1, 2, OUT);
  R(g, dx - 2, H - 3, 20, 3, "#cfc7b4");
  return c;
}

/**
 * A flag on a pole, flown from a roof once that subject has a challenge done. 16 wide and 22 tall;
 * the pole's foot is the bottom left. Two frames, so the flag ripples.
 */
export function makeFlag(colour: string, frame: number) {
  const c = makeCanvas(16, 22);
  const g = ctxOf(c);
  R(g, 0, 2, 3, 20, OUT);
  R(g, 1, 3, 1, 19, "#e9e4d6");
  R(g, 0, 0, 3, 3, OUT);
  R(g, 1, 1, 1, 1, "#ffd24a");
  const wave = frame ? 1 : 0;
  R(g, 3, 1, 13, 12, OUT);
  R(g, 4, 2 + wave, 11, 9, colour);
  R(g, 4, 2 + wave, 11, 2, "rgba(255,255,255,0.35)");
  R(g, 7, 5 + wave, 5, 4, "#f4efe6"); // a white patch on every flag
  R(g, 8, 6 + wave, 3, 2, colour);
  return c;
}

// ---------- put it all together ----------
export type SpriteKind = "lighthouse" | "observatory" | "museum" | "terminal" | "zoo" | "bandstand" | "stadium" | "theatre" | "cabinet" | "gate" | "airstrip" | "mirror" | "hall";

/**
 * Paint one building or stop. `w` and `h` are its size in tiles, found from the map. `door` is the
 * door's column inside the block (0 = leftmost). `extra` is only used by the airstrip: it says
 * which tile the plane sits on.
 */
export function drawSprite(kind: SpriteKind, w: number, h: number, door: number, extra?: { plane: [number, number] }): HTMLCanvasElement {
  switch (kind) {
    case "lighthouse": return lighthouse(w, h, door);
    case "observatory": return observatory(w, h, door);
    case "museum": return museum(w, h, door);
    case "terminal": return terminal(w, h, door);
    case "zoo": return zoo(w, h, door);
    case "bandstand": return bandstand(w, h, door);
    case "stadium": return stadium(w, h, door);
    case "theatre": return theatre(w, h, door);
    case "cabinet": return cabinet(w, h);
    case "gate": return gate(w, h);
    case "airstrip": return airstrip(w, h, [0, 0], extra?.plane ?? [1, 1]);
    case "mirror": return mirror(w, h);
    case "hall": return hall(w, h, door);
  }
}

export interface TileArt {
  grass: HTMLCanvasElement[];
  flowers: HTMLCanvasElement[];
  sand: HTMLCanvasElement[];
  gravel: HTMLCanvasElement[];
  dirt: HTMLCanvasElement[];
  sea: HTMLCanvasElement[][]; // [frame][variant]
  riverWater: HTMLCanvasElement[][];
  foam: HTMLCanvasElement[][]; // [frame][side]
  lip: HTMLCanvasElement[]; // [side]
  trees: HTMLCanvasElement[];
  rock: HTMLCanvasElement;
  sign: HTMLCanvasElement;
  bridge: HTMLCanvasElement;
  pier: HTMLCanvasElement[]; // [plain, top edge, bottom edge, both]
  pad: HTMLCanvasElement[];
  stampedPad: HTMLCanvasElement;
  gate: Record<string, HTMLCanvasElement>; // "open-x", "shut-y" and so on
  finish: Record<string, HTMLCanvasElement>;
  flags: HTMLCanvasElement[][]; // [colour][frame]
}

/** The flag colours, one per building in route order (they repeat if there are more buildings). */
export const FLAG_COLOURS = ["#d8402f", "#2f6fb5", "#7b4fb5", "#e08a1e", "#2f9e5a", "#d4559e", "#1f9aa8", "#c9a21c"];

export function makeTileArt(): TileArt {
  const range = (n: number) => Array.from({ length: n }, (_, i) => i);
  return {
    grass: range(6).map((v) => makeGrass(v)),
    flowers: ["#ff7aa8", "#ffffff", "#ffd24a", "#b58cff"].map((col, v) => makeGrass(v + 10, col)),
    sand: range(4).map(makeSand),
    gravel: range(4).map(makeGravel),
    dirt: range(3).map(makeDirt),
    sea: [0, 1].map((f) => range(4).map((v) => makeWater(f, v, false))),
    riverWater: [0, 1].map((f) => range(3).map((v) => makeWater(f, v, true))),
    foam: [0, 1].map((f) => range(4).map((s) => makeFoam(s, f))),
    lip: range(4).map(makeGrassLip),
    trees: range(3).map(makeTree),
    rock: makeRock(),
    sign: makeSign(),
    bridge: makeBridge(),
    pier: [makePier(false, false), makePier(true, false), makePier(false, true), makePier(true, true)],
    pad: [makeStopPad(0), makeStopPad(1)],
    stampedPad: makeStampedPad(),
    gate: { "open-x": makeGate(true, "x"), "shut-x": makeGate(false, "x"), "open-y": makeGate(true, "y"), "shut-y": makeGate(false, "y") },
    flags: FLAG_COLOURS.map((col) => [makeFlag(col, 0), makeFlag(col, 1)]),
    finish: { "open-x": makeFinish(true, "x"), "shut-x": makeFinish(false, "x"), "open-y": makeFinish(true, "y"), "shut-y": makeFinish(false, "y") },
  };
}
