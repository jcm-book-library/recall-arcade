import { h, formatTime } from "../ui/dom";
import { LEVELS } from "./labyrinth-maps";
import { clamp, loadBest, makeBeeper, makeCanvas, noise, paint, saveBest, startLoop } from "./kit";
import type { Blip } from "./kit";

// THE LABYRINTH: the second arcade game, seen from above like old Zelda or Pokemon.
// It uses the same LOOP as Planet Pong (read input, update, draw, many times a second); the
// loop itself now lives in the shared toolkit, kit.ts, along with the picture-from-letters
// helper and the best-time saving. What is new here is the WORLD: a map made of square tiles,
// a hero who steps from tile to tile, a camera that follows, and enemies. The maps themselves
// live in labyrinth-maps.ts.
//
// There are three worlds, each with its own look and its own danger:
//   1. The Garden Maze: hedges and gravel. Wasps. Gentle: no traps.
//   2. The Dungeon: old stone. Bats, keys and doors, and trapdoors that drop you back to the start.
//   3. The Lava Heart: a volcanic temple. Lava, jets of fire and the Minotaur.
// And one weapon: collect EVERY gem on a level to earn a charge of ice, then throw it.

// ---------- the world ----------
// GRID COORDINATES vs PIXEL COORDINATES. The map is a grid of tiles, and we say where
// things are by counting tiles: "column 5, row 3". That is a grid coordinate. To DRAW
// something we need pixels, so we multiply by the tile size: column 5 is at pixel 5 * 16 = 80.
// Almost everything in the game thinks in tiles. Only drawing thinks in pixels.
const TILE = 16; // one tile is 16 x 16 game pixels
const VIEW_W = 20; // the screen shows 20 tiles across...
const VIEW_H = 12; // ...and 12 tiles down
const W = VIEW_W * TILE; // 320: the canvas is tiny, then the browser scales it up with crisp pixels
const H = VIEW_H * TILE; // 192

const START_LIVES = 3;
const PLAYER_STEP = 0.14; // seconds the hero takes to slide from one tile to the next
const BAT_STEP = 0.22; // bats are slower than you, so you can time your dash past them
const MINO_CHASE_STEP = 0.2; // the Minotaur is a bit slower than you when he is chasing...
const MINO_WANDER_STEP = 0.32; // ...and ambles when he has lost you
const CHASE_RANGE = 10; // he only notices you if you are this many steps away along the corridors
const BUFFER_TIME = 0.25; // how long the game remembers a direction you tapped
const HIT_SIZE = 0.6; // how close (in tiles) counts as touching
const HURT_TIME = 0.7; // the short freeze after being caught
const SAFE_TIME = 1.5; // after coming back you blink for a moment and can't be caught
const CARD_TIME = 4; // the "level complete" card moves on by itself after this many seconds
const STORE_KEY = "learning-arcade:labyrinth"; // where the best time is saved. Never change this.

// The new things in worlds 2 and 3.
const FALL_TIME = 0.55; // how long the hero spends falling through a trapdoor
const JET_OFF = 2; // a fire jet's timer: 2 seconds quiet...
const JET_WARN = 0.6; // ...then 0.6 seconds of warning (the nozzle glows and hisses)...
const JET_ON = 1; // ...then 1 second of flame
const JET_LEN = 3; // the flame reaches this many tiles along the corridor
// The ice weapon.
const MAX_CHARGES = 3; // you can carry up to three ice charges
const SHOT_STEP = 1 / 12; // the ice crystal crosses one tile in 1/12 s: about 12 tiles a second
const FREEZE_TIME = 5; // seconds an enemy stays frozen

type Dir = 0 | 1 | 2 | 3; // down, left, right, up (the same order as the rows of the hero's picture sheet)
const DX = [0, -1, 1, 0]; // how far each direction moves sideways, in tiles...
const DY = [1, 0, 0, -1]; // ...and up or down
const opposite = (d: Dir) => (3 - d) as Dir;
type State = "ready" | "playing" | "paused" | "cleared" | "over" | "won";
const ALL_GEMS = LEVELS.reduce((n, l) => n + l.rows.join("").split("*").length - 1, 0);

// Tile letters used while the game runs (the map file has a few more, like keys and gems, that
// become items instead): "#" wall, "." floor, "R"/"B" closed doors, "E" exit, "T" a trapdoor,
// "O" an open trapdoor (a hole), "~" lava, "F" a fire jet (a wall that shoots flame).
/** Tiles nothing can walk through, ever. (Doors are different: they open with a key.) */
const isSolid = (tile: string) => tile === "#" || tile === "F" || tile === "~" || tile === "O";
/** Tiles that stop a flying ice crystal. It flies over open trapdoors but not over lava. */
const stopsIce = (tile: string) => tile === "#" || tile === "F" || tile === "~" || tile === "R" || tile === "B";

// Anything that walks tile to tile. (x, y) is the tile it is leaving, (nx, ny) is the tile it
// is heading for, and t is how many seconds it has spent on this step. When it isn't moving,
// the two tiles are the same.
interface Walker { x: number; y: number; nx: number; ny: number; t: number; dur: number }
// A STATUS EFFECT: `iced` is a countdown in seconds. While it is above zero the creature is
// frozen solid: it doesn't move and it can't catch you. Each tick it goes down a little; at zero
// the creature shakes free. Nothing else about it changes, which is why a countdown is such a
// tidy way to do things like freezing, poison or being invisible.
interface Bat extends Walker { dir: Dir; homeX: number; homeY: number; homeDir: Dir; iced: number }
interface Minotaur extends Walker { came: Dir | null; chasing: boolean; homeX: number; homeY: number; iced: number }
// The ice crystal is a walker too: it steps tile to tile, just very fast.
interface Shot extends Walker { dir: Dir }
// A fire jet. `offset` shifts its timer so the jets don't all fire together.
interface Jet { x: number; y: number; dir: Dir; len: number; offset: number; phase: JetPhase }
type JetPhase = "off" | "warn" | "on";
// A puff of smoke or a burst of ice, drawn for a moment and forgotten.
interface Puff { x: number; y: number; age: number; life: number; kind: "smoke" | "ice" | "fizz" }

const isMoving = (w: Walker) => w.nx !== w.x || w.ny !== w.y;

/** Where a walker is RIGHT NOW in tiles, part way between two tiles. This is the smooth sliding. */
function where(w: Walker) {
  const f = Math.min(1, w.t / w.dur); // 0 = still on the old tile, 1 = arrived on the new one
  return { x: w.x + (w.nx - w.x) * f, y: w.y + (w.ny - w.y) * f };
}

// ---------- pixel art, drawn from letters ----------
// The helpers `paint`, `makeCanvas` and `noise` come from kit.ts. Each world has its own palette.

// The ancient-stone palette (the Dungeon).
const STONE = {
  floor: "#2d2923", floorLit: "#37322a", floorDark: "#221e19", floorEdge: "#1c1915",
  mortar: "#3a352c", brickLit: "#a9a08a", brick: "#8a8270", brickShade: "#6b6455", brickDark: "#514b3f",
};
// The sunny-garden palette.
const GARDEN = {
  gravel: "#cbb98c", gravelLit: "#ddcda3", gravelDark: "#b5a276", gravelPebble: "#9c8a60",
  hedge: "#2f7a30", hedgeDark: "#1d5a24", hedgeLit: "#48a843", hedgeHi: "#86d466",
};
// The volcanic-temple palette.
const BASALT = {
  floor: "#2b2331", floorLit: "#352b3d", floorDark: "#201a26", floorEdge: "#171219",
  mortar: "#120e16", brickLit: "#4e4259", brick: "#352c3f", brickShade: "#251e2d", ember: "#ff7a1e",
};

