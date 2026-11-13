// THE SIDE-ON HERO: Bluebottle, the deep-sea-green one-eyed alien from hero-art.ts, drawn from the side for the platformer.
//
// The picture is ONE row of 10 frames, all facing RIGHT (the game flips it for left):
//   1-2 stand (breathing)   3-6 run   7 jump (going up)   8 fall   9 land   10 hurt
// Each frame is 32 x 32 to start with, so the sheet is 320 x 32. A taller hero works too: the game
// takes frame width = picture width / 10 and frame height = picture height. Feet sit on the bottom
// row of every frame. Empty pixels are see-through. See "The side-on hero" in docs/arcade-art.md.
//
// This file does three jobs:
//   1. draws the built-in hero (Bluebottle) in code (makeSideHeroSheet), so the game works before anyone draws
//   2. makes a blank labelled template to draw on (makeSideTemplate)
//   3. loads the hero the game should use (loadSideHero): this device's upload, else
//      public/arcade/hero-side.png, else the built-in Bluebottle
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
// Drawing Bluebottle
// ---------------------------------------------------------------------------------------------
// Bluebottle is built from rounded parts (a big head, a small body, stumpy limbs, two long ears),
// stacked back to front. Every part is a "mask" (a set of pixels). paint() gives a mask a 1 px dark
// outline, a flat fill, one shade on its lower right and a light rim on its upper left, the same
// crisp look as the rest of the arcade art. Colours come from the palette letters in hero-art.ts,
// so recolouring in the Workshop still works.

const N = SIDE_FRAME;
type Pt = [number, number];
type Mask = Map<number, [number, number, number]>; // key -> [x, y, how far along a limb or ear (0 to 1)]
type Grid = (string | null)[];

const keyOf = (x: number, y: number) => (y + 300) * 1000 + (x + 300);
const inMask = (m: Mask, x: number, y: number) => m.has(keyOf(x, y));

function mix(a: string, b: string, t: number) {
  const p = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  const ch = (i: number) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, "0");
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

/** An ellipse with its centre at (cx, cy) and radii rx and ry. */
function ell(cx: number, cy: number, rx: number, ry: number): Mask {
  const m: Mask = new Map();
  for (let y = Math.floor(cy - ry) - 1; y <= cy + ry + 1; y++)
    for (let x = Math.floor(cx - rx) - 1; x <= cx + rx + 1; x++)
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) m.set(keyOf(x, y), [x, y, 0]);
  return m;
}

/** A thick line with round ends, running through the points and growing from radius r0 to r1. */
function cap(pts: Pt[], r0: number, r1: number): Mask {
  const m: Mask = new Map();
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    lens.push(d);
    total += d;
  }
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const n = Math.max(2, Math.ceil(lens[i - 1] * 3));
    for (let s = 0; s <= n; s++) {
      const f = s / n;
      const t = (acc + lens[i - 1] * f) / total;
      const cx = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f;
      const cy = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f;
      const r = r0 + (r1 - r0) * t;
      for (let y = Math.floor(cy - r) - 1; y <= cy + r + 1; y++)
        for (let x = Math.floor(cx - r) - 1; x <= cx + r + 1; x++)
          if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) {
            const o = m.get(keyOf(x, y));
            if (!o || o[2] < t) m.set(keyOf(x, y), [x, y, t]);
          }
    }
    acc += lens[i - 1];
  }
  return m;
}

interface PaintOpts {
  f?: string; s?: string; h?: string; // fill, shade and rim colours (names, see colours below)
  st?: number; // how thick the shade is
  hi?: boolean; // light rim on the upper left
  ring?: string | null; // outline colour
  tip?: { from: number; c: string; s: string }; // a different colour at the far end of an ear
}

type Pose = {
  b: number; lx?: number; e: "stand" | "up" | "down" | "jump" | "fall" | "land" | "hurt"; earDy?: number;
  nl: [number, number, number]; fl: [number, number, number]; // near and far leg: hip x, foot x, foot y
  na: Pt; fa: Pt; // near and far arm: where the hand ends, from the shoulder
  face?: "calm" | "ouch"; headDx?: number; squash?: boolean;
};

