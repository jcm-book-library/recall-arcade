// THE PEOPLE AND THINGS: athletes, officials, the stampede runners, and the things that get thrown.
// Everything is drawn from little rectangles, in the same chunky style as the island. Nothing is
// loaded from a file. (The HERO is different: it comes from the side-on sheet, see hero-side-art.ts.)
import { makeCanvas } from "../kit";

type G = CanvasRenderingContext2D;
export const OUT = "#2a2018";

export function R(g: G, x: number, y: number, w: number, h: number, c: string) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), w, h);
}

/** A filled circle with hard edges (the canvas's own arc() blurs). */
export function disc(g: G, cx: number, cy: number, r: number, c: string) {
  g.fillStyle = c;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r) g.fillRect(x, y, 1, 1);
    }
  }
}

/** A straight line of square dots. */
export function line(g: G, x0: number, y0: number, x1: number, y1: number, t: number, c: string) {
  g.fillStyle = c;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + ((x1 - x0) * i) / n - t / 2), Math.round(y0 + ((y1 - y0) * i) / n - t / 2), t, t);
}

// ---------- a tiny 3 x 5 letter set, for signs, banners and the scoreboard ----------
const GLYPHS: Record<string, string> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
  K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "111101101101101", O: "010101101101010",
  P: "110101110100100", Q: "010101101111011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
  Z: "111001010100111", "0": "111101101101111", "1": "010110010010111", "2": "110001010100111", "3": "110001010001110",
  "4": "101101111001001", "5": "111100110001110", "6": "011100111101111", "7": "111001010010010", "8": "111101111101111",
  "9": "111101111001110", "-": "000000111000000", ":": "000010000010000", ".": "000000000000010", "!": "010010010000010",
  "?": "110001010000010", " ": "000000000000000", "&": "010101010101011", "'": "010010000000000",
};
export const tinyWidth = (s: string, scale = 1) => Math.max(0, s.length * 4 - 1) * scale;
export function tinyText(g: G, s: string, x: number, y: number, c: string, scale = 1) {
  g.fillStyle = c;
  let px = Math.round(x);
  for (const ch of s.toUpperCase()) {
    const bits = GLYPHS[ch] ?? GLYPHS[" "];
    for (let k = 0; k < 15; k++) if (bits[k] === "1") g.fillRect(px + (k % 3) * scale, Math.round(y) + Math.floor(k / 3) * scale, scale, scale);
    px += 4 * scale;
  }
}

// ---------- athletes ----------
export interface Kit { shirt: string; shorts: string; skin: string; hair: string; shoe: string }
export const KITS: Kit[] = [
  { shirt: "#d8402f", shorts: "#2b3a8f", skin: "#f2c9a0", hair: "#3b2514", shoe: "#f4efe6" },
  { shirt: "#2f7fc4", shorts: "#f4efe6", skin: "#c98d5e", hair: "#1c1410", shoe: "#2a2018" },
  { shirt: "#f0a31a", shorts: "#2a2018", skin: "#f2c9a0", hair: "#c9702a", shoe: "#d8402f" },
  { shirt: "#3fae6a", shorts: "#f4efe6", skin: "#8a5a3c", hair: "#1c1410", shoe: "#f4efe6" },
  { shirt: "#8a4fc4", shorts: "#2a2018", skin: "#e8b88a", hair: "#e8c44a", shoe: "#2a2018" },
  { shirt: "#f4efe6", shorts: "#d8402f", skin: "#a8704a", hair: "#2a2018", shoe: "#2b3a8f" },
];

export type Pose = "stand" | "run" | "windup" | "spin" | "throw" | "crouch" | "tug";

/**
 * Draw an athlete. (x, y) is the middle of the feet. `face` is 1 for right and -1 for left.
 * `ph` is a number that rises with time and picks the leg swing. About 24 px tall.
 */
