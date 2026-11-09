// THE SIDE-ON HERO: the same island hero as hero-art.ts, drawn from the side for the platformer.
//
// The picture is ONE row of 10 frames, all facing RIGHT (the game flips it for left):
//   1-2 stand (breathing)   3-6 run   7 jump (going up)   8 fall   9 land   10 hurt
// Each frame is 32 x 32 to start with, so the sheet is 320 x 32. A taller hero works too: the game
// takes frame width = picture width / 10 and frame height = picture height. Feet sit on the bottom
// row of every frame. Empty pixels are see-through. See "The side-on hero" in docs/arcade-art.md.
//
// This file does three jobs:
//   1. draws a placeholder hero in code (makeSideHeroSheet), so the game works before anyone draws
//   2. makes a blank labelled template to draw on (makeSideTemplate)
//   3. loads the hero the game should use (loadSideHero): this device's upload, else
//      public/arcade/hero-side.png, else the placeholder
import { HERO_PALETTE } from "./hero-art";
import { makeCanvas } from "./kit";

export const SIDE_FRAMES = 10;
export const SIDE_FRAME = 32;

/** The ten poses in sheet order, with a short note for the labels. */
export const SIDE_POSES: { name: string; note: string }[] = [
  { name: "Stand", note: "breathing in" },
  { name: "Stand", note: "breathing out" },
  { name: "Run", note: "stride" },
  { name: "Run", note: "dip" },
  { name: "Run", note: "stride, legs swapped" },
  { name: "Run", note: "dip, legs swapped" },
  { name: "Jump", note: "going up" },
  { name: "Fall", note: "coming down" },
  { name: "Land", note: "squashed" },
  { name: "Hurt", note: "ouch" },
];

// ---------------------------------------------------------------------------------------------
// Drawing the placeholder
// ---------------------------------------------------------------------------------------------

const N = SIDE_FRAME;
type Pt = [number, number];
/** One body part drawn on its own, so parts can be stacked front to back. */
type Layer = Map<number, string>;
type Grid = (string | null)[];

function put(l: Layer, x: number, y: number, c: string) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= N || y >= N) return;
  l.set(y * N + x, c);
}
function box(l: Layer, x: number, y: number, w: number, h: number, c: string) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(l, x + i, y + j, c);
}
/** A thick line made of little squares: used for arms and legs. */
function seg(l: Layer, a: Pt, b: Pt, w: number, c: string) {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
  const o = -Math.floor((w - 1) / 2);
  for (let i = 0; i <= n; i++) box(l, a[0] + ((b[0] - a[0]) * i) / n + o, a[1] + ((b[1] - a[1]) * i) / n + o, w, w, c);
}

function mix(a: string, b: string, t: number) {
  const p = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  const ch = (i: number) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, "0");
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

/** Put a part on the picture. A "carve" part also draws a thin outline where it sits over another part. */
function stamp(g: Grid, l: Layer, carve: boolean, outline: string) {
  const ring: number[] = [];
  if (carve) {
    for (const k of l.keys()) {
      const x = k % N;
      const y = (k - x) / N;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const nk = ny * N + nx;
        if (!l.has(nk) && g[nk]) ring.push(nk);
      }
    }
  }
  for (const [k, c] of l) g[k] = c;
  for (const k of ring) g[k] = outline;
}

// The head, facing right: 12 wide, 10 tall. h hair, H hair highlight, s skin, e eye, m mouth.
const HEAD = [
  "...hHHhhhh..",
  "..hHHhhhhhh.",
  ".hhhhhhhhhhh",
  ".hhhhhhhhsss",
  ".hhhhhhhsess",
  ".hhhhhhhsess",
  "..hhhhhhssss",
  "...hhhhsssms",
  "....hhssss..",
  ".....sss....",
];

type Face = "calm" | "wow" | "ouch";

interface Pose {
  hip: Pt; // where the legs start
  sh: Pt; // top of the body, under the head
  legB: [Pt, Pt]; // the far leg: knee, then where the sole of the shoe sits
  legF: [Pt, Pt]; // the near leg
  armB: [Pt, Pt]; // the far arm: elbow, hand
  armF: [Pt, Pt]; // the near arm
  face?: Face;
  headDx?: number;
}

