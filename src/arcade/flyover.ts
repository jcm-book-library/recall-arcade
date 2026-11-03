import { h, formatTime } from "../ui/dom";
import { AIRPORT_TABLE } from "../decks/airports-data";
import {
  AIRCRAFT, LEGS, WORLD_H, GATE_RETRY, TAKEOFF_LEN, LAND_AFTER_GATE, ROLL_OUT, RUNWAY_END_PAD, OBSTACLE_INFO,
  FULL_TANK, GLIDE_SPEED, AMBER_BELOW, RED_BELOW, LOW_FUEL_BEEPS, REFUEL_SECONDS, THUNDER_WARN, THUNDER_BOLT,
  THERMAL_W, THERMAL_TOP, THERMAL_LIFT,
  checkpointAt, gateSlots, groundWidth, hitboxOf, pictureOf, stopKind, thunderAt, boltRect,
  isMover, moverBox, heliY, devilHeight, devilX, inThermal,
  type Aircraft, type Leg, type ObstacleSpec, type Rect, type Terrain, type ThunderPhase,
} from "./flyover-data";
import { buildCourse, makeRng, mixSeed, pickDecoys, terrainBlend, type Course } from "./flyover-gen";
import { clamp, loadBest, makeBeeper, noise, paint, saveBest, startLoop } from "./kit";
import type { Blip } from "./kit";

// FLYOVER: the third arcade game, a side-scrolling flight. It uses the same LOOP as Planet
// Pong and The Labyrinth (now shared in kit.ts: read input, update, draw, many times a second).
// What is new here:
//   1. SMOOTH MOVEMENT. The Labyrinth hero hopped from tile to tile. The plane glides: it has
//      a speed that builds up and dies away slowly (velocity and acceleration).
//   2. A SCROLLING WORLD. The plane never really moves sideways. The world slides past it.
//   3. HITBOXES. We test touching with a rectangle smaller than the picture.
//   4. COURSES MADE FROM RECIPES. Each leg picks a route at random, and flyover-gen.ts makes the
//      obstacles from what is below each hop (sea, desert, city...) using a SEEDED random
//      number generator, so a play can be repeated exactly.
//   5. CHECKPOINTS. Gates to fly through, and a quiz hidden in them: which airport code is it?
//   6. TAKE-OFF AND LANDING. The plane rolls down a runway and lifts off at the start of each leg,
//      and every leg ends with a landing. Nothing stops in the middle: it is a long flight.
//   7. BLENDED SCENERY. The land or sea below changes gradually from one terrain to the next.
//   8. FUEL. A number that DRAINS while you fly (fastest when you climb) and REFILLS at certain
//      moments. It is the life bar on legs 2 and 3. See the "fuel" section below.
//   9. TRANSITS AND STOPOVERS. On legs 2 and 3 each middle stop is either a TRANSIT (just a gate,
//      no fuel) or a STOPOVER (flying through the gate fills the tank, with no pause: the bar
//      rises over about a second while you keep flying).
//  10. A TIMER THAT REPEATS. On leg 3 a thundercloud runs a cycle: quiet, then a warning light,
//      then a bolt, then round again. The cycle is worked out from the game clock (see thunderAt in
//      flyover-data.ts), so it is the same for the drawing and the touching.
//  11. THINGS THAT MOVE ON THEIR OWN. Also on leg 3: a news helicopter over a city swings up and
//      down, and a dust devil over a desert grows, shrinks and drifts left. Their place is plain
//      maths of the game clock too (heliY, devilHeight, devilX, moverBox in flyover-data.ts), so what
//      you see is exactly what can hit you. Heat thermals are the gentle cousin: not a strike,
//      just an extra push UP while you are inside the shimmering column.

// ---------- the world ----------
const W = 320; // the canvas is tiny, then the browser scales it up with crisp pixels
const H = WORLD_H; // 180
const PLANE_X = Math.round(W / 3); // the plane sits a third of the way across and stays there
const SURFACE = 170; // the height of the runway top: the plane's wheels rest here

const MAX_COMFORT = 3; // three stars
const SPEED_UP = 45; // how quickly the plane builds up forward speed (pixels per second, per second)
const TAKEOFF_ACCEL = 60; // the engines are working harder on the runway
const WOBBLE_TIME = 1.0; // how long the plane wobbles after turbulence
const RECOVER_TIME = 0.8; // how long it takes to float back to a safe height
const INVULN_TIME = 2.2; // after a bump nothing else can bump you for a moment
const SLOW_TIME = 0.9; // turbulence slows the plane down for a moment
const CARD_TIME = 4; // the "leg intro" card moves on by itself after this many seconds
const REST_TIME = 0.9; // the plane sits on the runway this long after landing
const FLAMEOUT_TIME = 1.7; // engines out: the plane glides down for this long before the "diverted" card
const STORE_KEY = "learning-arcade:flyover";

type State = "ready" | "briefing" | "playing" | "paused" | "legdone" | "diverted" | "won";
// What the plane is doing, inside "playing":
//   parked   sitting on a runway (the cards are showing)
//   takeoff  rolling, then lifting off. The computer flies; you cannot fail.
//   flight   you are flying
//   landing  gliding down to the runway, then rolling to a stop. The computer flies.
//   landed   stopped on the runway, at the end of the leg
//   flameout out of fuel: the engines are quiet and the plane glides down, then we divert
type Phase = "parked" | "takeoff" | "flight" | "landing" | "landed" | "flameout";

const smooth = (t: number) => t * t * (3 - 2 * t); // eases from 0 to 1 gently at both ends
const mod = (a: number, n: number) => ((a % n) + n) % n;
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---------- airports ----------
// The airport list from the Airports quiz: code | city | name | country | region | ...
const AIRPORTS = new Map<string, { city: string; country: string; region: string }>();
for (const line of AIRPORT_TABLE.trim().split("\n")) {
  const [code, city, , country, region] = line.split("|");
  AIRPORTS.set(code, { city, country, region });
}
const cityOf = (code: string) => AIRPORTS.get(code)?.city ?? code;
const countryOf = (code: string) => AIRPORTS.get(code)?.country ?? "";
const regionOf = (code: string) => AIRPORTS.get(code)?.region;

// ---------- pixel art, drawn from letters (paint comes from kit.ts) ----------
const PLANE_PALETTE = {
  o: "#1b2433", w: "#f4f7fb", s: "#c3cfde", r: "#d8402f", b: "#2f6fd0", t: "#1f9a8f",
  g: "#7fd0ff", p: "#aab4c2", d: "#5b6678", y: "#ffd34e",
};

// The Cessna: small, with a wing on TOP and a propeller. 24 wide.
const CESSNA_ART = [
  "..........oooooooooo....",
  "..........owwwwwwwwwo...",
  "..oo......oooooooooo....",
  "..oro....ooowwwwwwoo.p..",
  "..orwooooswwggwwggwwoop.",
  ".orwwwwwwwwwwwwwwwwwwoop",
  "..oosrrrrrrrrrrrrrrsoo.p",
  "....oosssssssssssssoo...",
  ".....ooooooooooooooo....",
  "..........o....o........",
  ".........ooo..ooo.......",
];

// The little jet: sleek, swept back, blue tail. 30 wide.
const JET_ART = [
  "..ob..........................",
  "..obbo........................",
  "..obbbo.......................",
  "...obbboooooooooooooooo.......",
  "...oobbwwwwwwwwwwwwwwwwooo....",
  "..oobbwwwggggggggwwwwwwwwwoo..",
  ".oowwwwwwwwwwwwwwwwwwwwwwwwwo.",
  "..osswwwwwwwwwwwwwwwwwwwwwoo..",
  "...oossssssssssssssssssooo....",
  ".....oodd..ooooooooo..........",
  "......oddo...ooddoo...........",
  ".......ooo.....oo.............",
];

// The jumbo: long, tall tail, a hump on top, four engines. 46 wide.
const JUMBO_ART = [
  "..tt...........................................",
  "..ttt..........................................",
  "..tttt..................ooooooooo..............",
  "..ttttt..............ooowwwwwwwwwooooo.........",
  "...ttttto..........oowwwwwwwwwwwwwwwwwoo.......",
  "...ttttttooooooooooowwwggggggggwwwwwwwwwoo.....",
  "....otttttwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwoo..",
  "...oottttwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwo.",
  "..oowwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwo",
  "...osswwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwoo.",
  "....osssssssssssssssssssssssssssssssssssssoo...",
  ".....ooossssssssssssssssssssssssssssssssoo.....",
  ".........ooo......oooooooooooo.......oooo......",
  "........oddo.....oddddoodddd.o......odddo......",
  ".........oo.......oooo.oooo..........ooo.......",
];


// ---------- sounds ----------
// Short blips made with the same piano as the other games. Higher number = higher note.
const SOUNDS = {
  stop: [[79, 0.08, 0], [86, 0.16, 0.08]],
  bump: [[50, 0.12, 0], [44, 0.12, 0.09], [40, 0.2, 0.18]],
  miss: [[60, 0.1, 0], [57, 0.14, 0.1]],
  clear: [[72, 0.12, 0], [76, 0.12, 0.1], [79, 0.12, 0.2], [84, 0.3, 0.3]],
  divert: [[55, 0.2, 0], [50, 0.2, 0.18], [46, 0.3, 0.36]],
  win: [[72, 0.12, 0], [76, 0.12, 0.1], [79, 0.12, 0.2], [84, 0.12, 0.3], [79, 0.1, 0.42], [84, 0.1, 0.52], [91, 0.35, 0.62]],
  lift: [[67, 0.08, 0], [72, 0.08, 0.08], [76, 0.16, 0.16]],
  low: [[84, 0.09, 0], [84, 0.09, 0.16]], // the low-fuel warning: two quick high beeps
  // A thundercloud: a crackle as its warning light starts (quick, jumpy high notes), and a deep zap with a bright crack on top when the bolt fires.
  crackle: [[96, 0.03, 0], [88, 0.03, 0.05], [95, 0.03, 0.1], [84, 0.03, 0.17], [97, 0.03, 0.24], [90, 0.03, 0.33], [96, 0.03, 0.45], [86, 0.03, 0.58], [94, 0.03, 0.72]],
  zap: [[103, 0.05, 0], [55, 0.14, 0.02], [48, 0.2, 0.1]],
  refuelled: [[72, 0.1, 0], [79, 0.1, 0.1], [86, 0.2, 0.2]],
  touch: [[45, 0.07, 0], [52, 0.1, 0.07]],
} satisfies Record<string, Blip[]>;

// ---------- the scenery ----------
// One LOOK for each kind of terrain. The sky is eight bands of colour, top to bottom.
const SKY: Record<Terrain, string[]> = {
  sea: ["#3f8fe0", "#52a1e8", "#66b2ee", "#7cc1f2", "#93cff5", "#abdcf7", "#c4e8f9", "#dcf3fb"],
  coast: ["#5aa0e0", "#6fb0e6", "#85bfeb", "#9bcdef", "#b3dbf2", "#cbe7f4", "#e3f1f4", "#f6f6ea"],
  mountains: ["#2f6fc4", "#3d7fcf", "#4f90d9", "#63a2e2", "#7bb4e8", "#94c5ee", "#afd5f2", "#cbe4f6"],
  desert: ["#5da3d8", "#7bb6dc", "#9bc6d8", "#c0d4c4", "#e3dcb0", "#f2d896", "#f4cb7f", "#f0bf72"],
  city: ["#6f8fb5", "#7f9dc0", "#90abc9", "#a2b8d1", "#b4c5d8", "#c5d1df", "#d4dce5", "#e1e6ea"],
  jungle: ["#3f9fb0", "#55b0b8", "#6cc0bd", "#85cfc2", "#a1dcc6", "#bfe7c9", "#d8efcf", "#e8f4d6"],
};
const SUN: Record<Terrain, string> = {
  sea: "#fff4b0", coast: "#fff4b0", mountains: "#fffbd8", desert: "#fff8d0", city: "#fff0c0", jungle: "#fffbd0",
};
// Clouds: [main colour, shade colour, how many of the far ones, how many of the near ones]
const CLOUDS: Record<Terrain, [string, string, number, number]> = {
  sea: ["#ffffff", "#d6e3f1", 5, 4], coast: ["#ffffff", "#dbe6ee", 4, 3], mountains: ["#ffffff", "#cfdcec", 3, 3],
  desert: ["#fff6e0", "#ecd9b4", 2, 1], city: ["#e9edf2", "#b7c0cc", 4, 3], jungle: ["#ffffff", "#cfe3da", 6, 5],
};

