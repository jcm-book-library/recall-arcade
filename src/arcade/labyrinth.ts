import { h, formatTime } from "../ui/dom";
import { playNote } from "../music/audio";
import { LEVELS } from "./labyrinth-maps";

// THE LABYRINTH: the second arcade game, seen from above like old Zelda or Pokemon.
// It uses the same LOOP as Planet Pong (read input, update, draw, many times a second).
// What is new here is the WORLD: a map made of square tiles, a hero who steps from tile to
// tile, a camera that follows, and enemies. The maps themselves live in labyrinth-maps.ts.

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
const STORE_KEY = "learning-arcade:labyrinth";

// FIXED TIMESTEP, exactly like Pong: the game moves in equal 1/120 second slices, so it
// runs at the same speed on every screen.
const STEP = 1 / 120;

type Dir = 0 | 1 | 2 | 3; // down, left, right, up (the same order as the rows of the hero's picture sheet)
const DX = [0, -1, 1, 0]; // how far each direction moves sideways, in tiles...
const DY = [1, 0, 0, -1]; // ...and up or down
const opposite = (d: Dir) => (3 - d) as Dir;
type State = "ready" | "playing" | "paused" | "cleared" | "over" | "won";
const ALL_GEMS = LEVELS.reduce((n, l) => n + l.rows.join("").split("*").length - 1, 0);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Anything that walks tile to tile. (x, y) is the tile it is leaving, (nx, ny) is the tile it
// is heading for, and t is how many seconds it has spent on this step. When it isn't moving,
// the two tiles are the same.
interface Walker { x: number; y: number; nx: number; ny: number; t: number; dur: number }
interface Bat extends Walker { dir: Dir; homeX: number; homeY: number; homeDir: Dir }
interface Minotaur extends Walker { came: Dir | null; chasing: boolean; homeX: number; homeY: number }

const isMoving = (w: Walker) => w.nx !== w.x || w.ny !== w.y;

/** Where a walker is RIGHT NOW in tiles, part way between two tiles. This is the smooth sliding. */
function where(w: Walker) {
  const f = Math.min(1, w.t / w.dur); // 0 = still on the old tile, 1 = arrived on the new one
  return { x: w.x + (w.nx - w.x) * f, y: w.y + (w.ny - w.y) * f };
}

// ---------- best time, saved in the browser ----------
function loadBest(): number | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
    return typeof saved?.best === "number" ? saved.best : null;
  } catch {
    return null;
  }
}
function saveBest(seconds: number) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ best: seconds }));
  } catch {
    // Saving is a bonus. If the browser says no, the game carries on.
  }
}

// ---------- pixel art, drawn from letters ----------
// Every picture is a little grid of letters. Each letter is a colour from a palette, and
// "." means "see-through". Draw them to a hidden canvas once, then stamp them onto the screen.
function makeCanvas(w: number, hgt: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = hgt;
  return c;
}

/** Turn rows of letters into a 16x16 picture. With `mirror` you write only the left half. */
function paint(rows: string[], palette: Record<string, string>, mirror = false) {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext("2d")!;
  rows.forEach((row, y) => {
    const full = mirror ? row + [...row].reverse().join("") : row;
    if (import.meta.env.DEV && full.length !== TILE) console.error(`Labyrinth art: row ${y} "${row}" is not ${TILE} wide`);
    [...full].forEach((letter, x) => {
      const colour = palette[letter];
      if (!colour) return;
      g.fillStyle = colour;
      g.fillRect(x, y, 1, 1);
    });
  });
  return c;
}