function drawFrame(pose: Pose, pal: Record<string, string>): Grid {
  const out = pal.o;
  const c = {
    hair: pal.h, hairHi: mix(pal.h, "#ffffff", 0.22), skin: pal.s, skinDk: mix(pal.s, out, 0.22), eye: pal.e,
    mouth: mix(pal.s, "#b5503c", 0.6), shirt: pal.t, shirtDk: mix(pal.t, out, 0.3), belt: pal.b,
    buckle: mix(pal.b, "#ffffff", 0.45), trou: pal.l, trouDk: mix(pal.l, out, 0.35), shoe: pal.k, shoeDk: mix(pal.k, out, 0.35),
  };
  const g: Grid = new Array(N * N).fill(null);
  const [hx, hy] = pose.hip;
  const [sx, sy] = pose.sh;

  const arm = (l: Layer, [el, ha]: [Pt, Pt], dark: boolean) => {
    const s: Pt = [sx, sy + 1];
    seg(l, s, el, 2, dark ? c.shirtDk : c.shirt);
    seg(l, el, ha, 2, dark ? c.skinDk : c.skin);
  };
  const leg = (l: Layer, [knee, foot]: [Pt, Pt], dark: boolean) => {
    seg(l, [hx, hy], knee, 3, dark ? c.trouDk : c.trou);
    seg(l, knee, [foot[0], foot[1] - 2], 3, dark ? c.trouDk : c.trou);
    box(l, foot[0] - 2, foot[1] - 1, 5, 1, dark ? c.shoeDk : c.shoe);
    box(l, foot[0] - 2, foot[1], 6, 1, dark ? c.shoeDk : c.shoe);
  };

  // back to front: far arm, far leg, near leg, body (hides the tops of the legs), head, near arm
  let l: Layer = new Map();
  arm(l, pose.armB, true);
  stamp(g, l, false, out);

  l = new Map();
  leg(l, pose.legB, true);
  stamp(g, l, false, out);

  l = new Map();
  leg(l, pose.legF, false);
  stamp(g, l, true, out);

  l = new Map();
  const rows = hy - sy;
  for (let r = 0; r < rows; r++) {
    const cx = Math.round(sx + ((hx - sx) * r) / Math.max(1, rows - 1));
    const last = r === rows - 1;
    for (let x = cx - 3; x <= cx + 3; x++) put(l, x, sy + r, last ? (x === cx + 2 ? c.buckle : c.belt) : x === cx - 3 ? c.shirtDk : c.shirt);
  }
  box(l, hx - 2, hy, 5, 1, c.trou);
  stamp(g, l, false, out);

  l = new Map();
  const x0 = sx - 6 + (pose.headDx ?? 0);
  const y0 = sy - 9;
  const key: Record<string, string> = { h: c.hair, H: c.hairHi, s: c.skin, e: c.eye, m: c.mouth };
  HEAD.forEach((row, j) => [...row].forEach((ch, i) => key[ch] && put(l, x0 + i, y0 + j, key[ch])));
  const face = pose.face ?? "calm";
  if (face !== "calm") {
    put(l, x0 + 9, y0 + 7, c.eye); // open mouth
    put(l, x0 + 10, y0 + 7, c.eye);
  }
  if (face === "ouch") {
    // eyes squeezed shut: a little ">" instead of two dots
    put(l, x0 + 9, y0 + 4, c.skin);
    put(l, x0 + 9, y0 + 5, c.skin);
    for (const [i, j] of [[8, 4], [9, 5], [8, 6]]) put(l, x0 + i, y0 + j, c.eye);
  }
  stamp(g, l, false, out);

  l = new Map();
  arm(l, pose.armF, false);
  stamp(g, l, true, out);

  // the outline goes round the whole hero last
  const edge: number[] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (g[y * N + x]) continue;
    if ((x > 0 && g[y * N + x - 1]) || (x < N - 1 && g[y * N + x + 1]) || (y > 0 && g[(y - 1) * N + x]) || (y < N - 1 && g[(y + 1) * N + x])) edge.push(y * N + x);
  }
  for (const k of edge) g[k] = out;
  return g;
}

// Arm swings for running, measured from the shoulder (sx, sy + 1).
const rel = (s: Pt, dx: number, dy: number): Pt => [s[0] + dx, s[1] + dy];
function swing(sh: Pt, kind: "back" | "down" | "fwd" | "mid"): [Pt, Pt] {
  const s: Pt = [sh[0], sh[1] + 1];
  if (kind === "back") return [rel(s, -3, 3), rel(s, -5, 1)];
  if (kind === "down") return [rel(s, -1, 4), rel(s, 1, 7)];
  if (kind === "fwd") return [rel(s, 3, 3), rel(s, 6, 1)];
  return [rel(s, 1, 4), rel(s, 4, 4)];
}

// The near leg's four poses. The far leg shows the pose two frames along, so the legs swap
// every two frames and the four frames loop into a proper run: reach, push off, tuck, swing.
const RUN_LEG: [Pt, Pt][] = [
  [[20, 25], [23, 30]], // reach forward, heel down
  [[19, 26], [17, 30]], // under the body, knee bent, weight on it
  [[15, 26], [11, 29]], // pushing off behind, toe down
  [[18, 26], [13, 28]], // foot tucked up behind, swinging through
];
const RUN_HIP_Y = [21, 23, 21, 23];
const RUN_ARM: ("back" | "down" | "fwd" | "mid")[] = ["back", "down", "fwd", "mid"];