/** A zig-zag wave from 0 to 1 and back. Adding a few of different sizes makes jagged peaks. */
const zig = (v: number) => Math.abs(mod(v, 2) - 1);
const ridge = (wx: number) => 0.55 * zig(wx / 70) + 0.3 * zig(wx / 27 + 0.4) + 0.15 * zig(wx / 11 + 0.9);
// Mixing two colours (for the sky, which fades smoothly from one terrain to the next).
const rgbCache = new Map<string, [number, number, number]>();
function rgbOf(hex: string): [number, number, number] {
  let v = rgbCache.get(hex);
  if (!v) { const n = parseInt(hex.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; rgbCache.set(hex, v); }
  return v;
}
const mixCache = new Map<string, string>();
function mixHex(a: string, b: string, m: number) {
  const q = Math.round(m * 24);
  if (q <= 0) return a;
  if (q >= 24) return b;
  const key = a + b + q;
  let c = mixCache.get(key);
  if (!c) {
    const [r1, g1, b1] = rgbOf(a), [r2, g2, b2] = rgbOf(b), k = q / 24;
    c = `rgb(${Math.round(r1 + (r2 - r1) * k)},${Math.round(g1 + (g2 - g1) * k)},${Math.round(b1 + (b2 - b1) * k)})`;
    mixCache.set(key, c);
  }
  return c;
}

// ---------- the game ----------
interface Obstacle { spec: ObstacleSpec; hit: Rect; pic: Rect; seen: ThunderPhase } // (`seen` is only for thunderclouds: the last phase we saw, to sound the crackle and the zap once)
interface GateGroup { x: number; codes: string[]; correct: number; off: boolean[]; stop: number; attempt: number }
interface Banner { title: string; sub: string; colour: string; t: number }
interface Runway { x0: number; x1: number; lights: boolean } // from x0 to x1 along the leg
interface Puff { x: number; y: number; vx: number; vy: number; life: number; max: number } // dust and smoke, fixed in the world

export function renderFlyover(root: HTMLElement): () => void {
  // ---------- page ----------
  const canvas = h("canvas", {
    class: "fly-canvas",
    width: String(W),
    height: String(H),
    role: "img",
    "aria-label": "Flyover: fly a Cessna, a jet and a jumbo over the continents, through the gate with the right airport code, and around the storms",
  });
  const pauseBtn = h("button", { class: "btn ghost", type: "button" }, "Pause");
  const hudLeg = h("span", { class: "fly-stat" });
  const hudNext = h("span", { class: "fly-stat fly-next" });
  const hudComfort = h("span", { class: "fly-stat fly-comfort" }); // stars on leg 1, the fuel gauge on legs 2 and 3
  const hudStops = h("span", { class: "fly-stat" });
  const hudTime = h("span", { class: "fly-stat" });
  const padUp = h("button", { class: "fly-key", type: "button", tabindex: "-1", "aria-label": "Climb" }, "▲");
  const padDown = h("button", { class: "fly-key", type: "button", tabindex: "-1", "aria-label": "Descend" }, "▼");
  root.replaceChildren(
    h(
      "main",
      { class: "play flyover" },
      h("div", { class: "play-top" }, h("a", { class: "back", href: "#" }, "◂ Arcade"), h("h1", { class: "play-title" }, "Flyover")),
      h("div", { class: "fly-hud" }, hudLeg, hudNext, hudComfort, hudStops, hudTime),
      h("div", { class: "fly-screen" }, canvas),
      h("div", { class: "fly-pad", "aria-label": "Climb and descend buttons" }, padUp, padDown),
      h(
        "div",
        { class: "fly-foot" },
        h(
          "p",
          { class: "fly-howto muted" },
          "Hold ↑ / W to climb and let go to sink (or hold your finger on the game, or use the buttons). Fly through the gate with the right airport code, and go round the storms, birds, mountains and buildings. P or Esc pauses.",
        ),
        pauseBtn,
      ),
    ),
  );
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  void document.fonts?.load("8px Silkscreen").catch(() => {});

  const sprites: Record<string, HTMLCanvasElement> = {
    cessna: paint(CESSNA_ART, PLANE_PALETTE),
    jet: paint(JET_ART, PLANE_PALETTE),
    jumbo: paint(JUMBO_ART, PLANE_PALETTE),
  };

  // ---------- game state ----------
  // For testing directly. Only works in the development copy (npm run dev):
  //   ?leg=2  start on leg 2     ?route=3  use the third route     ?seed=7  use seed 7 (the same course every time)
  const params = import.meta.env.DEV ? new URLSearchParams(location.search) : null;
  const devLeg = Number(params?.get("leg"));
  const firstLeg = devLeg >= 1 && devLeg <= LEGS.length ? devLeg - 1 : 0;
  const devSeedText = params?.get("seed");
  const devRoute = Number(params?.get("route")) >= 1 ? Number(params?.get("route")) - 1 : undefined;
  let forcedRoute: number | undefined = devRoute; // dev only: which route to use for the next leg set-up

  let state: State = "ready";
  let phase: Phase = "parked";
  let stateSince = performance.now();
  let soundOn = false; // browsers only allow sound after the player has pressed something
  // The SEED: one number that decides the whole play (which routes, where every obstacle is, the
  // order of the gates). A new play uses a new random seed. In the development copy ?seed=7 fixes it.
  let seedBase = devSeedText !== null && devSeedText !== "" && Number.isFinite(Number(devSeedText)) ? Number(devSeedText) : Math.floor(Math.random() * 2 ** 31);
  let legIndex = firstLeg;
  let leg: Leg = LEGS[legIndex];
  let ac: Aircraft = AIRCRAFT[leg.aircraft];
  let course: Course;
  let obstacles: Obstacle[] = [];
  let thermals: ObstacleSpec[] = []; // the heat thermals of this leg (they push the plane up, so the flight code keeps its own short list)
  let lifted = false; // is the plane inside a thermal right now? (only used to show the little arrows)
  let runways: Runway[] = [];
  let best = loadBest(STORE_KEY);
  let newBest = false;
  let totalTime = 0; // seconds of actual flying, whole journey
  let legTime = 0;
  let legStars: number[] = []; // comfort left at the end of each finished leg
  let divertCount = 0;
  let bumpCount = 0;

  // THE PLANE. `dist` is how far along the leg we have flown. The plane's picture never moves
  // sideways on the screen, but the world does, by exactly `dist`. `y` is the plane's height
  // and `vy` is its VELOCITY, how fast it is moving up (negative) or down (positive).
  let dist = 0;
  let speed = 0; // forward speed
  let y = 100;
  let vy = 0;
  let comfort = MAX_COMFORT;
  // FUEL (legs 2 and 3): a percentage, 100 = full. It goes down as you fly and up at a top-up or a refuel.
  let fuel = FULL_TANK;
  let lowWarned = LOW_FUEL_BEEPS.map(() => false); // has each low-fuel beep sounded yet? (reset when the tank rises again)
  let minFuel = FULL_TANK; // the lowest the tank got on this leg (shown on the leg card)
  let refuel = { left: 0, from: 0 }; // a stopover's refuel in progress: seconds still to go, and the level it began at (left 0 = none)
  let flameout = { t: 0 };
  const devKinds: Record<number, "transit" | "stopover"> = {}; // development copy only: force a stop's kind
  let stopIndex = 0; // which stop is next (0 for the first)
  let got: boolean[] = []; // for each stop: did we find the right gate?
  let lastStop = -1; // the last stop we got right (-1 = none yet, so a diversion goes back to the runway)
  let divertCity = ""; // shown on the "Diverted to ..." card
  let gate: GateGroup | null = null;
  const reached = () => got.filter(Boolean).length;
  const stopCode = (i: number) => course.route.codes[i + 1];
  const stopCount = () => course.route.hops.length;
  const fuelRules = () => leg.fuel;
  /** Is stop `i` a transit, a stopover, or the last one? (Legs 2 and 3 have the first two.) */
  const kindOf = (i: number) => (i < stopCount() - 1 && devKinds[i]) || stopKind(course.route, i);

  // The take-off and the landing each remember a few numbers while they run.
  let ride = { from: 0, lifted: false, dust: 0 };
  let landing = { from: 0, fromY: 0, touchX: 0, v0: 0, touched: false, rest: 0 };

  let wobble = 0; // timers that count down to 0
  let invuln = 0;
  let slow = 0;
  let flash = 0;
  let recover: { t: number; from: number; to: number } | null = null;
  let banner: Banner | null = null;
  let idle = 0; // lets the clouds drift along on the title and card screens
  let trailTimer = 0;
  let trail: { x: number; y: number; life: number }[] = [];
  let puffs: Puff[] = [];
  let god = false; // dev only: nothing can bump you
  let frozen = false; // dev only: the game stops updating but keeps drawing (for screenshots)

  const keys = { up: false, down: false };
  const pad = { up: false, down: false };
  let pointerY: number | null = null; // where a finger or the mouse button is held, in game pixels

  const beep = makeBeeper(SOUNDS, () => soundOn);
  function setState(next: State) {
    state = next;
    stateSince = performance.now();
    pauseBtn.textContent = next === "paused" ? "Resume" : "Pause";
  }
  const say = (title: string, sub: string, colour: string, t = 2.2) => { banner = { title, sub, colour, t }; };

  /** Where the plane's middle is when its wheels are on the runway. */
  const groundY = () => SURFACE - sprites[leg.aircraft].height / 2;
  const midY = () => Math.round((ac.ceiling + ac.floor) / 2);

  // ---------- starting a game and a leg ----------
  function newGame() {
    totalTime = 0;
    legStars = [];
    divertCount = 0;
    bumpCount = 0;
    newBest = false;
    if (devSeedText === null || devSeedText === "") seedBase = Math.floor(Math.random() * 2 ** 31);
    forcedRoute = devRoute; // (development copy only: ?route=3 asks for the third route)
    startLeg(firstLeg);
  }

  /** Set up a leg: pick its route, make its obstacles, and park the plane on the first runway. */
  function startLeg(n: number) {
    legIndex = n;
    leg = LEGS[n];
    ac = AIRCRAFT[leg.aircraft];
    // THE COURSE: the route is picked at random (by the seed) and the obstacles are generated
    // from it. See flyover-gen.ts. Each obstacle gets its picture box and a smaller hitbox, worked out once.
    course = buildCourse(n, seedBase, forcedRoute);
    forcedRoute = undefined;
    obstacles = course.obstacles.map((spec) => ({ spec, hit: hitboxOf(spec), pic: pictureOf(spec), seen: "quiet" as ThunderPhase }));
    thermals = course.obstacles.filter((spec) => spec.type === "thermal");
    lifted = false;
    got = course.route.hops.map(() => false);
    lastStop = -1;
    comfort = MAX_COMFORT;
    refill();
    minFuel = FULL_TANK;
    refuel.left = 0;
    stopIndex = 0;
    legTime = 0;
    resetFlightBits();
    parkAt(0);
    gate = newGate(0);
    setState("briefing");
  }

  /** Clear all the little timers and effects (after a leg starts or a diversion). */
  function resetFlightBits() {
    wobble = invuln = slow = flash = 0;
    recover = null;
    banner = null;
    trail = [];
    puffs = [];
    vy = 0;
  }

  /** The runways of this leg: the one we take off from, and the one at the end that we land on. */
  const takeoffRunway = (fromX: number): Runway => ({ x0: fromX - 60, x1: fromX + TAKEOFF_LEN + 20, lights: false });
  const landingTouchX = () => checkpointAt(leg, stopCount() - 1) + LAND_AFTER_GATE;

  /** Put the plane on a runway at `fromX`, waiting to take off. (Used at the start and after a diversion.) */
  function parkAt(fromX: number) {
    dist = fromX;
    speed = 0;
    y = groundY();
    vy = 0;
    phase = "parked";
    const finalRunway: Runway = { x0: landingTouchX() - 40, x1: landingTouchX() + ROLL_OUT + RUNWAY_END_PAD, lights: true };
    runways = [takeoffRunway(fromX), finalRunway];
  }

  // ---------- take-off and landing ----------
  // These two are separate little pieces: take-off starts a leg (and restarts it after a diversion),
  // and landing ends it.
  //
  // TAKE-OFF: the plane starts from rest at `fromX` and rolls, speeding up. Part of the way
  // along it rotates and lifts, and by the end of TAKEOFF_LEN it is at cruising height and YOU
  // are flying. You cannot fail it: the computer does the climbing.
  function beginTakeoff(fromX: number) {
    dist = fromX;
    speed = 0;
    y = groundY();
    vy = 0;
    ride = { from: fromX, lifted: false, dust: 0 };
    phase = "takeoff";
  }
  function stepTakeoff(dt: number) {
    speed = Math.min(ac.speed, speed + TAKEOFF_ACCEL * dt);
    dist += speed * dt;
    const p = (dist - ride.from) / TAKEOFF_LEN; // 0 at the start of the roll, 1 at the end of the climb
    const before = y;
    y = groundY() + (midY() - groundY()) * smooth(clamp((p - 0.4) / 0.6, 0, 1)); // flat on the ground until 40%, then climbing
    vy = (y - before) / dt;
    if (p < 0.4) {
      ride.dust -= dt;
      if (ride.dust <= 0) { ride.dust = 0.07; addPuff(dist - sprites[leg.aircraft].width / 2 + 4, SURFACE - 1, 1); }
    } else if (!ride.lifted) {
      ride.lifted = true;
      beep("lift");
      addPuff(dist - 6, SURFACE - 1, 4);
    }
    if (p >= 1) {
      phase = "flight";
      y = midY();
      vy = 0;
      if (legIndex === 0 && !banner) say("CLIMB OUT!", "Hold UP to climb, let go to sink", "#7fd0ff", 3.4);
    }
  }

  // LANDING: when you give the last answer the computer takes over and glides the plane down
  // to the runway at `touchX`. Close to the ground it flattens out ("the flare"), the wheels touch,
  // there is a puff of dust, and the plane rolls to a stop.
  function beginLanding(touchX: number) {
    landing = { from: dist, fromY: y, touchX, v0: 0, touched: false, rest: 0 };
    phase = "landing";
    recover = null;
  }
  function stepLanding(dt: number) {
    if (phase === "landed") {
      landing.rest += dt;
      if (landing.rest >= REST_TIME) finishLeg();
      return;
    }
    const L = landing;
    if (!L.touched) {
      speed += clamp(ac.speed * 0.85 - speed, -SPEED_UP * dt, SPEED_UP * dt); // a little slower for the approach
      dist += speed * dt;
      const p = clamp((dist - L.from) / Math.max(1, L.touchX - L.from), 0, 1);
      const before = y;
      // Half a straight slope, half a curve that flattens out at the end: a smooth, gentle touchdown.
      y = L.fromY + (groundY() - L.fromY) * (0.5 * p + 0.5 * (1 - (1 - p) * (1 - p)));
      vy = (y - before) / dt;
      if (p >= 1) {
        L.touched = true;
        L.v0 = speed;
        y = groundY();
        vy = 0;
        beep("touch");
        addPuff(dist - 8, SURFACE - 1, 6);
      }
    } else {
      // Rolling out: slowing down steadily, so the plane stops exactly at the end of the roll.
      const q = clamp((dist - L.touchX) / ROLL_OUT, 0, 1);
      speed = Math.max(5, L.v0 * Math.sqrt(1 - q));
      dist += speed * dt;
      if (q < 0.7) { ride.dust -= dt; if (ride.dust <= 0) { ride.dust = 0.09; addPuff(dist - 8, SURFACE - 1, 1); } }
      if (q >= 1) { speed = 0; phase = "landed"; }
    }
  }

  /** A puff of dust or smoke from the runway. Each lives a short while, then fades. */
  function addPuff(x: number, yy: number, count: number) {
    for (let i = 0; i < count; i++) {
      const life = 0.5 + Math.random() * 0.5;
      puffs.push({ x: x - Math.random() * 6, y: yy - Math.random() * 3, vx: -8 - Math.random() * 14, vy: -6 - Math.random() * 10, life, max: life });
    }
  }

  // ---------- fuel ----------
  // A RESOURCE THAT DRAINS AND REFILLS. Every update we work out how fast the engines are
  // burning (climb > level > gliding down) and take that much off the tank: rate times the time
  // slice. A "rate" is "how much per second", so a short slice takes a tiny bit, and the total
  // over a second comes out right whatever the screen's speed. Gates and stopovers add to the tank.
  function addFuel(amount: number) {
    fuel = clamp(fuel + amount, 0, FULL_TANK);
    LOW_FUEL_BEEPS.forEach((limit, i) => { if (fuel > limit) lowWarned[i] = false; }); // the warning can sound again
  }
  function refill() { fuel = FULL_TANK; lowWarned = LOW_FUEL_BEEPS.map(() => false); }
  /** Take fuel off. Beep as the tank crosses each warning line, and stop the engines at empty. */
  function burnFuel(amount: number) {
    const before = fuel;
    fuel = Math.max(0, fuel - amount);
    minFuel = Math.min(minFuel, fuel);
    LOW_FUEL_BEEPS.forEach((limit, i) => {
      if (before > limit && fuel <= limit && !lowWarned[i]) { lowWarned[i] = true; if (fuel > 0) beep("low"); }
    });
    if (fuel <= 0 && phase === "flight") beginFlameout();
  }

  /** OUT OF FUEL. The engines go quiet and the plane glides down for a moment; then we divert. */
  function beginFlameout() {
    phase = "flameout";
    flameout = { t: 0 };
    recover = null;
    wobble = 0;
    beep("divert");
    say("OUT OF FUEL!", "Engines quiet. Gliding down", "#ff8a7a", 3);
  }
  function stepFlameout(dt: number) {
    flameout.t += dt;
    speed += clamp(ac.speed * 0.55 - speed, -SPEED_UP * dt, SPEED_UP * dt);
    dist += speed * dt;
    const before = y;
    y = Math.min(ac.floor, y + 34 * dt);
    vy = (y - before) / dt;
    if (flameout.t >= FLAMEOUT_TIME) divert();
  }

  // ---------- stopovers: filling the tank while you fly ----------
  // Flying through a stopover's gate starts a REFUEL. There is no landing and no waiting: for about
  // a second the tank rises in a straight line from where it was to full, while the plane flies on.
  // (The same trick as the take-off: a number slides from one value to another over a set time.)
  function beginRefuel() {
    refuel = { left: REFUEL_SECONDS, from: fuel };
    beep("refuelled");
  }
  function stepRefuel(dt: number) {
    refuel.left = Math.max(0, refuel.left - dt);
    const k = 1 - refuel.left / REFUEL_SECONDS;
    addFuel(Math.max(fuel, refuel.from + (FULL_TANK - refuel.from) * k) - fuel);
  }

  // ---------- gates ----------
  /** Make the three gates for a stop: one right code, and two wrong ones picked by pickDecoys (flyover-gen.ts). */
  function newGate(stop: number): GateGroup {
    const right = stopCode(stop);
    // The order of the gates is also seeded, so a seed always gives the same gates. (A diversion changes the salt, so it is not the same order again.)
    const rng = makeRng(mixSeed(course.seed, 5000 + stop * 13 + divertCount));
    const wrong = pickDecoys(leg, course.route, stop, rng, regionOf);
    const correct = Math.floor(rng() * 3); // which of the three heights is right
    const codes = [wrong[0], wrong[1]];
    codes.splice(correct, 0, right);
    return { x: checkpointAt(leg, stop), codes, correct, off: [false, false, false], stop, attempt: 0 };
  }

  function setPaused(p: boolean) {
    if (p && state === "playing") setState("paused");
    else if (!p && state === "paused") setState("playing");
  }

  // ---------- turbulence ----------
  // Where could the plane sit, right now, without touching anything in the next stretch of sky?
  // We try heights near the current one first, then further away, and take the first free one.
  function safeYFrom(from: number, lookAhead = 110): number {
    const x0 = dist - ac.hitW / 2 - 2;
    // (A moving hazard counts where it is right now; a thermal is not in the way of anything.)
    const near = obstacles
      .filter((o) => o.spec.type !== "thermal" && o.hit.x < dist + lookAhead && o.hit.x + o.hit.w > x0)
      .map((o) => (isMover(o.spec) ? moverBox(o.spec, dist, legTime) : o.hit));
    const free = (cy: number) => near.every((r) => cy + ac.hitH / 2 + 4 <= r.y || cy - ac.hitH / 2 - 4 >= r.y + r.h);
    for (let d = 0; d <= ac.floor - ac.ceiling; d += 2) {
      for (const cy of [from - d, from + d]) {
        if (cy >= ac.ceiling && cy <= ac.floor && free(cy)) return cy;
      }
    }
    return from;
  }

  /**
   * A STRIKE: a bump into the weather or an obstacle, or a wrong gate. On the easy leg it costs a
   * comfort star; on the fuel legs it costs a chunk of fuel instead. Either way the plane wobbles.
   */
  function turbulence(title: string, sub: string) {
    const rules = fuelRules();
    bumpCount++;
    wobble = WOBBLE_TIME;
    slow = SLOW_TIME;
    invuln = INVULN_TIME;
    flash = 0.18;
    beep("bump");
    if (rules) {
      burnFuel(rules.strikeCost);
      if (fuel <= 0) return; // burnFuel has started the glide down
      say(`${title} -${rules.strikeCost}% FUEL`, sub, "#ffd34e");
    } else {
      comfort--;
      if (comfort <= 0) { divert(); return; }
      say(title, sub, "#ffd34e");
    }
    // No crash: the plane just floats back up (or down) to a safe height.
    recover = { t: 0, from: y, to: safeYFrom(y) };
  }

  /**
   * DIVERTED (out of comfort stars on leg 1, out of fuel on legs 2 and 3). The kind way: the leg is
   * NOT restarted. The plane is put back on a runway at the last stop it got right (or at the
   * start, if it has not got one yet), the stars or the tank are refilled, and the leg carries on from there.
   */
  function divert() {
    divertCount++;
    beep("divert");
    got = got.map((g, i) => g && i <= lastStop); // stops after that one have to be flown again
    stopIndex = lastStop + 1;
    divertCity = cityOf(lastStop < 0 ? course.route.codes[0] : stopCode(lastStop));
    comfort = MAX_COMFORT;
    refill();
    refuel.left = 0;
    resetFlightBits();
    parkAt(lastStop < 0 ? 0 : checkpointAt(leg, lastStop));
    gate = newGate(stopIndex);
    setState("diverted");
  }

  // ---------- checkpoints ----------
  function nextStop() {
    stopIndex++;
    if (stopIndex >= stopCount()) {
      gate = null;
      beginLanding(landingTouchX());
    } else {
      gate = newGate(stopIndex);
    }
  }

  /** The plane has reached the gates' column. Which ring did it fly through? */
  function passGate(g: GateGroup) {
    const { ys, half } = gateSlots(ac);
    // The ring whose middle is nearest the plane's height is the one we went through.
    let through = 0;
    ys.forEach((sy, i) => { if (Math.abs(sy - y) < Math.abs(ys[through] - y)) through = i; });
    if (Math.abs(ys[through] - y) > half + 3) through = -1; // flew between or past the rings
    const right = stopCode(g.stop);
    const isLast = g.stop === stopCount() - 1;

    if (through === g.correct) {
      got[g.stop] = true;
      lastStop = g.stop;
      beep("stop");
      const kind = kindOf(g.stop);
      if (isLast) say(`CLEARED TO LAND AT ${right}!`, `${cityOf(right)}, ${countryOf(right)}`, "#5fe08a", 3);
      else if (leg.fuel && kind === "stopover") {
        // A STOPOVER: the tank fills while we fly on (stepRefuel does it a little every update).
        say(`STOPOVER ${right}!`, `${cityOf(right)}. Tank refuelled`, "#5fe08a", 2.6);
        beginRefuel();
      } else if (leg.fuel) {
        say(`TRANSIT ${right}!`, `${cityOf(right)}, ${countryOf(right)}`, "#7fd0ff", 2.4); // a TRANSIT: nothing to do but fly on
      } else say(`CHECKPOINT ${right}!`, `${cityOf(right)}, ${countryOf(right)}`, "#5fe08a", 2.4);
      nextStop();
      return;
    }
    if (through >= 0 && !g.off[through]) {
      // A wrong gate counts as turbulence.
      g.off[through] = true;
      turbulence("TURBULENCE!", `That was ${g.codes[through]}, not ${right}`);
      if (state !== "playing" || phase !== "flight") return; // diverted, or the tank ran dry
    } else {
      beep("miss");
    }
    if (g.attempt === 0) {
      // Room to try again: the same gates come round once more, a little further on.
      g.attempt = 1;
      g.x += GATE_RETRY;
      if (through < 0) say("GO AROUND!", leg.glowRight ? `Follow the glowing gate to ${right}` : `Find ${right} (${cityOf(right)})`, "#7fd0ff");
    } else {
      // Second miss: the plane loops past to the next stop.
      say(`FLEW PAST ${right}`, "On to the next stop", "#7fd0ff");
      nextStop();
    }
  }

  // ---------- one tiny slice of game time ----------
  function update(dt: number) {
    totalTime += dt;
    legTime += dt;
    if (wobble > 0) wobble -= dt;
    if (invuln > 0) invuln -= dt;
    if (slow > 0) slow -= dt;
    if (flash > 0) flash -= dt;
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    for (const p of puffs) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    puffs = puffs.filter((p) => p.life > 0);

    if (phase === "takeoff") { stepTakeoff(dt); return; }
    if (phase === "landing" || phase === "landed") { stepLanding(dt); return; }
    if (phase === "flameout") { stepFlameout(dt); return; }
    if (phase !== "flight") return;

    // FORWARD SPEED builds up gradually: this is ACCELERATION. We never jump straight to top
    // speed; each slice we nudge the speed a little towards the speed we want.
    const wanted = slow > 0 ? ac.speed * 0.5 : ac.speed;
    speed += clamp(wanted - speed, -SPEED_UP * 3 * dt, SPEED_UP * dt);
    dist += speed * dt;

    // UP AND DOWN: SPEED AND MOMENTUM. The Labyrinth hero was told "go to the next tile".
    // Here the keys only change how the plane ACCELERATES. Holding climb pushes the up-speed
    // (vy) higher and higher; letting go lets a gentle sinking pull it back down; and DRAG
    // (air resistance) takes a bit of speed away every moment. So the plane eases into a
    // climb, and keeps drifting for a moment after you let go. That is momentum.
    const fingerUp = pointerY !== null && pointerY < y - 3;
    const fingerDown = pointerY !== null && pointerY > y + 3;
    const up = keys.up || pad.up || fingerUp;
    const down = keys.down || pad.down || fingerDown;
    if (recover) {
      // After turbulence the autopilot floats us back to a safe height. Smooth, no jolts.
      recover.t += dt;
      y = recover.from + (recover.to - recover.from) * smooth(clamp(recover.t / RECOVER_TIME, 0, 1));
      vy = 0;
      if (recover.t >= RECOVER_TIME) recover = null;
    } else {
      let accel = ac.fallAccel; // gentle sinking when nobody is pressing anything
      if (up && !down) accel = -ac.climbAccel;
      else if (down && !up) accel = ac.fallAccel * 3;
      else if (pointerY !== null && !up && !down) accel = 0; // a finger resting on the plane holds it level
      // A HEAT THERMAL (desert, leg 3) adds a gentle push UP while the plane is inside its column. It is less than the descend key,
      // so you can always fight it, but it costs you control: you drift higher than you meant to.
      lifted = thermals.some((t) => inThermal(t, dist, y));
      if (lifted) accel -= THERMAL_LIFT;
      vy += accel * dt; // acceleration changes the velocity...
      vy -= vy * ac.drag * dt; // ...drag bleeds a little off it...
      vy = clamp(vy, -ac.maxUp, ac.maxDown);
      y += vy * dt; // ...and the velocity changes the position.
      if (y < ac.ceiling) { y = ac.ceiling; vy = Math.max(vy, 0); }
      if (y > ac.floor) { y = ac.floor; vy = Math.min(vy, 0); }
    }

    // FUEL. How fast are we burning? Holding climb is the thirstiest; level flight (or still
    // drifting up after you let go) burns a little; gliding down burns nothing at all.
    const rules = fuelRules();
    if (rules) {
      const climbing = up && !down && !recover;
      const gliding = !climbing && vy > GLIDE_SPEED && !recover;
      burnFuel((climbing ? rules.climbBurn : gliding ? 0 : rules.levelBurn) * dt);
      if (phase !== "flight") return; // the tank ran dry: burnFuel started the glide down
      if (refuel.left > 0) stepRefuel(dt); // (after the burn, so a refuel always ends at exactly full)
    }

    // A thin white trail behind the plane. Each puff is fixed in the WORLD, so as the world
    // scrolls it streams away to the left, which shows how fast we are going.
    trailTimer -= dt;
    if (trailTimer <= 0) { trailTimer = 0.04; trail.push({ x: dist - sprites[leg.aircraft].width / 2 + 2, y, life: 1.3 }); }
    for (const p of trail) p.life -= dt;
    trail = trail.filter((p) => p.life > 0);

    // HITBOXES. The plane's hitbox is a rectangle smaller than its picture, and so is every
    // obstacle's. Touching is just a maths question: do the two rectangles overlap?
    //
    // A THUNDERCLOUD is two things to bump: its body, like any cloud, and its BOLT, which only
    // exists while the cloud is firing (thunderAt says when). The bolt's box is a thin tall
    // strip from the cloud up to the top of the sky, or down to the bottom.
    const me: Rect = { x: dist - ac.hitW / 2, y: y - ac.hitH / 2, w: ac.hitW, h: ac.hitH };
    let struck: string | null = null;
    for (const o of obstacles) {
      if (o.hit.x > dist + 60) break; // the list is sorted, so nothing further on can be close yet
      if (invuln > 0 || recover || god || struck) break;
      if (o.spec.type === "thunder") {
        const z = thunderAt(o.spec, legTime);
        if (z.phase === "bolt" && overlaps(me, boltRect(o.spec, z.side))) { struck = "Lightning! Hold on tight"; break; }
      }
      if (o.spec.type === "thermal") continue; // (harmless: it only pushes)
      // A moving hazard is where the clock says it is right now; everything else has one fixed box.
      const box = isMover(o.spec) ? moverBox(o.spec, dist, legTime) : o.hit;
      if (overlaps(me, box)) struck = `${OBSTACLE_INFO[o.spec.type].what}! Hold on tight`;
    }
    if (struck) turbulence("TURBULENCE!", struck);
    // The sounds of the clouds you can see: a crackle as a warning light starts, a zap as the bolt fires. Each sounds once per cycle.
    for (const o of obstacles) {
      if (o.spec.type !== "thunder" || o.hit.x - dist > W - PLANE_X + 20) continue;
      const z = thunderAt(o.spec, legTime);
      if (z.phase !== o.seen) {
        o.seen = z.phase;
        if (o.hit.x + o.hit.w > dist - PLANE_X) {
          if (z.phase === "warn") beep("crackle");
          else if (z.phase === "bolt") beep("zap");
        }
      }
    }
    if (state !== "playing") return;

    // CHECKPOINTS: when the plane reaches the column of gates, work out which ring it went through.
    if (gate && dist >= gate.x) passGate(gate);
  }

  function finishLeg() {
    legStars.push(leg.fuel ? -1 : comfort); // -1 = this leg used fuel, not stars
    if (legIndex === LEGS.length - 1) {
      if (best === null || totalTime < best) { best = totalTime; newBest = true; saveBest(STORE_KEY, totalTime); }
      beep("win");
      setState("won");
    } else {
      beep("clear");
      setState("legdone");
    }
  }

  /** Space or a tap: start, carry on, or play again, depending on what the game is showing. */
  function goOn() {
    const waited = performance.now() - stateSince;
    if (state === "ready") newGame();
    else if (state === "briefing" && waited > 300) { beginTakeoff(dist); setState("playing"); }
    else if (state === "paused") setPaused(false);
    else if (state === "legdone" && waited > 400) startLeg(legIndex + 1);
    else if (state === "diverted" && waited > 700) { beginTakeoff(dist); setState("playing"); }
    else if (state === "won" && waited > 700) newGame();
  }

  // ---------- the HUD (the strip above the game) ----------
  /** " (stopover)" or " (transit)" for a middle stop on legs 2 and 3, otherwise nothing. */
  const kindNote = (stop: number) => (leg.fuel && stop < stopCount() - 1 ? ` (${kindOf(stop)})` : "");
  let hudSignature = "";
  function updateHud() {
    // Only touch the page when something actually changed.
    const pct = Math.ceil(fuel - 1e-6);
    const sig = [legIndex, comfort, pct, reached(), stopIndex, gate?.attempt ?? -1, Math.floor(totalTime), state === "ready", phase, course?.routeIndex].join("|");
    if (sig === hudSignature) return;
    hudSignature = sig;
    hudLeg.textContent = `Leg ${legIndex + 1}/${LEGS.length}: ${ac.name}`;
    if (state === "ready") hudNext.textContent = "Ready for take-off";
    else if (gate) hudNext.textContent = `Next stop: ${cityOf(stopCode(gate.stop))}${kindNote(gate.stop)}${gate.attempt ? " (go around)" : ""}`;
    else hudNext.textContent = phase === "landed" ? "Landed" : "Coming in to land";
    if (leg.fuel) {
      // FUEL: eight little blocks plus the percentage. The text turns amber, then flashes red, as it runs low.
      const blocks = Math.ceil(fuel / (FULL_TANK / 8) - 1e-6);
      hudComfort.textContent = `Fuel ${"▮".repeat(blocks)}${"▯".repeat(8 - blocks)} ${pct}%`;
      hudComfort.setAttribute("aria-label", `Fuel: ${pct} percent`);
      hudComfort.classList.toggle("low", fuel < AMBER_BELOW);
      hudComfort.classList.toggle("crit", fuel < RED_BELOW);
    } else {
      hudComfort.textContent = "Comfort " + "★".repeat(comfort) + "☆".repeat(MAX_COMFORT - comfort);
      hudComfort.setAttribute("aria-label", `Comfort: ${comfort} of ${MAX_COMFORT} stars`);
      hudComfort.classList.remove("low", "crit");
    }
    hudStops.textContent = `Stops ${reached()}/${stopCount()}`;
    hudTime.textContent = `Time ${formatTime(totalTime)}`;
  }

  // ---------- drawing ----------
  const px = (x: number, yy: number, w: number, hh: number, colour: string) => {
    ctx.fillStyle = colour;
    ctx.fillRect(Math.round(x), Math.round(yy), Math.round(w), Math.round(hh)); // whole pixels only keeps edges crisp
  };

  function text(str: string, x: number, yy: number, size: number, colour: string, align: CanvasTextAlign = "center") {
    ctx.font = `${size}px Silkscreen, "Courier New", monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText(str, Math.round(x) + 1, Math.round(yy) + 1);
    ctx.fillStyle = colour;
    ctx.fillText(str, Math.round(x), Math.round(yy));
  }

  /** Where an object at world position `wx` appears on the screen. THIS is the scrolling world:
   *  the plane stays at PLANE_X, and everything else is drawn `dist` pixels further left. */
  const screenX = (wx: number) => PLANE_X + (wx - dist);

  // --- scenery, in layers. Far layers scroll slowly, near layers scroll fast. That difference
  // is called PARALLAX, and it is what makes a flat picture feel deep. ---
  //
  // Each kind of terrain has its own function below that paints ONE COLUMN of the screen (one
  // pixel wide), all its layers from far to near. `view` is how far the world has slid and
  // `p` multiplies it for each layer: a far layer uses a small p, a near one a big p.
  type Column = (x: number, view: number, t: number) => void;
  const col = (x: number, yy: number, hh: number, c: string) => px(x, yy, 1, hh, c);

  // sea: open water with waves, and a few distant islands
  const WAVE_ROWS: [number, number, number, string][] = [
    [149, 0.12, 3, "#a5d8f3"], [154, 0.2, 4, "#8ccbee"], [160, 0.32, 5, "#a5d8f3"],
    [167, 0.5, 6, "#d6eefb"], [174, 0.8, 8, "#bfe3f6"], [178, 1.1, 10, "#9fd2ee"],
  ];
  const islandHeight = (wi: number) => {
    const k = Math.floor(wi / 480);
    if (noise(k, 3, 7) % 3 === 0) return 0; // some gaps have no island
    const cx = k * 480 + 80 + (noise(k, 1, 7) % 260);
    const hw = 22 + (noise(k, 2, 7) % 24);
    const d = Math.abs(wi - cx) / hw;
    return d >= 1 ? 0 : Math.round(11 * Math.sqrt(1 - d * d)) + 1;
  };
  const seaColumn: Column = (x, view, t) => {
    px(x, 146, 1, 6, "#6fbbea"); px(x, 152, 1, 8, "#58a8e0"); px(x, 160, 1, 8, "#4396d4"); px(x, 168, 1, 12, "#2f80c4");
    px(x, 146, 1, 1, "#b4e2f7"); // the bright line of the horizon
    const ih = islandHeight(x + view * 0.1);
    if (ih > 0) { // a far island: green hump, pale beach at its foot
      col(x, 146 - ih, ih, "#4f9b5a"); col(x, 146 - ih, 1, "#7cc474"); col(x, 145, 1, "#e8d49a");
      if (ih > 9) col(x, 146 - ih - 3, 1, "#2f6f3a"); // a palm tree on the big ones
    }
    for (const [yy, p, len, c] of WAVE_ROWS) {
      const wx = Math.floor(x + view * p);
      const cell = wx >> 3;
      if (noise(cell, yy, 11) % 3 === 0 && (wx & 7) < len) {
        const lift = Math.sin(t * 2 + cell) > 0.6 ? 1 : 0; // the waves bob a little
        px(x, yy + lift, 1, 1, c);
        px(x, yy + lift + 2, 1, 1, "rgba(20,70,140,0.3)"); // a dark trough under each crest
      }
    }
  };

  // coast: sea to the back, cliffs in the middle, a beach with foam in front
  const coastColumn: Column = (x, view, t) => {
    px(x, 140, 1, 8, "#8fd0ee"); px(x, 148, 1, 10, "#6bbbe6"); px(x, 158, 1, 10, "#52a6dc"); px(x, 168, 1, 12, "#efdca2");
    px(x, 140, 1, 1, "#c4ecf8");
    const hw = x + view * 0.08; // a pale far headland on the horizon
    const hh = Math.round(7 + 6 * (Math.sin(hw / 53) + 1) * 0.5 + 3 * Math.sin(hw / 19 + 1));
    if (hh > 6) { col(x, 141 - hh + 5, hh - 5, "#86b3a4"); }
    // Cliffs: a block of land every 300 pixels, sloping up on the left and sheer on the right.
    const wc = x + view * 0.3;
    const k = Math.floor(wc / 300);
    if (noise(k, 3, 3) % 4 !== 0) {
      const start = 40 + (noise(k, 1, 3) % 80), width = 120 + (noise(k, 2, 3) % 100);
      const local = wc - k * 300 - start;
      if (local >= 0 && local < width) {
        const tall = 20 + (noise(k, 4, 3) % 14);
        const hgt = Math.round(Math.min(tall, 4 + local * 0.55, 3 + (width - local) * 1.2));
        const top = 168 - hgt;
        col(x, top + 2, hgt, "#dcc596"); // paler than the cliff obstacles, because it is further away
        col(x, top, 2, "#8cc378");
        col(x, top + 2, 1, "#a3d88a");
        for (let yy = top + 6; yy < 166; yy += 5) col(x, yy, 1, "#c8ac7c");
        if (width - local < 6) col(x, top + 2, hgt, "#bfa273"); // the sheer face is in shade
      }
    }
    // The beach in front: foam line on the water's edge, sand, and the odd palm tree.
    const wn = Math.floor(x + view * 0.55);
    px(x, 166 + Math.round(Math.sin(wn / 7 + t * 2)), 1, 1, "#ffffff");
    col(x, 167, 2, "#f6ecc4"); col(x, 169, 11, "#ecd9a0");
    if (noise(wn >> 1, 2, 5) % 11 === 0) col(x, 172 + (noise(wn, 3, 2) % 7), 1, "#cdb47a");
    if (mod(wn, 110) === 0 && noise(Math.floor(wn / 110), 1, 6) % 3 !== 0) palm(x, 169, 12, "#2f8f3f");
  };
  // Palms and cacti are wider than one column, so they cannot be painted column by column (the next
  // column would paint over them). Instead each one leaves a note here, and they are all painted
  // together once every column is done.
  const standing: (() => void)[] = [];
  function later(draw: () => void) {
    const alpha = ctx.globalAlpha; // keep the fade, if we are part way between two terrains
    standing.push(() => { ctx.globalAlpha = alpha; draw(); ctx.globalAlpha = 1; });
  }
  function palm(x: number, base: number, height: number, leaf: string) {
    later(() => {
      const top = base - height;
      px(x, top, 2, height, "#7a4f26");
      px(x - 5, top - 1, 12, 1, leaf); px(x - 3, top - 2, 8, 1, leaf); px(x - 8, top, 5, 1, leaf); px(x + 5, top, 5, 1, leaf);
      px(x - 10, top + 1, 4, 1, leaf); px(x + 8, top + 1, 4, 1, leaf); px(x - 11, top + 2, 2, 1, leaf); px(x + 11, top + 2, 2, 1, leaf);
      px(x - 2, top - 3, 4, 1, leaf);
    });
  }

  // mountains: ranges with snowy tops, pine foothills, a rocky foreground
  const mountainsColumn: Column = (x, view) => {
    px(x, 148, 1, 32, "#4a6a46");
    const w1 = x + view * 0.06;
    const h1 = Math.round(16 + 46 * ridge(w1));
    col(x, 152 - h1, h1, "#8aa4cc");
    if (h1 > 40) col(x, 152 - h1, Math.min(6, h1 - 38), "#f4f8fd");
    const w2 = x + view * 0.15 + 137;
    const h2 = Math.round(10 + 38 * ridge(w2 * 1.3));
    const facing = ridge(w2 * 1.3 + 1.3) < ridge(w2 * 1.3); // is this slope turned away from the sun?
    col(x, 160 - h2, h2, facing ? "#566f9b" : "#6d88b2");
    if (h2 > 34) col(x, 160 - h2, Math.min(5, h2 - 32), facing ? "#d3deee" : "#eef4fb");
    const w3 = x + view * 0.3;
    const h3 = Math.round(6 + 9 * (Math.sin(w3 / 31) + 1) + 4 * (Math.sin(w3 / 13 + 1) + 1));
    col(x, 166 - h3, h3 + 14, "#3f7a4d"); col(x, 166 - h3, 1, "#56965c");
    if (noise(Math.floor(w3) >> 1, 5, 4) % 7 === 0) { // a little pine tree
      const top = 166 - h3;
      col(x, top - 5, 2, "#2b5e3a"); px(x - 1, top - 3, 3, 2, "#2b5e3a"); px(x - 2, top - 1, 5, 2, "#2b5e3a");
    }
    const w4 = Math.floor(x + view * 0.5);
    col(x, 167, 13, "#58774a"); col(x, 167, 1, "#78a064");
    if (noise(w4 >> 2, 3, 8) % 9 === 0) px(x, 170 + (noise(w4, 4, 2) % 8), 3, 2, "#8c9199");
    if (noise(w4 >> 4, 6, 8) % 5 === 0) px(x, 168 + (noise(w4 >> 2, 9, 3) % 6), 2, 1, "#f2f6fb");
  };

  // desert: mesas, dunes, cacti and shimmering heat
  const desertColumn: Column = (x, view, t) => {
    px(x, 148, 1, 32, "#e2b765");
    const wm = x + view * 0.07; // far mesas, hazy orange
    const k = Math.floor(wm / 340);
    if (noise(k, 1, 5) % 3 !== 0) {
      const start = 30 + (noise(k, 2, 5) % 120), width = 60 + (noise(k, 3, 5) % 70), tall = 18 + (noise(k, 4, 5) % 16);
      const local = wm - k * 340 - start;
      if (local >= 0 && local < width) {
        const hh = Math.round(Math.min(tall, 3 + local * 1.4, 3 + (width - local) * 1.4));
        col(x, 152 - hh, hh, "#d49a68"); col(x, 152 - hh, 1, "#ebbb88");
        for (let yy = 152 - hh + 5; yy < 150; yy += 5) col(x, yy, 1, "#c08555");
      }
    }
    const w2 = x + view * 0.2; // middle dunes: the side facing the sun is light, the other side darker
    const h2 = Math.round(8 + 8 * (Math.sin(w2 / 48) + 1) + 3 * (Math.sin(w2 / 17 + 1) + 1));
    const slope2 = Math.cos(w2 / 48) * 8 / 48 + Math.cos(w2 / 17 + 1) * 3 / 17;
    col(x, 166 - h2, h2 + 14, slope2 < 0 ? "#d7a95a" : "#f1d08e");
    const w3 = Math.floor(x + view * 0.5); // near dunes with ripples
    const h3 = 3 + 6 * (Math.sin(w3 / 29 + 2) + 1) + 2 * (Math.sin(w3 / 9) + 1);
    const slope3 = Math.cos(w3 / 29 + 2) * 6 / 29;
    const top3 = Math.round(172 - h3 * 0.8);
    col(x, top3, 180 - top3, slope3 < 0 ? "#d9a850" : "#f6d98f");
    if (noise(w3 >> 1, 4, 3) % 5 === 0) col(x, top3 + 3 + (noise(w3, 5, 3) % 4), 1, "#c99a48");
    if (mod(w3, 150) === 0 && noise(Math.floor(w3 / 150), 2, 7) % 3 !== 0) { // a saguaro cactus
      later(() => {
        px(x, top3 - 9, 2, 10, "#3f7a3a"); px(x - 3, top3 - 6, 1, 4, "#3f7a3a"); px(x - 3, top3 - 3, 4, 1, "#3f7a3a");
        px(x + 4, top3 - 8, 1, 4, "#3f7a3a"); px(x + 2, top3 - 4, 3, 1, "#3f7a3a");
      });
    }
    for (let i = 0; i < 4; i++) { // HEAT SHIMMER: pale wobbly streaks just above the ground
      if (Math.sin(t * 3 + (x + view * 0.3) * 0.13 + i * 2.1) > 0.55) px(x, 138 + i * 4 + (Math.sin(t * 5 + i) > 0 ? 0 : 1), 1, 1, "rgba(255,244,214,0.38)");
    }
  };

  // city: three layers of skyline, then streets
  const CITY_NEAR = ["#3d4b66", "#4a5a78", "#56506a"];
  const cityColumn: Column = (x, view) => {
    px(x, 146, 1, 34, "#5c6b85");
    const w1 = Math.floor(x + view * 0.08); // far skyline
    const b1 = Math.floor(w1 / 9);
    const h1 = 18 + (noise(b1, 1, 2) % 38) + (noise(b1, 2, 2) % 5 === 0 ? 14 : 0);
    col(x, 152 - h1, h1, "#97aac4"); col(x, 152 - h1, 1, "#b4c3d8");
    const w2 = Math.floor(x + view * 0.22); // middle skyline with lit windows
    const b2 = Math.floor(w2 / 13), l2 = mod(w2, 13);
    const h2 = 24 + (noise(b2, 1, 3) % 48) + (noise(b2, 2, 3) % 6 === 0 ? 16 : 0);
    if (l2 < 12) {
      col(x, 160 - h2, h2, l2 > 9 ? "#58709a" : "#6c84a8");
      if (l2 % 3 === 1) for (let yy = 160 - h2 + 4; yy < 156; yy += 4) if (noise(b2 * 9 + l2, yy, 6) % 3 === 0) px(x, yy, 1, 2, "#dbe8f6");
      if (l2 === 6 && noise(b2, 3, 2) % 6 === 0) col(x, 160 - h2 - 8, 8, "#6c84a8"); // an aerial on top
    }
    const w3 = Math.floor(x + view * 0.5); // near buildings
    const b3 = Math.floor(w3 / 17), l3 = mod(w3, 17);
    const h3 = 12 + (noise(b3, 1, 4) % 26);
    if (l3 < 15) {
      const shade = CITY_NEAR[noise(b3, 2, 4) % 3];
      col(x, 168 - h3, h3, shade); col(x, 168 - h3, 2, "#2a3347");
      if (l3 % 4 === 1) for (let yy = 168 - h3 + 5; yy < 165; yy += 5) if (noise(b3 * 17 + l3, yy, 8) % 3 !== 0) px(x, yy, 2, 2, "#ffdf8a");
    }
    col(x, 168, 12, "#363e50"); col(x, 168, 1, "#7d869a"); // pavement and road
    if ((w3 >> 3) & 1) px(x, 175, 1, 1, "#e9c94f");
  };

  // jungle: misty hills, then dense canopy with palm fronds
  const jungleColumn: Column = (x, view) => {
    px(x, 140, 1, 40, "#2c6e3a");
    const w1 = x + view * 0.07; // far hills in the mist
    const h1 = Math.round(16 + 12 * (Math.sin(w1 / 41) + 1) + 6 * (Math.sin(w1 / 17 + 1) + 1));
    col(x, 152 - h1, h1, "#79b39c"); col(x, 152 - h1, 2, "#9cc9b2");
    px(x, 148, 1, 6, "rgba(225,245,230,0.4)");
    const w2 = x + view * 0.2; // middle canopy
    const top2 = 166 - Math.round(14 + 7 * zig(w2 / 12) + 4 * zig(w2 / 5 + 0.5));
    col(x, top2, 180 - top2, "#2f8140"); col(x, top2, 2, "#4fa65a");
    if (noise(Math.floor(w2), 3, 6) % 6 === 0) col(x, top2 + 3 + (noise(Math.floor(w2), 4, 6) % 10), 1, "#1f5f2e");
    const w3 = Math.floor(x + view * 0.55); // near canopy, bigger lumps
    const top3 = 172 - Math.round(8 + 8 * zig(w3 / 17 + 0.3) + 3 * zig(w3 / 6));
    col(x, top3, 180 - top3, "#2a8a3a"); col(x, top3, 2, "#58c25a");
    if (noise(w3, 5, 6) % 5 === 0) col(x, top3 + 2, 1, "#7fd870");
    if (noise(w3 >> 1, 6, 6) % 4 === 0) col(x, top3 + 5 + (noise(w3, 7, 6) % 6), 1, "#1c6a2c");
    if (mod(w3, 85) === 0 && noise(Math.floor(w3 / 85), 3, 9) % 2 === 0) palm(x, top3 + 2, 15, "#16572a");
  };

  const COLUMNS: Record<Terrain, Column> = {
    sea: seaColumn, coast: coastColumn, mountains: mountainsColumn, desert: desertColumn, city: cityColumn, jungle: jungleColumn,
  };

  function drawScenery(t: number) {
    const view = dist;
    const segs = course.segments;
    // BLENDING: where the terrain changes, `terrainBlend` says how far across the change we are.
    // The sky fades smoothly (we mix the two colours). For the ground layers we CROSS-FADE: each
    // column is painted as the old terrain, then the new terrain is painted over it, a little
    // more solid with every step. So the change sweeps across the screen like a soft wipe.
    const blendAt = (x: number) => terrainBlend(segs, view + (x - PLANE_X));
    for (let x = 0; x < W; x += 4) {
      const b = blendAt(x + 2);
      SKY[b.a].forEach((c, i) => px(x, i * 20, 4, 20, b.m > 0 ? mixHex(c, SKY[b.b][i], b.m) : c));
    }
    const sunT = blendAt(260);
    const sun = SUN[sunT.m > 0.5 ? sunT.b : sunT.a];
    px(252, 26, 16, 16, sun); px(250, 29, 20, 10, sun); px(255, 24, 10, 20, sun);

    standing.length = 0;
    for (let x = 0; x < W; x++) {
      const b = blendAt(x);
      COLUMNS[b.a](x, view, t);
      if (b.m > 0) { // part of the way into the next terrain: paint it over the top, more and more solid
        ctx.globalAlpha = b.m;
        COLUMNS[b.b](x, view, t);
        ctx.globalAlpha = 1;
      }
    }
    for (const f of standing) f();

    // Clouds: two layers, a far small one and a near big one, drifting at their own speeds.
    const cview = view + idle;
    for (const [par, size, period, far] of [[0.3, 1, 600, true], [0.65, 1.5, 760, false]] as const) {
      for (let i = 0; i < 6; i++) {
        const cx = mod((i * period) / 6 + (noise(i, par * 10, 3) % 60) - cview * par, period) - 60;
        const cy = 10 + (noise(i, par * 10, 5) % 70);
        const b = blendAt(cx + 15);
        const [c1, c2, farN, nearN] = CLOUDS[b.m > 0.5 ? b.b : b.a];
        if (i >= (far ? farN : nearN)) continue; // each terrain has its own number of clouds
        drawCloud(cx, cy, size, c1, c2);
      }
    }
  }

  function drawCloud(x: number, yy: number, s: number, c: string, shade: string) {
    px(x + 4 * s, yy + 4 * s, 22 * s, 5 * s, c);
    px(x + 9 * s, yy, 10 * s, 6 * s, c);
    px(x, yy + 7 * s, 30 * s, 3 * s, c);
    px(x + 2 * s, yy + 10 * s, 26 * s, 1 * s, shade);
  }

  // --- runways, with a control tower and a hangar ---
  function drawRunway(r: Runway, t: number) {
    const sx0 = Math.round(screenX(r.x0)), sx1 = Math.round(screenX(r.x1));
    if (sx1 < -50 || sx0 > W + 50) return;
    const len = r.x1 - r.x0;
    const tower = Math.round(screenX(r.x0 + len * 0.55)), hangar = Math.round(screenX(r.x0 + len * 0.78));
    px(sx0 - 6, SURFACE - 3, sx1 - sx0 + 12, 4, "#5e9c4e"); px(sx0 - 6, SURFACE - 3, sx1 - sx0 + 12, 1, "#7cbb66"); // a strip of grass for the buildings to stand on
    px(hangar, SURFACE - 12, 34, 12, "#9aa4b6"); px(hangar - 1, SURFACE - 14, 36, 3, "#6c7688"); px(hangar + 10, SURFACE - 8, 14, 8, "#5a6578");
    px(tower - 2, SURFACE - 26, 4, 26, "#c8ced8"); px(tower - 6, SURFACE - 34, 12, 8, "#dfe4ec"); px(tower - 5, SURFACE - 32, 10, 4, "#5fb4e8");
    px(tower - 7, SURFACE - 35, 14, 2, "#d8402f"); px(tower, SURFACE - 41, 1, 6, "#3a4150");
    const a = Math.max(-2, sx0), b = Math.min(W + 2, sx1);
    px(a, SURFACE, b - a, 1, "#b5bbc8"); // the bright edge, which the wheels roll on
    px(a, SURFACE + 1, b - a, 8, "#454b58");
    px(a, SURFACE + 9, b - a, 1, "#2f3440");
    for (let x = a; x < b; x++) {
      const wx = x - PLANE_X + dist;
      if (mod(wx, 18) < 9) px(x, SURFACE + 4, 1, 2, "#e6e9ef"); // the dashed centre line
      if ((x < sx0 + 16 || x > sx1 - 16) && x % 3 === 0) px(x, SURFACE + 1, 1, 8, "#e6e9ef"); // the stripes at each end
    }
    if (r.lights) { // flashing approach lights leading in to the landing runway
      for (let k = 1; k <= 7; k++) {
        const lx = Math.round(screenX(r.x0 - k * 10));
        px(lx, SURFACE + 3, 2, 2, Math.floor(t * 9) % 8 === 7 - k ? "#ffe45c" : "#8a7a3a");
      }
    }
  }

  // --- the obstacles ---
  /** Things that rise from the ground. They all lean on `groundWidth`, so the picture matches the box. */
  function drawGroundObstacle(o: Obstacle, t: number) {
    if (o.spec.type === "devil") return drawDevil(o, t); // (it has its own height and place, from the clock)
    const sx = Math.round(screenX(o.spec.at));
    const hgt = o.spec.y;
    const top = H - hgt;
    const pw = groundWidth(o.spec);
    const seed = o.spec.at;
    switch (o.spec.type) {
      case "mountain":
        for (let r = 0; r < hgt; r++) {
          // Each row is wider than the one above. A little noise makes the edges uneven.
          const w = Math.max(1, Math.round((pw / 2) * ((r + 1) / hgt) + ((noise(r, seed, 1) % 3) - 1)));
          const snow = hgt > 45 && r < hgt * 0.22 + (noise(r >> 1, seed, 4) % 3);
          px(sx - w, top + r, w, 1, snow ? "#ffffff" : "#9a9084"); // lit side, on the left
          px(sx, top + r, w, 1, snow ? "#eef4fb" : "#6e665b"); // shaded side, on the right
        }
        break;
      case "cliff":
        for (let r = 0; r < hgt; r++) {
          const w = Math.max(2, Math.round((pw / 2) * (0.5 + 0.5 * Math.pow((r + 1) / hgt, 0.7)) + ((noise(r, seed, 2) % 3) - 1)));
          const grass = r < 3;
          const strata = r > 4 && r % 6 === 0;
          px(sx - w, top + r, w, 1, grass ? "#5fa24a" : strata ? "#a06c3c" : "#b97f4c");
          px(sx, top + r, w, 1, grass ? "#468238" : strata ? "#74492a" : "#8d5d34");
        }
        break;
      case "mesa":
        for (let r = 0; r < hgt; r++) {
          const lower = clampFrac((r / hgt - 0.55) / 0.45); // straight sides on top, a sloping skirt below
          const w = Math.max(2, Math.round((pw / 2) * (0.72 + 0.28 * lower) + ((noise(r, seed, 3) % 3) - 1) * 0.6));
          const cap = r < 2, strata = r > 3 && r % 6 === 0;
          px(sx - w, top + r, w, 1, cap ? "#ecb37a" : strata ? "#b8683a" : "#d98c4e");
          px(sx, top + r, w, 1, cap ? "#d99a60" : strata ? "#8f4b2a" : "#b8683a");
        }
        break;
      case "building": {
        const w = o.spec.w ?? 24;
        const x0 = sx - Math.floor(w / 2);
        const [lit, shade] = [["#6b7a96", "#55627d"], ["#8a8f9c", "#6d7280"], ["#7a6a8a", "#5f5170"], ["#5f8a9a", "#4a6f7d"]][noise(seed, 1, 5) % 4];
        px(x0, top, w, hgt, lit);
        px(x0 + w - 4, top, 4, hgt, shade); // the side in shade
        px(x0 - 1, top, w + 2, 2, "#2f3648"); // the roof edge
        if (noise(seed, 2, 5) % 2 === 0) { // an aerial with a blinking red light
          px(sx, top - 7, 1, 7, "#2f3648");
          px(sx, top - 8, 1, 1, Math.floor(t * 2) % 2 ? "#ff5a4a" : "#7a2a2a");
        }
        for (let wy = top + 5; wy < H - 6; wy += 5) {
          for (let wx = x0 + 3; wx < x0 + w - 4; wx += 4) {
            const on = noise(seed + wx, wy, 6) % 3 !== 0; // most windows are lit
            px(wx, wy, 2, 2, on ? "#ffe9a0" : "#2d3548");
          }
        }
        break;
      }
    }
  }
  const clampFrac = (v: number) => clamp(v, 0, 1);

  /** Things that float: storms, dust storms and flocks. */
  function drawFloatingObstacle(o: Obstacle, t: number) {
    switch (o.spec.type) {
      case "storm": return drawStorm(o, t);
      case "dust": return drawDust(o, t);
      case "gulls": return drawFlock(o, t, false);
      case "parrots": return drawFlock(o, t, true);
      case "thunder": return drawThunder(o, t);
      case "heli": return drawHeli(o, t);
      case "thermal": return drawThermal(o, t);
    }
  }

  // A NEWS HELICOPTER (leg 3, over a city). It hangs in a column of sky and swings up and down on a slow, regular
  // beat (heliY, the same sum the touching uses). A faint dotted line with a small tick at each end shows the column it
  // patrols, so you can see the whole swing from far off and time your pass. The rotor is a blur that flickers.
  function drawHeli(o: Obstacle, t: number) {
    const cx = Math.round(screenX(o.spec.at));
    const cy = Math.round(heliY(o.spec, legTime));
    const amp = o.spec.amp ?? 30;
    // The patrol column: dots from the top of the swing to the bottom, and a tick at each end.
    const top = Math.round(o.spec.y - amp - 8), bottom = Math.round(o.spec.y + amp + 8);
    for (let yy = top; yy <= bottom; yy += 6) px(cx, yy, 1, 2, "rgba(255,255,255,0.35)");
    px(cx - 3, top, 7, 1, "rgba(255,255,255,0.45)");
    px(cx - 3, bottom, 7, 1, "rgba(255,255,255,0.45)");
    // The tail boom, fin and a blinking red light (the tail points right; the nose points back at you).
    px(cx + 8, cy - 1, 13, 3, "#dfe5f0");
    px(cx + 19, cy - 6, 3, 7, "#c4cde0");
    px(cx + 20, cy - 7 + (Math.floor(t * 20) % 2) * 3, 1, 3, "rgba(60,70,90,0.8)"); // the little tail rotor, a flicker
    if (Math.floor(t * 2) % 2) px(cx + 19, cy - 8, 2, 2, "#ff5a4a");
    // The body: a white pod with a red stripe, a belly in shade and a big blue window at the front.
    px(cx - 7, cy - 7, 14, 2, "#f2f4f8");
    px(cx - 10, cy - 5, 20, 9, "#f2f4f8");
    px(cx - 8, cy + 4, 16, 2, "#aeb8cc");
    px(cx - 10, cy + 1, 20, 2, "#e0463a");
    px(cx - 10, cy - 4, 7, 5, "#6fc8f4");
    px(cx - 10, cy - 4, 2, 1, "#d9f4ff");
    px(cx - 10, cy - 4, 1, 5, "#3d7fa8");
    // The skids and the mast, then the rotor on top: a long blur that flickers between two lengths.
    px(cx - 8, cy + 8, 17, 1, "#3a4156");
    px(cx - 5, cy + 6, 1, 3, "#3a4156"); px(cx + 4, cy + 6, 1, 3, "#3a4156");
    px(cx - 1, cy - 10, 2, 3, "#555d70");
    const long = Math.floor(t * 24) % 2 === 0;
    px(cx - (long ? 18 : 13), cy - 11, long ? 36 : 26, 1, "rgba(50,60,80,0.9)");
    px(cx - (long ? 18 : 13), cy - 12, long ? 36 : 26, 1, "rgba(120,130,150,0.35)");
  }

  // A HEAT THERMAL (leg 3, desert): a column of rising hot air. Harmless, so it is drawn light and see-through:
  // a faint warm glow, wavy strands of shimmer drifting UP, and little chevrons rising. They tell you it is pushing up.
  function drawThermal(o: Obstacle, t: number) {
    const cx = Math.round(screenX(o.spec.at));
    const left = cx - THERMAL_W / 2, high = THERMAL_TOP;
    px(left, high, THERMAL_W, H - high, "rgba(255,214,140,0.08)");
    px(left - 2, H - 5, THERMAL_W + 4, 5, "rgba(255,140,60,0.28)"); // the hot ground at its foot
    for (let k = 0; k < 4; k++) { // four wavy strands of shimmer
      const off = (k - 1.5) * 9;
      for (let yy = high; yy < H - 4; yy += 2) {
        if (mod(yy + t * 46 + k * 5, 16) < 7) px(cx + off + Math.sin(yy * 0.16 - t * 4 + k * 1.7) * 3, yy, 1, 2, "rgba(255,236,190,0.55)");
      }
    }
    for (let j = 0; j < 5; j++) { // chevrons climbing the column, fading near the top
      const span = H - high - 10;
      const yy = Math.round(H - 10 - mod(t * 30 + j * (span / 5), span));
      const a = clamp((yy - high) / 40, 0.15, 0.8).toFixed(2);
      px(cx - 3, yy + 2, 2, 1, `rgba(255,240,200,${a})`); px(cx - 1, yy + 1, 2, 1, `rgba(255,240,200,${a})`); px(cx + 1, yy, 2, 1, `rgba(255,240,200,${a})`);
      px(cx + 3, yy + 1, 2, 1, `rgba(255,240,200,${a})`); px(cx + 5, yy + 2, 2, 1, `rgba(255,240,200,${a})`);
    }
  }

  // A DUST DEVIL (leg 3, over a desert): a spinning twister standing on the ground. It is a funnel of sand, narrow at
  // the foot and wide at the top, drawn a row at a time. Its HEIGHT grows and shrinks on a regular beat (devilHeight) and it
  // drifts slowly left (devilX): the same two sums the touching uses. Bands of sand spin round it and specks fly off it.
  function drawDevil(o: Obstacle, t: number) {
    const cx = Math.round(screenX(devilX(o.spec, dist)));
    const hgt = Math.round(devilHeight(o.spec, legTime));
    px(cx - 14, H - 3, 28, 3, "rgba(201,164,106,0.55)"); // a puff of dust at the foot
    const halfAt = (r: number) => 3 + 10 * Math.pow(r / hgt, 0.85); // half the width, `r` pixels up
    const swayAt = (r: number) => Math.sin(legTime * 2.6 + r * 0.08) * 3.5 * (r / hgt);
    for (let r = 0; r < hgt; r++) {
      const half = halfAt(r), mid = cx + swayAt(r), yy = H - 1 - r;
      const band = (Math.floor(r / 2) + Math.floor(t * 14)) % 3; // bands of sand that spin round
      px(mid - half, yy, half * 2, 1, band === 0 ? "#caa070" : band === 1 ? "#a9794a" : "#dcc08f");
      px(mid + Math.sin(r * 0.5 - t * 11) * half * 0.7, yy, 2, 1, "#7d552f"); // a dark streak, swirling round and round
    }
    px(cx + swayAt(hgt) - 14, H - hgt - 1, 28, 2, "#caa070"); // the wide swirl at the very top
    px(cx + swayAt(hgt) - 10, H - hgt - 3, 20, 2, "#dcc08f");
    for (let k = 0; k < 7; k++) { // specks of sand flung out
      const a = t * 4.2 + k * 0.9, r = mod(t * 22 + k * 19, hgt);
      px(cx + swayAt(r) + Math.cos(a) * (halfAt(r) + 4), H - 1 - r, 2, 2, k % 2 ? "#e0b983" : "#7d552f");
    }
  }

  // A THUNDERCLOUD (leg 3): a big, dark cloud. When its cycle reaches the WARNING a bright light
  // flashes at the top or the bottom of the cloud (the side the bolt will go), with a faint
  // dotted line showing the way. Then the BOLT: a yellow-white zig-zag from the cloud to the very
  // edge of the sky. The picture follows thunderAt(), the same timer that decides if you are hit.
  function drawThunder(o: Obstacle, t: number) {
    const z = thunderAt(o.spec, legTime);
    const cx = Math.round(screenX(o.spec.at));
    const cy = Math.round(o.spec.y + Math.sin(t * 1.2 + o.spec.at) * 1);
    const x = cx - 30, yy = cy - 15;
    const glowing = z.phase !== "quiet";
    // The body is made of round PUFFS (filled circles, a row of pixels at a time). Each puff is drawn
    // twice: a light one first, then the dark one a little lower and to the right, so a thin light
    // rim is left along its top and left edge. A flat dark shadow goes underneath the lot.
    const disc = (dx: number, dy: number, r: number, colour: string) => {
      for (let row = -r; row <= r; row++) {
        const half = Math.floor(Math.sqrt(r * r - row * row));
        px(x + dx - half, yy + dy + row, half * 2 + 1, 1, colour);
      }
    };
    const puffs: [number, number, number][] = [[14, 17, 9], [29, 11, 11], [46, 16, 10], [22, 20, 9], [38, 21, 8]];
    const body = glowing ? "#34304c" : "#363c4c", rim = glowing ? "#6a6490" : "#667089", shade = "#1f222d";
    for (const [dx, dy, r] of puffs) disc(dx, dy + 5, r, shade); // the shadow underneath
    for (const [dx, dy, r] of puffs) disc(dx, dy, r, rim); // the light rim...
    for (const [dx, dy, r] of puffs) disc(dx + 1, dy + 2, r - 1, body); // ...the dark body, a little lower
    px(x + 6, yy + 24, 48, 3, shade); // a flat dark underside
    px(x + 10, yy + 27, 40, 2, shade);
    // Little flickers of light deep inside the cloud, which grow as it gets ready to fire.
    const flick = glowing ? 3 : 1;
    for (let k = 0; k < flick; k++) {
      if (Math.sin(t * 9 + k * 2.3 + o.spec.at) > 0.5) px(x + 14 + ((k * 17 + Math.floor(t * 6) * 5) % 30), yy + 14 + (k % 2) * 4, 4, 1, "#ffe45c");
    }
    if (z.phase === "warn") {
      const up = z.side === "up";
      const lightY = up ? yy - 1 : yy + 29;
      const on = Math.floor(t * 14) % 2 === 0; // flashes fast
      const dir = up ? -1 : 1;
      // The faint dotted line showing where the bolt will go.
      for (let k = 0; k < 14; k++) px(cx, up ? lightY - 4 - k * 6 : lightY + 4 + k * 6, 1, 2, `rgba(255,244,160,${on ? 0.38 : 0.2})`);
      // The glowing light: a bright core with a halo and four little sparks.
      px(cx - 5, lightY - 5, 11, 11, `rgba(255,228,92,${on ? 0.35 : 0.15})`);
      px(cx - 3, lightY - 3, 7, 7, on ? "#fff7a8" : "#ffd34e");
      px(cx - 1, lightY - 1, 3, 3, "#ffffff");
      px(cx - 8, lightY, 3, 1, "#ffe45c"); px(cx + 6, lightY, 3, 1, "#ffe45c");
      px(cx, lightY + dir * 6, 1, 3, "#ffe45c"); px(cx, lightY - dir * 6, 1, 2, "#ffe45c");
    } else if (z.phase === "bolt") {
      const up = z.side === "up";
      const r = boltRect(o.spec, z.side);
      const y0 = Math.round(up ? 0 : r.y + 3), y1 = Math.round(up ? r.y + r.h - 3 : H);
      px(cx - 8, y0, 16, y1 - y0, "rgba(255,244,160,0.14)"); // a faint glow round the bolt
      // The zig-zag: a line that swings a few pixels left, then right, every 11 pixels of height,
      // drawn one row at a time (3 pixels wide: a white middle with yellow edges). It starts at the
      // cloud (the end of the line next to it is always in the middle) and the kinks flicker.
      const seg = 11;
      const kink = (k: number) => (k === 0 ? 0 : (k % 2 ? 1 : -1) * (3 + ((k * 7 + Math.floor(t * 18)) % 4)));
      for (let row = 0; row < y1 - y0; row++) {
        const d = up ? y1 - 1 - row - y0 : row; // how far from the cloud this row is
        const k = Math.floor(d / seg), f = (d % seg) / seg;
        const bx = cx + Math.round(kink(k) + (kink(k + 1) - kink(k)) * f);
        px(bx - 2, y0 + row, 5, 1, "#ffd34e");
        px(bx - 1, y0 + row, 3, 1, "#fffbd0");
      }
      px(cx - 6, up ? yy - 2 : yy + 27, 13, 3, "#fffbd0"); // a flash where the bolt leaves the cloud
    }
  }

  function drawStorm(o: Obstacle, t: number) {
    const x = Math.round(screenX(o.spec.at) - 18);
    const yy = Math.round(o.spec.y - 11 + Math.sin(t * 1.5 + o.spec.at) * 1.5);
    px(x + 6, yy + 3, 24, 12, "#4a5160"); // the dark puffy body
    px(x + 10, yy, 14, 6, "#4a5160");
    px(x + 1, yy + 8, 34, 7, "#4a5160");
    px(x + 4, yy + 15, 28, 4, "#383d4a");
    px(x + 10, yy + 1, 8, 2, "#6a7386"); // a bit of light on top
    px(x + 3, yy + 8, 5, 2, "#6a7386");
    // LIGHTNING: a tiny zig-zag that blinks on for part of every second.
    if (mod(t * 1.7 + o.spec.at, 1) < 0.35) {
      for (const [dx, dy, w] of [[17, 15, 3], [15, 17, 3], [17, 19, 3], [15, 21, 2]] as const) px(x + dx, yy + dy, w, 2, "#ffe45c");
    }
  }

  // A DUST STORM: a brown cloud like the storm, with specks of sand swirling round it.
  function drawDust(o: Obstacle, t: number) {
    const cx = screenX(o.spec.at);
    const cy = o.spec.y + Math.sin(t * 1.3 + o.spec.at) * 1.5;
    const x = Math.round(cx - 20), yy = Math.round(cy - 12);
    px(x + 8, yy + 4, 24, 14, "#a9794a");
    px(x + 13, yy, 14, 8, "#a9794a");
    px(x + 2, yy + 9, 36, 9, "#a9794a");
    px(x + 5, yy + 18, 30, 5, "#8a5f36");
    px(x + 13, yy + 1, 8, 2, "#caa070"); px(x + 4, yy + 9, 6, 2, "#caa070");
    for (let k = 0; k < 12; k++) { // sand circling round in the wind
      const a = t * 2.6 + k * 0.63;
      px(cx + Math.cos(a) * 19, cy + Math.sin(a) * 9, 2, 2, k % 2 ? "#e0b983" : "#7d552f");
    }
  }

  // A FLOCK of five birds. They flap, each a little out of step with the others.
  // Gulls are white with dark outlines; parrots are bright and each one a different colour.
  const PARROT_COLOURS = ["#e8402f", "#3fb04a", "#f2c230", "#2f7fd8", "#e8402f"];
  function drawFlock(o: Obstacle, t: number, parrots: boolean) {
    const cx = screenX(o.spec.at);
    const flock = [[-12, 0], [-4, -6], [4, 1], [12, -5], [0, 6]];
    flock.forEach(([dx, dy], i) => {
      const up = Math.floor(t * 6 + i * 1.3) % 2 === 0;
      const bx = Math.round(cx + dx - 2 + Math.sin(t * 2 + i) * 1);
      const by = Math.round(o.spec.y + dy - 1);
      const vee = (c: number, oy: number, colour: string) => {
        if (up) { px(bx + c, by + oy, 1, 1, colour); px(bx + 4 + c, by + oy, 1, 1, colour); px(bx + 1 + c, by + 1 + oy, 1, 1, colour); px(bx + 3 + c, by + 1 + oy, 1, 1, colour); px(bx + 2 + c, by + 2 + oy, 1, 1, colour); }
        else { px(bx + 2 + c, by + oy, 1, 1, colour); px(bx + 1 + c, by + 1 + oy, 1, 1, colour); px(bx + 3 + c, by + 1 + oy, 1, 1, colour); px(bx + c, by + 2 + oy, 1, 1, colour); px(bx + 4 + c, by + 2 + oy, 1, 1, colour); }
      };
      vee(0, 1, "#2b3446"); // the dark outline, one pixel lower
      vee(0, 0, parrots ? PARROT_COLOURS[i] : "#ffffff");
      if (parrots) px(bx + 2, by + 3, 1, 3, PARROT_COLOURS[(i + 2) % 5]); // a long tail
    });
  }

  // --- the gates ---
  // A ring is drawn in two halves: the back half BEFORE the plane and the front half AFTER,
  // so the plane really seems to fly through the middle.
  function drawGate(g: GateGroup, front: boolean, t: number) {
    const sx = Math.round(screenX(g.x));
    if (sx < -60 || sx > W + 20) return;
    const { ys, half } = gateSlots(ac);
    // EASY HELP: after a go-around on the easy leg, the right gate pulses with a green glow.
    const pulse = 0.5 + 0.5 * Math.sin(t * 7);
    ys.forEach((sy, i) => {
      const off = g.off[i];
      const glow = leg.glowRight && g.attempt > 0 && i === g.correct && !off;
      const lit = mod(t * 2, 1) < 0.5;
      const rim = off ? "#6c7484" : "#ffd34e";
      const rimDark = off ? "#4a5160" : "#e08a1e";
      for (let a = 0; a < 64; a++) {
        const ang = (a / 64) * Math.PI * 2;
        const isFront = Math.cos(ang) < 0; // the half that points at us (to the left, as we fly in)
        if (isFront !== front) continue;
        if (glow) px(Math.round(sx + Math.cos(ang) * 7) - 1, Math.round(sy + Math.sin(ang) * (half + 3)) - 1, 3, 3, `rgba(110,255,160,${(0.35 + 0.65 * pulse).toFixed(2)})`);
        const gx = Math.round(sx + Math.cos(ang) * 4);
        const gy = Math.round(sy + Math.sin(ang) * half);
        px(gx, gy, 2, 2, Math.sin(ang) > 0 ? rimDark : rim);
      }
      if (front) {
        // The label: big and plain, on a dark sign, to the right of the ring.
        const label = g.codes[i];
        const bw = 46, bh = 17;
        const bx = sx + 8, by = sy - bh / 2;
        if (glow) px(bx - 3, by - 3, bw + 6, bh + 6, `rgba(110,255,160,${(0.2 + 0.5 * pulse).toFixed(2)})`);
        px(bx, by, bw, bh, off ? "#2a2f3a" : "#10162b");
        const edge = glow ? "#7dffa8" : rim;
        px(bx, by, bw, 1, edge); px(bx, by + bh - 1, bw, 1, edge);
        px(bx, by, 1, bh, edge); px(bx + bw - 1, by, 1, bh, edge);
        text(label, bx + bw / 2, sy, 16, off ? "#8b93a3" : glow ? "#b8ffd0" : lit ? "#ffffff" : "#ffeea0");
        if (off) text("X", bx - 6, sy, 8, "#ff8a7a");
      }
    });
  }

  // --- the plane ---
  function drawPlane(t: number) {
    const sprite = sprites[leg.aircraft];
    const w = sprite.width;
    const hh = sprite.height;
    // Nose up when climbing, nose down when sinking. Pixel pictures don't rotate well, so we
    // "shear" it instead: copy it one column at a time and slide each column up or down.
    const pitch = clamp((vy / ac.speed) * 0.4, -0.15, 0.15);
    const shake = wobble > 0 ? (wobble / WOBBLE_TIME) : 0;
    const bob = shake * Math.sin(t * 48) * 1.6;
    const tilt = pitch + shake * Math.sin(t * 31) * 0.12;
    const x0 = Math.round(PLANE_X - w / 2);
    const y0 = y - hh / 2 + bob;
    const onGround = phase === "parked" || phase === "landed" || (phase === "takeoff" && !ride.lifted) || (phase === "landing" && landing.touched);
    for (let i = 0; i < w; i++) {
      ctx.drawImage(sprite, i, 0, 1, hh, x0 + i, Math.round(y0 + (onGround ? 0 : tilt * (i - w / 2))), 1, hh);
    }
    // A propeller, spinning (and slowing to a stop once the plane has landed and parked).
    const spinning = !(phase === "parked" || phase === "landed");
    if (leg.aircraft === "cessna") px(x0 + w, Math.round(y0 + 2 + (spinning ? Math.floor(t * 30) % 2 : 1)), 1, spinning ? 5 : 4, spinning ? "rgba(255,255,255,0.7)" : "#1b2433");
  }

  function drawPuffs() {
    for (const p of puffs) {
      const k = p.life / p.max;
      const s = 2 + Math.round((1 - k) * 3);
      px(screenX(p.x) - s / 2, p.y - s / 2, s, s, `rgba(236,232,224,${(k * 0.85).toFixed(2)})`);
    }
  }

  /** A text panel. Long lines shrink a little so they always fit inside the box. */
  function panel(lines: { t: string; size: number; colour: string }[], width = 250) {
    const hgt = lines.length * 14 + 14;
    const x0 = Math.round((W - width) / 2);
    const y0 = Math.round(H / 2 - hgt / 2);
    px(x0, y0, width, hgt, "#0a1230");
    px(x0, y0, width, 1, "#8e9ac8");
    px(x0, y0 + hgt - 1, width, 1, "#8e9ac8");
    px(x0, y0, 1, hgt, "#8e9ac8");
    px(x0 + width - 1, y0, 1, hgt, "#8e9ac8");
    lines.forEach((l, i) => {
      let size = l.size;
      ctx.font = `${size}px Silkscreen, "Courier New", monospace`;
      while (size > 8 && ctx.measureText(l.t).width > width - 14) { size--; ctx.font = `${size}px Silkscreen, "Courier New", monospace`; }
      text(l.t, W / 2, y0 + 14 + i * 14 - 1, size, l.colour);
    });
  }

  // The FUEL GAUGE, top left: a little box with a bar that shrinks as the tank empties. Green
  // while there is plenty, amber under AMBER_BELOW percent, and flashing red under RED_BELOW.
  function drawFuelGauge(t: number) {
    const x0 = 3, y0 = 17, w = 66, hgt = 14;
    const flashingOff = fuel < RED_BELOW && Math.floor(t * 4) % 2 === 0;
    const colour = fuel < RED_BELOW ? (flashingOff ? "#b3382a" : "#ff4d3a") : fuel < AMBER_BELOW ? "#ffb52e" : "#5fe08a";
    px(x0, y0, w, hgt, "rgba(10,18,48,0.78)");
    px(x0, y0, w, 1, "#8e9ac8"); px(x0, y0 + hgt - 1, w, 1, "#8e9ac8");
    px(x0, y0, 1, hgt, "#8e9ac8"); px(x0 + w - 1, y0, 1, hgt, "#8e9ac8");
    const filling = refuel.left > 0; // a stopover is topping the tank up: the bar and the label glow
    text(filling ? `REFUEL ${Math.ceil(fuel - 1e-6)}%` : `FUEL ${Math.ceil(fuel - 1e-6)}%`, x0 + 4, y0 + 4, 8, filling ? "#b8ffd0" : fuel < AMBER_BELOW ? colour : "#e8ecff", "left");
    const bw = w - 8;
    px(x0 + 4, y0 + 8, bw, 4, "#27304f");
    px(x0 + 4, y0 + 8, Math.round((bw * fuel) / FULL_TANK), 4, filling ? "#b8ffd0" : colour);
    if (filling) { px(x0 - 1, y0 - 1, w + 2, 1, "#5fe08a"); px(x0 - 1, y0 + hgt, w + 2, 1, "#5fe08a"); px(x0 - 1, y0, 1, hgt, "#5fe08a"); px(x0 + w, y0, 1, hgt, "#5fe08a"); }
    // Tick marks at the two warning lines, so you can see where the beeps happen.
    for (const mark of LOW_FUEL_BEEPS) px(x0 + 4 + Math.round((bw * mark) / FULL_TANK), y0 + 7, 1, 6, "#8e9ac8");
  }

  const stars = (n: number) => "★".repeat(Math.max(0, n)) + "☆".repeat(Math.max(0, MAX_COMFORT - n)); // (n is -1 if the first leg flown had fuel, as when a test starts on leg 2)

  function draw(t: number) {
    // Each frame we repaint everything from scratch, back to front.
    ctx.save();
    // The screen shakes a little during turbulence.
    if (wobble > 0 && state === "playing") ctx.translate(Math.round(Math.sin(t * 90) * 1.5 * (wobble / WOBBLE_TIME)), Math.round(Math.cos(t * 70) * 1.5 * (wobble / WOBBLE_TIME)));
    drawScenery(t);

    // Anything in the world is drawn at screenX(its world position). Skip what is off the screen.
    const onScreen = (r: Rect) => screenX(r.x + r.w) > -8 && screenX(r.x) < W + 8;
    for (const r of runways) drawRunway(r, t);
    for (const o of obstacles) if (OBSTACLE_INFO[o.spec.type].ground && onScreen(o.pic)) drawGroundObstacle(o, t);
    if (gate) drawGate(gate, false, t);
    for (const p of trail) px(screenX(p.x), p.y + 1, 2, 1, `rgba(255,255,255,${(p.life / 1.3 * 0.7).toFixed(2)})`);
    for (const o of obstacles) if (!OBSTACLE_INFO[o.spec.type].ground && onScreen(o.pic)) drawFloatingObstacle(o, t);
    const blink = invuln > 0 && Math.floor(t * 14) % 2 === 0;
    if (!blink) drawPlane(t);
    if (lifted && phase === "flight") { // little arrows rising off the plane while a thermal pushes it up
      for (let k = 0; k < 2; k++) {
        const ay = Math.round(y - 12 - mod(t * 26 + k * 7, 14));
        px(PLANE_X - 2, ay + 2, 2, 1, "#fff0c8"); px(PLANE_X, ay + 1, 2, 1, "#fff0c8"); px(PLANE_X + 2, ay, 2, 1, "#fff0c8");
        px(PLANE_X + 4, ay + 1, 2, 1, "#fff0c8"); px(PLANE_X + 6, ay + 2, 2, 1, "#fff0c8");
      }
    }
    drawPuffs();
    if (gate) drawGate(gate, true, t);
    ctx.restore();

    if (flash > 0) px(0, 0, W, H, "rgba(255,255,255,0.22)");

    // Messages on top.
    if (banner && state === "playing") {
      px(0, 2, W, 21, "rgba(10,18,48,0.6)");
      text(banner.title, W / 2, 8, 8, banner.colour);
      text(banner.sub, W / 2, 17, 8, "#e8ecff");
    } else if (gate && state === "playing") {
      // The next stop, on the game itself, so you don't have to look away to the strip above.
      const city = cityOf(stopCode(gate.stop));
      const msg = `NEXT STOP: ${city.toUpperCase()}${kindNote(gate.stop).toUpperCase()}${gate.attempt ? " (GO AROUND)" : ""}`;
      ctx.font = `8px Silkscreen, "Courier New", monospace`;
      const bw = Math.ceil(ctx.measureText(msg).width) + 12;
      px((W - bw) / 2, 2, bw, 12, "rgba(10,18,48,0.7)");
      text(msg, W / 2, 8, 8, "#7fd0ff");
    }
    // The city again, right above the gates as they come in, so the question sits next to the answers.
    // LEG 1 ONLY: on legs 2 and 3 you must remember which city you are heading for (the NEXT STOP plate and the strip above still say it).
    if (legIndex === 0 && gate && state === "playing") {
      const sx = screenX(gate.x);
      if (sx > PLANE_X + 20 && sx < W - 10) {
        // Just right of the top sign: the sky there is kept clear around every checkpoint.
        const { ys } = gateSlots(ac);
        text(`${cityOf(stopCode(gate.stop))}?`, sx + 58, ys[0], 8, "#ffffff", "left");
      }
    }

    if (leg.fuel && (state === "playing" || state === "paused")) drawFuelGauge(t);

    const startStars = legStars[0] ?? 0; // only leg 1 uses comfort stars
    const startName = (c: string) => `${cityOf(c)} (${c})`;
    if (state === "ready") {
      panel([
        { t: "FLYOVER", size: 16, colour: "#ffd34e" },
        { t: "Press Space or tap to take off", size: 8, colour: "#e8ecff" },
        { t: "Cessna, jet, jumbo: three legs, new routes every time", size: 8, colour: "#8e9ac8" },
      ], 290);
    } else if (state === "briefing") {
      const first = course.route.codes[0], last = course.route.codes[course.route.codes.length - 1];
      panel([
        { t: `LEG ${legIndex + 1} OF ${LEGS.length}: ${leg.level.toUpperCase()}`, size: 8, colour: "#8e9ac8" },
        { t: ac.nick.toUpperCase(), size: 16, colour: "#ffd34e" },
        { t: `${startName(first)} to ${startName(last)}`, size: 8, colour: "#e8ecff" },
        { t: course.route.codes.join("  "), size: 8, colour: "#8e9ac8" },
        ...(leg.fuel ? [{ t: "Climbing burns fuel. Gliding down burns none.", size: 8, colour: "#7fd0ff" }] : []),
        ...(leg.fuel ? [{ t: `Stopovers refuel you: ${course.route.stopovers.map(cityOf).join(", ")}`, size: 8, colour: "#ffd34e" }] : []),
        ...(leg.thunder[1] > 0 ? [{ t: "Thunderclouds: a light shows where the bolt goes", size: 8, colour: "#ff8a7a" }] : []),
        ...(leg.special[1] > 0 ? [{ t: "City helicopters, desert dust devils, hot air lifts", size: 8, colour: "#ff8a7a" }] : []),
        { t: "Space or tap to go", size: 8, colour: "#e8ecff" },
      ], 300);
    } else if (state === "paused") {
      panel([
        { t: "PAUSED", size: 16, colour: "#ffd34e" },
        { t: "P, Esc, Space or tap to go on", size: 8, colour: "#e8ecff" },
      ]);
    } else if (state === "legdone") {
      panel([
        { t: `LEG ${legIndex + 1} COMPLETE!`, size: 16, colour: "#5fe08a" },
        { t: `Time ${formatTime(legTime)}     Stops ${reached()} of ${stopCount()}`, size: 8, colour: "#e8ecff" },
        { t: leg.fuel ? `Fuel left ${Math.ceil(fuel)}%     Lowest ${Math.floor(minFuel)}%` : `Comfort ${stars(comfort)}`, size: 8, colour: "#ffd34e" },
        { t: "Space or tap for the next leg", size: 8, colour: "#e8ecff" },
      ], 280);
    } else if (state === "diverted") {
      panel([
        { t: leg.fuel ? "OUT OF FUEL!" : `DIVERTED TO ${divertCity.toUpperCase()}`, size: 16, colour: leg.fuel ? "#ff8a7a" : "#7fd0ff" },
        { t: leg.fuel ? `Diverted to ${divertCity}` : "Too bumpy! Comfort is topped up again.", size: 8, colour: "#e8ecff" },
        { t: leg.fuel ? "Tank refuelled to full. You carry on from here." : "Nothing broken. You carry on from here.", size: 8, colour: "#8e9ac8" },
        { t: "Space or tap to take off", size: 8, colour: "#e8ecff" },
      ], 296);
    } else if (state === "won") {
      panel([
        { t: "ALL LEGS FLOWN!", size: 16, colour: "#5fe08a" },
        { t: `Total time ${formatTime(totalTime)}     Diversions ${divertCount}`, size: 8, colour: "#e8ecff" },
        { t: `Leg 1 comfort ${stars(startStars)}`, size: 8, colour: "#ffd34e" },
        { t: newBest ? "A new best time!" : `Best time ${formatTime(best ?? totalTime)}`, size: 8, colour: "#ffd34e" },
        { t: "Space or tap to fly again", size: 8, colour: "#e8ecff" },
      ], 296);
    }
  }

  // ---------- input ----------
  // Every listener is stored with its "undo" so cleanup can remove them all.
  const undo: (() => void)[] = [];
  function on<T extends EventTarget>(target: T, type: string, fn: (e: any) => void, opts?: AddEventListenerOptions) {
    target.addEventListener(type, fn, opts);
    undo.push(() => target.removeEventListener(type, fn, opts));
  }

  const isUp = (k: string) => k === "ArrowUp" || k === "w" || k === "W";
  const isDown = (k: string) => k === "ArrowDown" || k === "s" || k === "S";

  on(window, "keydown", (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    // Stop the arrow keys and Space from scrolling the page while this screen is open.
    if (k === " " || k.startsWith("Arrow")) e.preventDefault();
    soundOn = true;
    if (isUp(k)) { keys.up = true; return; }
    if (isDown(k)) { keys.down = true; return; }
    if (e.repeat) return;
    if (k === " " || k === "Enter") goOn();
    else if (k === "p" || k === "P" || k === "Escape") {
      if (state === "playing") setPaused(true);
      else if (state === "paused") setPaused(false);
    }
  });
  on(window, "keyup", (e: KeyboardEvent) => {
    if (isUp(e.key)) keys.up = false;
    if (isDown(e.key)) keys.down = false;
  });
  on(window, "blur", () => { keys.up = keys.down = pad.up = pad.down = false; pointerY = null; });

  // Pause by itself when the tab is hidden.
  on(document, "visibilitychange", () => { if (document.hidden) setPaused(true); });

  // Holding a finger (or the mouse button) on the game: the plane climbs or sinks towards it.
  const aim = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointerY = clamp(((e.clientY - r.top) / r.height) * H, 0, H);
  };
  on(canvas, "pointerdown", (e: PointerEvent) => {
    soundOn = true;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not every pointer can be captured */ }
    if (state === "playing") aim(e);
    else goOn();
  });
  on(canvas, "pointermove", (e: PointerEvent) => { if (pointerY !== null) aim(e); });
  const letGo = () => { pointerY = null; };
  on(canvas, "pointerup", letGo);
  on(canvas, "pointercancel", letGo);
  on(canvas, "lostpointercapture", letGo);

  on(pauseBtn, "click", () => {
    soundOn = true;
    setPaused(state === "playing");
    pauseBtn.blur(); // so Space afterwards doesn't "press" this button again
  });

  // The two big on-screen buttons. Pressing one is the same as holding an arrow key.
  for (const [btn, which] of [[padUp, "up"], [padDown, "down"]] as const) {
    const stop = () => { pad[which] = false; btn.classList.remove("pressed"); };
    on(btn, "pointerdown", (e: PointerEvent) => {
      e.preventDefault();
      soundOn = true;
      try { btn.setPointerCapture(e.pointerId); } catch { /* the button still works */ }
      btn.classList.add("pressed");
      if (state !== "playing") goOn();
      pad[which] = true;
    });
    on(btn, "pointerup", stop);
    on(btn, "pointercancel", stop);
    on(btn, "lostpointercapture", stop);
    on(btn, "contextmenu", (e: Event) => e.preventDefault()); // no pop-up menu on a long press
  }

  // Test helpers. These only exist in the development copy, never in the real site.
  if (import.meta.env.DEV) {
    const api = {
      info: () => ({
        state, phase, leg: legIndex + 1, aircraft: leg.aircraft, dist, speed, y, vy, comfort, fuel, minFuel, refuel: { ...refuel }, legTime, kinds: course.route.codes.slice(1).map((_, i) => kindOf(i)), reached: reached(), stopIndex, lastStop,
        divertCount, bumpCount, totalTime, seed: course.seed, routeIndex: course.routeIndex, route: course.route.codes,
        hops: course.route.hops.map((x) => (x.start === x.end ? x.start : `${x.start}+${x.end}`)), length: course.length,
        segments: course.segments.map((s) => ({ x0: s.x0, x1: s.x1, terrain: s.terrain })),
        runways: runways.map((r) => ({ x0: r.x0, x1: r.x1 })),
        gate: gate && { x: gate.x, dx: gate.x - dist, ys: gateSlots(ac).ys, correct: gate.correct, codes: gate.codes, attempt: gate.attempt, right: stopCode(gate.stop) },
        safeY: safeYFrom(y, 150),
        obstacles: course.obstacles,
        thunder: obstacles.filter((o) => o.spec.type === "thunder" && o.spec.at > dist - 100).slice(0, 3).map((o) => ({ dx: o.spec.at - dist, y: o.spec.y, ...thunderAt(o.spec, legTime) })),
        movers: obstacles.filter((o) => isMover(o.spec) && o.spec.at > dist - 120).slice(0, 3).map((o) => ({ dx: o.spec.at - dist, type: o.spec.type, box: moverBox(o.spec, dist, legTime), spec: o.spec })),
        hazards: obstacles.filter((o) => o.hit.x + o.hit.w > dist).slice(0, 3).map((o) => ({ dx: o.spec.at - dist, type: o.spec.type, midY: o.hit.y + o.hit.h / 2 })),
      }),
      // Start a fresh game on leg `n` (1 to 3), with a chosen route (1-based) and seed, straight into the briefing card.
      begin: (n: number, route?: number, seed?: number) => {
        if (seed !== undefined) seedBase = seed;
        forcedRoute = route !== undefined ? route - 1 : undefined;
        totalTime = 0; legStars = []; divertCount = 0; bumpCount = 0; newBest = false;
        startLeg(n - 1);
      },
      // Run the game by script, a fixed 1/60 s at a time, for `seconds` of game time (or until the leg is over). With `bot`, a
      // simple autopilot flies for you: it heads for the right ring when a gate is near, and holds the middle height otherwise.
      step: (seconds: number, bot = true) => {
        const dt = 1 / 60;
        for (let i = 0; i < seconds * 60 && state === "playing"; i++) {
          if (bot) {
            const aim = gate && gate.x - dist < 260 ? gateSlots(ac).ys[gate.correct] : midY();
            keys.up = y > aim + 3;
          }
          update(dt);
        }
        if (bot) keys.up = false;
        return api.info();
      },
      // Move a thundercloud's clock so it is in the given part of its cycle, with the bolt going to the given side (`nth` = nth cloud ahead).
      syncThunder: (nth: number, want: "warn" | "bolt" | "quiet", side: "up" | "down", into = 0) => {
        const o = obstacles.filter((q) => q.spec.type === "thunder" && q.spec.at > dist)[nth];
        if (!o) return false;
        for (let tt = legTime; tt < legTime + 80; tt += 0.02) {
          const z = thunderAt(o.spec, tt);
          if (z.phase === want && z.side === side && (want === "quiet" || z.left > (want === "warn" ? THUNDER_WARN : THUNDER_BOLT) - into - 0.03)) { legTime = tt + into; return true; }
        }
        return false;
      },
      // Move the game clock so the nth moving hazard ahead is at the top or bottom of its swing (a helicopter's highest or lowest point, a dust devil's tallest or shortest).
      syncMover: (nth: number, want: "high" | "low") => {
        const o = obstacles.filter((q) => isMover(q.spec) && q.spec.at > dist)[nth];
        if (!o) return false;
        const value = (tt: number) => (o.spec.type === "heli" ? -heliY(o.spec, tt) : devilHeight(o.spec, tt)); // (bigger = higher up the screen)
        let best = legTime, bestV = value(legTime);
        for (let tt = legTime; tt < legTime + 12; tt += 0.01) {
          const v = value(tt);
          if (want === "high" ? v > bestV : v < bestV) { best = tt; bestV = v; }
        }
        legTime = best;
        return true;
      },
      go: () => { if (state === "briefing") { beginTakeoff(dist); setState("playing"); } },
      // Jump to a distance along the leg, in the air at a safe height (use god(true) to ignore obstacles).
      warpTo: (d: number, atY?: number) => {
        dist = d; phase = "flight"; speed = ac.speed; y = atY ?? midY(); vy = 0; recover = null; invuln = 0; trail = [];
        if (state !== "playing") setState("playing");
        // Keep the gate in line with where we now are.
        while (gate && gate.x < dist - 10) { stopIndex++; gate = stopIndex < stopCount() ? newGate(stopIndex) : null; }
      },
      warpToGate: (ahead = 120) => { if (gate) dist = gate.x - ahead; },
      warpToStop: (i: number, ahead = 120) => api.warpTo(checkpointAt(leg, i) - ahead),
      // Pretend the plane got stop `i` right (so a diversion has somewhere to go back to).
      markGot: (i: number) => { for (let k = 0; k <= i; k++) got[k] = true; lastStop = i; },
      setComfort: (n: number) => { comfort = n; },
      // Set the tank (percent). Beep flags are cleared so the low-fuel warnings can be tried again.
      setFuel: (n: number) => { fuel = n; lowWarned = LOW_FUEL_BEEPS.map((limit) => n <= limit); },
      // Force stop number `i` (0 = the first stop) to be a "transit" or a "stopover".
      setStopKind: (i: number, kind: "transit" | "stopover") => { devKinds[i] = kind; },
      // Switch the plane's controls on without a real key press (for tests that fly by script).
      hold: (up: boolean) => { keys.up = up; },
      bump: () => turbulence("TURBULENCE!", "Test bump"),
      god: (on: boolean) => { god = on; },
      freeze: (on: boolean) => { frozen = on; },
      setPlaneY: (v: number) => { y = v; vy = 0; },
      terrainStart: (terrain: string) => { const s = course.segments.find((q) => q.terrain === terrain); return s ? Math.max(0, s.x0) : null; },
    };
    (window as any).__flyover = api;
    undo.push(() => { delete (window as any).__flyover; });
  }

  startLeg(firstLeg); // so the scenery shows behind the title card
  setState("ready");

  // startLoop (from kit.ts) runs the fixed timestep for us and gives back a function to stop it.
  const stopLoop = startLoop({
    playing: () => state === "playing" && !frozen,
    update,
    idle: (dt) => {
      if (state !== "paused") idle += dt * 18;
      if (state === "briefing" && performance.now() - stateSince > CARD_TIME * 1000) goOn();
    },
    draw: (t) => { draw(t); updateHud(); },
  });

  // Cleanup: stop the loop and remove every listener when leaving this screen.
  return () => {
    stopLoop();
    undo.forEach((f) => f());
  };
}
