import { h, formatTime } from "../ui/dom";
import { playNote } from "../music/audio";
import { AIRPORT_TABLE } from "../decks/airports-data";
import {
  AIRCRAFT, LEGS, WORLD_H, GATE_RETRY, LEG_RUNOUT, checkpointAt, gateSlots, hitboxOf, pictureOf,
  type Aircraft, type Leg, type ObstacleSpec, type Rect,
} from "./flyover-data";

// FLYOVER: the third arcade game, a side-scrolling flight. It uses the same LOOP as Planet
// Pong and The Labyrinth (read input, update, draw, many times a second). What is new:
//   1. SMOOTH MOVEMENT. The Labyrinth hero hopped from tile to tile. The plane glides: it has
//      a speed that builds up and dies away slowly (velocity and acceleration).
//   2. A SCROLLING WORLD. The plane never really moves sideways. The world slides past it.
//   3. HITBOXES. We test touching with a rectangle smaller than the picture.
//   4. OBSTACLES FROM A LIST. Storms, birds and mountains are listed in flyover-data.ts.
//   5. CHECKPOINTS. Gates to fly through, and a quiz hidden in them: which airport code is it?

// ---------- the world ----------
const W = 320; // the canvas is tiny, then the browser scales it up with crisp pixels
const H = WORLD_H; // 180
const PLANE_X = Math.round(W / 3); // the plane sits a third of the way across and stays there

const MAX_COMFORT = 3; // three stars
const SPEED_UP = 45; // how quickly the plane builds up forward speed (pixels per second, per second)
const WOBBLE_TIME = 1.0; // how long the plane wobbles after turbulence
const RECOVER_TIME = 0.8; // how long it takes to float back to a safe height
const INVULN_TIME = 2.2; // after a bump nothing else can bump you for a moment
const SLOW_TIME = 0.9; // turbulence slows the plane down for a moment
const CARD_TIME = 4; // the "leg intro" card moves on by itself after this many seconds
const STORE_KEY = "learning-arcade:flyover";

// FIXED TIMESTEP, exactly like the other games: the game moves in equal 1/120 second slices,
// so it runs at the same speed on every screen.
const STEP = 1 / 120;

type State = "ready" | "briefing" | "playing" | "paused" | "legdone" | "diverted" | "won";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smooth = (t: number) => t * t * (3 - 2 * t); // eases from 0 to 1 gently at both ends
const mod = (a: number, n: number) => ((a % n) + n) % n;
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---------- airports ----------
// The airport list from the Airports quiz: code | city | name | country | ...
const AIRPORTS = new Map<string, { city: string; country: string }>();
for (const line of AIRPORT_TABLE.trim().split("\n")) {
  const [code, city, , country] = line.split("|");
  AIRPORTS.set(code, { city, country });
}
const cityOf = (code: string) => AIRPORTS.get(code)?.city ?? code;
const countryOf = (code: string) => AIRPORTS.get(code)?.country ?? "";

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