function fillPixels(c: HTMLCanvasElement, pixel: (x: number, y: number) => string | null) {
  const g = c.getContext("2d")!;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const colour = pixel(x, y);
      if (!colour) continue;
      g.fillStyle = colour;
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

// ----- the Dungeon -----
function makeWall(variant: number) {
  return fillPixels(makeCanvas(TILE, TILE), (x, y) => {
    // Bricks are 8 pixels tall. The joins in the second row are shifted half a brick.
    const row = y >> 3;
    const joinX = ((x + (row ? 8 : 0)) & 15) === 7;
    const joinY = (y & 7) === 7;
    if (joinX || joinY) return STONE.mortar;
    if ((y & 7) === 0) return STONE.brickLit; // light catches the top of each brick
    if ((y & 7) === 6) return STONE.brickShade;
    if (noise(x, y, variant) % 7 === 0) return STONE.brickShade;
    if (noise(x, y, variant + 9) % 11 === 0) return STONE.brickLit;
    return STONE.brick;
  });
}

function makeFloor(variant: number) {
  const c = fillPixels(makeCanvas(TILE, TILE), (x, y) => {
    if (x === 0 || y === 0) return STONE.floorEdge; // gaps between big flagstones
    if (noise(x, y, variant) % 9 === 0) return STONE.floorLit;
    if (noise(x, y, variant + 5) % 13 === 0) return STONE.floorDark;
    return STONE.floor;
  });
  if (variant === 2) { // one stone has a crack
    const g = c.getContext("2d")!;
    g.fillStyle = STONE.floorEdge;
    for (const [x, y] of [[5, 4], [6, 5], [7, 5], [8, 6], [9, 7], [9, 8], [10, 9]]) g.fillRect(x, y, 1, 1);
  }
  return c;
}

function makeStairs(floor: HTMLCanvasElement) {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext("2d")!;
  g.drawImage(floor, 0, 0);
  g.fillStyle = "#0f0d0a";
  g.fillRect(1, 1, 14, 14);
  // Four steps going down into the dark: each one a little darker than the last.
  const lit = ["#d8cdb0", "#a99e80", "#7c725a", "#4f4837"];
  const shade = ["#948a6c", "#6f664f", "#4a4334", "#2a251c"];
  lit.forEach((top, i) => {
    g.fillStyle = top;
    g.fillRect(2, 2 + i * 3, 12, 2);
    g.fillStyle = shade[i];
    g.fillRect(2, 4 + i * 3, 12, 1);
  });
  return c;
}

/** A locked door. `base` and `light` are the colour of its metal bands and lock; the planks change per world. */
function makeDoor(base: string, light: string, planks = ["#7f5a33", "#6e4b2a"], frame = "#14100b") {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext("2d")!;
  g.fillStyle = frame;
  g.fillRect(0, 0, TILE, TILE);
  for (let x = 1; x < 15; x++) { // upright planks
    g.fillStyle = Math.floor((x - 1) / 3) % 2 ? planks[1] : planks[0];
    g.fillRect(x, 1, 1, 14);
  }
  g.fillStyle = base; // two metal bands in the door's colour
  g.fillRect(1, 3, 14, 2);
  g.fillRect(1, 11, 14, 2);
  g.fillStyle = light;
  g.fillRect(1, 3, 14, 1);
  g.fillRect(1, 11, 14, 1);
  g.fillStyle = frame; // the lock
  g.fillRect(5, 5, 6, 6);
  g.fillStyle = base;
  g.fillRect(6, 6, 4, 4);
  g.fillStyle = frame;
  g.fillRect(7, 7, 2, 1);
  g.fillRect(7, 8, 1, 2);
  return c;
}

/**
 * The trapdoor, in four poses: 0 shut (a wooden hatch with a crack you can spot if you look),
 * 1 a creak (the crack opens), 2 half open, 3 fully open: a hole.
 */
function makeTrap(pose: number, floor: HTMLCanvasElement) {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext("2d")!;
  g.drawImage(floor, 0, 0);
  const rect = (x: number, y: number, w: number, hh: number, colour: string) => { g.fillStyle = colour; g.fillRect(x, y, w, hh); };
  if (pose === 3) { // the hole
    rect(1, 1, 14, 14, "#3a2412");
    rect(2, 2, 12, 12, "#0a0705");
    rect(3, 3, 10, 10, "#050403");
    rect(2, 2, 12, 2, "#171009"); // a little light on the far wall
    rect(1, 1, 3, 2, "#6e4b2a"); // splintered plank ends hanging at the edge
    rect(12, 1, 3, 2, "#6e4b2a");
    rect(1, 13, 14, 2, "#2a190c");
    return c;
  }
  rect(1, 1, 14, 14, "#3a2412"); // dark frame
  rect(2, 2, 12, 12, "#7d5530"); // the hatch
  for (const y of [5, 8, 11]) rect(2, y, 12, 1, "#5a3a1c"); // gaps between planks
  rect(2, 2, 12, 1, "#a47643"); // light on the top plank
  rect(3, 3, 2, 2, "#5c5c66"); // hinges...
  rect(3, 11, 2, 2, "#5c5c66");
  rect(11, 7, 2, 2, "#9a9aa6"); // ...and an iron ring to pull
  // The crack: a dark zig-zag across the planks. It is the only clue a careful player needs.
  const crack = [[5, 2], [5, 3], [6, 4], [6, 5], [7, 6], [7, 7], [8, 8], [8, 9], [9, 10], [9, 11], [10, 12], [10, 13]];
  for (const [x, y] of crack) rect(x, y, 1, 1, "#0b0603");
  for (const [x, y] of crack.slice(1, 9)) rect(x - 1, y, 1, 1, "#a47643"); // the splintered edge catches the light
  if (pose === 1) { for (const [x, y] of crack) rect(x + 1, y, 1, 1, "#050302"); }
  if (pose === 2) { // the right half swings down into the dark
    rect(8, 2, 6, 12, "#050403");
    rect(7, 2, 1, 12, "#a47643");
    rect(8, 2, 2, 12, "#2a190c");
  }
  return c;
}

// ----- the Garden Maze -----
function makeGravel(variant: number, flower: string | null) {
  const c = fillPixels(makeCanvas(TILE, TILE), (x, y) => {
    if (noise(x, y, variant) % 8 === 0) return GARDEN.gravelLit;
    if (noise(x, y, variant + 5) % 6 === 0) return GARDEN.gravelDark;
    return GARDEN.gravel;
  });
  const g = c.getContext("2d")!;
  g.fillStyle = GARDEN.gravelPebble; // a few darker pebbles
  for (let k = 0; k < 5; k++) g.fillRect(noise(k, variant, 7) % 14, noise(k, variant, 8) % 14, 2, 1);
  if (flower) { // a tuft of grass with one flower, tucked in a corner
    g.fillStyle = "#3f9a3a";
    for (const [x, y] of [[1, 12], [2, 11], [2, 12], [3, 13], [1, 14], [3, 12], [2, 14], [4, 14], [0, 13]]) g.fillRect(x, y, 1, 1);
    g.fillStyle = flower;
    for (const [x, y] of [[3, 9], [2, 10], [4, 10], [3, 11]]) g.fillRect(x, y, 1, 1);
    g.fillStyle = "#ffe85a";
    g.fillRect(3, 10, 1, 1);
  }
  return c;
}

/** A hedge. `capped` gives the top edge a rounded, leafy look (used where the hedge borders a path on its top side). */
function makeHedge(variant: number, capped: boolean) {
  const c = fillPixels(makeCanvas(TILE, TILE), (x, y) => {
    const n = noise(x >> 1, y >> 1, variant) % 4;
    return n === 0 ? GARDEN.hedgeDark : n === 3 ? GARDEN.hedgeLit : GARDEN.hedge;
  });
  const g = c.getContext("2d")!;
  for (let cy = 0; cy < 4; cy++) { // leaf dabs: a light blob with a bright dot, one in every 4x4 square
    for (let cx = 0; cx < 4; cx++) {
      const ox = cx * 4 + (noise(cx, cy, variant + 3) % 2);
      const oy = cy * 4 + (noise(cx, cy, variant + 4) % 2);
      g.fillStyle = GARDEN.hedgeLit;
      g.fillRect(ox, oy, 3, 2);
      g.fillStyle = GARDEN.hedgeHi;
      g.fillRect(ox, oy, 1, 1);
      g.fillStyle = GARDEN.hedgeDark;
      g.fillRect(ox, oy + 2, 3, 1);
    }
  }
  if (variant === 2) { // a flowering hedge
    for (const [fx, fy, col] of [[3, 4, "#ff7aa8"], [11, 9, "#fff2a0"], [7, 12, "#ff7aa8"], [12, 3, "#fff2a0"]] as [number, number, string][]) {
      g.fillStyle = col;
      for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) g.fillRect(fx + dx, fy + dy, 1, 1);
      g.fillStyle = "#ffcf3a";
      g.fillRect(fx, fy, 1, 1);
    }
  }
  if (capped) {
    for (let x = 0; x < TILE; x++) {
      const bump = 2 + Math.round(1.4 * Math.sin(x * 0.95 + variant * 2)); // a wavy leafy top edge
      g.clearRect(x, 0, 1, bump);
      g.fillStyle = GARDEN.hedgeDark; // a thin dark outline under the edge...
      g.fillRect(x, bump, 1, 1);
      g.fillStyle = GARDEN.hedgeHi; // ...and sunlight on the leaves below it
      g.fillRect(x, bump + 1, 1, 1);
    }
  }
  return c;
}

/** The cellar door: stone steps going down into the ground, with the two wooden door leaves propped open. */
function makeCellar(floor: HTMLCanvasElement) {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext("2d")!;
  g.drawImage(floor, 0, 0);
  const rect = (x: number, y: number, w: number, hh: number, colour: string) => { g.fillStyle = colour; g.fillRect(x, y, w, hh); };
  rect(1, 1, 14, 14, "#4b473d");
  rect(2, 2, 12, 12, "#9a9486"); // the stone surround
  rect(4, 3, 8, 10, "#0c0a08"); // the dark opening
  const lit = ["#cfc6ad", "#a79e85", "#7c735d"];
  const shade = ["#8a816a", "#625a47", "#40392b"];
  lit.forEach((top, i) => { // three steps going down, each darker
    rect(4, 3 + i * 3, 8, 2, top);
    rect(4, 5 + i * 3, 8, 1, shade[i]);
  });
  for (const side of [0, 12]) { // the open door leaves
    rect(side, 3, 4, 10, "#7a4e28");
    rect(side, 3, 4, 1, "#a47643");
    for (const y of [6, 9]) rect(side, y, 4, 1, "#5a3a1c");
    rect(side + (side ? 3 : 0), 3, 1, 10, "#3a2412");
  }
  rect(0, 14, 3, 2, "#3f9a3a"); // grass tufts
  rect(13, 14, 3, 2, "#3f9a3a");
  return c;
}

/** A garden gate, painted in the key's colour. */
function makeGate(base: string, light: string, floor: HTMLCanvasElement) {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext("2d")!;
  g.drawImage(floor, 0, 0);
  const rect = (x: number, y: number, w: number, hh: number, colour: string) => { g.fillStyle = colour; g.fillRect(x, y, w, hh); };
  rect(0, 1, 3, 15, "#2a2a30"); // two posts
  rect(13, 1, 3, 15, "#2a2a30");
  rect(1, 1, 1, 14, base);
  rect(14, 1, 1, 14, base);
  for (const x of [4, 7, 10]) { // pointed pickets
    rect(x, 3, 2, 12, base);
    rect(x, 3, 1, 12, light);
    rect(x, 2, 1, 1, light);
  }
  rect(3, 5, 10, 2, base); // two rails
  rect(3, 11, 10, 2, base);
  rect(3, 5, 10, 1, light);
  rect(3, 11, 10, 1, light);
  rect(11, 8, 2, 2, "#2a2a30"); // the padlock
  return c;
}

// ----- the Lava Heart -----
function makeBasaltWall(variant: number) {
  const brickAt = (x: number, y: number) => {
    const row = y >> 3;
    return { joinX: ((x + (row ? 8 : 0)) & 15) === 7, joinY: (y & 7) === 7 };
  };
  // The cracks: a few jagged lines found by walking down the tile. `glow` makes the crack-only copy.
  const cracks = new Set<number>();
  for (let k = 0; k < variant; k++) { // variant 0 is plain rock; 1 has one crack; 2 has two
    let cx = 2 + (noise(k, variant, 31) % 12);
    for (let y = 1; y < 15; y++) {
      if (noise(y, k, variant + 40) % 3 === 0) cx = clamp(cx + (noise(y, k, variant + 50) % 2 ? 1 : -1), 1, 14);
      cracks.add(y * TILE + cx);
    }
  }
  const wall = fillPixels(makeCanvas(TILE, TILE), (x, y) => {
    if (cracks.has(y * TILE + x)) return "#7a2a10";
    const { joinX, joinY } = brickAt(x, y);
    if (joinX || joinY) return BASALT.mortar;
    if ((y & 7) === 0) return BASALT.brickLit;
    if ((y & 7) === 6) return BASALT.brickShade;
    if (noise(x, y, variant) % 8 === 0) return BASALT.brickShade;
    if (noise(x, y, variant + 9) % 12 === 0) return BASALT.brickLit;
    return BASALT.brick;
  });
  const glow = fillPixels(makeCanvas(TILE, TILE), (x, y) => (cracks.has(y * TILE + x) ? (noise(x, y, 2) % 3 ? "#ff8a2a" : "#ffd36a") : null));
  return { wall, glow };
}

function makeBasaltFloor(variant: number) {
  return fillPixels(makeCanvas(TILE, TILE), (x, y) => {
    if (x === 0 || y === 0) return BASALT.floorEdge;
    if (variant === 2 && ((x + y === 11 && x > 3 && x < 9) || (x === 9 && y === 3))) return "#8a3414"; // a dim glowing crack
    if (noise(x, y, variant + 77) % 97 === 0) return "#c2501a"; // a speck of ember
    if (noise(x, y, variant) % 9 === 0) return BASALT.floorLit;
    if (noise(x, y, variant + 5) % 13 === 0) return BASALT.floorDark;
    return BASALT.floor;
  });
}

/**
 * Lava, in 4 frames. Each pixel's heat comes from a few waves added together (sine waves that
 * repeat exactly every 16 pixels, so neighbouring lava tiles join up without seams). Shifting the
 * waves a little in each frame makes the glow crawl slowly across the pool.
 */
function makeLava(frame: number) {
  const colours = ["#6e1208", "#b3260f", "#ff6a14", "#ffc23a"];
  const TAU = Math.PI * 2;
  return fillPixels(makeCanvas(TILE, TILE), (x, y) => {
    const a = Math.sin(TAU * (x / 16 + frame / 4));
    const b = Math.sin(TAU * ((2 * y) / 16 - frame / 2));
    const c = Math.sin(TAU * ((x + y) / 16 + frame / 4));
    const v = (a + b + c) / 3 + ((noise(x, y, 3) % 100) / 100 - 0.5) * 0.4;
    return colours[v < -0.3 ? 0 : v < 0.12 ? 1 : v < 0.55 ? 2 : 3];
  });
}

