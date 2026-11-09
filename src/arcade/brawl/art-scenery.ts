// THE SCENERY: tiles, the sky and the stands behind, and the scenery of each part of the stadium.
// Drawn in code, in the island's chunky style. Like the island, each picture is made ONCE (into a
// hidden canvas) and then stamped on the screen every frame, because drawing every brick again 60
// times a second would be wasteful.
//
// PARALLAX: the far-away layers move slower than the camera. The sky barely moves, the city a
// little, the stands a bit more, and the tiles (the world you stand on) move the full amount. Your
// eyes read the different speeds as depth. A layer's "factor" is how much of the camera's movement
// it copies (0 = stuck to the screen, 1 = moves with the ground).
import { clamp, makeCanvas, noise } from "../kit";
import { TILE, VIEW_H, VIEW_W } from "./tuning.ts";
import { SIGN_KEYS, type LevelData, type World } from "./world.ts";
import { OUT, R, disc, tinyText, tinyWidth, once } from "./art-chars.ts";

type G = CanvasRenderingContext2D;
type Canvas = HTMLCanvasElement;
const ctxOf = (c: Canvas) => {
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  return g;
};

// ---------------------------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------------------------
interface StonePal { base: string; mid: string; hi: string; line: string; dark: string }
const PAVEMENT: StonePal = { base: "#a39c8e", mid: "#b6b0a2", hi: "#d6d0c2", line: "#7d786c", dark: "#6a665b" };
const CONCRETE: StonePal = { base: "#69737f", mid: "#7c8795", hi: "#a3adba", line: "#48515c", dark: "#363d47" };
const TRACK: StonePal = { base: "#b8452f", mid: "#cc5b3a", hi: "#e8855a", line: "#8d3322", dark: "#6e2619" };
const SAND: StonePal = { base: "#ecd9a0", mid: "#f1e1ae", hi: "#f8edc6", line: "#d3bd82", dark: "#c0a96c" };

/** A block of stone-like ground. `top`: air above it (draw the lit surface). `under`: air below it (a dark edge). */
function stoneTile(p: StonePal, top: boolean, under: boolean, v: number, brick: boolean): Canvas {
  return once(TILE, TILE, (g) => {
    R(g, 0, 0, TILE, TILE, p.base);
    // speckles, so big areas of ground do not look flat
    for (let i = 0; i < 14; i++) {
      const x = noise(i, v, 3) % TILE, y = noise(i, v, 4) % TILE;
      R(g, x, y, 1, 1, i % 3 === 0 ? p.hi : i % 3 === 1 ? p.mid : p.line);
    }
    if (brick) {
      R(g, 0, 7, TILE, 1, p.line); R(g, 0, 15, TILE, 1, p.line);
      const o = v % 2 ? 4 : 10;
      R(g, o, 0, 1, 7, p.line); R(g, (o + 8) % TILE, 8, 1, 7, p.line);
    }
    if (top) {
      R(g, 0, 0, TILE, 4, p.mid);
      R(g, 0, 0, TILE, 2, p.hi);
      R(g, 0, 4, TILE, 1, p.line);
      for (let i = 0; i < 4; i++) R(g, noise(i, v, 8) % TILE, 2 + (i % 2), 1, 1, p.base);
    }
    if (under) {
      R(g, 0, TILE - 3, TILE, 3, p.line);
      R(g, 0, TILE - 1, TILE, 1, p.dark);
    }
  });
}

function trackTile(top: boolean, v: number): Canvas {
  return once(TILE, TILE, (g) => {
    R(g, 0, 0, TILE, TILE, TRACK.base);
    for (let i = 0; i < 18; i++) {
      const x = noise(i, v, 5) % TILE, y = noise(i, v, 6) % TILE;
      R(g, x, y, 1, 1, i % 2 ? TRACK.mid : TRACK.line);
    }
    R(g, 0, TILE - 2, TILE, 2, TRACK.line);
    if (top) {
      R(g, 0, 0, TILE, 1, "#f4efe6");           // the painted lane line along the edge
      R(g, 0, 1, TILE, 3, TRACK.hi);
      R(g, 0, 4, TILE, 1, TRACK.mid);
      for (let i = 0; i < 3; i++) R(g, noise(i, v, 9) % TILE, 1 + (i % 3), 1, 1, TRACK.mid);
    }
  });
}