// The two long ears, as a line of points from the head. Swept back like long hair.
const EARS: Record<Pose["e"], Pt[]> = {
  stand: [[12, 7], [8.5, 7.5], [5, 9], [3, 12.5]],
  up: [[12, 7], [8.5, 6], [5.5, 5.5], [3, 6.5]],
  down: [[12, 7], [8.5, 9], [5.5, 12], [3.2, 16.5]],
  jump: [[12, 7], [9, 10], [6.2, 14], [4.2, 19.5]],
  fall: [[12, 7], [9.5, 4], [7, 2.6], [4, 3.2]],
  land: [[12, 7], [8.5, 9.5], [5.5, 13], [3.2, 17.5]],
  hurt: [[12, 7], [9.5, 4.6], [7.2, 3.6], [4.5, 4.2]],
};

function drawFrame(pose: Pose, pal: Record<string, string>): Grid {
  const o = pal.o;
  // every colour Bluebottle uses; the shades that have no palette letter are made from the ones that do
  const C: Record<string, string> = {
    O: o, B: pal.b, D: pal.d, D2: mix(pal.d, o, 0.4), L: pal.l, P: pal.p, P2: mix(pal.p, pal.b, 0.35),
    T: pal.t, T2: pal.u, W: pal.w, V: mix(pal.w, pal.b, 0.2), E: pal.e, I: mix(pal.e, pal.b, 0.5), K: pal.k,
  };
  const g: Grid = new Array(N * N).fill(null);
  let ox = 0;
  const set = (x: number, y: number, c: string) => {
    x += ox;
    if (x >= 0 && y >= 0 && x < N && y < N) g[y * N + x] = C[c];
  };
  const paint = (m: Mask, a: PaintOpts = {}) => {
    const f = a.f ?? "B", s = a.s ?? "D", h = a.h ?? "L", st = a.st ?? 1, ring = a.ring === undefined ? "O" : a.ring;
    if (ring) for (const [x, y] of m.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!inMask(m, x + dx, y + dy)) set(x + dx, y + dy, ring);
    for (const [x, y, t] of m.values()) {
      let c = f;
      let shaded = false;
      for (let k = 1; k <= st; k++) if (!inMask(m, x + k, y + k)) shaded = true;
      if (shaded) c = s;
      else if (a.hi && !inMask(m, x - 1, y - 1)) c = h;
      if (a.tip && t >= a.tip.from) c = shaded ? a.tip.s : a.tip.c;
      set(x, y, c);
    }
  };
  const b = pose.b;
  const lx = pose.lx ?? 0;
  const ear = pose.earDy ?? 0;
  const E = EARS[pose.e].map(([x, y], i): Pt => [x, y + (i ? ear : 0)]);
  const far = E.map(([x, y], i): Pt => (i ? [x + 2.5, y - 1.5] : [x, y]));
  const earO: PaintOpts = { hi: true, st: 1, tip: { from: 0.62, c: "T", s: "T2" } };
  const leg = (hip: number, fx: number, fy: number, near: boolean) =>
    paint(cap([[hip, 24.5 + b], [fx, fy]], 2.1, 2.1), near ? { hi: true } : { f: "D", s: "D2", h: "D" });
  const dx = pose.headDx ?? 0;

  // back to front: far ear, far leg, far arm, body, near leg, near arm, head, near ear, face
  ox = lx + dx;
  paint(cap(far.map(([x, y]): Pt => [x, y + b]), 1.6, 2.2), { ...earO, f: "D", s: "D2", h: "D", tip: { from: 0.62, c: "T2", s: "D2" } });
  ox = 0;
  leg(pose.fl[0], pose.fl[1], pose.fl[2], false);
  paint(cap([[16, 21 + b], [16 + pose.fa[0], 21 + b + pose.fa[1]]], 1.7, 1.7), { f: "D", s: "D2", h: "D" });
  paint(ell(15.5, 22.6 + b, 6.2, pose.squash ? 4.0 : 4.6), { hi: true, st: 1 });
  paint(ell(18.8, 22.8 + b, 3, 3.4), { f: "P", s: "P2", ring: null });
  leg(pose.nl[0], pose.nl[1], pose.nl[2], true);
  paint(cap([[17.5, 21.5 + b], [17.5 + pose.na[0], 21.5 + b + pose.na[1]]], 1.8, 1.8), { hi: true });

  ox = lx + dx;
  const head = ell(16, 12.6 + b, 10.5, 8.5);
  paint(head, { hi: true, st: 1 });
  paint(cap(E.map(([x, y]): Pt => [x, y + b]), 1.7, 2.3), earO);

  // the eye: round and open at the top, big pupil sitting a little low, shine top left
  paint(ell(20.6, 12.6 + b, 5.4, 5.3), { f: "W", s: "V", st: 1, ring: "D" });
  const px = (x: number, y: number, c: string) => set(x, y + b, c);
  if (pose.face === "ouch") {
    // eye squeezed shut: a fat ">" over the white, like a cartoon "ow"
    for (const [x, y] of [[19, 10], [20, 11], [21, 12], [22, 13], [21, 14], [20, 15], [19, 16], [20, 10], [21, 11], [22, 12], [21, 13], [20, 14], [19, 15]]) px(x, y, "E");
    for (const [x, y] of [[13, 17], [14, 17], [15, 17], [13, 18], [14, 18], [15, 18]]) px(x, y, "K");
    for (const [x, y] of [[22, 19], [23, 19], [22, 20], [23, 20]]) px(x, y, "O"); // open mouth
  } else {
    const pu = ell(22, 14 + b, 3.5, 3.5);
    paint(pu, { f: "E", ring: null, st: 0 });
    for (const [x, y] of pu.values()) if (!inMask(pu, x, y - 2) && y >= 16 + b) set(x, y, "I");
    for (const [x, y] of [[20, 12], [21, 12], [20, 13], [21, 13]]) px(x, y, "W"); // shine
    px(23, 16, "W"); // sparkle
    for (const [x, y] of [[13, 17], [14, 17], [15, 17], [13, 18], [14, 18], [15, 18]]) px(x, y, "K"); // blush
    // the smile: a small "w"
    const q = ell(23.5, 19.6 + b, 3.4, 1.9);
    for (const k of [...q.keys()]) if (!head.has(k)) q.delete(k);
    paint(q, { ring: null, st: 0 });
    for (const [x, y] of [[22, 19], [23, 20], [24, 20], [25, 19]]) px(x, y, "O");
  }
  ox = 0;
  return g;
}