function poses(): Pose[] {
  const list: Pose[] = [];
  // 1-2 stand: the second frame drops the shoulders and head by a pixel
  for (const dy of [0, 1]) {
    const sh: Pt = [16, 14 + dy];
    list.push({
      hip: [16, 22], sh, legB: [[15, 25], [13, 30]], legF: [[17, 25], [18, 30]],
      armB: [rel([16, sh[1] + 1], 0, 3), rel([16, sh[1] + 1], -1, 6)], armF: [rel([16, sh[1] + 1], 1, 3), rel([16, sh[1] + 1], 2, 6)],
    });
  }
  // 3-6 run
  for (let i = 0; i < 4; i++) {
    const hip: Pt = [16, RUN_HIP_Y[i]];
    const sh: Pt = [18, hip[1] - 8];
    list.push({
      hip, sh, legF: RUN_LEG[i], legB: RUN_LEG[(i + 2) % 4],
      armF: swing(sh, RUN_ARM[i]), armB: swing(sh, RUN_ARM[(i + 2) % 4]),
    });
  }
  // 7 jump: knees up, arms flung forward and back
  list.push({
    hip: [16, 19], sh: [17, 11], legF: [[22, 21], [21, 27]], legB: [[14, 23], [10, 26]],
    armF: [[21, 14], [25, 10]], armB: [[12, 15], [8, 13]],
  });
  // 8 fall: arms up, legs dangling
  list.push({
    hip: [16, 21], sh: [16, 13], legF: [[18, 25], [20, 29]], legB: [[14, 25], [12, 28]],
    armF: [[23, 13], [26, 7]], armB: [[9, 13], [6, 7]], face: "wow",
  });
  // 9 land: squashed, knees out, arms out for balance
  list.push({
    hip: [16, 26], sh: [18, 20], legF: [[21, 26], [22, 30]], legB: [[11, 26], [10, 30]],
    armF: [[22, 23], [25, 24]], armB: [[13, 24], [10, 23]],
  });
  // 10 hurt: thrown back, eyes squeezed shut, arms flung out
  list.push({
    hip: [17, 22], sh: [14, 14], legF: [[19, 25], [21, 28]], legB: [[16, 26], [13, 30]],
    armF: [[20, 15], [24, 12]], armB: [[10, 17], [6, 15]], face: "ouch", headDx: -1,
  });
  return list;
}

/**
 * The placeholder hero's picture sheet: 10 frames in one row, 320 x 32, facing right.
 * The colours come from the top-down hero, so they read as the same person. Pass a different
 * palette to recolour it.
 */
export function makeSideHeroSheet(palette: Record<string, string> = HERO_PALETTE) {
  const sheet = makeCanvas(SIDE_FRAME * SIDE_FRAMES, SIDE_FRAME);
  const g = sheet.getContext("2d")!;
  poses().forEach((pose, f) => {
    const grid = drawFrame(pose, palette);
    grid.forEach((col, k) => {
      if (!col) return;
      g.fillStyle = col;
      g.fillRect(f * SIDE_FRAME + (k % N), Math.floor(k / N), 1, 1);
    });
  });
  return sheet;
}

// ---------------------------------------------------------------------------------------------
// The blank template
// ---------------------------------------------------------------------------------------------

const DIGITS = [
  "111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001",
  "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111",
];

/**
 * A blank sheet with faint guide lines: a light-blue box edge on the left and top of each frame,
 * a pink dotted line for the ground on the bottom row, a dotted centre line, and the frame number.
 * It is only a guide: rub the lines out before you export.
 */
export function makeSideTemplate(frameW = SIDE_FRAME, frameH = SIDE_FRAME) {
  const sheet = makeCanvas(frameW * SIDE_FRAMES, frameH);
  const g = sheet.getContext("2d")!;
  for (let f = 0; f < SIDE_FRAMES; f++) {
    const ox = f * frameW;
    g.fillStyle = "#a9d4f5";
    g.fillRect(ox, 0, 1, frameH);
    g.fillRect(ox, 0, frameW, 1);
    g.fillStyle = "#f5a9c0";
    for (let x = 0; x < frameW; x += 2) g.fillRect(ox + x, frameH - 1, 1, 1);
    g.fillStyle = "#c9d6e2";
    for (let y = 2; y < frameH - 1; y += 3) g.fillRect(ox + Math.floor(frameW / 2), y, 1, 1);
    g.fillStyle = "#f5a9c0";
    let px = ox + 3;
    for (const d of String(f + 1)) {
      const bits = DIGITS[Number(d)];
      for (let k = 0; k < 15; k++) if (bits[k] === "1") g.fillRect(px + (k % 3), 3 + Math.floor(k / 3), 1, 1);
      px += 4;
    }
  }
  return sheet;
}