/** The way out of the volcano: steps climbing up into daylight. */
function makeDaylightStairs(floor: HTMLCanvasElement) {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext("2d")!;
  g.drawImage(floor, 0, 0);
  const rect = (x: number, y: number, w: number, hh: number, colour: string) => { g.fillStyle = colour; g.fillRect(x, y, w, hh); };
  rect(1, 1, 14, 14, "#0c070d");
  rect(2, 2, 12, 12, "#8fd0f0"); // the sky
  rect(2, 2, 12, 5, "#d6f3ff");
  rect(10, 3, 2, 2, "#fff6c0"); // a little sun
  for (let i = 0; i < 4; i++) { // steps climbing away from us: higher ones are narrower
    const y = 12 - i * 2;
    rect(2 + i, y, 12 - i * 2, 2, i % 2 ? "#e6dcc0" : "#cfc4a4");
    rect(2 + i, y + 1, 12 - i * 2, 1, "#8a7f62");
  }
  return c;
}

const KEY_ART = [
  "................",
  "................",
  "......oooo......",
  ".....okkkko.....",
  "....okllllko....",
  "....okl..lko....",
  "....okl..lko....",
  "....okllllko....",
  ".....okkkko.....",
  "......okko......",
  "......okko......",
  "......okkoo.....",
  "......okko......",
  "......okkoo.....",
  "......okko......",
  ".......oo.......",
];
const GEM_ART = [
  "................",
  "................",
  "................",
  "................",
  ".....oooooo.....",
  "....owwllllo....",
  "...owwlllllmo...",
  "..owlllllllmmo..",
  "..ollllllllmmo..",
  "...ollllllmmo...",
  "....ollllmmo....",
  ".....ollmmo.....",
  "......olmo......",
  ".......oo.......",
  "................",
  "................",
];
// Bats, minotaurs and the other creatures are symmetrical, so we only write the LEFT HALF.
const BAT_WINGS_UP = [
  "........", "........", "........",
  "oo......",
  "opo.....",
  "oppo.obo",
  "opppobrb",
  "opppobbb",
  ".oppobbb",
  "..oo.obb",
  "......ob",
  "........", "........", "........", "........", "........",
];
const BAT_WINGS_DOWN = [
  "........", "........", "........", "........", "........",
  ".....obo",
  "....obrb",
  ".oppobbb",
  "opppobbb",
  "oppp.obb",
  "opo...ob",
  "oo......",
  "........", "........", "........", "........",
];
const MINO_STAND = [
  "h.......",
  "hh......",
  "ghh..ooo",
  ".ghhofff",
  "...offrf",
  "...offff",
  "...offll",
  "....oldl",
  ".....ooo",
  "..ooffff",
  ".offfffl",
  ".offdffl",
  ".okkkknk",
  "..offfff",
  "..offfo.",
  "..oddoo.",
];
const MINO_WALK = [
  ...MINO_STAND.slice(0, 13),
  "..offfff",
  "...offo.",
  "...ooo..",
];

