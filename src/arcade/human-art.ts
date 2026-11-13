// THE FIRST HUMAN BLUEBOTTLE MEETS: the original starter hero (a kid with brown hair, a green shirt and
// blue trousers), kept as a future character. Nothing in the game uses him yet; he is here so his drawing
// is not lost. Bluebottle, the deep-sea-green one-eyed alien, is the starter hero now (hero-art.ts and hero-side-art.ts).
//
//   makeHumanSheet()      top-down, 32 x 64: 2 walking frames x 4 directions of 16 x 16 (same layout as hero-art.ts)
//   makeHumanSideSheet()  side-on, 320 x 32: 10 frames facing right (same layout as hero-side-art.ts)
import { makeCanvas, paint } from "./kit";
import { SIDE_FRAME, SIDE_FRAMES } from "./hero-side-art";

const TILE = 16;

// The hero is 16 rows: 12 for the head and body, 4 for the legs. Two leg poses make him walk.
export const HUMAN_PALETTE: Record<string, string> = {
  o: "#1c1410", h: "#6b3f1d", s: "#f2c9a0", e: "#1c1410", t: "#3fae6a",
  b: "#d9a441", l: "#34437d", k: "#5a3417",
};
const HUMAN_FRONT = [
  "................",
  "....oooooooo....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "...ohssssssho...",
  "...osesssseso...",
  "...osssssssso...",
  ".....osssso.....",
  "....ottttttto...",
  "...osttttttso...",
  "...osbbbbbbso...",
  "....ottttttto...",
];
const HUMAN_BACK = [
  "................",
  "....oooooooo....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  ".....ohhhho.....",
  "....ottttttto...",
  "...osttttttso...",
  "...osbbbbbbso...",
  "....ottttttto...",
];
const HUMAN_SIDE = [
  "................",
  "....ooooooo.....",
  "...ohhhhhhho....",
  "...ohhhhhhhho...",
  "...ohhhhssssso..",
  "...ohhhhsesssso.",
  "...ohhhhssssso..",
  "....ohhhsssso...",
  "....ottttttto...",
  "....otttttttso..",
  "....obbbbbbbso..",
  "....ottttttto...",
];
const HUMAN_LEGS_FRONT = [
  ["....ollllllo....", "....olll.llo....", "....okkk..oo....", "....oooo........"],
  ["....ollllllo....", "....ollo.lllo...", ".....oo..okkko..", ".........oooo..."],
];
const HUMAN_LEGS_SIDE = [
  [".....olllllo....", ".....oll.llo....", ".....okk..kko...", ".....oooo.oooo.."],
  [".....olllllo....", "......ollo......", "......okko......", "......oooo......"],
];

/**
 * The hero's picture sheet: 2 columns (walk frame 1, walk frame 2) by 4 rows (down, left,
 * right, up), each frame 16x16, so the sheet is 32 x 64. YOUR OWN drawing can replace this
 * built-in one: see docs/arcade-art.md.
 */
export function makeHumanSheet(palette: Record<string, string> = HUMAN_PALETTE) {
  const sheet = makeCanvas(TILE * 2, TILE * 4);
  const g = sheet.getContext("2d")!;
  for (let f = 0; f < 2; f++) {
    const front = paint([...HUMAN_FRONT, ...HUMAN_LEGS_FRONT[f]], palette);
    const back = paint([...HUMAN_BACK, ...HUMAN_LEGS_FRONT[f]], palette);
    const right = paint([...HUMAN_SIDE, ...HUMAN_LEGS_SIDE[f]], palette);
    g.drawImage(front, f * TILE, 0);
    g.drawImage(right, f * TILE, TILE * 2);
    g.drawImage(back, f * TILE, TILE * 3);
    // Facing left is just facing right, flipped like a mirror.
    g.save();
    g.translate(f * TILE + TILE, TILE);
    g.scale(-1, 1);
    g.drawImage(right, 0, 0);
    g.restore();
  }
  return sheet;
}

// ---------------------------------------------------------------------------------------------
// Side-on
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
export function makeHumanSideSheet(palette: Record<string, string> = HUMAN_PALETTE) {
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