// ---------------------------------------------------------------------------------------------
// Loading the hero the game should use
// ---------------------------------------------------------------------------------------------

// A hero tried out in the Hero Workshop is kept in this browser, as a picture written out as text.
const SAVED_SIDE_HERO = "learning-arcade:hero-side";
export function loadSavedSideHero(): string | null {
  try {
    return localStorage.getItem(SAVED_SIDE_HERO);
  } catch {
    return null;
  }
}
export function saveSideHero(dataUrl: string | null): boolean {
  try {
    if (dataUrl) localStorage.setItem(SAVED_SIDE_HERO, dataUrl);
    else localStorage.removeItem(SAVED_SIDE_HERO);
    return true;
  } catch {
    return false;
  }
}

// When a frame is left empty, the game borrows the nearest pose that IS drawn, in this order.
const BORROW: number[][] = [
  [1, 2, 3, 4, 5, 8, 6, 7, 9], // stand 1: the other stand, then run 1
  [0, 2, 3, 4, 5, 8, 6, 7, 9],
  [3, 4, 5, 6, 0, 1, 7, 8, 9], // run frames: another run frame, then jump, then stand
  [2, 4, 5, 6, 0, 1, 7, 8, 9],
  [3, 5, 2, 6, 0, 1, 7, 8, 9],
  [4, 3, 2, 6, 0, 1, 7, 8, 9],
  [7, 2, 3, 4, 5, 0, 1, 8, 9], // jump: fall, then run
  [6, 2, 3, 4, 5, 0, 1, 8, 9], // fall: jump
  [0, 1, 2, 3, 4, 5, 6, 7, 9], // land: stand
  [7, 8, 6, 0, 1, 2, 3, 4, 5], // hurt: fall
];

/** For each of the 10 poses, which frame to really draw (its own if it has pixels, else the nearest drawn one). */
export function resolveFrames(drawn: boolean[]): number[] {
  if (!drawn.some(Boolean)) return drawn.map((_, i) => i);
  return drawn.map((ok, i) => (ok ? i : (BORROW[i].find((j) => drawn[j]) ?? i)));
}

/** Which frames have any visible pixel. Returns all true if the pixels can't be read. */
export function drawnFrames(image: CanvasImageSource, frameW: number, frameH: number): boolean[] {
  try {
    const c = makeCanvas(frameW * SIDE_FRAMES, frameH);
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(image, 0, 0);
    return Array.from({ length: SIDE_FRAMES }, (_, f) => {
      const d = g.getImageData(f * frameW, 0, frameW, frameH).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
      return false;
    });
  } catch {
    return new Array(SIDE_FRAMES).fill(true);
  }
}

export interface SideHero {
  image: CanvasImageSource;
  frameW: number;
  frameH: number;
  /** For each of the 10 poses, the frame number (0-9) to draw. Empty frames borrow a nearby pose. */
  frameMap: number[];
  /** Where it came from: this device's upload, the file in the project, or the built-in placeholder. */
  source: "device" | "file" | "starter";
}

function readImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Is this picture a usable sheet (width divisible by 10, frames at least 8 pixels)? */
export function sideSheetSize(w: number, h: number): { frameW: number; frameH: number } | null {
  if (w % SIDE_FRAMES || w / SIDE_FRAMES < 8 || h < 8) return null;
  return { frameW: w / SIDE_FRAMES, frameH: h };
}

function fromImage(img: HTMLImageElement, source: SideHero["source"]): SideHero | null {
  const size = sideSheetSize(img.naturalWidth, img.naturalHeight);
  if (!size) return null;
  return { image: img, ...size, frameMap: resolveFrames(drawnFrames(img, size.frameW, size.frameH)), source };
}

/**
 * The side-on hero the platformer should draw: a hero saved on this device first, then
 * public/arcade/hero-side.png, then the built-in placeholder. Never fails.
 */
export async function loadSideHero(): Promise<SideHero> {
  const saved = loadSavedSideHero();
  if (saved) {
    const img = await readImage(saved);
    const hero = img && fromImage(img, "device");
    if (hero) return hero;
  }
  const img = await readImage(`${import.meta.env.BASE_URL}arcade/hero-side.png`);
  const hero = img && fromImage(img, "file");
  if (hero) return hero;
  return {
    image: makeSideHeroSheet(), frameW: SIDE_FRAME, frameH: SIDE_FRAME,
    frameMap: Array.from({ length: SIDE_FRAMES }, (_, i) => i), source: "starter",
  };
}