/** A small repeatable "random" number for a spot, so the land looks uneven but never flickers. */
function noise(x: number, y: number, seed: number) {
  let n = (x * 374761393 + y * 668265263 + seed * 144665) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

// ---------- pixel art, drawn from letters ----------
// Every picture is a little grid of letters. Each letter is a colour from a palette, and
// "." means "see-through". We stamp them onto a hidden canvas once, then copy them to the screen.
function paint(rows: string[], palette: Record<string, string>) {
  const width = Math.max(...rows.map((r) => r.length));
  const c = document.createElement("canvas");
  c.width = width;
  c.height = rows.length;
  const g = c.getContext("2d")!;
  rows.forEach((row, y) => {
    [...row].forEach((letter, x) => {
      const colour = palette[letter];
      if (!colour) return;
      g.fillStyle = colour;
      g.fillRect(x, y, 1, 1);
    });
  });
  return c;
}

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
  "..tt..........................................",
  "..ttt.........................................",
  "..tttt..................ooooooooo.............",
  "..ttttt..............ooowwwwwwwwwooooo........",
  "...ttttto..........oowwwwwwwwwwwwwwwwwoo......",
  "...ttttttooooooooooowwwggggggggwwwwwwwwwoo....",
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
// Short blips made with the same playNote as the other games. Higher number = higher note.
const SOUNDS = {
  stop: [[79, 0.08, 0], [86, 0.16, 0.08]],
  bump: [[50, 0.12, 0], [44, 0.12, 0.09], [40, 0.2, 0.18]],
  miss: [[60, 0.1, 0], [57, 0.14, 0.1]],
  clear: [[72, 0.12, 0], [76, 0.12, 0.1], [79, 0.12, 0.2], [84, 0.3, 0.3]],
  divert: [[55, 0.2, 0], [50, 0.2, 0.18], [46, 0.3, 0.36]],
  win: [[72, 0.12, 0], [76, 0.12, 0.1], [79, 0.12, 0.2], [84, 0.12, 0.3], [79, 0.1, 0.42], [84, 0.1, 0.52], [91, 0.35, 0.62]],
} satisfies Record<string, [number, number, number][]>;

// ---------- the scenery ----------
// One look for each leg: day, golden evening, then night.
interface Look {
  sky: string[]; // bands of sky, top to bottom
  farMountains: string; farSnow: string; sea: string;
  hills: [string, string]; land: [string, string, string]; ocean: [string, string]; sand: string;
  cloud: [string, string]; ridge: [string, string]; ridgeSnow: string;
  night: boolean;
}
const LOOKS: Look[] = [
  {
    sky: ["#4a93de", "#5ba2e6", "#6eb0ec", "#82bdf0", "#98cbf3", "#b0d9f6", "#c8e5f8", "#ddf0fa"],
    farMountains: "#8ca6cc", farSnow: "#eef4fb", sea: "#79c0ea", hills: ["#6fae6a", "#8fc784"],
    land: ["#5e9c4e", "#4c8741", "#6bad58"], ocean: ["#3f86c9", "#5a9edb"], sand: "#e6d49a",
    cloud: ["#ffffff", "#d6e3f1"], ridge: ["#9a9084", "#6e665b"], ridgeSnow: "#ffffff", night: false,
  },
  {
    sky: ["#3a5fa8", "#5276bd", "#7a8fc9", "#a69fc9", "#d4aabb", "#f0b7a0", "#f8cf9a", "#fde4b0"],
    farMountains: "#8d7fa8", farSnow: "#ffe9d6", sea: "#d99a8a", hills: ["#7a8f5a", "#a2b070"],
    land: ["#7f9448", "#6a7d3c", "#91a755"], ocean: ["#4a6fb5", "#6a8ed0"], sand: "#f0d6a0",
    cloud: ["#ffe9dd", "#e7c4c4"], ridge: ["#a07f70", "#75594f"], ridgeSnow: "#fff0e0", night: false,
  },
  {
    sky: ["#070b24", "#0c1236", "#131b4a", "#1c2660", "#283278", "#37408c", "#4a519d", "#5f64ad"],
    farMountains: "#2a3468", farSnow: "#6f7ab5", sea: "#1f3e7a", hills: ["#1f3a4a", "#2c4d5c"],
    land: ["#2a4a43", "#203b36", "#33574d"], ocean: ["#14306a", "#22458a"], sand: "#7a7a8a",
    cloud: ["#7f88c8", "#586099"], ridge: ["#5a6290", "#3a4170"], ridgeSnow: "#b8c0f0", night: true,
  },
];

/** A zig-zag wave from 0 to 1 and back. Adding a few of different sizes makes jagged peaks. */
const zig = (v: number) => Math.abs(mod(v, 2) - 1);
const ridge = (wx: number) => 0.55 * zig(wx / 70) + 0.3 * zig(wx / 27 + 0.4) + 0.15 * zig(wx / 11 + 0.9);

// ---------- the game ----------
interface Obstacle { spec: ObstacleSpec; hit: Rect; pic: Rect }
interface GateGroup { x: number; codes: string[]; correct: number; off: boolean[]; stop: number; attempt: number }
interface Banner { title: string; sub: string; colour: string; t: number }

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
  const hudComfort = h("span", { class: "fly-stat fly-comfort" });
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
          "Hold ↑ / W to climb and let go to sink (or hold your finger on the game, or use the buttons). Fly through the gate with the right airport code, and go round the storms, birds and mountains. P or Esc pauses.",
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
  // For testing a leg directly. Only works in the development copy (npm run dev).
  const devLeg = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get("leg")) : 0;
  const firstLeg = devLeg >= 1 && devLeg <= LEGS.length ? devLeg - 1 : 0;

  let state: State = "ready";
  let stateSince = performance.now();
  let soundOn = false; // browsers only allow sound after the player has pressed something
  let legIndex = firstLeg;
  let leg: Leg = LEGS[legIndex];
  let ac: Aircraft = AIRCRAFT[leg.aircraft];
  let obstacles: Obstacle[] = [];
  let best = loadBest();
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
  let stopIndex = 0; // which checkpoint is next (0 to 7)
  let reached = 0; // how many we really landed at
  let gate: GateGroup | null = null;
  let legEnd = Infinity; // set once the last checkpoint is behind us

  let wobble = 0; // timers that count down to 0
  let invuln = 0;
  let slow = 0;
  let flash = 0;
  let recover: { t: number; from: number; to: number } | null = null;
  let banner: Banner | null = null;
  let idle = 0; // lets the scenery drift along on the title and card screens
  let trailTimer = 0;
  let trail: { x: number; y: number; life: number }[] = [];

  const keys = { up: false, down: false };
  const pad = { up: false, down: false };
  let pointerY: number | null = null; // where a finger or the mouse button is held, in game pixels

  const beep = (name: keyof typeof SOUNDS) => {
    if (soundOn) for (const [note, length, delay] of SOUNDS[name]) playNote(note, length, delay);
  };
  function setState(next: State) {
    state = next;
    stateSince = performance.now();
    pauseBtn.textContent = next === "paused" ? "Resume" : "Pause";
  }
  const say = (title: string, sub: string, colour: string, t = 2.2) => { banner = { title, sub, colour, t }; };

  // ---------- starting a game, a leg, a gate ----------
  function newGame() {
    totalTime = 0;
    legStars = [];
    divertCount = 0;
    bumpCount = 0;
    newBest = false;
    startLeg(firstLeg, true);
  }

  /** Set up a leg. `fresh` is false when we are trying the same leg again after a diversion. */
  function startLeg(n: number, fresh: boolean) {
    legIndex = n;
    leg = LEGS[n];
    ac = AIRCRAFT[leg.aircraft];
    // OBSTACLES FROM A LIST: the owner's list in flyover-data.ts becomes real objects here,
    // each with its picture box and a smaller hitbox worked out once.
    obstacles = leg.obstacles.map((spec) => ({ spec, hit: hitboxOf(spec), pic: pictureOf(spec) }));
    dist = 0;
    speed = 0; // we start on the runway and build up speed
    y = Math.round((ac.ceiling + ac.floor) / 2);
    vy = 0;
    comfort = MAX_COMFORT;
    stopIndex = 0;
    reached = 0;
    legEnd = Infinity;
    wobble = invuln = slow = flash = 0;
    recover = null;
    banner = null;
    trail = [];
    if (fresh) legTime = 0;
    gate = newGate(0);
    setState("briefing");
  }

  /** Make the three gates for a checkpoint: one right code, two wrong ones from the same leg. */
  function newGate(stop: number): GateGroup {
    const right = leg.stops[stop];
    const wrong = leg.stops.filter((c) => c !== right);
    // Shuffle the wrong codes and take two of them.
    for (let i = wrong.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wrong[i], wrong[j]] = [wrong[j], wrong[i]];
    }
    const correct = Math.floor(Math.random() * 3); // which of the three heights is right is random
    const codes = [wrong[0], wrong[1], wrong[2]];
    codes.splice(correct, 0, right);
    codes.length = 3;
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
    const near = obstacles.filter((o) => o.hit.x < dist + lookAhead && o.hit.x + o.hit.w > x0).map((o) => o.hit);
    const free = (cy: number) => near.every((r) => cy + ac.hitH / 2 + 4 <= r.y || cy - ac.hitH / 2 - 4 >= r.y + r.h);
    for (let d = 0; d <= ac.floor - ac.ceiling; d += 2) {
      for (const cy of [from - d, from + d]) {
        if (cy >= ac.ceiling && cy <= ac.floor && free(cy)) return cy;
      }
    }
    return from;
  }

  function turbulence(title: string, sub: string) {
    comfort--;
    bumpCount++;
    wobble = WOBBLE_TIME;
    slow = SLOW_TIME;
    invuln = INVULN_TIME;
    flash = 0.18;
    beep("bump");
    if (comfort <= 0) {
      divertCount++;
      beep("divert");
      banner = null;
      setState("diverted");
      return;
    }
    say(title, sub, "#ffd34e");
    // No crash: the plane just floats back up (or down) to a safe height.
    recover = { t: 0, from: y, to: safeYFrom(y) };
  }

  // ---------- checkpoints ----------
  function nextStop() {
    stopIndex++;
    if (stopIndex >= leg.stops.length) {
      gate = null;
      legEnd = dist + LEG_RUNOUT;
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
    const right = leg.stops[g.stop];

    if (through === g.correct) {
      reached++;
      beep("stop");
      say(`LANDED AT ${right}!`, `${cityOf(right)}, ${countryOf(right)}`, "#5fe08a", 2.4);
      nextStop();
      return;
    }
    if (through >= 0 && !g.off[through]) {
      // A wrong gate counts as turbulence.
      g.off[through] = true;
      turbulence("TURBULENCE!", `That was ${g.codes[through]}, not ${right}`);
      if (state === "diverted") return;
    } else {
      beep("miss");
    }
    if (g.attempt === 0) {
      // Room to try again: the same gates come round once more, a little further on.
      g.attempt = 1;
      g.x += GATE_RETRY;
      if (through < 0) say("GO AROUND!", `Find ${right} (${cityOf(right)})`, "#7fd0ff");
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
      vy += accel * dt; // acceleration changes the velocity...
      vy -= vy * ac.drag * dt; // ...drag bleeds a little off it...
      vy = clamp(vy, -ac.maxUp, ac.maxDown);
      y += vy * dt; // ...and the velocity changes the position.
      if (y < ac.ceiling) { y = ac.ceiling; vy = Math.max(vy, 0); }
      if (y > ac.floor) { y = ac.floor; vy = Math.min(vy, 0); }
    }

    // A thin white trail behind the plane. Each puff is fixed in the WORLD, so as the world
    // scrolls it streams away to the left, which shows how fast we are going.
    trailTimer -= dt;
    if (trailTimer <= 0) { trailTimer = 0.04; trail.push({ x: dist - sprites[leg.aircraft].width / 2 + 2, y, life: 1.3 }); }
    for (const p of trail) p.life -= dt;
    trail = trail.filter((p) => p.life > 0);

    // HITBOXES. The plane's hitbox is a rectangle smaller than its picture, and so is every
    // obstacle's. Touching is just a maths question: do the two rectangles overlap?
    if (invuln <= 0 && !recover) {
      const me: Rect = { x: dist - ac.hitW / 2, y: y - ac.hitH / 2, w: ac.hitW, h: ac.hitH };
      for (const o of obstacles) {
        if (o.hit.x > dist + 60) break; // the list is sorted, so nothing further on can be close yet
        if (!overlaps(me, o.hit)) continue;
        const what = o.spec.type === "storm" ? "A storm cloud" : o.spec.type === "birds" ? "A flock of birds" : "A mountain";
        turbulence("TURBULENCE!", `${what}! Hold on tight`);
        break;
      }
    }
    if (state !== "playing") return;

    // CHECKPOINTS: when the plane reaches the column of gates, work out which ring it went through.
    if (gate && dist >= gate.x) passGate(gate);
    if (state !== "playing") return;

    // The leg is over a short way after the last checkpoint.
    if (!gate && dist >= legEnd) finishLeg();
  }

  function finishLeg() {
    legStars.push(comfort);
    if (legIndex === LEGS.length - 1) {
      if (best === null || totalTime < best) { best = totalTime; newBest = true; saveBest(totalTime); }
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
    else if (state === "briefing" && waited > 300) setState("playing");
    else if (state === "paused") setPaused(false);
    else if (state === "legdone" && waited > 400) startLeg(legIndex + 1, true);
    else if (state === "diverted" && waited > 700) startLeg(legIndex, false);
    else if (state === "won" && waited > 700) newGame();
  }

  // ---------- the game loop ----------
  let raf = 0;
  let last = performance.now();
  let acc = 0; // time we owe the game, in seconds
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    // How long since the last frame ("delta time"), capped so a busy tab can't make us catch up on ages.
    const dt = clamp((now - last) / 1000, 0, 0.25);
    last = now;
    if (state === "playing") {
      acc += dt;
      while (state === "playing" && acc >= STEP) { update(STEP); acc -= STEP; }
    } else {
      acc = 0;
      if (state !== "paused") idle += dt * 18;
      if (state === "briefing" && performance.now() - stateSince > CARD_TIME * 1000) goOn();
    }
    draw(now / 1000);
    updateHud();
  }

  // ---------- the HUD (the strip above the game) ----------
  let hudSignature = "";
  function updateHud() {
    // Only touch the page when something actually changed.
    const sig = [legIndex, comfort, reached, stopIndex, gate?.attempt ?? -1, Math.floor(totalTime), state === "ready"].join("|");
    if (sig === hudSignature) return;
    hudSignature = sig;
    hudLeg.textContent = `Leg ${legIndex + 1}/${LEGS.length}: ${ac.name}`;
    if (state === "ready") hudNext.textContent = "Ready for take-off";
    else if (gate) hudNext.textContent = `Next stop: ${cityOf(leg.stops[stopIndex])}${gate.attempt ? " (go around)" : ""}`;
    else hudNext.textContent = "Coming in to land";
    hudComfort.textContent = "Comfort " + "★".repeat(comfort) + "☆".repeat(MAX_COMFORT - comfort);
    hudComfort.setAttribute("aria-label", `Comfort: ${comfort} of ${MAX_COMFORT} stars`);
    hudStops.textContent = `Stops ${reached}/${leg.stops.length}`;
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
  function drawScenery(t: number, look: Look) {
    const view = dist + idle; // how far the world has slid

    look.sky.forEach((c, i) => px(0, i * 20, W, 20, c));
    if (look.night) {
      for (let i = 0; i < 46; i++) {
        const sx = mod(noise(i, 1, 9) % W - view * 0.02, W);
        const sy = noise(i, 2, 9) % 110;
        px(sx, sy, 1, 1, Math.sin(t * 2 + i) > 0.6 ? "#7f88c8" : "#e8ecff");
      }
      px(250, 30, 12, 12, "#f4f1d8"); px(254, 30, 8, 12, "#f4f1d8"); // a pixel moon...
      px(252, 28, 8, 16, "#f4f1d8"); px(258, 33, 3, 3, "#d8d4b4"); // ...with a crater
    } else {
      const sun = look === LOOKS[0] ? "#fff4b0" : "#ffb35a";
      const sy = look === LOOKS[0] ? 34 : 108;
      px(252, sy - 8, 16, 16, sun); px(250, sy - 5, 20, 10, sun); px(255, sy - 10, 10, 20, sun);
    }

    // Layer 1, the furthest: tall pointy mountains that barely move (0.06 of our distance).
    for (let x = 0; x < W; x++) {
      const hgt = Math.round(14 + 42 * ridge(x + view * 0.06));
      px(x, 152 - hgt, 1, hgt, look.farMountains);
      if (hgt > 42) px(x, 152 - hgt, 1, 3, look.farSnow);
    }
    // Layer 2: the sea at the foot of the mountains, with a few glints.
    px(0, 150, W, 14, look.sea);
    for (let x = 0; x < W; x++) {
      const wx = Math.floor(x + view * 0.12);
      if (noise(wx >> 1, 3, 4) % 14 === 0) px(x, 153 + (noise(wx, 5, 1) % 8), 2, 1, look.farSnow);
    }
    // Layer 3: rolling hills (0.2). A lighter pixel on top gives each one an edge.
    for (let x = 0; x < W; x++) {
      const wx = x + view * 0.2;
      const hgt = Math.round(7 + 9 * (Math.sin(wx / 37) + 1) + 4 * (Math.sin(wx / 15 + 2) + 1));
      px(x, 166 - hgt, 1, hgt, look.hills[0]);
      px(x, 166 - hgt, 1, 1, look.hills[1]);
    }
    // Layer 4, the nearest ground (0.5): fields, a sandy COASTLINE and open ocean in turn.
    const isOcean = (wx: number) => noise(Math.floor(wx / 420), 8, legIndex) % 3 === 0;
    for (let x = 0; x < W; x++) {
      const wx = Math.floor(x + view * 0.5);
      if (isOcean(wx)) {
        const coast = !isOcean(wx - 5) || !isOcean(wx + 5);
        px(x, 166, 1, 14, look.ocean[0]);
        px(x, 166, 1, 2, look.ocean[1]);
        if (coast) px(x, 166, 1, 1, "#e8f6ff"); // foam where the waves meet the beach
        else if (noise(wx >> 1, 7, 2) % 9 === 0) px(x, 170 + (noise(wx, 3, 6) % 9), 2, 1, look.ocean[1]);
      } else {
        const coast = isOcean(wx - 6) || isOcean(wx + 6);
        px(x, 166, 1, 14, look.land[1]);
        px(x, 168, 1, 6, look.land[noise(wx >> 4, 1, legIndex) % 3]); // field stripes, each one its own green
        px(x, 174, 1, 6, look.land[noise(wx >> 4, 2, legIndex) % 3]);
        if (coast) px(x, 166, 1, 5, look.sand);
      }
    }
    // Clouds: two layers, a far small one and a near big one, drifting at their own speeds.
    for (const [par, size, count, period] of [[0.3, 1, 5, 600], [0.65, 1.5, 4, 760]] as const) {
      for (let i = 0; i < count; i++) {
        const cx = mod((i * period) / count + (noise(i, par * 10, 3) % 60) - view * par, period) - 60;
        const cy = 10 + (noise(i, par * 10, 5) % 70);
        drawCloud(cx, cy, size, look.cloud[0], look.cloud[1]);
      }
    }
  }

  function drawCloud(x: number, yy: number, s: number, c: string, shade: string) {
    px(x + 4 * s, yy + 4 * s, 22 * s, 5 * s, c);
    px(x + 9 * s, yy, 10 * s, 6 * s, c);
    px(x, yy + 7 * s, 30 * s, 3 * s, c);
    px(x + 2 * s, yy + 10 * s, 26 * s, 1 * s, shade);
  }

  // --- the obstacles ---
  function drawMountain(o: Obstacle, look: Look) {
    const { pic } = o;
    const sx = Math.round(screenX(o.spec.at));
    const hgt = o.spec.y;
    const top = H - hgt;
    for (let r = 0; r < hgt; r++) {
      // Each row is wider than the one above. A little noise makes the edges uneven.
      const half = (pic.w / 2) * ((r + 1) / hgt) + ((noise(r, o.spec.at, 1) % 3) - 1);
      const w = Math.max(1, Math.round(half));
      const snow = hgt > 45 && r < hgt * 0.22 + (noise(r >> 1, o.spec.at, 4) % 3);
      px(sx - w, top + r, w, 1, snow ? look.ridgeSnow : look.ridge[0]); // lit side, on the left
      px(sx, top + r, w, 1, snow ? look.farSnow : look.ridge[1]); // shaded side, on the right
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

  function drawBirds(o: Obstacle, t: number) {
    // Five small V shapes. They flap, each a little out of step with the others.
    const cx = screenX(o.spec.at);
    const flock = [[-12, 0], [-4, -6], [4, 1], [12, -5], [0, 6]];
    flock.forEach(([dx, dy], i) => {
      const up = Math.floor(t * 6 + i * 1.3) % 2 === 0;
      const bx = Math.round(cx + dx - 2 + Math.sin(t * 2 + i) * 1);
      const by = Math.round(o.spec.y + dy - 1);
      const dark = "#2b2f3a";
      if (up) { px(bx, by, 1, 1, dark); px(bx + 4, by, 1, 1, dark); px(bx + 1, by + 1, 1, 1, dark); px(bx + 3, by + 1, 1, 1, dark); px(bx + 2, by + 2, 1, 1, dark); }
      else { px(bx + 2, by, 1, 1, dark); px(bx + 1, by + 1, 1, 1, dark); px(bx + 3, by + 1, 1, 1, dark); px(bx, by + 2, 1, 1, dark); px(bx + 4, by + 2, 1, 1, dark); }
    });
  }

  // --- the gates ---
  // A ring is drawn in two halves: the back half BEFORE the plane and the front half AFTER,
  // so the plane really seems to fly through the middle.
  function drawGate(g: GateGroup, front: boolean, t: number) {
    const sx = Math.round(screenX(g.x));
    if (sx < -60 || sx > W + 20) return;
    const { ys, half } = gateSlots(ac);
    ys.forEach((sy, i) => {
      const off = g.off[i];
      const lit = mod(t * 2, 1) < 0.5;
      const rim = off ? "#6c7484" : "#ffd34e";
      const rimDark = off ? "#4a5160" : "#e08a1e";
      for (let a = 0; a < 64; a++) {
        const ang = (a / 64) * Math.PI * 2;
        const isFront = Math.cos(ang) < 0; // the half that points at us (to the left, as we fly in)
        if (isFront !== front) continue;
        const gx = Math.round(sx + Math.cos(ang) * 4);
        const gy = Math.round(sy + Math.sin(ang) * half);
        px(gx, gy, 2, 2, Math.sin(ang) > 0 ? rimDark : rim);
      }
      if (front) {
        // The label: big and plain, on a dark sign, to the right of the ring.
        const label = g.codes[i];
        const bw = 46, bh = 17;
        const bx = sx + 8, by = sy - bh / 2;
        px(bx, by, bw, bh, off ? "#2a2f3a" : "#10162b");
        px(bx, by, bw, 1, rim); px(bx, by + bh - 1, bw, 1, rim);
        px(bx, by, 1, bh, rim); px(bx + bw - 1, by, 1, bh, rim);
        text(label, bx + bw / 2, sy, 16, off ? "#8b93a3" : lit ? "#ffffff" : "#ffeea0");
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
    for (let i = 0; i < w; i++) {
      ctx.drawImage(sprite, i, 0, 1, hh, x0 + i, Math.round(y0 + tilt * (i - w / 2)), 1, hh);
    }
    if (leg.aircraft === "cessna") px(x0 + w, Math.round(y0 + 2 + (Math.floor(t * 30) % 2)), 1, 5, "rgba(255,255,255,0.7)"); // spinning propeller
  }

  function panel(lines: { t: string; size: number; colour: string }[], width = 250) {
    const hgt = lines.length * 14 + 14;
    const x0 = Math.round((W - width) / 2);
    const y0 = Math.round(H / 2 - hgt / 2);
    px(x0, y0, width, hgt, "#0a1230");
    px(x0, y0, width, 1, "#8e9ac8");
    px(x0, y0 + hgt - 1, width, 1, "#8e9ac8");
    px(x0, y0, 1, hgt, "#8e9ac8");
    px(x0 + width - 1, y0, 1, hgt, "#8e9ac8");
    lines.forEach((l, i) => text(l.t, W / 2, y0 + 14 + i * 14 - 1, l.size, l.colour));
  }

  const stars = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, MAX_COMFORT - n));

  function draw(t: number) {
    // Each frame we repaint everything from scratch, back to front.
    const look = LOOKS[legIndex];
    ctx.save();
    // The screen shakes a little during turbulence.
    if (wobble > 0 && state === "playing") ctx.translate(Math.round(Math.sin(t * 90) * 1.5 * (wobble / WOBBLE_TIME)), Math.round(Math.cos(t * 70) * 1.5 * (wobble / WOBBLE_TIME)));
    drawScenery(t, look);

    // Anything in the world is drawn at screenX(its world position). Skip what is off the screen.
    const onScreen = (r: Rect) => screenX(r.x + r.w) > -8 && screenX(r.x) < W + 8;
    for (const o of obstacles) if (o.spec.type === "mountain" && onScreen(o.pic)) drawMountain(o, look);
    if (gate) drawGate(gate, false, t);
    for (const p of trail) px(screenX(p.x), p.y + 1, 2, 1, `rgba(255,255,255,${(p.life / 1.3 * 0.7).toFixed(2)})`);
    for (const o of obstacles) {
      if (!onScreen(o.pic)) continue;
      if (o.spec.type === "storm") drawStorm(o, t);
      else if (o.spec.type === "birds") drawBirds(o, t);
    }
    const blink = invuln > 0 && Math.floor(t * 14) % 2 === 0;
    if (state !== "ready" && !blink) drawPlane(t);
    else if (state === "ready") drawPlane(t);
    if (gate) drawGate(gate, true, t);
    ctx.restore();

    if (flash > 0) px(0, 0, W, H, "rgba(255,255,255,0.22)");

    // Messages on top.
    if (banner && state === "playing") {
      px(0, 2, W, 21, "rgba(10,18,48,0.6)");
      text(banner.title, W / 2, 8, 8, banner.colour);
      text(banner.sub, W / 2, 17, 8, "#e8ecff");
    }

    const total = legStars.reduce((a, b) => a + b, 0);
    const startName = (c: string) => `${cityOf(c)} (${c})`;
    if (state === "ready") {
      panel([
        { t: "FLYOVER", size: 16, colour: "#ffd34e" },
        { t: "Press Space or tap to take off", size: 8, colour: "#e8ecff" },
        { t: "Cessna, jet, jumbo: 24 airports", size: 8, colour: "#8e9ac8" },
      ]);
    } else if (state === "briefing") {
      const last = leg.stops[leg.stops.length - 1];
      panel([
        { t: `LEG ${legIndex + 1} OF ${LEGS.length}`, size: 8, colour: "#8e9ac8" },
        { t: ac.nick.toUpperCase(), size: 16, colour: "#ffd34e" },
        { t: `${leg.from} to ${last}`, size: 8, colour: "#e8ecff" },
        { t: `${startName(leg.from)} to ${startName(last)}`, size: 8, colour: "#8e9ac8" },
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
        { t: `Time ${formatTime(legTime)}     Stops ${reached} of ${leg.stops.length}`, size: 8, colour: "#e8ecff" },
        { t: `Comfort ${stars(comfort)}`, size: 8, colour: "#ffd34e" },
        { t: "Space or tap for the next leg", size: 8, colour: "#e8ecff" },
      ], 280);
    } else if (state === "diverted") {
      panel([
        { t: "DIVERTING BACK", size: 16, colour: "#7fd0ff" },
        { t: `Too bumpy! Back to ${leg.from} for another go.`, size: 8, colour: "#e8ecff" },
        { t: "Nothing broken, just a bit of time lost.", size: 8, colour: "#8e9ac8" },
        { t: "Space or tap to try again", size: 8, colour: "#e8ecff" },
      ], 296);
    } else if (state === "won") {
      panel([
        { t: "ALL LEGS FLOWN!", size: 16, colour: "#5fe08a" },
        { t: `Total time ${formatTime(totalTime)}     Comfort ${total} of ${LEGS.length * MAX_COMFORT}`, size: 8, colour: "#e8ecff" },
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
    (window as any).__flyover = {
      info: () => ({
        state, leg: legIndex + 1, aircraft: leg.aircraft, dist, speed, y, vy, comfort, reached, stopIndex,
        divertCount, bumpCount, totalTime,
        gate: gate && { dx: gate.x - dist, ys: gateSlots(ac).ys, correct: gate.correct, codes: gate.codes, attempt: gate.attempt, right: leg.stops[gate.stop] },
        safeY: safeYFrom(y, 150),
        hazards: obstacles.filter((o) => o.hit.x + o.hit.w > dist).slice(0, 3).map((o) => ({ dx: o.spec.at - dist, type: o.spec.type, midY: o.hit.y + o.hit.h / 2 })),
      }),
      warpToGate: (ahead = 120) => { if (gate) dist = gate.x - ahead; },
      warpTo: (d: number) => { dist = d; },
    };
    undo.push(() => { delete (window as any).__flyover; });
  }

  startLeg(firstLeg, true); // so the scenery shows behind the title card
  setState("ready");
  raf = requestAnimationFrame(frame);

  // Cleanup: stop the loop and remove every listener when leaving this screen.
  return () => {
    cancelAnimationFrame(raf);
    undo.forEach((f) => f());
  };
}