export function athlete(g: G, x: number, y: number, face: 1 | -1, pose: Pose, k: Kit, ph = 0, bib = "") {
  g.save();
  g.translate(Math.round(x), Math.round(y));
  g.scale(face, 1);
  const swing = Math.sin(ph * Math.PI * 2);
  const stride = pose === "run" ? Math.round(swing * 3) : 0;
  const bob = pose === "run" ? (Math.abs(swing) > 0.5 ? 0 : 1) : pose === "crouch" ? 3 : 0;
  const top = -24 + bob; // top of the head
  // legs
  const leg = (dx: number, lift: number, shade: boolean) => {
    const c = shade ? "#c9a37a" : k.skin;
    R(g, dx - 1 + Math.round(lift / 2), -7 + bob, 2, 4, c);
    R(g, dx - 1 + lift, -3 + bob, 2, 3 - bob, c);
    R(g, dx - 1 + lift, -1, 4, 1, k.shoe);
    R(g, dx - 1 + lift, 0 - 1, 1, 1, k.shoe);
  };
  leg(-1, -stride, true);
  leg(2, stride, false);
  // shorts and shirt
  R(g, -3, -10 + bob, 7, 4, OUT); R(g, -2, -10 + bob, 5, 3, k.shorts);
  R(g, -3, -18 + bob, 7, 9, OUT);
  R(g, -2, -18 + bob, 5, 8, k.shirt);
  R(g, -2, -18 + bob, 5, 1, "rgba(255,255,255,0.35)");
  if (bib) tinyText(g, bib, -2, -16 + bob, "#f4efe6");
  else R(g, -1, -16 + bob, 3, 2, "#f4efe6");
  // head
  R(g, -3, top, 7, 7, OUT);
  R(g, -2, top + 1, 5, 5, k.skin);
  R(g, -3, top, 7, 3, OUT); R(g, -2, top + 1, 5, 2, k.hair);
  R(g, -3, top + 2, 2, 3, k.hair);
  R(g, 2, top + 3, 1, 1, OUT); // eye
  // arms
  const arm = (ax: number, ay: number, bx: number, by: number, shade: boolean) => {
    line(g, ax, ay, bx, by, 2, shade ? "#c9a37a" : k.skin);
  };
  const sy = -17 + bob;
  if (pose === "windup") {
    arm(-1, sy, -5, sy - 5, true); arm(1, sy, -4, sy - 7, false);          // both arms back and up
  } else if (pose === "spin") {
    arm(-1, sy, 8, sy - 1, true); arm(1, sy, 9, sy, false);                 // arms straight out
  } else if (pose === "throw") {
    arm(-1, sy, 6, sy - 8, true); arm(1, sy, 7, sy - 9, false);             // arms forward and up
  } else if (pose === "tug") {
    arm(1, sy, 6, sy + 4, false); arm(-1, sy, 5, sy + 5, true);
  } else if (pose === "run") {
    arm(0, sy, 4 * Math.sign(swing || 1), sy + 5, false); arm(0, sy, -4 * Math.sign(swing || 1), sy + 5, true);
  } else {
    arm(-1, sy, -2, sy + 7, true); arm(1, sy, 3, sy + 6, false);
  }
  g.restore();
}

/** An official in a blazer, with a clipboard, a flag, a pistol or a tug. */
export function official(g: G, x: number, y: number, face: 1 | -1, pose: "stand" | "pistol" | "tug" | "wave", ph: number, blazer = "#2b3a8f") {
  const k: Kit = { shirt: blazer, shorts: "#6b7480", skin: "#e8b88a", hair: "#c9c9c9", shoe: "#2a2018" };
  athlete(g, x, y, face, pose === "tug" ? "tug" : pose === "pistol" ? "stand" : "stand", k, ph);
  g.save();
  g.translate(Math.round(x), Math.round(y));
  g.scale(face, 1);
  // a pale shirt strip and a tie, trousers, a cap
  R(g, 0, -18, 1, 6, "#f4efe6"); R(g, 0, -16, 1, 3, "#d8402f");
  R(g, -2, -10, 5, 3, "#6b7480");
  R(g, -3, -24, 7, 2, "#f4efe6");
  if (pose === "pistol") {
    R(g, 3, -23, 7, 2, OUT); R(g, 3, -21, 2, 3, OUT); // a pistol held up
  } else if (pose === "wave") {
    R(g, 3, -27, 1, 8, OUT); R(g, 4, -27, 5, 4, ph % 1 < 0.5 ? "#ffd24a" : "#d8402f"); // a little flag
  } else if (pose === "stand") {
    R(g, 3, -14, 5, 7, OUT); R(g, 4, -13, 3, 5, "#f4efe6"); // a clipboard
  }
  g.restore();
}