function sandTile(top: boolean, v: number): Canvas {
  return once(TILE, TILE, (g) => {
    R(g, 0, 0, TILE, TILE, SAND.base);
    for (let i = 0; i < 16; i++) R(g, noise(i, v, 11) % TILE, noise(i, v, 12) % TILE, 1, 1, i % 2 ? SAND.line : SAND.hi);
    if (top) { R(g, 0, 0, TILE, 2, SAND.hi); R(g, 0, 2, TILE, 1, SAND.mid); }
  });
}

/** The high-jump mat: sits a little proud of the track. The picture is taller than a tile. */
function matTile(): Canvas {
  return once(TILE, TILE + 6, (g) => {
    g.drawImage(trackTile(true, 1), 0, 6);
    R(g, 0, 1, TILE, 9, OUT);
    R(g, 1, 2, TILE - 2, 7, "#2f6fd6");
    R(g, 1, 2, TILE - 2, 2, "#5f95ee");
    R(g, 1, 8, TILE - 2, 1, "#1f4fa6");
    R(g, 3, 5, 3, 1, "#f4efe6"); R(g, 10, 5, 3, 1, "#f4efe6");
  });
}

function hurdleTile(): Canvas {
  return once(TILE, TILE, (g) => {
    R(g, 1, 3, 3, 13, OUT); R(g, 12, 3, 3, 13, OUT);
    R(g, 2, 4, 1, 11, "#f4efe6"); R(g, 13, 4, 1, 11, "#f4efe6");
    R(g, 0, 15, 6, 1, OUT); R(g, 10, 15, 6, 1, OUT);
    R(g, 0, 1, TILE, 6, OUT);
    for (let i = 0; i < 4; i++) R(g, 1 + i * 4, 2, 4, 4, i % 2 ? "#f4efe6" : "#d8402f");
    R(g, 0, 2, 1, 4, "#d8402f"); R(g, 15, 2, 1, 4, "#f4efe6");
  });
}

function ledgeTile(): Canvas {
  return once(TILE, TILE, (g) => {
    R(g, 0, 0, TILE, 5, OUT);
    R(g, 0, 1, TILE, 3, "#c28d4e");
    R(g, 0, 1, TILE, 1, "#dcab6c");
    R(g, 0, 4, TILE, 1, "#7d5428");
    R(g, 1, 5, 2, 4, OUT); R(g, 13, 5, 2, 4, OUT);
    R(g, 1, 5, 1, 3, "#a8763c"); R(g, 13, 5, 1, 3, "#a8763c");
  });
}

function signTile(): Canvas {
  return once(TILE, 22, (g) => {
    R(g, 7, 13, 3, 9, OUT); R(g, 8, 13, 1, 9, "#a8763c");
    R(g, 0, 0, 16, 14, OUT);
    R(g, 1, 1, 14, 12, "#f3e6c4");
    R(g, 1, 1, 14, 1, "#fff6dc");
    for (let i = 0; i < 3; i++) R(g, 3, 3 + i * 3, i === 2 ? 7 : 10, 1, "#4a2f16");
  });
}

function flagImages() {
  const pole = (g: G) => { R(g, 3, 4, 3, 30, OUT); R(g, 4, 4, 1, 30, "#c9cbd0"); R(g, 1, 32, 7, 2, OUT); R(g, 0, 31, 4, 3, "#6b7480"); R(g, 2, 3, 5, 3, OUT); R(g, 3, 3, 3, 2, "#ffd24a"); };
  const down = once(18, 34, (g) => { pole(g); R(g, 5, 8, 3, 12, OUT); R(g, 6, 9, 1, 10, "#d9d9d9"); });
  const up = (colour: string, hi: string, wave: number) => once(18, 34, (g) => {
    pole(g);
    R(g, 5, 4, 13, 12, OUT);
    R(g, 6, 5, 11 - wave, 10, colour);
    R(g, 6, 5, 11 - wave, 2, hi);
    R(g, 8 - wave, 8, 4, 3, "#f4efe6");
    R(g, 17 - wave, 6, 1, 8, OUT);
  });
  return { down, green: [up("#2fa05a", "#59d082", 0), up("#2fa05a", "#59d082", 1)], gold: [up("#e0a21a", "#ffd24a", 0), up("#e0a21a", "#ffd24a", 1)] };
}

export interface Tiles {
  /** The image for a tile at (tx, ty), and how far above the tile's top to draw it. */
  image: (letter: string, tx: number, ty: number) => { img: Canvas; dy: number } | null;
  sign: Canvas;
  flag: ReturnType<typeof flagImages>;
}