// The hero is 16 rows: 12 for the head and body, 4 for the legs. Two leg poses make him walk.
const HERO_PALETTE = {
  o: "#1c1410", h: "#6b3f1d", s: "#f2c9a0", e: "#1c1410", t: "#3fae6a",
  b: "#d9a441", l: "#34437d", k: "#5a3417",
};
const HERO_FRONT = [
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
const HERO_BACK = [
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
const HERO_SIDE = [
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
const HERO_LEGS_FRONT = [
  ["....ollllllo....", "....olll.llo....", "....okkk..oo....", "....oooo........"],
  ["....ollllllo....", "....ollo.lllo...", ".....oo..okkko..", ".........oooo..."],
];
const HERO_LEGS_SIDE = [
  [".....olllllo....", ".....oll.llo....", ".....okk..kko...", ".....oooo.oooo.."],
  [".....olllllo....", "......ollo......", "......okko......", "......oooo......"],
];

/**
 * The hero's picture sheet: 2 columns (walk frame 1, walk frame 2) by 4 rows (down, left,
 * right, up), each frame 16x16, so the sheet is 32 x 64. YOUR OWN drawing can replace this
 * built-in one: see docs/arcade-art.md.
 */
function makeHeroSheet() {
  const sheet = makeCanvas(TILE * 2, TILE * 4);
  const g = sheet.getContext("2d")!;
  for (let f = 0; f < 2; f++) {
    const front = paint([...HERO_FRONT, ...HERO_LEGS_FRONT[f]], HERO_PALETTE);
    const back = paint([...HERO_BACK, ...HERO_LEGS_FRONT[f]], HERO_PALETTE);
    const right = paint([...HERO_SIDE, ...HERO_LEGS_SIDE[f]], HERO_PALETTE);
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

// Wasps (the garden's version of the bats) are symmetrical too: write the LEFT HALF only.
const WASP_WINGS_UP = [
  "........",
  "....o...",
  "ww...o..",
  "wWw.oooo",
  "wWWWoeyy",
  ".wWWoyyy",
  "..wWokkk",
  "...Wokky",
  "....oyyy",
  "....okkk",
  "....oyyy",
  "....okkk",
  "....oyyy",
  ".....okk",
  ".....oos",
  ".......s",
];
const WASP_WINGS_DOWN = [
  "........",
  "....o...",
  ".....o..",
  "....oooo",
  "....oeyy",
  "....oyyy",
  "...Wokkk",
  "..WWokky",
  ".wWWoyyy",
  "wWWwokkk",
  "wWw.oyyy",
  "ww..okkk",
  "....oyyy",
  ".....okk",
  ".....oos",
  ".......s",
];

/** Turn a picture icy: every solid pixel gets a pale blue-white frost over it. */
function frost(source: HTMLCanvasElement) {
  const c = makeCanvas(source.width, source.height);
  const g = c.getContext("2d")!;
  g.drawImage(source, 0, 0);
  g.globalCompositeOperation = "source-atop"; // only paint where the picture already has pixels
  g.fillStyle = "rgba(150, 215, 255, 0.72)";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "rgba(255, 255, 255, 0.55)";
  for (let k = 0; k < 7; k++) g.fillRect(2 + ((k * 5) % 12), 1 + ((k * 7) % 14), 2, 1); // glints
  return c;
}

/** Everything one world needs to look like itself. */
interface WorldArt {
  floors: HTMLCanvasElement[]; // a few kinds, picked by noise so the ground looks uneven; repeats make a kind more common
  walls: HTMLCanvasElement[];
  cappedWalls?: HTMLCanvasElement[]; // garden only: hedges with a leafy top edge
  wallGlow?: HTMLCanvasElement[]; // lava only: the glowing cracks, drawn on top, pulsing
  exit: HTMLCanvasElement;
  redDoor: HTMLCanvasElement;
  blueDoor: HTMLCanvasElement;
  foes: HTMLCanvasElement[]; // two wing poses
  foesIce: HTMLCanvasElement[];
  background: string; // what shows beyond the map
  shade: string; // the shadow a wall casts on the floor just below it
}

/** Build every picture once, when the screen opens. */
function makeArt() {
  const bat = { o: "#120d18", p: "#5b3f7a", b: "#3a2a4f", r: "#ff4a3a" };
  const wasp = { o: "#1a1204", y: "#ffd02a", k: "#2a1f06", w: "#eaf8ff", W: "#9cc6e6", e: "#e03a2a", s: "#6a6a6a" };
  const mino = { o: "#1a0f0a", f: "#7a4a2a", d: "#4f2f1a", l: "#a46a3c", h: "#efe3c4", g: "#b8a97f", r: "#ff5030", k: "#5b3318", n: "#e0b040" };
  const batPair = [paint(BAT_WINGS_UP, bat, true), paint(BAT_WINGS_DOWN, bat, true)];
  const waspPair = [paint(WASP_WINGS_UP, wasp, true), paint(WASP_WINGS_DOWN, wasp, true)];
  const minos = [paint(MINO_STAND, mino, true), paint(MINO_WALK, mino, true)];

  const stoneFloors = [0, 1, 2].map(makeFloor);
  const dungeon: WorldArt = {
    floors: stoneFloors,
    walls: [0, 1, 2].map(makeWall),
    exit: makeStairs(stoneFloors[0]),
    redDoor: makeDoor("#c8402f", "#ff8a70"),
    blueDoor: makeDoor("#3f7fd0", "#9cc8ff"),
    foes: batPair,
    foesIce: batPair.map(frost),
    background: "#0d0b09",
    shade: "rgba(0,0,0,0.35)",
  };

  // Mostly plain gravel, with the odd tuft of grass and a flower.
  const gravel = [0, 1, 2].map((v) => makeGravel(v, null));
  const pink = makeGravel(3, "#ff7aa8");
  const yellow = makeGravel(4, "#fff06a");
  const white = makeGravel(5, "#ffffff");
  const garden: WorldArt = {
    floors: [gravel[0], gravel[1], gravel[2], gravel[0], gravel[1], pink, gravel[2], gravel[0], gravel[1], yellow, gravel[2], gravel[0], gravel[1], gravel[2], white, gravel[0]],
    // Picked by noise, so a repeated hedge makes that look more common. Only one in six has flowers.
    walls: [0, 1, 0, 1, 0, 2].map((v) => makeHedge(v, false)),
    cappedWalls: [0, 1, 0, 1, 0, 2].map((v) => makeHedge(v, true)),
    exit: makeCellar(gravel[0]),
    redDoor: makeGate("#d8402f", "#ff9a80", gravel[0]),
    blueDoor: makeGate("#3f7fe0", "#9cc8ff", gravel[0]),
    foes: waspPair,
    foesIce: waspPair.map(frost),
    background: "#2f7a30",
    shade: "rgba(10,50,20,0.33)",
  };

  const rock = [0, 1, 0, 0, 2, 0].map(makeBasaltWall); // mostly plain rock, with the odd glowing crack
  const basaltFloors = [0, 1, 0, 0, 1, 2, 0, 1].map(makeBasaltFloor);
  const lava: WorldArt = {
    floors: basaltFloors,
    walls: rock.map((r) => r.wall),
    wallGlow: rock.map((r) => r.glow),
    exit: makeDaylightStairs(basaltFloors[0]),
    redDoor: makeDoor("#e0482f", "#ff9a70", ["#4a3340", "#3d2a35"], "#0c070d"),
    blueDoor: makeDoor("#4f8ae0", "#a8d0ff", ["#4a3340", "#3d2a35"], "#0c070d"),
    foes: batPair,
    foesIce: batPair.map(frost),
    background: "#0e0a10",
    shade: "rgba(0,0,0,0.4)",
  };

  return {
    worlds: { garden, dungeon, lava },
    lavaFrames: [0, 1, 2, 3].map(makeLava),
    trap: [0, 1, 2, 3].map((p) => makeTrap(p, stoneFloors[0])),
    redKey: paint(KEY_ART, { o: "#2a0e0a", k: "#d8402f", l: "#ff9a80" }),
    blueKey: paint(KEY_ART, { o: "#0a1a3a", k: "#3f7fe0", l: "#9cc8ff" }),
    gem: paint(GEM_ART, { o: "#06302a", w: "#e8fff6", l: "#4be3a0", m: "#1e9a6a" }),
    minos,
    minosIce: minos.map(frost),
    hero: makeHeroSheet(),
  };
}

// ---------- sounds ----------
// Short blips made with the same playNote as Planet Pong. Higher number = higher note.
// Each is a list of [note, how long it rings, how long before it starts].
const SOUNDS = {
  step: [[45, 0.05, 0]],
  gem: [[84, 0.09, 0], [91, 0.14, 0.07]],
  key: [[72, 0.08, 0], [79, 0.08, 0.07], [86, 0.16, 0.14]],
  door: [[47, 0.14, 0], [40, 0.22, 0.08]],
  hurt: [[52, 0.14, 0], [45, 0.14, 0.1], [38, 0.3, 0.2]],
  burn: [[96, 0.04, 0], [52, 0.12, 0.03], [45, 0.14, 0.1], [38, 0.3, 0.2]],
  clear: [[72, 0.12, 0], [76, 0.12, 0.1], [79, 0.12, 0.2], [84, 0.3, 0.3]],
  win: [[72, 0.12, 0], [76, 0.12, 0.1], [79, 0.12, 0.2], [84, 0.12, 0.3], [79, 0.1, 0.42], [84, 0.1, 0.52], [91, 0.35, 0.62]],
  lose: [[55, 0.2, 0], [50, 0.2, 0.18], [46, 0.2, 0.36], [38, 0.35, 0.54]],
  // trapdoor: a wooden creak, then a whoosh that falls away
  creak: [[40, 0.12, 0], [37, 0.18, 0.1], [41, 0.1, 0.22]],
  whoosh: [[84, 0.05, 0.05], [76, 0.05, 0.09], [68, 0.06, 0.13], [58, 0.08, 0.17], [48, 0.12, 0.22], [40, 0.2, 0.28]],
  // fire jets: a hiss as they warm up, a low roar when the flame comes
  hiss: [[100, 0.03, 0], [104, 0.03, 0.03], [98, 0.03, 0.06], [103, 0.03, 0.09], [99, 0.03, 0.12], [104, 0.04, 0.15]],
  roar: [[38, 0.14, 0], [33, 0.2, 0.05]],
  // ice
  throw: [[88, 0.05, 0], [95, 0.06, 0.04]],
  freeze: [[96, 0.06, 0], [100, 0.06, 0.05], [103, 0.1, 0.1], [108, 0.22, 0.17]],
  fizz: [[90, 0.03, 0], [84, 0.03, 0.03], [88, 0.03, 0.06], [78, 0.05, 0.09]],
  empty: [[50, 0.03, 0], [44, 0.03, 0.03]],
  charge: [[88, 0.1, 0], [93, 0.1, 0.08], [100, 0.1, 0.16], [105, 0.3, 0.24]],
  thaw: [[84, 0.05, 0], [88, 0.05, 0.05]],
  // a little background sound for each world, played now and then
  chirp: [[96, 0.05, 0], [100, 0.05, 0.07], [96, 0.05, 0.14]],
  drip: [[88, 0.04, 0], [76, 0.1, 0.06]],
  rumble: [[30, 0.3, 0], [27, 0.35, 0.15]],
} satisfies Record<string, Blip[]>;

const AMBIENT = { garden: "chirp", dungeon: "drip", lava: "rumble" } as const;
const ICE_MARK = "❄︎"; // a snowflake, forced to the plain text style so it takes the text colour

/** Break a message into at most two lines so it fits across the little screen. */
function wrap(str: string, max = 38): string[] {
  if (str.length <= max) return [str];
  const cut = str.lastIndexOf(" ", max);
  return [str.slice(0, cut), str.slice(cut + 1)];
}

export function renderLabyrinth(root: HTMLElement): () => void {
  // ---------- page ----------
  const canvas = h("canvas", {
    class: "lab-canvas",
    width: String(W),
    height: String(H),
    role: "img",
    "aria-label": "The Labyrinth: walk three mazes, collect keys and gems, dodge the wasps, bats, fire and the Minotaur, throw ice, and find the way down",
  });
  const pauseBtn = h("button", { class: "btn ghost", type: "button" }, "Pause");
  const hudLevel = h("span", { class: "lab-stat" });
  const hudLives = h("span", { class: "lab-stat lab-lives" });
  const hudKeys = h("span", { class: "lab-stat" });
  const hudGems = h("span", { class: "lab-stat" });
  const hudIce = h("span", { class: "lab-stat lab-icestat" });
  const hudTime = h("span", { class: "lab-stat" });
  const padDirs: [Dir, string, string][] = [[3, "up", "▲"], [1, "left", "◀"], [2, "right", "▶"], [0, "down", "▼"]];
  const padButtons = padDirs.map(([, name, arrow]) =>
    h("button", { class: `lab-key ${name}`, type: "button", tabindex: "-1", "aria-label": `Move ${name}` }, arrow),
  );
  const iceButton = h("button", { class: "lab-key lab-icebtn", type: "button", tabindex: "-1", "aria-label": "Throw ice" }, ICE_MARK);
  root.replaceChildren(
    h(
      "main",
      { class: "play labyrinth" },
      h("div", { class: "play-top" }, h("a", { class: "back", href: "#" }, "◂ Arcade"), h("h1", { class: "play-title" }, "The Labyrinth")),
      h("div", { class: "lab-hud" }, hudLevel, hudLives, hudKeys, hudGems, hudIce, hudTime),
      h("div", { class: "lab-screen" }, canvas),
      h("div", { class: "lab-controls" }, h("div", { class: "lab-pad", "aria-label": "Direction buttons" }, ...padButtons), iceButton),
      h(
        "div",
        { class: "lab-foot" },
        h(
          "p",
          { class: "lab-howto muted" },
          "Arrow keys or WASD to walk (or the buttons on a phone). Grab keys to open matching doors, collect gems, dodge the wasps, bats and the Minotaur, and find the way down. Collect every gem on a level to earn ice: Space or F throws it and freezes what it hits. P or Esc pauses.",
        ),
        pauseBtn,
      ),
    ),
  );
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  void document.fonts?.load("8px Silkscreen").catch(() => {});

  const art = makeArt();
  // YOUR HERO: try to load your own picture sheet. If it isn't there (the usual case) or can't
  // be read, we quietly keep the built-in hero. Nothing is logged either way.
  let heroSheet: HTMLCanvasElement | HTMLImageElement = art.hero;
  let heroFrameW = TILE; // the size of one frame in the sheet (yours might be drawn bigger than 16)
  let heroFrameH = TILE;
  let disposed = false;
  const heroImage = new Image();
  heroImage.onload = () => {
    if (disposed || heroImage.naturalWidth < TILE * 2 || heroImage.naturalHeight < TILE * 4) return;
    heroSheet = heroImage;
    heroFrameW = heroImage.naturalWidth / 2;
    heroFrameH = heroImage.naturalHeight / 4;
  };
  heroImage.onerror = () => {};
  heroImage.src = `${import.meta.env.BASE_URL}arcade/hero.png`;

  // ---------- game state ----------
  // For testing a level directly. Only works in the development copy (npm run dev).
  const devLevel = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get("level")) : 0;
  const firstLevel = devLevel >= 1 && devLevel <= LEVELS.length ? devLevel - 1 : 0;

  let state: State = "ready";
  let stateSince = performance.now();
  let soundOn = false; // browsers only allow sound after the player has pressed something
  let levelIndex = firstLevel;
  let lives = START_LIVES;
  let totalTime = 0; // seconds of actual play, whole game
  let levelTime = 0;
  let totalGems = 0;
  let gemsGot = 0;
  let gemsInLevel = 0;
  let charges = 0; // ice charges in your pocket (they carry over between levels)
  let earnedIce = false; // did this level give you an ice charge?
  let held = { r: 0, b: 0 }; // keys in your pocket
  let best = loadBest(STORE_KEY);
  let newBest = false;
  let hurtTimer = 0;
  let hurtKind: "foe" | "fire" = "foe";
  let safeTimer = 0;
  let fallTimer = 0; // above zero while the hero is falling through a trapdoor
  let cardTimer = 0;
  let bannerText = "";
  let bannerSub = "";
  let bannerTimer = 0;
  let toastText = "";
  let toastTimer = 0;
  let stepCount = 0;
  let jetClock = 0; // seconds on the fire jets' shared clock (see jetPhaseOf)
  let ambientTimer = 3;

  // THE TILE MAP. `tiles` is a grid you look things up in: tiles[row][column].
  // It only holds the parts that can change: walls, floor, doors, trapdoors and so on. Things you
  // pick up (keys, gems) sit in `items`, found by their tile number (row * mapW + column).
  let tiles: string[][] = [];
  let mapW = 0;
  let mapH = 0;
  const items = new Map<number, string>();
  const trapAge = new Map<number, number>(); // for each trapdoor that has opened: seconds since it did
  let start = { x: 1, y: 1 };
  let stairs = { x: 1, y: 1 };
  let bats: Bat[] = []; // bats, or wasps in the garden: the same creature with a different picture
  let mino: Minotaur | null = null;
  let jets: Jet[] = [];
  const jetAt = new Map<number, Jet>();
  let shot: Shot | null = null; // the ice crystal in flight (there is only ever one)
  let puffs: Puff[] = [];

  const player: Walker = { x: 1, y: 1, nx: 1, ny: 1, t: 0, dur: PLAYER_STEP };
  let facing: Dir = 0;

  // Input. `heldDirs` is every direction currently held, newest last. `buffer` remembers the
  // direction you most recently TAPPED, for a short while, so you can press "up" a moment
  // before a corner and the hero turns the instant he reaches it.
  let heldDirs: Dir[] = [];
  let buffer: Dir | null = null;
  let bufferAge = 0;

  const beep = makeBeeper(SOUNDS, () => soundOn);
  function setState(next: State) {
    state = next;
    stateSince = performance.now();
    pauseBtn.textContent = next === "paused" ? "Resume" : "Pause";
  }

  // ---------- loading a level ----------
  const tileAt = (x: number, y: number) => tiles[y]?.[x] ?? "#"; // off the map counts as wall
  const indexOf = (x: number, y: number) => y * mapW + x;
  const worldOf = () => LEVELS[levelIndex].world;

  /** Read the letters of a map (see labyrinth-maps.ts) and set up the world. */
  function loadLevel(n: number) {
    levelIndex = n;
    const rows = LEVELS[n].rows;
    mapH = rows.length;
    mapW = Math.max(...rows.map((r) => r.length));
    tiles = [];
    items.clear();
    trapAge.clear();
    bats = [];
    mino = null;
    jets = [];
    jetAt.clear();
    shot = null;
    puffs = [];
    gemsInLevel = 0;
    gemsGot = 0;
    earnedIce = false;
    held = { r: 0, b: 0 };
    for (let y = 0; y < mapH; y++) {
      const line: string[] = [];
      for (let x = 0; x < mapW; x++) {
        const letter = rows[y][x] ?? "#";
        let tile = ".";
        if ("#RBET~F".includes(letter)) tile = letter; // these stay in the tile grid...
        if (letter === "r" || letter === "b") items.set(indexOf(x, y), letter); // ...these become items...
        if (letter === "*") { items.set(indexOf(x, y), "*"); gemsInLevel++; }
        if (letter === "P") start = { x, y };
        if (letter === "E") stairs = { x, y };
        if (letter === "v" || letter === "h") { // ...and these become creatures
          const dir: Dir = letter === "v" ? (bats.length % 2 ? 0 : 3) : bats.length % 2 ? 1 : 2;
          bats.push({ x, y, nx: x, ny: y, t: 0, dur: BAT_STEP, dir, homeX: x, homeY: y, homeDir: dir, iced: 0 });
        }
        if (letter === "M") mino = { x, y, nx: x, ny: y, t: 0, dur: MINO_WANDER_STEP, came: null, chasing: false, homeX: x, homeY: y, iced: 0 };
        line.push(tile);
      }
      tiles.push(line);
    }
    // Fire jets. Now that the whole map is known, work out which way each one shoots: the first
    // open floor tile in the order down, left, right, up. The flame covers up to JET_LEN floor
    // tiles in that direction and stops at anything that isn't plain floor.
    jetClock = 0;
    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        if (tiles[y][x] !== "F") continue;
        let dir: Dir = 0;
        for (const d of [0, 1, 2, 3] as Dir[]) {
          if (tileAt(x + DX[d], y + DY[d]) === ".") { dir = d; break; }
        }
        let len = 0;
        while (len < JET_LEN && tileAt(x + DX[dir] * (len + 1), y + DY[dir] * (len + 1)) === ".") len++;
        // STAGGER: every jet's timer starts at a different point of the cycle, so they never all fire at once.
        const jet: Jet = { x, y, dir, len, offset: (jets.length * 1.3) % (JET_OFF + JET_WARN + JET_ON), phase: "off" };
        jet.phase = jetPhaseOf(jet);
        jets.push(jet);
        jetAt.set(indexOf(x, y), jet);
      }
    }
    levelTime = 0;
    resetActors();
    bannerText = `Level ${n + 1}: ${LEVELS[n].name}`;
    bannerSub = LEVELS[n].tagline;
    bannerTimer = 3;
    toastTimer = 0;
    ambientTimer = 2;
  }

  /** Put the hero back at the start and send the enemies home. Keys, doors and gems stay as they were. */
  function resetActors() {
    Object.assign(player, { x: start.x, y: start.y, nx: start.x, ny: start.y, t: 0 });
    facing = 0;
    buffer = null;
    fallTimer = 0;
    shot = null;
    for (const b of bats) Object.assign(b, { x: b.homeX, y: b.homeY, nx: b.homeX, ny: b.homeY, t: 0, dir: b.homeDir });
    if (mino) Object.assign(mino, { x: mino.homeX, y: mino.homeY, nx: mino.homeX, ny: mino.homeY, t: 0, came: null, chasing: false });
  }

  function newGame() {
    lives = START_LIVES;
    totalTime = 0;
    totalGems = 0;
    charges = 0;
    newBest = false;
    loadLevel(firstLevel);
    safeTimer = SAFE_TIME;
    setState("playing");
  }

  function setPaused(p: boolean) {
    if (p && state === "playing") setState("paused");
    else if (!p && state === "paused") setState("playing");
  }

  // ---------- collision: "look up the tile before you step" ----------
  // We never move into a wall and then push back out. Instead, before each step, we ask the
  // map what is on the tile we are about to enter. A wall? Don't go. A door? Only with its key.
  // Lava and open trapdoors count as walls, too (see isSolid at the top).

  /** For the hero: can I step this way? */
  function canWalk(d: Dir) {
    const tile = tileAt(player.x + DX[d], player.y + DY[d]);
    if (isSolid(tile)) return false;
    if (tile === "R") return held.r > 0;
    if (tile === "B") return held.b > 0;
    return true;
  }

  /** For the bats and the Minotaur: solid things and closed doors block them. They are not fooled by trapdoors. */
  const enemyCanWalk = (x: number, y: number) => {
    const tile = tileAt(x, y);
    return !isSolid(tile) && tile !== "R" && tile !== "B";
  };

  function toast(text: string) {
    toastText = text;
    toastTimer = 2.2;
  }

  function puff(kind: Puff["kind"], x: number, y: number) {
    puffs.push({ x, y, age: 0, life: kind === "smoke" ? 1 : 0.5, kind });
  }

  /** Decide where the hero goes next (or null to stand still). */
  function chooseDirection(): Dir | null {
    // The wish list, most wanted first: the direction you tapped, then what you are holding.
    const wishes: Dir[] = [];
    if (buffer !== null) wishes.push(buffer);
    for (let i = heldDirs.length - 1; i >= 0; i--) if (!wishes.includes(heldDirs[i])) wishes.push(heldDirs[i]);
    for (const d of wishes) {
      if (!canWalk(d)) continue;
      if (d === buffer) buffer = null; // the tapped turn has been used
      return d;
    }
    if (wishes.length) {
      // Blocked everywhere. Turn to face what is in the way, and say why if it's a locked door.
      facing = wishes[0];
      const tile = tileAt(player.x + DX[facing], player.y + DY[facing]);
      if (tile === "R") toast(worldOf() === "garden" ? "Locked. You need a red key for the gate." : "Locked. You need a red key.");
      if (tile === "B") toast(worldOf() === "garden" ? "Locked. You need a blue key for the gate." : "Locked. You need a blue key.");
    }
    return null;
  }

  function startStep(d: Dir) {
    const nx = player.x + DX[d];
    const ny = player.y + DY[d];
    facing = d;
    const tile = tileAt(nx, ny);
    if (tile === "R" || tile === "B") {
      // Walking into a door with its key opens it. The key is used up.
      if (tile === "R") held.r--;
      else held.b--;
      tiles[ny][nx] = ".";
      beep("door");
      const what = worldOf() === "garden" ? "gate" : "door";
      toast(tile === "R" ? `The red ${what} opens.` : `The blue ${what} opens.`);
    }
    player.nx = nx;
    player.ny = ny;
    stepCount++;
    if (stepCount % 2 === 0) beep("step"); // a soft tick on every other step
  }

  /** Pick up whatever lies on a tile. */
  function pickUp(id: number) {
    const item = items.get(id);
    if (!item) return;
    items.delete(id);
    if (item === "*") {
      gemsGot++;
      totalGems++;
      beep("gem");
      // EVERY gem on the level earns one ice charge (up to the most you can carry).
      if (gemsGot === gemsInLevel) {
        earnedIce = true;
        if (charges < MAX_CHARGES) {
          charges++;
          toast("All the gems! You've earned an ice charge.");
        } else {
          toast("All the gems! Your ice is already full.");
        }
        beep("charge");
      }
    } else {
      if (item === "r") held.r++;
      else held.b++;
      beep("key");
      toast(item === "r" ? "You found a red key." : "You found a blue key.");
    }
  }

  /** The hero has just landed on a tile: pick things up, spring traps, and check for the exit. */
  function arrive() {
    pickUp(indexOf(player.x, player.y));
    if (tileAt(player.x, player.y) === "T") springTrapdoor();
    else if (player.x === stairs.x && player.y === stairs.y) finishLevel();
  }

  /**
   * A TRAPDOOR. Stepping on it opens it (it creaks, then whooshes) and the hero drops. After the
   * fall he is put back at the start. No life is lost, the clock keeps running, and keys and gems
   * are kept. The trapdoor stays open as a hole, and a hole counts as a wall.
   */
  function springTrapdoor() {
    const id = indexOf(player.x, player.y);
    tiles[player.y][player.x] = "O";
    trapAge.set(id, 0);
    fallTimer = FALL_TIME;
    buffer = null;
    beep("creak");
    beep("whoosh");
    toast("A trapdoor! Back you go.");
  }

  function finishLevel() {
    if (levelIndex === LEVELS.length - 1) {
      if (best === null || totalTime < best) {
        newBest = true;
        best = totalTime;
        saveBest(STORE_KEY, totalTime);
      }
      beep("win");
      setState("won");
    } else {
      cardTimer = 0;
      beep("clear");
      setState("cleared");
    }
  }

  // ---------- moving smoothly from tile to tile ----------
  // Nobody jumps from one tile to the next. A step takes a fraction of a second, and while it
  // lasts the thing is drawn part of the way between the two tiles (see where() above).
  // `advance` counts the time. When the step is finished it lands on the new tile, and
  // `next` is asked what to do now. The leftover time carries over so a long walk stays smooth.
  function advance(w: Walker, dt: number, onLand: (() => void) | null, next: () => void) {
    if (isMoving(w)) {
      w.t += dt;
      if (w.t < w.dur) return;
      w.t -= w.dur;
      w.x = w.nx;
      w.y = w.ny;
      onLand?.();
    }
    if (state !== "playing") return;
    next();
    if (!isMoving(w)) w.t = 0;
  }

  // ---------- simple enemy patrols ----------
  // A bat (or wasp) has one job: fly along its row or column. When the next tile is a wall (or a
  // closed door) it turns round. That's the whole trick.
  function patrol(b: Bat) {
    let nx = b.x + DX[b.dir];
    let ny = b.y + DY[b.dir];
    if (!enemyCanWalk(nx, ny)) {
      b.dir = opposite(b.dir);
      nx = b.x + DX[b.dir];
      ny = b.y + DY[b.dir];
    }
    if (enemyCanWalk(nx, ny)) { b.nx = nx; b.ny = ny; }
  }

  // ---------- how the Minotaur finds you: a ripple through the corridors ----------
  // Imagine dropping a pebble where the hero stands. A ripple spreads out along the corridors,
  // one step at a time: every tile next to the hero gets the number 1, the tiles next to those
  // get 2, and so on, stopping when the ripple is CHASE_RANGE steps wide. Walls and closed
  // doors stop a ripple, so it only follows real paths. (The proper name is a
  // "breadth-first search", because it explores everything 1 step away, then 2 steps, then 3.)
  // To find you, the Minotaur just walks downhill: always onto the neighbouring tile with the
  // smaller number. If the ripple never reaches him, you're too far away, and he wanders.
  function ripple(fromX: number, fromY: number, maxSteps: number) {
    const steps = new Map<number, number>([[indexOf(fromX, fromY), 0]]);
    const queue: [number, number][] = [[fromX, fromY]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      const n = steps.get(indexOf(x, y))!;
      if (n >= maxSteps) continue;
      for (let d = 0; d < 4; d++) {
        const tx = x + DX[d];
        const ty = y + DY[d];
        if (!enemyCanWalk(tx, ty) || steps.has(indexOf(tx, ty))) continue;
        steps.set(indexOf(tx, ty), n + 1);
        queue.push([tx, ty]);
      }
    }
    return steps;
  }

  function planMinotaur(m: Minotaur) {
    const steps = ripple(player.nx, player.ny, CHASE_RANGE); // start the ripple where the hero is heading
    const here = steps.get(indexOf(m.x, m.y));
    m.chasing = here !== undefined;
    let pick: Dir | null = null;
    if (here !== undefined) {
      let lowest = here;
      for (let d = 0; d < 4; d++) {
        const n = steps.get(indexOf(m.x + DX[d], m.y + DY[d]));
        if (n !== undefined && n < lowest) { lowest = n; pick = d as Dir; }
      }
    } else {
      // Lost you: amble about, and don't turn straight back unless it's a dead end.
      const open = ([0, 1, 2, 3] as Dir[]).filter((d) => enemyCanWalk(m.x + DX[d], m.y + DY[d]));
      const onward = open.filter((d) => m.came === null || d !== opposite(m.came));
      const choices = onward.length ? onward : open;
      if (choices.length) pick = choices[Math.floor(Math.random() * choices.length)];
    }
    m.dur = m.chasing ? MINO_CHASE_STEP : MINO_WANDER_STEP;
    if (pick !== null) {
      m.came = pick;
      m.nx = m.x + DX[pick];
      m.ny = m.y + DY[pick];
    }
  }

  // ---------- fire jets: a timer cycle ----------
  // Each jet repeats the same cycle forever: OFF for 2 seconds, WARN for 0.6, ON for 1. That is a
  // 3.6 second cycle. We don't give each jet its own stopwatch. One shared clock (`jetClock`)
  // just keeps counting up, and each jet asks "where am I in my cycle?" by taking the clock plus
  // its own offset and finding the remainder after dividing by the cycle length (the % sign).
  // Giving every jet a different offset staggers them so they never all fire at once.
  const CYCLE = JET_OFF + JET_WARN + JET_ON;
  function jetPhaseOf(j: Jet): JetPhase {
    const c = (jetClock + j.offset) % CYCLE;
    return c < JET_OFF ? "off" : c < JET_OFF + JET_WARN ? "warn" : "on";
  }

  /** The tiles a jet's flame covers, nearest first. */
  function flameTiles(j: Jet) {
    const out: [number, number][] = [];
    for (let k = 1; k <= j.len; k++) out.push([j.x + DX[j.dir] * k, j.y + DY[j.dir] * k]);
    return out;
  }

  function updateJets() {
    const me = where(player);
    for (const j of jets) {
      const now = jetPhaseOf(j);
      if (now !== j.phase) {
        j.phase = now;
        // Only jets you can actually see make a noise.
        const near = Math.abs(j.x - me.x) < VIEW_W / 2 + 1 && Math.abs(j.y - me.y) < VIEW_H / 2 + 1;
        if (near && now === "warn") beep("hiss");
        if (near && now === "on") beep("roar");
      }
      // Touching a burning tile = caught. Only while the flame is ON.
      if (j.phase === "on" && safeTimer <= 0 && fallTimer <= 0 && hurtTimer <= 0) {
        for (const [fx, fy] of flameTiles(j)) {
          if (Math.abs(me.x - fx) < HIT_SIZE && Math.abs(me.y - fy) < HIT_SIZE) { caught("fire"); break; }
        }
      }
    }
  }

  // ---------- being caught ----------
  function caught(kind: "foe" | "fire") {
    lives--;
    hurtTimer = HURT_TIME;
    hurtKind = kind;
    if (kind === "fire") {
      const me = where(player);
      puff("smoke", me.x, me.y);
      toast("Singed! Back to the start.");
    }
    beep(kind === "fire" ? "burn" : "hurt");
  }

  function checkHits() {
    if (safeTimer > 0 || fallTimer > 0 || hurtTimer > 0) return;
    const me = where(player);
    const foes: (Walker & { iced: number })[] = mino ? [...bats, mino] : bats;
    for (const e of foes) {
      if (e.iced > 0) continue; // a frozen creature can't catch anyone
      const them = where(e);
      if (Math.abs(me.x - them.x) < HIT_SIZE && Math.abs(me.y - them.y) < HIT_SIZE) {
        caught("foe");
        return;
      }
    }
  }

  function afterHurt() {
    if (lives <= 0) {
      beep("lose");
      setState("over");
    } else {
      resetActors();
      safeTimer = SAFE_TIME;
    }
  }

  // ---------- the ice weapon: a projectile that moves tile by tile ----------
  // The crystal is a Walker, just like the hero: it stands on one tile, then slides to the next
  // one. It is only much quicker (SHOT_STEP). Each time it lands, it looks at the tile ahead, the
  // same "look before you step" idea as the hero. If that tile is a wall, lava or a closed door,
  // the crystal fizzles. Meanwhile, every tiny time slice, we check whether it is touching a creature.
  function throwIce() {
    if (state !== "playing" || hurtTimer > 0 || fallTimer > 0 || shot) return;
    if (charges <= 0) {
      beep("empty");
      toast("No ice. Collect all the gems on a level to earn one.");
      return;
    }
    charges--;
    const me = where(player);
    const x = Math.round(me.x);
    const y = Math.round(me.y);
    shot = { x, y, nx: x, ny: y, t: 0, dur: SHOT_STEP, dir: facing };
    beep("throw");
  }

  function freeze(e: Walker & { iced: number }) {
    e.iced = FREEZE_TIME;
    const p = where(e);
    puff("ice", p.x, p.y);
    beep("freeze");
    toast(e === mino ? "The Minotaur is frozen!" : "Frozen solid!");
  }

  function updateShot(dt: number) {
    const s = shot;
    if (!s) return;
    advance(s, dt, null, () => {
      const nx = s.x + DX[s.dir];
      const ny = s.y + DY[s.dir];
      if (stopsIce(tileAt(nx, ny))) { // hit a wall: the ice fizzles out. The charge is wasted.
        puff("fizz", s.x, s.y);
        beep("fizz");
        shot = null;
        return;
      }
      s.nx = nx;
      s.ny = ny;
    });
    if (!shot) return;
    const p = where(s);
    const foes: (Walker & { iced: number })[] = mino ? [...bats, mino] : bats;
    for (const e of foes) {
      const them = where(e);
      if (Math.abs(p.x - them.x) < 0.7 && Math.abs(p.y - them.y) < 0.7) {
        freeze(e);
        shot = null;
        return;
      }
    }
  }

  // ---------- one tiny slice of game time ----------
  function update(dt: number) {
    if (bannerTimer > 0) bannerTimer -= dt;
    if (toastTimer > 0) toastTimer -= dt;
    jetClock += dt;
    for (const p of puffs) p.age += dt;
    puffs = puffs.filter((p) => p.age < p.life);
    for (const [id, age] of trapAge) trapAge.set(id, age + dt);
    ambientTimer -= dt;
    if (ambientTimer <= 0) {
      ambientTimer = 2.5 + Math.random() * 4;
      beep(AMBIENT[worldOf()]);
    }
    if (hurtTimer > 0) {
      hurtTimer -= dt;
      if (hurtTimer <= 0) afterHurt();
      return;
    }
    levelTime += dt;
    totalTime += dt;
    if (safeTimer > 0) safeTimer -= dt;
    if (buffer !== null) {
      bufferAge += dt;
      if (bufferAge > BUFFER_TIME) buffer = null; // forgotten: too old to matter
    }

    // THE STATUS COUNTDOWN: every frozen creature counts down; at zero it shakes free.
    for (const e of [...bats, ...(mino ? [mino] : [])]) {
      if (e.iced > 0) {
        e.iced -= dt;
        if (e.iced <= 0) { e.iced = 0; beep("thaw"); }
      }
    }

    if (fallTimer > 0) {
      // Falling: the hero can't move. When the fall ends he is back at the start.
      fallTimer -= dt;
      if (fallTimer <= 0) {
        resetActors();
        safeTimer = SAFE_TIME;
      }
    } else {
      advance(player, dt, arrive, () => {
        const d = chooseDirection();
        if (d !== null) startStep(d);
      });
    }
    if (state !== "playing") return;
    for (const b of bats) if (b.iced <= 0) advance(b, dt, null, () => patrol(b));
    if (mino && mino.iced <= 0) {
      const m = mino;
      advance(m, dt, null, () => planMinotaur(m));
    }
    updateShot(dt);
    updateJets();
    checkHits();
  }

  // ---------- the game loop ----------
  // startLoop (from kit.ts) runs the fixed timestep for us and gives back a function to stop it.
  const stopLoop = startLoop({
    playing: () => state === "playing",
    update,
    idle: (dt) => {
      if (state === "cleared") {
        cardTimer += dt;
        if (cardTimer > CARD_TIME) goOn();
      }
    },
    draw: (seconds) => {
      draw(seconds);
      updateHud();
    },
  });

  // ---------- the HUD (the strip above the game) ----------
  let hudSignature = "";
  function updateHud() {
    // Only touch the page when something actually changed.
    const sig = [levelIndex, lives, held.r, held.b, gemsGot, gemsInLevel, charges, Math.floor(totalTime)].join("|");
    if (sig === hudSignature) return;
    hudSignature = sig;
    const pocket: (Node | string)[] = [];
    if (held.r) pocket.push(h("i", { class: "lab-keyicon red", title: "Red key" }));
    if (held.b) pocket.push(h("i", { class: "lab-keyicon blue", title: "Blue key" }));
    const shownLives = clamp(lives, 0, START_LIVES);
    hudLevel.textContent = `Level ${levelIndex + 1}/${LEVELS.length}`;
    hudLives.textContent = "♥".repeat(shownLives) + "♡".repeat(START_LIVES - shownLives);
    hudLives.setAttribute("aria-label", `Lives: ${shownLives} of ${START_LIVES}`);
    hudKeys.replaceChildren("Keys ", ...(pocket.length ? pocket : ["none"]));
    hudGems.textContent = `Gems ${gemsGot}/${gemsInLevel}`;
    hudIce.textContent = `Ice ${charges ? ICE_MARK.repeat(charges) : "none"}`;
    hudIce.setAttribute("aria-label", `Ice charges: ${charges}`);
    iceButton.classList.toggle("empty", charges === 0);
    hudTime.textContent = `Time ${formatTime(totalTime)}`;
  }

  // ---------- drawing ----------
  const px = (x: number, y: number, w: number, hh: number, colour: string) => {
    ctx.fillStyle = colour;
    ctx.fillRect(Math.round(x), Math.round(y), w, hh); // whole pixels only keeps edges crisp
  };

  function text(str: string, x: number, y: number, size: number, colour: string) {
    ctx.font = `${size}px Silkscreen, "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText(str, Math.round(x) + 1, Math.round(y) + 1);
    ctx.fillStyle = colour;
    ctx.fillText(str, Math.round(x), Math.round(y));
  }

  function panel(lines: { t: string; size: number; color: string }[], width = 250) {
    const hgt = lines.length * 14 + 14;
    const x0 = Math.round((W - width) / 2);
    const y0 = Math.round(H / 2 - hgt / 2);
    px(x0, y0, width, hgt, "#12100c");
    px(x0, y0, width, 1, "#a9a08a");
    px(x0, y0 + hgt - 1, width, 1, "#a9a08a");
    px(x0, y0, 1, hgt, "#a9a08a");
    px(x0 + width - 1, y0, 1, hgt, "#a9a08a");
    lines.forEach((l, i) => text(l.t, W / 2, y0 + 14 + i * 14 - 1, l.size, l.color));
  }

  /** A soft dark oval under a sprite, which makes it look like it stands on the floor. */
  const shadow = (sx: number, sy: number) => px(sx + 3, sy + 13, 10, 2, "rgba(0,0,0,0.35)");

  const WORLD_ACCENT = { garden: "#86d466", dungeon: "#d9a441", lava: "#ff8a3a" } as const;

  /** The nozzle of a fire jet, drawn on top of its wall tile. Its glow tells you what it is about to do. */
  function drawNozzle(j: Jet, sx: number, sy: number, t: number) {
    const cx = sx + 8 + DX[j.dir] * 3;
    const cy = sy + 8 + DY[j.dir] * 3;
    px(cx - 5, cy - 5, 10, 10, "#0a070c"); // the dark socket...
    px(cx - 4, cy - 4, 8, 8, "#5a4a60"); // ...a metal ring...
    if (j.phase === "off") {
      px(cx - 3, cy - 3, 6, 6, "#241018");
      px(cx - 1, cy - 1, 2, 2, "#6a1a12"); // a dull red glint
    } else if (j.phase === "warn") {
      // WARNING: the nozzle flickers between orange and yellow, and the stone around it glows.
      const flick = Math.floor(t * 14) % 2 === 0;
      px(cx - 6, cy - 6, 12, 12, "rgba(255,150,40,0.3)");
      px(cx - 3, cy - 3, 6, 6, flick ? "#ff9a2a" : "#ffe27a");
      px(cx - 1, cy - 1, 2, 2, "#ffffff");
      px(cx + DX[j.dir] * 5 - 1, cy + DY[j.dir] * 5 - 1, 2, 2, flick ? "#ffcf4a" : "#ff7a1e"); // a spark of pilot flame
    } else {
      px(cx - 7, cy - 7, 14, 14, "rgba(255,170,50,0.4)");
      px(cx - 3, cy - 3, 6, 6, "#fff2b0");
    }
  }

  /** The flame itself. We draw it pointing "down" in a turned-round picture, then rotate to face the right way. */
  function drawFlame(j: Jet, sx: number, sy: number, t: number) {
    const length = j.len * TILE;
    ctx.save();
    ctx.translate(Math.round(sx + 8), Math.round(sy + 8));
    ctx.rotate([0, Math.PI / 2, -Math.PI / 2, Math.PI][j.dir]);
    px(-8, 8, 16, length, "rgba(255,110,20,0.3)"); // the glow on the floor
    for (let yy = 0; yy < length; yy++) {
      const f = yy / length; // 0 at the nozzle, 1 at the tip
      const flicker = Math.sin(t * 38 + yy * 0.9 + j.x * 3) * 1.2 + Math.sin(t * 23 + yy * 0.4 + j.y) * 1;
      const half = Math.max(1, Math.round(6.5 * (1 - f * 0.55) + flicker));
      px(-half, 8 + yy, half * 2, 1, "#ff5a14");
      const inner = Math.round(half * 0.62);
      px(-inner, 8 + yy, inner * 2, 1, "#ffb02e");
      const core = Math.round(half * 0.3);
      if (f < 0.75 && core > 0) px(-core, 8 + yy, core * 2, 1, "#fff1a8");
    }
    ctx.restore();
  }

  function draw(t: number) {
    const world = worldOf();
    const wArt = art.worlds[world];
    // THE CAMERA. The map is much bigger than the screen, so we only draw the part around the
    // hero. The camera's top-left corner (in pixels) is "hero's position minus half a screen",
    // and we clamp it so the camera never shows anything beyond the edge of the map.
    const me = where(player);
    const shake = hurtTimer > 0 ? Math.round(Math.sin(t * 80) * 1.5) : 0;
    const camX = clamp(Math.round(me.x * TILE + TILE / 2 - W / 2), 0, Math.max(0, mapW * TILE - W)) + shake;
    const camY = clamp(Math.round(me.y * TILE + TILE / 2 - H / 2), 0, Math.max(0, mapH * TILE - H));

    px(0, 0, W, H, wArt.background);

    // Only the tiles that can be seen: pixel position = grid position * 16, minus the camera.
    const x0 = Math.max(0, Math.floor(camX / TILE));
    const x1 = Math.min(mapW - 1, Math.floor((camX + W - 1) / TILE));
    const y0 = Math.max(0, Math.floor(camY / TILE));
    const y1 = Math.min(mapH - 1, Math.floor((camY + H - 1) / TILE));
    const lavaFrame = art.lavaFrames[Math.floor(t * 1.6) % 4];
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const sx = tx * TILE - camX;
        const sy = ty * TILE - camY;
        const tile = tiles[ty][tx];
        const pick = noise(tx, ty, 1) % wArt.walls.length;
        if (tile === "#" || tile === "F") {
          const above = tileAt(tx, ty - 1);
          if (wArt.cappedWalls && above !== "#" && above !== "F") { // a hedge with a path above it gets a leafy top
            ctx.drawImage(wArt.floors[0], sx, sy);
            ctx.drawImage(wArt.cappedWalls[pick], sx, sy);
          } else {
            ctx.drawImage(wArt.walls[pick], sx, sy);
          }
          if (wArt.wallGlow) { // the cracks in the black rock glow, a little differently each
            ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 2 + tx * 0.7 + ty * 1.3);
            ctx.drawImage(wArt.wallGlow[pick], sx, sy);
            ctx.globalAlpha = 1;
          }
          if (tile === "F") {
            const j = jetAt.get(indexOf(tx, ty));
            if (j) drawNozzle(j, sx, sy, t);
          }
          continue;
        }
        if (tile === "~") { ctx.drawImage(lavaFrame, sx, sy); continue; }
        ctx.drawImage(wArt.floors[noise(tx, ty, 1) % wArt.floors.length], sx, sy);
        const above = tileAt(tx, ty - 1);
        if (above === "#" || above === "F") px(sx, sy, TILE, 3, wArt.shade); // the wall casts a little shade
        if (world === "lava") { // lava lights up the floor beside it
          const glow = "rgba(255,110,30,0.38)";
          if (tileAt(tx, ty - 1) === "~") px(sx, sy, TILE, 3, glow);
          if (tileAt(tx, ty + 1) === "~") px(sx, sy + TILE - 3, TILE, 3, glow);
          if (tileAt(tx - 1, ty) === "~") px(sx, sy, 3, TILE, glow);
          if (tileAt(tx + 1, ty) === "~") px(sx + TILE - 3, sy, 3, TILE, glow);
        }
        if (tile === "E") ctx.drawImage(wArt.exit, sx, sy);
        else if (tile === "R") ctx.drawImage(wArt.redDoor, sx, sy);
        else if (tile === "B") ctx.drawImage(wArt.blueDoor, sx, sy);
        else if (tile === "T") ctx.drawImage(art.trap[0], sx, sy);
        else if (tile === "O") {
          const age = trapAge.get(indexOf(tx, ty)) ?? 9; // a hole from the start of the game's memory counts as fully open
          ctx.drawImage(art.trap[age < 0.12 ? 1 : age < 0.25 ? 2 : 3], sx, sy);
        }
      }
    }

    // Flames: drawn over the floor, under the creatures. They show while a jet is ON.
    for (const j of jets) {
      if (j.phase !== "on" || j.len === 0) continue;
      const sx = j.x * TILE - camX;
      const sy = j.y * TILE - camY;
      if (sx < -TILE * 4 || sx > W + TILE * 4 || sy < -TILE * 4 || sy > H + TILE * 4) continue;
      drawFlame(j, sx, sy, t);
    }

    // Things lying on the floor.
    for (const [id, item] of items) {
      const tx = id % mapW;
      const ty = Math.floor(id / mapW);
      if (tx < x0 || tx > x1 || ty < y0 || ty > y1) continue;
      const sx = tx * TILE - camX;
      const sy = ty * TILE - camY;
      shadow(sx, sy);
      const bob = Math.round(Math.sin(t * 4 + tx + ty));
      ctx.drawImage(item === "*" ? art.gem : item === "r" ? art.redKey : art.blueKey, sx, sy + bob);
      if (item === "*" && Math.floor(t * 3 + tx) % 4 === 0) px(sx + 4 + ((tx * 5) % 7), sy + 5 + ((ty * 3) % 4), 1, 1, "#ffffff"); // a twinkle
    }

    // The Minotaur, then the bats, then the hero on top.
    // A frozen creature is drawn icy blue, and in its last second it shakes before breaking free.
    const wobble = (e: { iced: number }) => (e.iced > 0 && e.iced < 1 ? Math.round(Math.sin(t * 60)) : 0);
    if (mino) {
      const p = where(mino);
      const sx = Math.round(p.x * TILE - camX) + wobble(mino);
      const sy = Math.round(p.y * TILE - camY);
      shadow(sx, sy);
      const stride = mino.iced <= 0 && isMoving(mino) && Math.floor(t * (mino.chasing ? 6 : 3)) % 2 ? 1 : 0;
      ctx.drawImage((mino.iced > 0 ? art.minosIce : art.minos)[stride], sx, sy - stride);
      if (mino.chasing && mino.iced <= 0) text("!", sx + 8, sy - 3, 8, "#ff5030");
    }
    for (const b of bats) {
      const p = where(b);
      const sx = Math.round(p.x * TILE - camX) + wobble(b);
      const sy = Math.round(p.y * TILE - camY);
      shadow(sx, sy + 2);
      if (b.iced > 0) ctx.drawImage(wArt.foesIce[0], sx, sy - 2); // frozen in mid-air: wings still
      else ctx.drawImage(wArt.foes[Math.floor(t * (world === "garden" ? 14 : 8) + b.homeX) % 2], sx, sy - 2 + Math.round(Math.sin(t * 5 + b.homeY)));
    }
    const blink = safeTimer > 0 && Math.floor(t * 12) % 2 === 0;
    if (fallTimer > 0) {
      // Falling through the trapdoor: the hero shrinks into the dark.
      const f = 1 - fallTimer / FALL_TIME; // 0 at the start of the fall, 1 at the end
      const size = Math.max(2, Math.round(TILE * (1 - f * 0.9)));
      const off = Math.round((TILE - size) / 2);
      const sx = Math.round(me.x * TILE - camX) + off;
      const sy = Math.round(me.y * TILE - camY) + off + Math.round(f * 3);
      ctx.globalAlpha = 1 - f * 0.6;
      ctx.drawImage(heroSheet, 0, facing * heroFrameH, heroFrameW, heroFrameH, sx, sy, size, size);
      ctx.globalAlpha = 1;
    } else if (!blink && (hurtTimer <= 0 || Math.floor(t * 20) % 2 === 0)) {
      const sx = Math.round(me.x * TILE - camX);
      const sy = Math.round(me.y * TILE - camY);
      shadow(sx, sy);
      const frameNo = isMoving(player) ? stepCount % 2 : 0; // feet swap every tile
      // Cut one frame out of the sheet: column = which foot, row = which way he faces.
      ctx.drawImage(heroSheet, frameNo * heroFrameW, facing * heroFrameH, heroFrameW, heroFrameH, sx, sy, TILE, TILE);
    }

    // The ice crystal: two shapes swapped quickly make it look like it is spinning, and a short trail follows.
    if (shot) {
      const p = where(shot);
      const cx = Math.round(p.x * TILE + 8 - camX);
      const cy = Math.round(p.y * TILE + 8 - camY);
      for (let k = 4; k >= 1; k--) {
        px(cx - DX[shot.dir] * k * 4 - 1, cy - DY[shot.dir] * k * 4 - 1, 2, 2, `rgba(170,225,255,${0.6 - k * 0.12})`);
      }
      if (Math.floor(t * 24) % 2 === 0) { // a plus-shaped crystal...
        px(cx - 1, cy - 4, 3, 9, "#9edcff");
        px(cx - 4, cy - 1, 9, 3, "#9edcff");
      } else { // ...then a cross-shaped one
        for (let k = -3; k <= 3; k++) { px(cx + k - 1, cy + k - 1, 2, 2, "#9edcff"); px(cx + k - 1, cy - k - 1, 2, 2, "#9edcff"); }
      }
      px(cx - 1, cy - 1, 3, 3, "#ffffff");
    }

    // Puffs of smoke, ice and fizz.
    for (const p of puffs) {
      const f = p.age / p.life;
      const cx = Math.round(p.x * TILE + 8 - camX);
      const cy = Math.round(p.y * TILE + 8 - camY);
      if (p.kind === "smoke") {
        for (let k = 0; k < 5; k++) {
          const r = Math.round(2 + f * 4 + (k % 2));
          const ox = Math.round(Math.sin(k * 2.1) * (3 + f * 5));
          px(cx + ox - r / 2, cy - f * 14 - k * 2 - r / 2, r, r, `rgba(${70 + k * 12},${66 + k * 12},${72 + k * 12},${0.8 * (1 - f)})`);
        }
      } else {
        const colour = p.kind === "ice" ? `rgba(190,235,255,${1 - f})` : `rgba(255,255,255,${0.9 - f})`;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          const r = (p.kind === "ice" ? 3 : 1) + f * (p.kind === "ice" ? 12 : 5);
          px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 2, colour);
        }
      }
    }

    // In the Lava Heart, glowing embers drift up the screen.
    if (world === "lava") {
      for (let i = 0; i < 18; i++) {
        const ex = (i * 53 + Math.sin(t * 0.9 + i) * 8 + 320) % W;
        const ey = H - ((t * (8 + (i % 5) * 4) + i * 37) % (H + 8));
        px(ex, ey, 1, 1, i % 3 ? "rgba(255,150,50,0.8)" : "rgba(255,220,120,0.9)");
      }
    }

    // Messages on top.
    if (hurtTimer > 0) px(0, 0, W, H, hurtKind === "fire" ? "rgba(255,120,20,0.3)" : "rgba(200,30,20,0.3)");
    if (bannerTimer > 0 && state === "playing") {
      px(0, 6, W, 24, "rgba(0,0,0,0.62)");
      text(bannerText.toUpperCase(), W / 2, 13, 8, "#e8dcb8");
      text(bannerSub, W / 2, 24, 8, WORLD_ACCENT[world]);
    }
    if (toastTimer > 0 && state === "playing") {
      const lines = wrap(toastText);
      px(0, H - 6 - lines.length * 12, W, lines.length * 12, "rgba(0,0,0,0.62)");
      lines.forEach((l, i) => text(l, W / 2, H - 6 - (lines.length - i) * 12 + 6, 8, "#ffffff"));
    }

    if (state === "ready") {
      panel([
        { t: "THE LABYRINTH", size: 16, color: "#d9a441" },
        { t: "Press Space or tap to start", size: 8, color: "#e8dcb8" },
        { t: "Three worlds. Find the way down.", size: 8, color: "#a9a08a" },
        { t: "Every gem on a level earns ice (Space)", size: 8, color: "#9edcff" },
        ...(best !== null ? [{ t: `Best time ${formatTime(best)}`, size: 8, color: "#4be3a0" }] : []),
      ]);
    } else if (state === "paused") {
      panel([
        { t: "PAUSED", size: 16, color: "#d9a441" },
        { t: "P, Esc, Space or tap to go on", size: 8, color: "#e8dcb8" },
      ]);
    } else if (state === "cleared") {
      const missed = gemsInLevel - gemsGot;
      panel([
        { t: `LEVEL ${levelIndex + 1} COMPLETE`, size: 16, color: "#4be3a0" },
        { t: LEVELS[levelIndex].name, size: 8, color: WORLD_ACCENT[world] },
        { t: `Time ${formatTime(levelTime)}     Gems ${gemsGot} of ${gemsInLevel}`, size: 8, color: "#e8dcb8" },
        earnedIce
          ? { t: "All the gems! You earned ice.", size: 8, color: "#9edcff" }
          : { t: `${missed} gem${missed === 1 ? "" : "s"} missed: no ice this time`, size: 8, color: "#a9a08a" },
        { t: `Ice charges ${charges} of ${MAX_CHARGES}`, size: 8, color: "#9edcff" },
        { t: "Space or tap to go on", size: 8, color: "#a9a08a" },
      ]);
    } else if (state === "over") {
      panel([
        { t: "THE LABYRINTH WINS", size: 12, color: "#ff6b5f" },
        { t: `You got as far as level ${levelIndex + 1}`, size: 8, color: "#e8dcb8" },
        { t: LEVELS[levelIndex].name, size: 8, color: WORLD_ACCENT[world] },
        { t: "Space or tap to try again", size: 8, color: "#e8dcb8" },
      ]);
    } else if (state === "won") {
      panel([
        { t: "YOU ESCAPED!", size: 16, color: "#4be3a0" },
        { t: `Out of ${LEVELS[levelIndex].name}`, size: 8, color: WORLD_ACCENT[world] },
        { t: `Total time ${formatTime(totalTime)}     Gems ${totalGems} of ${ALL_GEMS}`, size: 8, color: "#e8dcb8" },
        { t: newBest ? "A new best time!" : `Best time ${formatTime(best ?? totalTime)}`, size: 8, color: "#d9a441" },
        { t: "Space or tap to play again", size: 8, color: "#e8dcb8" },
      ]);
    }
  }

  // ---------- input ----------
  // Every listener is stored with its "undo" so cleanup can remove them all.
  const undo: (() => void)[] = [];
  function on<T extends EventTarget>(target: T, type: string, fn: (e: any) => void, opts?: AddEventListenerOptions) {
    target.addEventListener(type, fn, opts);
    undo.push(() => target.removeEventListener(type, fn, opts));
  }

  const KEY_DIRS: Record<string, Dir> = {
    ArrowDown: 0, s: 0, S: 0, ArrowLeft: 1, a: 1, A: 1, ArrowRight: 2, d: 2, D: 2, ArrowUp: 3, w: 3, W: 3,
  };
  const keyDir = (k: string) => (Object.hasOwn(KEY_DIRS, k) ? KEY_DIRS[k] : undefined);

  function press(d: Dir) {
    heldDirs = heldDirs.filter((x) => x !== d);
    heldDirs.push(d);
    if (state === "playing") { buffer = d; bufferAge = 0; }
  }
  function release(d: Dir) {
    heldDirs = heldDirs.filter((x) => x !== d);
  }

  /** Space or a tap: start, carry on, or play again, depending on what the game is showing. */
  function goOn() {
    const waited = performance.now() - stateSince;
    if (state === "ready") newGame();
    else if (state === "paused") setPaused(false);
    else if (state === "cleared" && waited > 400) {
      loadLevel(levelIndex + 1);
      safeTimer = SAFE_TIME;
      setState("playing");
    } else if ((state === "over" || state === "won") && waited > 700) newGame(); // a pause, so a held key doesn't skip the screen
  }

  on(window, "keydown", (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    // Stop the arrow keys and Space from scrolling the page while this screen is open.
    if (k === " " || k.startsWith("Arrow")) e.preventDefault();
    soundOn = true;
    const d = keyDir(k);
    if (d !== undefined) { if (!e.repeat) press(d); return; }
    if (e.repeat) return;
    // Space does two jobs: it throws ice while you play, and starts or continues on every card.
    if (k === " ") { if (state === "playing") throwIce(); else goOn(); }
    else if (k === "f" || k === "F") throwIce();
    else if (k === "Enter") goOn();
    else if (k === "p" || k === "P" || k === "Escape") {
      if (state === "playing") setPaused(true);
      else if (state === "paused") setPaused(false);
    }
  });
  on(window, "keyup", (e: KeyboardEvent) => {
    const d = keyDir(e.key);
    if (d !== undefined) release(d);
  });
  on(window, "blur", () => { heldDirs = []; });

  // Pause by itself when the tab is hidden.
  on(document, "visibilitychange", () => { if (document.hidden) setPaused(true); });

  on(canvas, "pointerdown", () => {
    soundOn = true;
    goOn();
  });
  on(pauseBtn, "click", () => {
    soundOn = true;
    setPaused(state === "playing");
    pauseBtn.blur(); // so Space afterwards doesn't "press" this button again
  });

  // The on-screen direction buttons. Pressing one is the same as holding an arrow key.
  padDirs.forEach(([d], i) => {
    const btn = padButtons[i];
    const stop = () => { release(d); btn.classList.remove("pressed"); };
    on(btn, "pointerdown", (e: PointerEvent) => {
      e.preventDefault();
      soundOn = true;
      try {
        btn.setPointerCapture(e.pointerId); // keep hearing about this finger even if it slides off
      } catch {
        // Not every pointer can be captured. The button still works.
      }
      btn.classList.add("pressed");
      if (state !== "playing") goOn();
      press(d);
    });
    on(btn, "pointerup", stop);
    on(btn, "pointercancel", stop);
    on(btn, "lostpointercapture", stop);
    on(btn, "contextmenu", (e: Event) => e.preventDefault()); // no pop-up menu on a long press
  });

  // The snowflake button next to the pad: the phone's version of Space.
  on(iceButton, "pointerdown", (e: PointerEvent) => {
    e.preventDefault();
    soundOn = true;
    iceButton.classList.add("pressed");
    if (state === "playing") throwIce();
    else goOn();
  });
  const iceUp = () => iceButton.classList.remove("pressed");
  on(iceButton, "pointerup", iceUp);
  on(iceButton, "pointercancel", iceUp);
  on(iceButton, "pointerleave", iceUp);
  on(iceButton, "contextmenu", (e: Event) => e.preventDefault());

  // Test helpers. These only exist in the development copy, never in the real site.
  if (import.meta.env.DEV) {
    const foesOf = () => [...bats, ...(mino ? [mino] : [])];
    (window as any).__labyrinth = {
      info: () => ({
        state, level: levelIndex + 1, world: worldOf(), lives, x: player.x, y: player.y, moving: isMoving(player), facing,
        gems: gemsGot, gemsInLevel, charges, earnedIce, held: { ...held },
        hurt: hurtTimer, safe: safeTimer, fall: fallTimer, levelTime, toast: toastTimer > 0 ? toastText : "",
        mino: mino && { x: mino.x, y: mino.y, chasing: mino.chasing, iced: mino.iced },
        bats: bats.map((b) => ({ x: b.x, y: b.y, iced: b.iced })),
        shot: shot && { x: shot.x, y: shot.y, dir: shot.dir },
        openTraps: [...trapAge.keys()].map((id) => [id % mapW, Math.floor(id / mapW)]),
      }),
      start: () => newGame(),
      level: (n: number) => { if (state === "ready") newGame(); loadLevel(n - 1); safeTimer = SAFE_TIME; setState("playing"); },
      teleport: (x: number, y: number, land = true) => { Object.assign(player, { x, y, nx: x, ny: y, t: 0 }); if (land) arrive(); },
      face: (d: Dir) => { facing = d; },
      give: (key: "r" | "b") => { held[key]++; },
      giveCharge: (n = 1) => { charges = clamp(charges + n, 0, MAX_CHARGES); },
      setCharges: (n: number) => { charges = clamp(n, 0, MAX_CHARGES); },
      setLives: (n: number) => { lives = n; },
      throwIce: () => throwIce(),
      gemTiles: () => [...items].filter(([, v]) => v === "*").map(([id]) => [id % mapW, Math.floor(id / mapW)]),
      grabAllGems: () => { for (const [id, v] of [...items]) if (v === "*") pickUp(id); },
      moveMino: (x: number, y: number) => { if (mino) Object.assign(mino, { x, y, nx: x, ny: y, t: 0, homeX: x, homeY: y }); },
      moveBat: (i: number, x: number, y: number) => { Object.assign(bats[i], { x, y, nx: x, ny: y, t: 0 }); },
      jets: () => jets.map((j) => ({ x: j.x, y: j.y, dir: j.dir, len: j.len, offset: j.offset, phase: j.phase })),
      setJetClock: (s: number) => { jetClock = s; for (const j of jets) j.phase = jetPhaseOf(j); },
      setSafe: (s: number) => { safeTimer = s; },
      iced: () => foesOf().map((e) => e.iced),
      tile: (x: number, y: number) => tileAt(x, y),
    };
    undo.push(() => { delete (window as any).__labyrinth; });
  }

  loadLevel(firstLevel); // so the maze shows behind the title card

  // Cleanup: stop the loop and remove every listener when leaving this screen.
  return () => {
    disposed = true;
    stopLoop();
    undo.forEach((f) => f());
  };
}