// ---------- thrown things ----------
export function drawShot(g: G, x: number, y: number, spin: number, r = 6) {
  disc(g, x, y, r, OUT);
  disc(g, x, y, r - 1, "#5d6672");
  disc(g, x - 1.5, y - 1.5, 2, "#9aa4b2");
  // a mark that rolls round so you can see it spinning
  const a = spin % (Math.PI * 2);
  R(g, x + Math.cos(a) * 3 - 1, y + Math.sin(a) * 3 - 1, 2, 2, "#2a2f38");
}

export function drawSpear(g: G, tipX: number, tipY: number, tailX: number, tailY: number) {
  line(g, tailX, tailY, tipX, tipY, 4, OUT);
  line(g, tailX, tailY, tipX, tipY, 2, "#f4f8fb");
  // the red-and-white grip near the middle, and a dark point
  const gx = tailX + (tipX - tailX) * 0.42, gy = tailY + (tipY - tailY) * 0.42;
  line(g, gx - (tipX - tailX) * 0.08, gy - (tipY - tailY) * 0.08, gx + (tipX - tailX) * 0.08, gy + (tipY - tailY) * 0.08, 2, "#d8402f");
  const dx = tipX - tailX, dy = tipY - tailY, len = Math.hypot(dx, dy) || 1;
  line(g, tipX - (dx / len) * 5, tipY - (dy / len) * 5, tipX, tipY, 2, "#3a4048");
}

export function drawHammer(g: G, x: number, y: number, dir: 1 | -1, spin: number, chain = true) {
  if (chain) line(g, x - dir * 14, y + 1, x - dir * 4, y, 1, "#9aa4b2");
  disc(g, x, y, 6, OUT);
  disc(g, x, y, 5, "#6b7480");
  disc(g, x - 1.5, y - 1.5, 2, "#b9c2cf");
  const a = spin % (Math.PI * 2);
  R(g, x + Math.cos(a) * 3 - 1, y + Math.sin(a) * 3 - 1, 2, 2, "#2a2f38");
  // a grip handle trailing behind
  R(g, x - dir * 20, y - 1, 5, 3, "#a8763c");
}

/** A little burst of stars over the hero's head: a bonk. */
export function stars(g: G, cx: number, cy: number, t: number) {
  for (let i = 0; i < 3; i++) {
    const a = t * 7 + (i * Math.PI * 2) / 3;
    const sx = cx + Math.cos(a) * 8, sy = cy + Math.sin(a) * 3;
    R(g, sx - 1, sy - 3, 2, 6, "#ffd24a"); R(g, sx - 3, sy - 1, 6, 2, "#ffd24a");
    R(g, sx - 1, sy - 1, 2, 2, "#fff6dc");
  }
}

/** A cloud of dust. `p` goes from 0 to 1 as it fades. */
export function puff(g: G, x: number, y: number, p: number, big = 1) {
  g.globalAlpha = Math.max(0, 1 - p);
  const r = (2 + p * 4) * big;
  disc(g, x, y - p * 3, r, "#e9dfc9");
  disc(g, x - r * 0.6, y - p * 2, r * 0.7, "#f4efe6");
  g.globalAlpha = 1;
}

/** Make a hurdle, a stuck-in-the-ground marker or any other small picture once, then stamp it. */
export function once(w: number, h: number, draw: (g: G) => void) {
  const c = makeCanvas(w, h);
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  draw(g);
  return c;
}