export function makeTiles(world: World, level: LevelData): Tiles {
  const cache = new Map<string, Canvas>();
  const get = (key: string, make: () => Canvas) => {
    let c = cache.get(key);
    if (!c) { c = make(); cache.set(key, c); }
    return c;
  };
  const sceneAt = (tx: number) => level.scenes.find((s) => tx >= s.from && tx <= s.to)?.kind ?? "field";
  const mat = matTile(), hurdle = hurdleTile(), ledge = ledgeTile();
  return {
    sign: signTile(),
    flag: flagImages(),
    image(letter, tx, ty) {
      const v = noise(tx, ty, 21) % 4;
      const top = !world.solid(tx, ty - 1);
      const under = !world.solid(tx, ty + 1) && !world.oneWay(tx, ty + 1);
      switch (letter) {
        case "#": {
          const scene = sceneAt(tx);
          const outdoors = scene === "outside" || scene === "field" || scene === "finale";
          const pal = outdoors ? PAVEMENT : CONCRETE;
          return { img: get(`s${outdoors}${top}${under}${v}`, () => stoneTile(pal, top, under, v, true)), dy: 0 };
        }
        case "T": return { img: get(`t${top}${v}`, () => trackTile(top, v)), dy: 0 };
        case "s": return { img: get(`sa${top}${v}`, () => sandTile(top, v)), dy: 0 };
        case "B": return { img: mat, dy: 6 };
        case "H": return { img: hurdle, dy: 0 };
        case "=": return { img: ledge, dy: 0 };
        case "g": return { img: get(`g${top}${v}`, () => stoneTile({ base: "#4d9c40", mid: "#62b34c", hi: "#79c75e", line: "#3d8a36", dark: "#2f7a30" }, top, under, v, false)), dy: 0 };
        default: return null;
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------
// The far layers
// ---------------------------------------------------------------------------------------------
const SKY = ["#4aa3df", "#5fb2e8", "#78c2ee", "#93d0f2", "#afdff6", "#cdeefa"];

function cloudsStrip(): Canvas {
  const c = makeCanvas(640, 70);
  const g = ctxOf(c);
  const cloud = (cx: number, cy: number, s: number) => {
    disc(g, cx, cy, 9 * s, "#f6fcff"); disc(g, cx + 12 * s, cy + 2, 7 * s, "#f6fcff"); disc(g, cx - 12 * s, cy + 3, 6 * s, "#f6fcff");
    disc(g, cx + 3 * s, cy - 5 * s, 7 * s, "#ffffff");
    R(g, cx - 18 * s, cy + 7 * s, 36 * s, 3, "#dcecf7");
  };
  [[60, 22, 1.2], [200, 40, 0.9], [330, 18, 1.3], [470, 36, 1], [590, 20, 0.8]].forEach(([x, y, s]) => cloud(x, y, s));
  return c;
}

function skylineStrip(): Canvas {
  const c = makeCanvas(1024, 150);
  const g = ctxOf(c);
  // far city: pale blue blocks of different heights
  let x = 0;
  let i = 0;
  while (x < 1024) {
    const w = 18 + (noise(i, 1, 31) % 26), h = 34 + (noise(i, 2, 31) % 56);
    R(g, x, 150 - h, w, h, "#9ec0dc");
    R(g, x, 150 - h, w, 2, "#b6d2e8");
    for (let wy = 150 - h + 6; wy < 146; wy += 7) for (let wx = x + 3; wx < x + w - 3; wx += 6) if (noise(wx, wy, 32) % 3) R(g, wx, wy, 2, 3, "#c7dff0");
    x += w + (noise(i, 3, 31) % 5);
    i++;
  }
  // floodlight towers
  for (const tx of [150, 420, 700, 930]) {
    R(g, tx - 2, 20, 4, 130, "#7b96b3");
    R(g, tx - 14, 14, 28, 18, "#5d7794");
    for (let ly = 0; ly < 2; ly++) for (let lx = 0; lx < 5; lx++) R(g, tx - 12 + lx * 5, 16 + ly * 7, 4, 5, "#fff6c2");
  }
  return c;
}

/** The stands: tiers of seats full of people, banners, a scoreboard. Two pictures, so the crowd can wave. */
function standsStrip(width: number, frame: number): Canvas {
  const H = 118;
  const c = makeCanvas(width, H);
  const g = ctxOf(c);
  // the concrete bowl
  R(g, 0, 0, width, H, "#8793a3");
  // tiers: a step every 9 px, with people sitting on each
  const tiers = Math.floor((H - 14) / 9);
  for (let t = 0; t < tiers; t++) {
    const y = 20 + t * 9;
    R(g, 0, y + 7, width, 2, "#5f6b7a");
    R(g, 0, y + 6, width, 1, "#a3afbf");
    for (let x = 2; x < width - 4; x += 4) {
      const n = noise(x, t, 41);
      if (n % 5 < 2) continue; // an empty seat
      const colours = ["#d8402f", "#2f7fc4", "#f0a31a", "#3fae6a", "#f4efe6", "#8a4fc4", "#e86fa0", "#2a2f38"];
      const shirt = colours[(n >> 3) % colours.length];
      const skins = ["#f2c9a0", "#c98d5e", "#8a5a3c", "#e8b88a"];
      const waving = frame === 1 && (n >> 6) % 4 === 0;
      const yy = y + (n % 2);
      R(g, x, yy + 2, 3, 5, shirt);
      R(g, x, yy - (waving ? 0 : 0), 3, 3, skins[(n >> 5) % skins.length]);
      R(g, x, yy, 3, 1, (n >> 9) % 3 ? "#3b2514" : "#c9702a");
      if (waving) { R(g, x - 1, yy - 4, 1, 5, skins[(n >> 5) % skins.length]); R(g, x + 3, yy - 3, 1, 4, skins[(n >> 5) % skins.length]); }
    }
  }
  // a pale haze over the crowd so the people are a soft background and the hero stands out
  R(g, 0, 18, width, H - 18, "rgba(150,178,208,0.42)");
  // aisles
  for (let x = 90; x < width; x += 170) { R(g, x, 18, 7, H - 18, "#6f7b8b"); for (let y = 20; y < H; y += 4) R(g, x, y, 7, 1, "#8793a3"); }
  // the roof edge, with bunting
  R(g, 0, 0, width, 14, "#2b3a8f");
  R(g, 0, 12, width, 2, "#f4efe6");
  R(g, 0, 14, width, 4, "#1c2560");
  const flagC = ["#d8402f", "#f0a31a", "#f4efe6", "#3fae6a", "#2f7fc4"];
  for (let x = 6; x < width; x += 9) { const col = flagC[(x / 9 | 0) % flagC.length]; R(g, x, 18, 6, 1, "#2a2018"); R(g, x, 19, 5, 3, col); R(g, x + 1, 22, 3, 1, col); }
  // banners on the tier fronts
  const banners: [string, string, string][] = [["RECALL", "#d8402f", "#f4efe6"], ["GO TEAM", "#f0a31a", "#2a2018"], ["PIES", "#3fae6a", "#f4efe6"], ["ASK ME", "#2f7fc4", "#f4efe6"], ["BRAWL", "#8a4fc4", "#f4efe6"], ["NO FUN", "#f4efe6", "#d8402f"]];
  for (let i = 0, x = 40; x < width - 60; i++, x += 96 + (noise(i, 1, 45) % 70)) {
    const [text, bg, fg] = banners[i % banners.length];
    const w = tinyWidth(text) + 6;
    const y = 48 + (noise(i, 2, 45) % 3) * 9;
    R(g, x, y, w, 9, OUT); R(g, x + 1, y + 1, w - 2, 7, bg);
    tinyText(g, text, x + 3, y + 2, fg);
  }
  // scoreboards
  for (let x = 300; x < width - 160; x += 900) {
    R(g, x, 26, 112, 40, OUT); R(g, x + 2, 28, 108, 36, "#10161c");
    tinyText(g, "RECALL", x + 8, 32, "#ffd24a"); tinyText(g, "3", x + 80, 32, "#ffd24a");
    tinyText(g, "EVERYONE", x + 8, 42, "#ffd24a"); tinyText(g, "2", x + 80, 42, "#ffd24a");
    tinyText(g, "WORLD RECORD: PENDING", x + 8, 54, "#86f0a8");
    R(g, x + 20, 66, 6, 20, OUT); R(g, x + 86, 66, 6, 20, OUT);
  }
  return c;
}

// ---------------------------------------------------------------------------------------------
// The scenery of each part (drawn in world coordinates, behind the hero)
// ---------------------------------------------------------------------------------------------
function facade(): Canvas {
  const w = 460, h = 170;
  const c = makeCanvas(w, h);
  const g = ctxOf(c);
  R(g, 0, 0, w, h, "#b86a4c");
  for (let y = 0; y < h; y += 6) {
    R(g, 0, y, w, 1, "#9c5238");
    for (let x = (y / 6) % 2 ? 0 : 6; x < w; x += 12) R(g, x, y, 1, 6, "#9c5238");
  }
  R(g, 0, 0, w, 10, "#d8cdb4"); R(g, 0, 10, w, 2, "#8c7f66");           // top ledge
  R(g, 0, 36, w, 4, "#d8cdb4"); R(g, 0, 40, w, 2, "#8c7f66");           // a stone band
  // tall arched windows
  for (let x = 24; x < w - 60; x += 64) {
    R(g, x, 54, 24, 52, OUT);
    R(g, x + 2, 56, 20, 50, "#2a3a55"); R(g, x + 2, 56, 20, 6, "#3d5a85");
    R(g, x + 11, 56, 2, 50, OUT); R(g, x + 2, 80, 20, 2, OUT);
    R(g, x + 3, 58, 4, 14, "#5f7fae");
    R(g, x - 2, 106, 28, 3, "#d8cdb4");
  }
  // the big banner
  R(g, 150, 18, 160, 22, OUT); R(g, 152, 20, 156, 18, "#c0392b");
  tinyText(g, "ATHLETICS MEET", 158, 24, "#f4efe6", 2);
  R(g, 150, 40, 160, 1, "#8c3228");
  return c;
}

function crowdBarrier(): Canvas {
  const c = makeCanvas(32, 24);
  const g = ctxOf(c);
  R(g, 0, 0, 32, 4, OUT); R(g, 0, 1, 32, 2, "#f4efe6");
  for (let x = 2; x < 32; x += 12) R(g, x, 4, 2, 20, "#c9cbd0");
  return c;
}

export interface Art {
  /** Everything behind the hero: sky, far layers, scenery. */
  drawBack: (g: G, camX: number, camY: number, t: number) => void;
  /** The tiles. */
  drawTiles: (g: G, camX: number, camY: number, t: number, flagsUp: Set<string>) => void;
  tiles: Tiles;
}

export function makeArt(world: World, level: LevelData): Art {
  const tiles = makeTiles(world, level);
  const clouds = cloudsStrip();
  const skyline = skylineStrip();
  const standsW = Math.ceil(world.pxW * 0.4) + VIEW_W + 64;
  const stands = [standsStrip(standsW, 0), standsStrip(standsW, 1)];
  const face = facade();
  const barrier = crowdBarrier();
  const FLOOR = level.floorY;
  const scene = (kind: string) => level.scenes.find((s) => s.kind === kind);

  // PITS: a column with no ground at the very bottom. We fill it dark, from the ground beside it down,
  // so a pit looks like a drop and not a window onto the sky.
  const pitTop: (number | null)[] = [];
  const bottomRun = (tx: number) => { let r = world.h - 1; while (r >= 0 && world.solid(tx, r)) r--; return r + 1; };
  for (let tx = 0; tx < world.w; tx++) pitTop.push(world.solid(tx, world.h - 1) || world.tile(tx, world.h - 1) === "s" ? null : -1);
  for (let tx = 0; tx < world.w; tx++) {
    if (pitTop[tx] !== -1) continue;
    let l = tx, r = tx;
    while (l >= 0 && pitTop[l] === -1) l--;
    while (r < world.w && pitTop[r] === -1) r++;
    const rows = [l >= 0 ? bottomRun(l) : world.h, r < world.w ? bottomRun(r) : world.h];
    pitTop[tx] = Math.min(...rows);
  }

  const inView = (g: G, x0: number, x1: number, camX: number) => x1 >= camX - 8 && x0 <= camX + VIEW_W + 8;

  // The grass inside the track, with mowing stripes. Drawn once as a long strip.
  const infield = once(64, 60, (g) => {
    for (let i = 0; i < 4; i++) R(g, i * 16, 0, 16, 60, i % 2 ? "#5aa944" : "#68b94f");
    R(g, 0, 0, 64, 2, "#3d8a36");
    for (let k = 0; k < 40; k++) R(g, noise(k, 1, 51) % 64, 4 + (noise(k, 2, 51) % 54), 1, 1, "#4d9c40");
  });
  const hoarding = once(96, 14, (g) => {
    R(g, 0, 0, 96, 14, OUT);
    const ads: [string, string, string][] = [["RECALL", "#2b3a8f", "#f4efe6"], ["PIES", "#d8402f", "#ffd24a"], ["SORRY", "#f4efe6", "#2a2018"]];
    ads.forEach(([t, bg, fg], i) => { R(g, i * 32 + 1, 1, 30, 12, bg); tinyText(g, t, i * 32 + 1 + Math.round((30 - tinyWidth(t)) / 2), 5, fg); });
  });

  function drawOutside(g: G) {
    // street lamps, bushes, the ticket kiosk and the turnstile
    for (const lx of [112, 330, 560, 760]) {
      R(g, lx, FLOOR - 64, 3, 64, OUT); R(g, lx + 1, FLOOR - 64, 1, 64, "#8793a3");
      R(g, lx - 6, FLOOR - 70, 16, 5, OUT); R(g, lx - 5, FLOOR - 69, 14, 3, "#fff6c2");
    }
    for (const bx of [40, 150, 230, 700]) { disc(g, bx, FLOOR - 7, 9, OUT); disc(g, bx, FLOOR - 8, 8, "#2f7a30"); disc(g, bx - 3, FLOOR - 11, 4, "#48a843"); }
    // ticket kiosk
    const kx = 270;
    R(g, kx, FLOOR - 40, 52, 40, OUT); R(g, kx + 2, FLOOR - 38, 48, 36, "#e8d9b0");
    R(g, kx + 8, FLOOR - 30, 20, 14, OUT); R(g, kx + 9, FLOOR - 29, 18, 12, "#2a3a55");
    R(g, kx + 36, FLOOR - 36, 10, 36, "#7d5428");
    for (let i = 0; i < 7; i++) R(g, kx - 4 + i * 8, FLOOR - 46, 8, 8, i % 2 ? "#f4efe6" : "#d8402f");
    R(g, kx - 4, FLOOR - 38, 60, 1, OUT);
    tinyText(g, "TICKETS", kx + 8, FLOOR - 56, "#2a2018");
    R(g, kx + 12, FLOOR - 25, 12, 5, "#d8402f"); tinyText(g, "SHUT", kx + 9, FLOOR - 14, "#d8402f");
    // turnstile
    const tx = 600;
    R(g, tx, FLOOR - 24, 4, 24, OUT); R(g, tx + 1, FLOOR - 23, 2, 22, "#c9cbd0");
    R(g, tx + 18, FLOOR - 24, 4, 24, OUT); R(g, tx + 19, FLOOR - 23, 2, 22, "#c9cbd0");
    for (let i = 0; i < 3; i++) { R(g, tx + 3, FLOOR - 20 + i * 6, 16, 2, OUT); R(g, tx + 3, FLOOR - 20 + i * 6, 16, 1, "#f0a31a"); }
    R(g, tx - 6, FLOOR - 36, 34, 8, OUT); R(g, tx - 5, FLOOR - 35, 32, 6, "#d8402f"); tinyText(g, "OUT OF ORDER", tx - 3, FLOOR - 34, "#f4efe6");
  }

  function drawTunnel(g: G, x0: number, x1: number, camX: number, t: number) {
    R(g, x0, 64, x1 - x0, 80, "#1b222d");
    R(g, x0, 64, x1 - x0, 6, "#262f3d");
    // lamps along the roof, with a glow
    for (let x = x0 + 24; x < x1 - 20; x += 56) {
      const flick = noise(x, 1, 61) % 9 === 0 && Math.floor(t * 8) % 5 === 0;
      if (flick) continue;
      R(g, x, 64, 18, 3, "#fff2b0");
      g.globalAlpha = 0.1; R(g, x - 10, 67, 38, 40, "#fff2b0"); g.globalAlpha = 1;
    }
    // chevrons painted on the floor edge and the tunnel mouth at both ends
    for (let x = x0 + 8; x < x1 - 8; x += 24) { R(g, x, 138, 10, 3, "#e0a21a"); R(g, x + 12, 138, 6, 3, "#2a2018"); }
    // the light at the end
    for (let i = 0; i < 6; i++) { g.globalAlpha = 0.07 + i * 0.03; R(g, x1 - 48 + i * 8, 70, 48 - i * 8, 74, "#d6ecff"); }
    g.globalAlpha = 1;
    R(g, x0 - 2, 62, 4, 84, "#0f141c");
    // a sign over the mouth
    R(g, x0 + 4, 44, 76, 14, OUT); R(g, x0 + 5, 45, 74, 12, "#2b3a8f"); tinyText(g, "ATHLETES ONLY", x0 + 10, 49, "#f4efe6");
    void camX;
  }

  function drawConcourse(g: G, x0: number, x1: number, t: number) {
    // a back wall with arches, a railing, a pie stall
    R(g, x0, 88, x1 - x0, 56, "#5d6b7e");
    for (let x = x0 + 8; x < x1 - 16; x += 40) { R(g, x, 100, 28, 44, OUT); R(g, x + 2, 102, 24, 42, "#3d9bd8"); R(g, x + 2, 102, 24, 10, "#7fd0f0"); }
    R(g, x0, 88, x1 - x0, 4, "#8793a3");
    for (let x = x0; x < x1; x += 32) g.drawImage(barrier, 0, 0, 32, 24, x, 120, 32, 24);
    const sx = x0 + 120;
    R(g, sx, 100, 56, 44, OUT); R(g, sx + 2, 102, 52, 40, "#e8d9b0");
    for (let i = 0; i < 7; i++) R(g, sx - 3 + i * 9, 94, 9, 8, i % 2 ? "#f4efe6" : "#f0a31a");
    tinyText(g, "PIES", sx + 18, 82, "#f4efe6");
    R(g, sx + 6, 114, 44, 4, "#a8763c");
    disc(g, sx + 14, 112, 4, "#c98d5e"); disc(g, sx + 26, 112, 4, "#c98d5e"); disc(g, sx + 38, 112, 4, "#c98d5e");
    R(g, sx + 10, 124, 36, 7, "#fff6dc"); tinyText(g, "NONE", sx + 17, 126, "#d8402f");
    void t;
  }

  function drawField(g: G, x0: number, x1: number, camX: number, t: number, kind: "field" | "finale") {
    // hoarding along the back of the track, then the infield grass in front of it
    const y0 = FLOOR - 56;
    const left = Math.max(x0, Math.floor(camX / 96) * 96), right = Math.min(x1, camX + VIEW_W + 96);
    for (let x = left; x < right; x += 96) g.drawImage(hoarding, x, y0 + 4);
    for (let x = Math.floor(Math.max(x0, camX) / 64) * 64; x < Math.min(x1, camX + VIEW_W + 64); x += 64) g.drawImage(infield, x, y0 + 18);
    // lane numbers and distance markers painted on the infield edge
    for (let x = Math.floor(Math.max(x0, camX) / 160) * 160; x < Math.min(x1, camX + VIEW_W + 160); x += 160) {
      R(g, x, FLOOR - 12, 2, 12, "#f4efe6");
    }
    void t; void kind;
  }

  function drawFinale(g: G, x0: number, x1: number, camX: number, t: number) {
    drawField(g, x0, x1, camX, t, "finale");
    // bunting across the end of the track and the finish gantry
    const fx = 258 * TILE + 8;
    for (let x = fx - 200; x < fx + 120; x += 12) {
      const sag = Math.sin(((x - (fx - 200)) / 320) * Math.PI) * 10;
      const col = ["#d8402f", "#f0a31a", "#f4efe6", "#3fae6a", "#2f7fc4"][((x - fx) / 12 + 100 | 0) % 5];
      R(g, x, FLOOR - 70 + sag, 7, 1, OUT); R(g, x, FLOOR - 69 + sag, 6, 5, col); R(g, x + 1, FLOOR - 64 + sag, 4, 2, col);
    }
    // the finish gantry: two uprights and a banner
    R(g, fx - 30, FLOOR - 80, 4, 80, OUT); R(g, fx - 29, FLOOR - 80, 2, 80, "#c9cbd0");
    R(g, fx + 28, FLOOR - 80, 4, 80, OUT); R(g, fx + 29, FLOOR - 80, 2, 80, "#c9cbd0");
    R(g, fx - 34, FLOOR - 96, 70, 20, OUT); R(g, fx - 33, FLOOR - 95, 68, 18, "#f4efe6");
    for (let i = 0; i < 17; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) R(g, fx - 33 + i * 4, FLOOR - 95 + j * 4 + 1, 4, 4, OUT);
    R(g, fx - 28, FLOOR - 93, 56, 13, "#d8402f"); tinyText(g, "FINISH", fx - 23, FLOOR - 90, "#f4efe6", 2);
    // the starter's line
    const lx = 193 * TILE + 8;
    R(g, lx - 2, FLOOR - 20, 3, 20, "rgba(255,255,255,0.0)");
    R(g, lx - 26, FLOOR - 56, 52, 12, OUT); R(g, lx - 25, FLOOR - 55, 50, 10, "#d8402f"); tinyText(g, "STAMPEDE", lx - 15, FLOOR - 52, "#f4efe6");
    R(g, lx - 20, FLOOR - 44, 3, 44, OUT); R(g, lx + 17, FLOOR - 44, 3, 44, OUT);
    // a starting block
    for (let i = 0; i < 3; i++) { R(g, lx - 10 + i * 8, FLOOR - 5, 6, 5, OUT); R(g, lx - 9 + i * 8, FLOOR - 4, 4, 3, "#c9cbd0"); }
  }

  return {
    tiles,
    drawBack(g, camX, camY, t) {
      // sky: flat bands of blue
      const band = Math.ceil(VIEW_H / SKY.length);
      SKY.forEach((c, i) => R(g, 0, i * band, VIEW_W, band + 1, c));
      // clouds (wrap round), skyline, stands: each slides at its own speed
      const wrap = (strip: Canvas, factor: number, y: number) => {
        const off = Math.floor((camX * factor) % strip.width);
        for (let x = -off; x < VIEW_W; x += strip.width) g.drawImage(strip, x, y);
      };
      wrap(clouds, 0.04, 8 - camY * 0.02);
      wrap(skyline, 0.14, 58 - camY * 0.1);
      const sx0 = Math.floor(camX * 0.4);
      const sw = Math.min(VIEW_W, standsW - sx0);
      // outside the stadium there are no stands in view: they fade in as you go through the tunnel
      const standsAlpha = clamp((camX - 460) / 340, 0, 1);
      if (standsAlpha > 0) {
        g.globalAlpha = standsAlpha;
        g.drawImage(stands[Math.floor(t * 1.6) % 2], sx0, 0, sw, 118, 0, Math.round(14 - camY * 0.4), sw, 118);
        g.globalAlpha = 1;
      }
      g.save();
      g.translate(-camX, -camY);
      for (const s of level.scenes) {
        const x0 = s.from * TILE, x1 = (s.to + 1) * TILE;
        if (!inView(g, x0, x1, camX)) continue;
        if (s.kind === "outside") {
          g.drawImage(face, 380, FLOOR - 170 + 2 - 0);
          drawOutside(g);
        } else if (s.kind === "tunnel") drawTunnel(g, x0, x1, camX, t);
        else if (s.kind === "concourse") drawConcourse(g, x0, x1, t);
        else if (s.kind === "field") drawField(g, x0, x1, camX, t, "field");
        else drawFinale(g, x0, x1, camX, t);
      }
      g.restore();
    },
    drawTiles(g, camX, camY, t, flagsUp) {
      const tx0 = Math.floor(camX / TILE), tx1 = Math.floor((camX + VIEW_W) / TILE);
      for (let tx = Math.max(0, tx0); tx <= Math.min(world.w - 1, tx1); tx++) {
        const top = pitTop[tx];
        if (top === null || top === undefined) continue;
        const y0 = top * TILE - camY;
        R(g, tx * TILE - camX, y0, TILE, VIEW_H - y0 + 8, "#1c2533");
        R(g, tx * TILE - camX, y0, TILE, 3, "#10161f");
        g.globalAlpha = 0.5; R(g, tx * TILE - camX, y0 + (world.h - top) * TILE * 0.55, TILE, 40, "#0a0e14"); g.globalAlpha = 1;
      }
      const ty0 = Math.max(0, Math.floor(camY / TILE)), ty1 = Math.min(world.h - 1, Math.floor((camY + VIEW_H) / TILE));
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          const letter = world.tile(tx, ty);
          if (letter === "." || tx < 0 || tx >= world.w) continue;
          const sx = tx * TILE - camX, sy = ty * TILE - camY;
          const pic = tiles.image(letter, tx, ty);
          if (pic) { g.drawImage(pic.img, sx, sy - pic.dy); continue; }
          if (letter === "C" || letter === "c") {
            const up = flagsUp.has(`${tx},${ty}`);
            const set = letter === "C" ? tiles.flag.green : tiles.flag.gold;
            g.drawImage(up ? set[Math.floor(t * 4) % 2] : tiles.flag.down, sx - 1, sy + TILE - 34);
          } else if (SIGN_KEYS.includes(letter)) {
            g.drawImage(tiles.sign, sx, sy + TILE - 22);
          }
        }
      }
    },
  };
}