// The poses. b is how far the body bobs down; lx how far the head leads forward (the legs stay put).
const POSES: Pose[] = [
  { b: 0, nl: [12, 12, 28.3], fl: [19, 19, 28.3], na: [1, 4], fa: [0, 4], e: "stand" }, // stand: breathing in
  { b: 0, nl: [12, 12, 28.3], fl: [19, 19, 28.3], na: [1, 4], fa: [0, 4], e: "stand", earDy: 1 }, // breathing out: the ears drift down 1 px
  { b: 0, lx: 1, nl: [13.5, 19.5, 28.3], fl: [17.5, 8.5, 26.4], na: [-4, 2], fa: [4, 2], e: "up" }, // run: stride, ears up
  { b: 1, nl: [13, 13, 28.3], fl: [18.5, 20.5, 25.6], na: [-1, 4], fa: [1, 4], e: "down" }, // dip, ears down
  { b: 0, lx: 1, nl: [13.5, 8.5, 26.4], fl: [17.5, 20.5, 28.3], na: [4, 2], fa: [-4, 2], e: "up" }, // stride, legs swapped
  { b: 1, nl: [13, 19.5, 25.6], fl: [18.5, 18.5, 28.3], na: [1, 4], fa: [-1, 4], e: "down" }, // dip, legs swapped
  { b: -1, nl: [13.5, 10.5, 25.8], fl: [17.5, 21.5, 23.6], na: [4, -1], fa: [4, -2], e: "jump" }, // jump: ears stream down and back
  { b: 1, nl: [13.5, 10, 28.3], fl: [18, 22.5, 28.3], na: [4, -3], fa: [3, -4], e: "fall" }, // fall: ears float up
  { b: 2, nl: [11.5, 8.5, 28.3], fl: [19.5, 22.5, 28.3], na: [4, 3], fa: [-3, 3], e: "land", squash: true }, // land: squashed, ears bounce down
  { b: 0, nl: [14, 17, 28.3], fl: [17.5, 12, 28.3], na: [5, -2], fa: [-3, -3], e: "hurt", face: "ouch", headDx: -1 }, // hurt: ears flung up
];

/**
 * The built-in side-on hero's picture sheet: Bluebottle, 10 frames in one row, 320 x 32, facing
 * right. The colours come from the top-down hero (hero-art.ts), so they read as the same
 * character. Pass a different palette to recolour it.
 */
export function makeSideHeroSheet(palette: Record<string, string> = HERO_PALETTE) {
  const sheet = makeCanvas(SIDE_FRAME * SIDE_FRAMES, SIDE_FRAME);
  const g = sheet.getContext("2d")!;
  POSES.forEach((pose, f) => {
    drawFrame(pose, palette).forEach((col, k) => {
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