/** A small repeatable "random" number for a spot, so the stones look uneven but never flicker. */
function noise(x: number, y: number, seed: number) {
  let n = (x * 374761393 + y * 668265263 + seed * 144665) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

// The ancient-stone palette.
const STONE = {
  floor: "#2d2923", floorLit: "#37322a", floorDark: "#221e19", floorEdge: "#1c1915",
  mortar: "#3a352c", brickLit: "#a9a08a", brick: "#8a8270", brickShade: "#6b6455", brickDark: "#514b3f",
};

function makeWall(variant: number) {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext("2d")!;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      // Bricks are 8 pixels tall. The joins in the second row are shifted half a brick.
      const row = y >> 3;
      const joinX = ((x + (row ? 8 : 0)) & 15) === 7;
      const joinY = (y & 7) === 7;
      let colour = STONE.brick;
      if (joinX || joinY) colour = STONE.mortar;
      else if ((y & 7) === 0) colour = STONE.brickLit; // light catches the top of each brick
      else if ((y & 7) === 6) colour = STONE.brickShade;
      else if (noise(x, y, variant) % 7 === 0) colour = STONE.brickShade;
      else if (noise(x, y, variant + 9) % 11 === 0) colour = STONE.brickLit;
      g.fillStyle = colour;
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

function makeFloor(variant: number) {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext("2d")!;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      let colour = STONE.floor;
      if (x === 0 || y === 0) colour = STONE.floorEdge; // gaps between big flagstones
      else if (noise(x, y, variant) % 9 === 0) colour = STONE.floorLit;
      else if (noise(x, y, variant + 5) % 13 === 0) colour = STONE.floorDark;
      g.fillStyle = colour;
      g.fillRect(x, y, 1, 1);
    }
  }
  if (variant === 2) { // one stone has a crack
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

function makeDoor(base: string, light: string) {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext("2d")!;
  g.fillStyle = "#14100b";
  g.fillRect(0, 0, TILE, TILE);
  for (let x = 1; x < 15; x++) { // upright planks
    g.fillStyle = Math.floor((x - 1) / 3) % 2 ? "#6e4b2a" : "#7f5a33";
    g.fillRect(x, 1, 1, 14);
  }
  g.fillStyle = base; // two metal bands in the door's colour
  g.fillRect(1, 3, 14, 2);
  g.fillRect(1, 11, 14, 2);
  g.fillStyle = light;
  g.fillRect(1, 3, 14, 1);
  g.fillRect(1, 11, 14, 1);
  g.fillStyle = "#14100b"; // the lock
  g.fillRect(5, 5, 6, 6);
  g.fillStyle = base;
  g.fillRect(6, 6, 4, 4);
  g.fillStyle = "#14100b";
  g.fillRect(7, 7, 2, 1);
  g.fillRect(7, 8, 1, 2);
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

/** Build every picture once, when the screen opens. */
function makeArt() {
  const bat = { o: "#120d18", p: "#5b3f7a", b: "#3a2a4f", r: "#ff4a3a" };
  const mino = { o: "#1a0f0a", f: "#7a4a2a", d: "#4f2f1a", l: "#a46a3c", h: "#efe3c4", g: "#b8a97f", r: "#ff5030", k: "#5b3318", n: "#e0b040" };
  const floors = [0, 1, 2].map(makeFloor);
  return {
    floors,
    walls: [0, 1, 2].map(makeWall),
    stairs: makeStairs(floors[0]),
    redDoor: makeDoor("#c8402f", "#ff8a70"),
    blueDoor: makeDoor("#3f7fd0", "#9cc8ff"),
    redKey: paint(KEY_ART, { o: "#2a0e0a", k: "#d8402f", l: "#ff9a80" }),
    blueKey: paint(KEY_ART, { o: "#0a1a3a", k: "#3f7fe0", l: "#9cc8ff" }),
    gem: paint(GEM_ART, { o: "#06302a", w: "#e8fff6", l: "#4be3a0", m: "#1e9a6a" }),
    bats: [paint(BAT_WINGS_UP, bat, true), paint(BAT_WINGS_DOWN, bat, true)],
    minos: [paint(MINO_STAND, mino, true), paint(MINO_WALK, mino, true)],
    hero: makeHeroSheet(),
  };
}

// ---------- sounds ----------
// Short blips made with the same playNote as Planet Pong. Higher number = higher note.
const SOUNDS = {
  step: [[45, 0.05, 0]],
  gem: [[84, 0.09, 0], [91, 0.14, 0.07]],
  key: [[72, 0.08, 0], [79, 0.08, 0.07], [86, 0.16, 0.14]],
  door: [[47, 0.14, 0], [40, 0.22, 0.08]],
  hurt: [[52, 0.14, 0], [45, 0.14, 0.1], [38, 0.3, 0.2]],
  clear: [[72, 0.12, 0], [76, 0.12, 0.1], [79, 0.12, 0.2], [84, 0.3, 0.3]],
  win: [[72, 0.12, 0], [76, 0.12, 0.1], [79, 0.12, 0.2], [84, 0.12, 0.3], [79, 0.1, 0.42], [84, 0.1, 0.52], [91, 0.35, 0.62]],
  lose: [[55, 0.2, 0], [50, 0.2, 0.18], [46, 0.2, 0.36], [38, 0.35, 0.54]],
} satisfies Record<string, [number, number, number][]>;

export function renderLabyrinth(root: HTMLElement): () => void {
  // ---------- page ----------
  const canvas = h("canvas", {
    class: "lab-canvas",
    width: String(W),
    height: String(H),
    role: "img",
    "aria-label": "The Labyrinth: walk the maze, collect keys and gems, dodge the bats and the Minotaur, and find the stairs",
  });
  const pauseBtn = h("button", { class: "btn ghost", type: "button" }, "Pause");
  const hudLevel = h("span", { class: "lab-stat" });
  const hudLives = h("span", { class: "lab-stat lab-lives" });
  const hudKeys = h("span", { class: "lab-stat" });
  const hudGems = h("span", { class: "lab-stat" });
  const hudTime = h("span", { class: "lab-stat" });
  const padDirs: [Dir, string, string][] = [[3, "up", "▲"], [1, "left", "◀"], [2, "right", "▶"], [0, "down", "▼"]];
  const padButtons = padDirs.map(([, name, arrow]) =>
    h("button", { class: `lab-key ${name}`, type: "button", tabindex: "-1", "aria-label": `Move ${name}` }, arrow),
  );
  root.replaceChildren(
    h(
      "main",
      { class: "play labyrinth" },
      h("div", { class: "play-top" }, h("a", { class: "back", href: "#" }, "◂ Arcade"), h("h1", { class: "play-title" }, "The Labyrinth")),
      h("div", { class: "lab-hud" }, hudLevel, hudLives, hudKeys, hudGems, hudTime),
      h("div", { class: "lab-screen" }, canvas),
      h("div", { class: "lab-pad", "aria-label": "Direction buttons" }, ...padButtons),
      h(
        "div",
        { class: "lab-foot" },
        h(
          "p",
          { class: "lab-howto muted" },
          "Arrow keys or WASD to walk (or the buttons on a phone). Grab keys to open matching doors, collect gems, dodge the bats and find the stairs. P or Esc pauses.",
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
  let held = { r: 0, b: 0 }; // keys in your pocket
  let best = loadBest();
  let newBest = false;
  let hurtTimer = 0;
  let safeTimer = 0;
  let cardTimer = 0;
  let bannerText = "";
  let bannerTimer = 0;
  let toastText = "";
  let toastTimer = 0;
  let stepCount = 0;

  // THE TILE MAP. `tiles` is a grid you look things up in: tiles[row][column].
  // It only holds the parts that can change: walls, floor, doors and the stairs. Things you pick
  // up (keys, gems) sit in `items`, found by their tile number (row * mapW + column).
  let tiles: string[][] = [];
  let mapW = 0;
  let mapH = 0;
  const items = new Map<number, string>();
  let start = { x: 1, y: 1 };
  let stairs = { x: 1, y: 1 };
  let bats: Bat[] = [];
  let mino: Minotaur | null = null;

  const player: Walker = { x: 1, y: 1, nx: 1, ny: 1, t: 0, dur: PLAYER_STEP };
  let facing: Dir = 0;

  // Input. `heldDirs` is every direction currently held, newest last. `buffer` remembers the
  // direction you most recently TAPPED, for a short while, so you can press "up" a moment
  // before a corner and the hero turns the instant he reaches it.
  let heldDirs: Dir[] = [];
  let buffer: Dir | null = null;
  let bufferAge = 0;

  const beep = (name: keyof typeof SOUNDS) => {
    if (soundOn) for (const [note, length, delay] of SOUNDS[name]) playNote(note, length, delay);
  };
  function setState(next: State) {
    state = next;
    stateSince = performance.now();
    pauseBtn.textContent = next === "paused" ? "Resume" : "Pause";
  }

  // ---------- loading a level ----------
  const tileAt = (x: number, y: number) => tiles[y]?.[x] ?? "#"; // off the map counts as wall
  const indexOf = (x: number, y: number) => y * mapW + x;

  /** Read the letters of a map (see labyrinth-maps.ts) and set up the world. */
  function loadLevel(n: number) {
    levelIndex = n;
    const rows = LEVELS[n].rows;
    mapH = rows.length;
    mapW = Math.max(...rows.map((r) => r.length));
    tiles = [];
    items.clear();
    bats = [];
    mino = null;
    gemsInLevel = 0;
    gemsGot = 0;
    held = { r: 0, b: 0 };
    for (let y = 0; y < mapH; y++) {
      const line: string[] = [];
      for (let x = 0; x < mapW; x++) {
        const letter = rows[y][x] ?? "#";
        let tile = ".";
        if (letter === "#" || letter === "R" || letter === "B" || letter === "E") tile = letter;
        if (letter === "r" || letter === "b") items.set(indexOf(x, y), letter);
        if (letter === "*") { items.set(indexOf(x, y), "*"); gemsInLevel++; }
        if (letter === "P") start = { x, y };
        if (letter === "E") stairs = { x, y };
        if (letter === "v" || letter === "h") {
          const dir: Dir = letter === "v" ? (bats.length % 2 ? 0 : 3) : bats.length % 2 ? 1 : 2;
          bats.push({ x, y, nx: x, ny: y, t: 0, dur: BAT_STEP, dir, homeX: x, homeY: y, homeDir: dir });
        }
        if (letter === "M") mino = { x, y, nx: x, ny: y, t: 0, dur: MINO_WANDER_STEP, came: null, chasing: false, homeX: x, homeY: y };
        line.push(tile);
      }
      tiles.push(line);
    }
    levelTime = 0;
    resetActors();
    bannerText = `Level ${n + 1}: ${LEVELS[n].name}`;
    bannerTimer = 2.6;
    toastTimer = 0;
  }

  /** Put the hero back at the start and send the enemies home. Keys, doors and gems stay as they were. */
  function resetActors() {
    Object.assign(player, { x: start.x, y: start.y, nx: start.x, ny: start.y, t: 0 });
    facing = 0;
    buffer = null;
    for (const b of bats) Object.assign(b, { x: b.homeX, y: b.homeY, nx: b.homeX, ny: b.homeY, t: 0, dir: b.homeDir });
    if (mino) Object.assign(mino, { x: mino.homeX, y: mino.homeY, nx: mino.homeX, ny: mino.homeY, t: 0, came: null, chasing: false });
  }

  function newGame() {
    lives = START_LIVES;
    totalTime = 0;
    totalGems = 0;
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

  /** For the hero: can I step this way? */
  function canWalk(d: Dir) {
    const tile = tileAt(player.x + DX[d], player.y + DY[d]);
    if (tile === "#") return false;
    if (tile === "R") return held.r > 0;
    if (tile === "B") return held.b > 0;
    return true;
  }

  /** For the bats and the Minotaur: closed doors and walls both block them. */
  const enemyCanWalk = (x: number, y: number) => {
    const tile = tileAt(x, y);
    return tile !== "#" && tile !== "R" && tile !== "B";
  };

  function toast(text: string) {
    toastText = text;
    toastTimer = 1.8;
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
      if (tile === "R") toast("Locked. You need a red key.");
      if (tile === "B") toast("Locked. You need a blue key.");
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
      toast(tile === "R" ? "The red door opens." : "The blue door opens.");
    }
    player.nx = nx;
    player.ny = ny;
    stepCount++;
    if (stepCount % 2 === 0) beep("step"); // a soft tick on every other step
  }

  /** The hero has just landed on a tile: pick things up, and check for the stairs. */
  function arrive() {
    const id = indexOf(player.x, player.y);
    const item = items.get(id);
    if (item) {
      items.delete(id);
      if (item === "*") { gemsGot++; totalGems++; beep("gem"); }
      else {
        if (item === "r") held.r++;
        else held.b++;
        beep("key");
        toast(item === "r" ? "You found a red key." : "You found a blue key.");
      }
    }
    if (player.x === stairs.x && player.y === stairs.y) finishLevel();
  }

  function finishLevel() {
    if (levelIndex === LEVELS.length - 1) {
      if (best === null || totalTime < best) {
        newBest = true;
        best = totalTime;
        saveBest(totalTime);
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
  // A bat has one job: fly along its row or column. When the next tile is a wall (or a closed
  // door) it turns round. That's the whole trick.
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

  // ---------- being caught ----------
  function checkHits() {
    if (safeTimer > 0) return;
    const me = where(player);
    const foes: Walker[] = mino ? [...bats, mino] : bats;
    for (const e of foes) {
      const them = where(e);
      if (Math.abs(me.x - them.x) < HIT_SIZE && Math.abs(me.y - them.y) < HIT_SIZE) {
        lives--;
        hurtTimer = HURT_TIME;
        beep("hurt");
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

  // ---------- one tiny slice of game time ----------
  function update(dt: number) {
    if (bannerTimer > 0) bannerTimer -= dt;
    if (toastTimer > 0) toastTimer -= dt;
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

    advance(player, dt, arrive, () => {
      const d = chooseDirection();
      if (d !== null) startStep(d);
    });
    if (state !== "playing") return;
    for (const b of bats) advance(b, dt, null, () => patrol(b));
    if (mino) {
      const m = mino;
      advance(m, dt, null, () => planMinotaur(m));
    }
    checkHits();
  }

  // ---------- the game loop ----------
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = clamp((now - last) / 1000, 0, 0.25);
    last = now;
    if (state === "playing") {
      acc += dt;
      while (state === "playing" && acc >= STEP) { update(STEP); acc -= STEP; }
    } else {
      acc = 0;
      if (state === "cleared") {
        cardTimer += dt;
        if (cardTimer > CARD_TIME) goOn();
      }
    }
    draw(now / 1000);
    updateHud();
  }

  // ---------- the HUD (the strip above the game) ----------
  let hudSignature = "";
  function updateHud() {
    // Only touch the page when something actually changed.
    const sig = [levelIndex, lives, held.r, held.b, gemsGot, gemsInLevel, Math.floor(totalTime)].join("|");
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

  function panel(lines: { t: string; size: number; color: string }[], width = 240) {
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

  function draw(t: number) {
    // THE CAMERA. The map is much bigger than the screen, so we only draw the part around the
    // hero. The camera's top-left corner (in pixels) is "hero's position minus half a screen",
    // and we clamp it so the camera never shows anything beyond the edge of the map.
    const me = where(player);
    const shake = hurtTimer > 0 ? Math.round(Math.sin(t * 80) * 1.5) : 0;
    const camX = clamp(Math.round(me.x * TILE + TILE / 2 - W / 2), 0, Math.max(0, mapW * TILE - W)) + shake;
    const camY = clamp(Math.round(me.y * TILE + TILE / 2 - H / 2), 0, Math.max(0, mapH * TILE - H));

    px(0, 0, W, H, "#0d0b09");

    // Only the tiles that can be seen: pixel position = grid position * 16, minus the camera.
    const x0 = Math.max(0, Math.floor(camX / TILE));
    const x1 = Math.min(mapW - 1, Math.floor((camX + W - 1) / TILE));
    const y0 = Math.max(0, Math.floor(camY / TILE));
    const y1 = Math.min(mapH - 1, Math.floor((camY + H - 1) / TILE));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const sx = tx * TILE - camX;
        const sy = ty * TILE - camY;
        const tile = tiles[ty][tx];
        const pick = noise(tx, ty, 1) % 3;
        if (tile === "#") { ctx.drawImage(art.walls[pick], sx, sy); continue; }
        ctx.drawImage(art.floors[pick], sx, sy);
        if (tileAt(tx, ty - 1) === "#") px(sx, sy, TILE, 3, "rgba(0,0,0,0.35)"); // the wall casts a little shade
        if (tile === "E") ctx.drawImage(art.stairs, sx, sy);
        else if (tile === "R") ctx.drawImage(art.redDoor, sx, sy);
        else if (tile === "B") ctx.drawImage(art.blueDoor, sx, sy);
      }
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
    if (mino) {
      const p = where(mino);
      const sx = Math.round(p.x * TILE - camX);
      const sy = Math.round(p.y * TILE - camY);
      shadow(sx, sy);
      const stride = isMoving(mino) && Math.floor(t * (mino.chasing ? 6 : 3)) % 2 ? 1 : 0;
      ctx.drawImage(art.minos[stride], sx, sy - stride);
      if (mino.chasing) text("!", sx + 8, sy - 3, 8, "#ff5030");
    }
    for (const b of bats) {
      const p = where(b);
      const sx = Math.round(p.x * TILE - camX);
      const sy = Math.round(p.y * TILE - camY);
      shadow(sx, sy + 2);
      ctx.drawImage(art.bats[Math.floor(t * 8 + b.homeX) % 2], sx, sy - 2 + Math.round(Math.sin(t * 5 + b.homeY)));
    }
    const blink = safeTimer > 0 && Math.floor(t * 12) % 2 === 0;
    if (!blink && (hurtTimer <= 0 || Math.floor(t * 20) % 2 === 0)) {
      const sx = Math.round(me.x * TILE - camX);
      const sy = Math.round(me.y * TILE - camY);
      shadow(sx, sy);
      const frameNo = isMoving(player) ? stepCount % 2 : 0; // feet swap every tile
      // Cut one frame out of the sheet: column = which foot, row = which way he faces.
      ctx.drawImage(heroSheet, frameNo * heroFrameW, facing * heroFrameH, heroFrameW, heroFrameH, sx, sy, TILE, TILE);
    }

    // Messages on top.
    if (hurtTimer > 0) px(0, 0, W, H, "rgba(200,30,20,0.3)");
    if (bannerTimer > 0 && state === "playing") {
      px(0, 6, W, 14, "rgba(0,0,0,0.6)");
      text(bannerText.toUpperCase(), W / 2, 13, 8, "#e8dcb8");
    }
    if (toastTimer > 0 && state === "playing") {
      px(0, H - 20, W, 14, "rgba(0,0,0,0.6)");
      text(toastText, W / 2, H - 13, 8, "#ffffff");
    }

    if (state === "ready") {
      panel([
        { t: "THE LABYRINTH", size: 16, color: "#d9a441" },
        { t: "Press Space or tap to start", size: 8, color: "#e8dcb8" },
        { t: "Find the stairs on every level", size: 8, color: "#a9a08a" },
        ...(best !== null ? [{ t: `Best time ${formatTime(best)}`, size: 8, color: "#4be3a0" }] : []),
      ]);
    } else if (state === "paused") {
      panel([
        { t: "PAUSED", size: 16, color: "#d9a441" },
        { t: "P, Esc, Space or tap to go on", size: 8, color: "#e8dcb8" },
      ]);
    } else if (state === "cleared") {
      panel([
        { t: "LEVEL COMPLETE", size: 16, color: "#4be3a0" },
        { t: `Time ${formatTime(levelTime)}     Gems ${gemsGot} of ${gemsInLevel}`, size: 8, color: "#e8dcb8" },
        { t: "Space or tap to go on", size: 8, color: "#a9a08a" },
      ]);
    } else if (state === "over") {
      panel([
        { t: "THE LABYRINTH WINS", size: 12, color: "#ff6b5f" },
        { t: `You got as far as level ${levelIndex + 1}`, size: 8, color: "#e8dcb8" },
        { t: "Space or tap to try again", size: 8, color: "#e8dcb8" },
      ]);
    } else if (state === "won") {
      panel([
        { t: "YOU ESCAPED!", size: 16, color: "#4be3a0" },
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
    if (k === " " || k === "Enter") goOn();
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

  // Test helpers. These only exist in the development copy, never in the real site.
  if (import.meta.env.DEV) {
    (window as any).__labyrinth = {
      info: () => ({ state, level: levelIndex + 1, lives, x: player.x, y: player.y, moving: isMoving(player), gems: gemsGot, held: { ...held }, mino: mino && { x: mino.x, y: mino.y, chasing: mino.chasing }, bats: bats.length }),
      teleport: (x: number, y: number) => Object.assign(player, { x, y, nx: x, ny: y, t: 0 }),
      give: (key: "r" | "b") => { held[key]++; },
    };
    undo.push(() => { delete (window as any).__labyrinth; });
  }

  loadLevel(firstLevel); // so the maze shows behind the title card
  raf = requestAnimationFrame(frame);

  // Cleanup: stop the loop and remove every listener when leaving this screen.
  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    undo.forEach((f) => f());
  };
}
