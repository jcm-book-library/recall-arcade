import { h } from "../ui/dom";
import { playNote } from "../music/audio";
import { currentTrack } from "../engine/progress";

// PLANET PONG: the first arcade game. Every video game is built on the same idea:
// a LOOP that runs again and again, many times a second. Each time round it
// (1) reads the player's input, (2) moves everything a tiny bit (the "update"),
// and (3) draws the picture (the "draw"). Run fast enough and it looks like motion.

// ---------- the world ----------
// The game is drawn on a tiny 320x180 canvas, then the browser scales it up with
// crisp square pixels. All the numbers below are in these little "game pixels".
const W = 320;
const H = 180;
const WALL = 3; // thickness of the top and bottom walls
const PW = 4; // paddle width
const PH = 28; // paddle height
const PADDLE_GAP = 8; // space between a paddle and the screen edge
const EDGE_FRACTION = 0.21; // how much of each paddle end is the shaded "steep angle" zone
const STORE_KEY = "learning-arcade:pong";

// Speeds are "pixels per second". Multiplying by a time step gives distance moved.
const PLAYER_KEY_SPEED = 150;
const PLAYER_POINTER_SPEED = 600; // how fast the paddle chases your mouse or finger
const CPU_SPEED = 80; // slower than the ball can go, so the computer can be beaten
const BALL_START_SPEED = 120;
const BALL_SPEEDUP = 7; // extra speed after every paddle hit...
const BALL_MAX_SPEED = 230; // ...but never faster than this
const MAX_BOUNCE_ANGLE = (55 * Math.PI) / 180; // steepest return angle (at a paddle's edge)
const SERVE_DELAY = 1; // seconds the new planet waits before it launches
const HAUMEA_SPEED = 1.6; // Haumea flies this many times faster than a normal planet
const ERIS_PADDLE = 0.7; // while Eris is in play the computer's paddle is this fraction of normal
const COMET_R = 2; // Halley's Comet is small
const COMET_SPEED = 150;
const COMET_WARNING = 1; // seconds of warning before the comet streaks in

// ---------- the three levels ----------
// Easy is always open. Intermediate and Hard are "earned" by your learning track,
// but you can PLAY any of them whenever you like. Ones you haven't earned are
// labelled "preview" so you know they are a sneak peek.
type Tier = "easy" | "intermediate" | "hard";
const TIER_LIST: Tier[] = ["easy", "intermediate", "hard"];
const TIERS: Record<Tier, { name: string; winScore: number; comet: boolean; color: string }> = {
  easy: { name: "Easy", winScore: 5, comet: false, color: "#5fe08a" },
  intermediate: { name: "Intermediate", winScore: 7, comet: true, color: "#ffb52b" },
  hard: { name: "Hard", winScore: 10, comet: true, color: "#ff6b5f" },
};

// FIXED TIMESTEP: screens refresh at different speeds (60, 120, 144 times a second).
// If we moved things once per screen refresh, the game would run faster on a fast
// screen. So instead we chop time into equal 1/120 second slices and run the update
// once per slice, however many it takes to catch up. Same speed on every screen.
const STEP = 1 / 120;

// ---------- the planets (one per serve, in order from the Sun) ----------
interface Planet {
  name: string;
  r: number; // radius in game pixels
  shades: [string, string, string]; // light, middle, dark: gives a round, lit look
  bands?: [string, string, string]; // stripes (Jupiter)
  spots?: { at: [number, number][]; shades: [string, string, string] }; // land patches (Earth)
  ring?: [string, string]; // Saturn's ring: light, dark
  power?: "ceres" | "haumea" | "pluto" | "eris" | "makemake"; // dwarf planets only (Hard level)
  blurb?: string; // what the power is, shown in the banner
}

const PLANETS: Planet[] = [
  { name: "Mercury", r: 2.5, shades: ["#c9c4bc", "#9a948c", "#6a655f"] },
  { name: "Venus", r: 4, shades: ["#f6dc9a", "#e0b45c", "#a97b34"] },
  {
    name: "Earth", r: 4, shades: ["#7fc4ff", "#2f7fe0", "#1c4aa0"],
    spots: { at: [[-1, -2], [0, -2], [-2, 0], [-1, 0], [2, 1], [1, 2]], shades: ["#8fe070", "#3fb04a", "#287a34"] },
  },
  { name: "Mars", r: 3, shades: ["#ff9a70", "#d6552e", "#8f3318"] },
  { name: "Jupiter", r: 8, shades: ["#f3d9b0", "#d9a273", "#a2693f"], bands: ["#c2825a", "#a8603a", "#7a3f24"] },
  { name: "Saturn", r: 6, shades: ["#f5e3a8", "#d9c078", "#a08a48"], ring: ["#efe0b0", "#a8945a"] },
  { name: "Uranus", r: 5, shades: ["#c4f4f6", "#7fdbe0", "#46a3ad"] },
  { name: "Neptune", r: 5, shades: ["#8fb0ff", "#3f5fe0", "#26389c"] },
];

// Dwarf planets (Hard level only). They are drawn bigger than true scale so you can
// see their look. Each has ONE power, and the banner tells you what it is.
const DWARFS: Planet[] = [
  {
    name: "Ceres", r: 4, shades: ["#b9aea0", "#8a7f73", "#5a5048"], power: "ceres", blurb: "smashes asteroids",
    spots: { at: [[1, -1], [2, -1]], shades: ["#ffffff", "#e8ecff", "#b8c0d8"] }, // bright salt patches
  },
  {
    name: "Pluto", r: 4, shades: ["#e8c9a0", "#c08f62", "#7e5638"], power: "pluto", blurb: "worth 2 points\nstill a planet to us",
    // a pale heart-shaped patch, just like the real Pluto has
    spots: { at: [[-2, -1], [-1, -1], [1, -1], [2, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]], shades: ["#fff0e8", "#f2cfc0", "#c89a8c"] },
  },
  {
    name: "Haumea", r: 4, shades: ["#f4f4f8", "#c9ccd8", "#8a8ea4"], power: "haumea", blurb: "moves extra fast",
    spots: { at: [[1, 0], [2, 0]], shades: ["#d6552e", "#a8381c", "#6a2210"] }, ring: ["#d8dcec", "#7c82a0"],
  },
  {
    name: "Eris", r: 4.5, shades: ["#ffffff", "#dfe6f0", "#9aa6bc"], power: "eris", blurb: "shrinks the computer paddle",
    spots: { at: [[1, 1], [0, 2], [1, 2]], shades: ["#9aa6bc", "#7c88a0", "#566078"] },
  },
  {
    name: "Makemake", r: 4.5, shades: ["#ffb38a", "#d9693a", "#8a3418"], power: "makemake", blurb: "curves in flight",
    bands: ["#e8946a", "#c4552a", "#7a2c14"],
  },
];

/** The order planets are served in, for each level. It cycles when it runs out. */
function serveOrder(t: Tier): Planet[] {
  if (t === "easy") return PLANETS.slice(0, 4); // Mercury, Venus, Earth, Mars
  if (t === "intermediate") return PLANETS;
  // Hard: a planet, then a dwarf planet, then a planet... so dwarfs turn up often.
  const order: Planet[] = [];
  PLANETS.forEach((p, i) => order.push(p, DWARFS[i % DWARFS.length]));
  return order;
}

// ---------- the rest of the cast ----------
const ROCK_SHADES = ["#b4b7bf", "#8a8d96", "#5d6069"];
const ROCK_X = [112, 146, 176, 206]; // where each asteroid drifts (up and down only)
const EASY_ROCK_X = [W / 2 - 11]; // Easy has just one big asteroid, right in the middle

interface Rock {
  x: number; y: number; w: number; h: number;
  vy: number; // velocity: speed AND direction (negative = up)
  hp: number; // hits left before it breaks
  maxHp: number; // hits it started with (so we know when to draw cracks)
  slot: number; // which column it lives in (the Hard level splits one rock into two in a column)
  small: boolean; // a small split-off piece: it breaks in one hit
  respawn: number; // seconds until it comes back (0 = here now)
  appear: number; // brief blink after coming back
  sprite: number[][]; // -1 = empty, otherwise a shade (0 light, 1 middle, 2 dark)
}
// Anything that flies about (the planet, the comet): where it is, where it's going, how fast.
interface Body { x: number; y: number; vx: number; vy: number; speed: number }
interface Bit { x: number; y: number; vx: number; vy: number; life: number }
type State = "ready" | "playing" | "paused" | "over";

// Tiny 3x5 pixel digits for the score, drawn by hand so they look the same everywhere.
const DIGITS = [
  "111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001",
  "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111",
];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---------- remembering the level you picked, saved in the browser ----------
function loadTier(): Tier | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
    return TIER_LIST.includes(saved?.tier) ? saved.tier : null;
  } catch {
    return null;
  }
}
function saveTier(tier: Tier) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ tier }));
  } catch {
    // Saving is a bonus. If the browser says no, the game carries on.
  }
}

/** Build a lumpy little rock as a grid of pixels. */
function makeRockSprite(w: number, h: number): number[][] {
  // The edge wobbles with a few random waves, which is what makes it lumpy.
  const waves = [0, 1, 2].map(() => ({ k: 2 + Math.floor(Math.random() * 3), p: rand(0, 6.28) }));
  const rows: number[][] = [];
  for (let j = 0; j < h; j++) {
    const row: number[] = [];
    for (let i = 0; i < w; i++) {
      const nx = (i + 0.5 - w / 2) / (w / 2);
      const ny = (j + 0.5 - h / 2) / (h / 2);
      const angle = Math.atan2(ny, nx);
      const edge = 0.82 + waves.reduce((s, v) => s + Math.sin(angle * v.k + v.p) * 0.07, 0);
      if (Math.hypot(nx, ny) > edge) { row.push(-1); continue; }
      const light = -(nx + ny); // light comes from the top left
      let shade = light > 0.45 ? 0 : light < -0.35 ? 2 : 1;
      if (Math.random() < 0.09) shade = 2; // craters
      row.push(shade);
    }
    rows.push(row);
  }
  return rows;
}

export function renderPong(root: HTMLElement): () => void {
  // ---------- page ----------
  const canvas = h("canvas", {
    class: "pong-canvas",
    width: String(W),
    height: String(H),
    role: "img",
    "aria-label": "Planet Pong: move your paddle on the left to knock the planets past the computer",
  });
  const pauseBtn = h("button", { class: "btn ghost", type: "button" }, "Pause");
  root.replaceChildren(
    h(
      "main",
      { class: "play pong" },
      h("div", { class: "play-top" }, h("a", { class: "back", href: "#" }, "◂ Arcade"), h("h1", { class: "play-title" }, "Planet Pong")),
      h("div", { class: "pong-screen" }, canvas),
      h(
        "div",
        { class: "pong-foot" },
        h("p", { class: "pong-howto muted" }, "W / S or ↑ / ↓ moves your paddle. On a phone or with a mouse, slide up and down over the game. First to 5, 7 or 10 wins (it depends on the level). Before a match, press 1 / 2 / 3 or ← / → to pick a level, or tap the level name. P or Esc pauses."),
        pauseBtn,
      ),
    ),
  );
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  // Make sure the pixel font is ready before we draw words with it.
  void document.fonts?.load("8px Silkscreen").catch(() => {});

  // ---------- game state ----------
  let state: State = "ready";
  let soundOn = false; // browsers only allow sound after the player has pressed something
  let playerScore = 0;
  let cpuScore = 0;
  let winner = "";
  let serveCount = 0; // which planet is next
  let planet = PLANETS[0];
  // Which levels you have earned. You can still PLAY the others (as a preview).
  const track = currentTrack();
  const earned: Record<Tier, boolean> = { easy: true, intermediate: track !== "easy", hard: track === "hard" };
  const bestEarned: Tier = earned.hard ? "hard" : earned.intermediate ? "intermediate" : "easy";
  let tier: Tier = loadTier() ?? bestEarned;
  let order = serveOrder(tier);
  let ballMul = 1; // 1 normally; Haumea makes it faster
  let curveClock = 0; // Makemake's curve is a slow wave; this is where we are on it
  // Halley's Comet. "off" = not this match. "armed" = this match has one, waiting for point 2.
  // "waiting" = a random time to go. "warning" = banner is up. "flying" = it is on screen. "done" = gone.
  let cometMode: "off" | "armed" | "waiting" | "warning" | "flying" | "done" = "off";
  let cometTimer = 0;
  let cometTop = true; // enters from the top edge (true) or the bottom edge (false)
  let cometEntryX = 0;
  let comet: (Body & { trail: { x: number; y: number }[] }) | null = null;
  // The box on the canvas that you tap to change level (set when the panel is drawn).
  let tierHit: { x0: number; x1: number; y0: number; y1: number } | null = null;
  let serveTimer = 0; // while above 0 the planet just sits in the middle
  let bannerTimer = 0;
  let bannerText = "";
  let cpuError = 0; // the computer aims a little off, a different amount each time

  // Position is where something IS. Velocity (vx, vy) is how far it moves each
  // second. Every update we nudge position by velocity * time.
  const ball: Body = { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: BALL_START_SPEED };
  // h is the paddle's height. The computer's gets shorter while Eris is in play.
  const player = { x: PADDLE_GAP, cy: H / 2, h: PH };
  const cpu = { x: W - PADDLE_GAP - PW, cy: H / 2, h: PH };
  let rocks: Rock[] = [];
  let bits: Bit[] = [];

  const keys = { up: false, down: false };
  let pointerY: number | null = null; // where the mouse or finger is, in game pixels

  // A few fixed stars for the background; some twinkle.
  const stars = Array.from({ length: 46 }, () => ({
    x: Math.floor(rand(0, W)), y: Math.floor(rand(0, H)),
    bright: Math.random() < 0.3, twinkle: Math.random() < 0.25, phase: rand(0, 6),
  }));

  const beep = (midi: number, length: number, when = 0) => {
    if (soundOn) playNote(midi, length, when);
  };

  // ---------- starting and serving ----------
  /** A fresh big asteroid in column `i`. Easy's is about twice the size and takes 3 hits. */
  function newRock(i: number): Rock {
    const easy = tier === "easy";
    const w = easy ? 21 + Math.floor(Math.random() * 3) : 11 + Math.floor(Math.random() * 3);
    const h2 = easy ? 17 + Math.floor(Math.random() * 3) : 9 + Math.floor(Math.random() * 3);
    const xs = easy ? EASY_ROCK_X : ROCK_X;
    const hp = easy ? 3 : 2;
    return {
      x: xs[i] + Math.floor(rand(-4, 5)), y: rand(WALL + 4, H - WALL - h2 - 4), w, h: h2,
      vy: (Math.random() < 0.5 ? -1 : 1) * rand(6, 14), hp, maxHp: hp, slot: i, small: false, respawn: 0, appear: 0,
      sprite: makeRockSprite(w, h2),
    };
  }

  /** A small split-off piece (Hard level). One hit and it is gone. */
  function smallRock(slot: number, x: number, y: number, vy: number): Rock {
    const w = 7, h2 = 6;
    return {
      x, y: clamp(y, WALL + 1, H - WALL - 1 - h2), w, h: h2, vy, hp: 1, maxHp: 1, slot, small: true,
      respawn: 0, appear: 0.3, // a short blink where it can't be hit, so the planet doesn't hit it twice at once
      sprite: makeRockSprite(w, h2),
    };
  }

  function newGame() {
    playerScore = cpuScore = 0;
    serveCount = 0;
    order = serveOrder(tier);
    rocks = (tier === "easy" ? EASY_ROCK_X : ROCK_X).map((_, i) => newRock(i));
    bits = [];
    comet = null;
    // Halley's Comet: roll the dice once, at the start. About half of matches get one.
    cometMode = TIERS[tier].comet && Math.random() < 0.5 ? "armed" : "off";
    player.cy = cpu.cy = H / 2;
    state = "playing";
    pauseBtn.textContent = "Pause";
    serve(Math.random() < 0.5 ? 1 : -1);
  }

  /** Put the next planet in the middle. `dir` is +1 (towards the computer) or -1 (towards you). */
  function serve(dir: 1 | -1) {
    planet = order[serveCount % order.length];
    serveCount++;
    // Dwarf-planet powers that change how the serve works:
    ballMul = planet.power === "haumea" ? HAUMEA_SPEED : 1;
    cpu.h = planet.power === "eris" ? PH * ERIS_PADDLE : PH;
    curveClock = rand(0, 6);
    ball.x = W / 2;
    ball.y = rand(60, H - 60);
    ball.speed = BALL_START_SPEED;
    // Aim a bit up or down so the serve is never perfectly flat.
    const angle = rand(-0.4, 0.4);
    ball.vx = Math.cos(angle) * ball.speed * ballMul * dir;
    ball.vy = Math.sin(angle) * ball.speed * ballMul;
    serveTimer = SERVE_DELAY;
    if (planet.power) {
      say(`${planet.name.toUpperCase()}: ${planet.blurb}`, SERVE_DELAY + 2.6);
    } else {
      say(`Serving: ${planet.name}`, SERVE_DELAY + 1.4);
    }
    cpuError = rand(-10, 10);
  }

  /** Show a line of text at the bottom of the screen for a while. "\n" starts a second line. */
  function say(msg: string, seconds: number) {
    bannerText = msg;
    bannerTimer = seconds;
  }

  /** Change level (only between matches), and remember the choice. */
  function setTier(t: Tier) {
    if (state !== "ready" && state !== "over") return;
    tier = t;
    saveTier(t);
  }
  const stepTier = (by: number) => setTier(TIER_LIST[(TIER_LIST.indexOf(tier) + by + TIER_LIST.length) % TIER_LIST.length]);

  function setPaused(p: boolean) {
    if (p && state === "playing") state = "paused";
    else if (!p && state === "paused") state = "playing";
    pauseBtn.textContent = state === "paused" ? "Resume" : "Pause";
  }

  // ---------- collisions ----------
  // A "collision" is just a yes/no maths question: are two shapes overlapping?
  // Here: a circle (the planet) against a rectangle (a paddle or a rock). We find
  // the point on the rectangle closest to the circle's centre. If that point is
  // closer than the radius, they touch.
  function nearestOnRect(b: Body, rx: number, ry: number, rw: number, rh: number) {
    const px = clamp(b.x, rx, rx + rw);
    const py = clamp(b.y, ry, ry + rh);
    return { dx: b.x - px, dy: b.y - py };
  }

  /**
   * Bounce something (the planet or the comet) off a paddle. Returns true if it hit.
   * `r` is its radius, `mul` its speed multiplier, `dir` the way it should leave (+1 right, -1 left).
   */
  function hitPaddle(b: Body, r: number, mul: number, p: { x: number; cy: number; h: number }, dir: 1 | -1) {
    if (b.vx * dir > 0) return false; // already heading away from this paddle
    const { dx, dy } = nearestOnRect(b, p.x, p.cy - p.h / 2, PW, p.h);
    if (dx * dx + dy * dy > r * r) return false;
    // WHY THE ANGLE CHANGES: where it lands on the paddle decides the way it
    // leaves. Dead centre (-1..1 maps to top..bottom) sends it straight; near an
    // edge sends it off steeply, like the paddle was tilted. It's how you aim.
    // The angle grows steadily from the middle out, and the shaded ends of the paddle
    // (the outer fifth, see EDGE_FRACTION) are the part where it is steeper than about 32 degrees.
    const where = clamp((b.y - p.cy) / (p.h / 2), -1, 1);
    const angle = where * MAX_BOUNCE_ANGLE;
    b.speed = Math.min(BALL_MAX_SPEED, b.speed + BALL_SPEEDUP);
    b.vx = Math.cos(angle) * b.speed * mul * dir;
    b.vy = Math.sin(angle) * b.speed * mul;
    b.x = dir > 0 ? p.x + PW + r : p.x - r; // pop it out so it can't stick
    beep(dir > 0 ? 76 : 72, 0.12);
    return true;
  }

  /** Top and bottom walls: flip the up/down part of the velocity. */
  function bounceWalls(b: Body, r: number) {
    if (b.y - r < WALL) { b.y = WALL + r; b.vy = Math.abs(b.vy); beep(60, 0.12); }
    if (b.y + r > H - WALL) { b.y = H - WALL - r; b.vy = -Math.abs(b.vy); beep(60, 0.12); }
  }

  /** Bounce the ball off a rock; returns true if it touched. */
  function hitRock(rock: Rock) {
    const rx = rock.x + 1, ry = rock.y + 1, rw = rock.w - 2, rh = rock.h - 2; // a touch smaller than the picture
    const { dx, dy } = nearestOnRect(ball, rx, ry, rw, rh);
    const d2 = dx * dx + dy * dy;
    if (d2 > planet.r * planet.r) return false;
    // The "normal" is the direction pointing straight out of the surface we hit.
    let nx = dx, ny = dy, d = Math.sqrt(d2);
    if (d === 0) { nx = ball.x - (rx + rw / 2); ny = ball.y - (ry + rh / 2); d = Math.hypot(nx, ny) || 1; }
    nx /= d; ny /= d;
    ball.x += nx * (planet.r - d); // push the ball out of the rock
    ball.y += ny * (planet.r - d);
    const into = ball.vx * nx + ball.vy * ny;
    if (into < 0) {
      // Mirror the velocity around the surface. Speed stays the same.
      ball.vx -= 2 * into * nx;
      ball.vy -= 2 * into * ny;
      // Stop it bouncing straight up and down forever between the rocks.
      const full = ball.speed * ballMul;
      const minVx = full * 0.35;
      if (Math.abs(ball.vx) < minVx) {
        ball.vx = (ball.vx < 0 ? -1 : 1) * minVx;
        const vy = Math.sqrt(Math.max(0, full * full - ball.vx * ball.vx));
        ball.vy = (ball.vy < 0 ? -1 : 1) * vy;
      }
    }
    return true;
  }

  function breakRock(rock: Rock) {
    const cx = rock.x + rock.w / 2, cy = rock.y + rock.h / 2;
    for (let i = 0; i < 12; i++) {
      const a = rand(0, 6.28), s = rand(15, 50);
      bits.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.4, 0.9) });
    }
    beep(43, 0.25);
    beep(38, 0.25, 0.06);
    if (tier === "hard" && !rock.small) {
      // On Hard a big rock cracks into TWO small ones that drift apart, up and down.
      const sw = 7, sh = 6;
      Object.assign(rock, smallRock(rock.slot, cx - sw / 2, cy - sh - 1, -rand(10, 18)));
      rocks.push(smallRock(rock.slot, cx - sw / 2, cy + 1, rand(10, 18)));
      return;
    }
    rock.hp = 0;
    rock.respawn = rand(3, 5);
  }

  // ---------- one tiny slice of game time ----------
  function update(dt: number) {
    if (bannerTimer > 0) bannerTimer -= dt;

    // Your paddle: keys move it at a steady speed; a mouse or finger pulls it along.
    const dirKey = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (dirKey) player.cy += dirKey * PLAYER_KEY_SPEED * dt;
    else if (pointerY !== null) player.cy += clamp(pointerY - player.cy, -PLAYER_POINTER_SPEED * dt, PLAYER_POINTER_SPEED * dt);
    player.cy = clamp(player.cy, WALL + player.h / 2, H - WALL - player.h / 2);

    // The computer paddle chases whichever thing is the biggest worry: the one
    // heading its way that is closest to it. It has a speed limit so it can miss.
    let threat: Body | null = ball.vx > 0 ? ball : null;
    if (comet && comet.vx > 0 && (!threat || comet.x > threat.x)) threat = comet;
    const aim = threat ? threat.y + cpuError : H / 2; // drifts back to the middle when nothing is coming
    const gap = aim - cpu.cy;
    if (Math.abs(gap) > 3) cpu.cy += clamp(gap, -CPU_SPEED * dt, CPU_SPEED * dt);
    cpu.cy = clamp(cpu.cy, WALL + cpu.h / 2, H - WALL - cpu.h / 2);

    // Rocks drift up and down and turn round at the walls. Broken ones count down to return.
    for (const rock of rocks) {
      if (rock.appear > 0) rock.appear -= dt;
      if (rock.hp === 0) { rock.respawn -= dt; continue; }
      rock.y += rock.vy * dt;
      if (rock.y < WALL + 1) { rock.y = WALL + 1; rock.vy = Math.abs(rock.vy); }
      if (rock.y + rock.h > H - WALL - 1) { rock.y = H - WALL - 1 - rock.h; rock.vy = -Math.abs(rock.vy); }
    }
    // A column comes back as ONE big rock, once every piece in it has been gone long enough
    // (and the planet isn't sitting right where it would appear).
    for (const slot of new Set(rocks.filter((r) => r.hp === 0 && r.respawn <= 0).map((r) => r.slot))) {
      const group = rocks.filter((r) => r.slot === slot);
      if (!group.every((r) => r.hp === 0 && r.respawn <= 0)) continue;
      const first = group[0];
      const ballClose = Math.abs(ball.x - (first.x + first.w / 2)) < 24 && Math.abs(ball.y - (first.y + first.h / 2)) < 24;
      if (ballClose) continue;
      Object.assign(first, newRock(slot), { appear: 0.7 });
      rocks = rocks.filter((r) => r.slot !== slot || r === first);
    }

    // Little rock crumbs fly outwards and fade.
    for (const b of bits) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
    bits = bits.filter((b) => b.life > 0);

    // The planet waits in the middle for a moment, then launches.
    if (serveTimer > 0) { serveTimer -= dt; return; }

    // Makemake curves: its up/down speed is nudged by a slow wave. Then we fix the
    // sideways speed so the total speed stays the same. The limit keeps it from going near-vertical.
    if (planet.power === "makemake") {
      curveClock += dt;
      const full = ball.speed * ballMul;
      ball.vy = clamp(ball.vy + Math.sin(curveClock * 2.4) * 110 * dt, -full * 0.85, full * 0.85);
      ball.vx = (ball.vx < 0 ? -1 : 1) * Math.sqrt(full * full - ball.vy * ball.vy);
    }

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    bounceWalls(ball, planet.r);

    if (hitPaddle(ball, planet.r, ballMul, player, 1)) cpuError = rand(-10, 10);
    hitPaddle(ball, planet.r, ballMul, cpu, -1);

    for (const rock of rocks) {
      if (rock.hp === 0 || rock.appear > 0) continue;
      if (hitRock(rock)) {
        if (planet.power === "ceres") rock.hp = 1; // Ceres smashes any asteroid in one hit
        rock.hp--;
        if (rock.hp === 0) breakRock(rock);
        else beep(50, 0.15);
      }
    }

    // ----- Halley's Comet: a second, small, fast ball that streaks in mid-rally -----
    if (cometMode === "waiting") {
      cometTimer -= dt;
      if (cometTimer <= 0) {
        cometMode = "warning";
        cometTimer = COMET_WARNING;
        cometTop = Math.random() < 0.5;
        cometEntryX = rand(W * 0.58, W * 0.8); // on the computer's half
        say("HALLEY'S COMET!", COMET_WARNING + 0.5);
      }
    } else if (cometMode === "warning") {
      cometTimer -= dt;
      if (cometTimer <= 0) {
        const a = rand(0.35, 0.7); // how steeply it angles in
        comet = {
          x: cometEntryX, y: cometTop ? WALL + COMET_R : H - WALL - COMET_R,
          vx: -Math.cos(a) * COMET_SPEED, vy: Math.sin(a) * COMET_SPEED * (cometTop ? 1 : -1),
          speed: COMET_SPEED, trail: [],
        };
        cometMode = "flying";
      }
    } else if (cometMode === "flying" && comet) {
      comet.x += comet.vx * dt;
      comet.y += comet.vy * dt;
      comet.trail.push({ x: comet.x, y: comet.y });
      if (comet.trail.length > 16) comet.trail.shift(); // a short tail
      bounceWalls(comet, COMET_R);
      if (hitPaddle(comet, COMET_R, 1, player, 1)) cpuError = rand(-10, 10);
      hitPaddle(comet, COMET_R, 1, cpu, -1);
      // Past a paddle: a normal point, then the comet is gone for good. It never touches the planet.
      if (comet.x + COMET_R < 0) { score("cpu", 1); return; }
      if (comet.x - COMET_R > W) { score("player", 1); return; }
    }

    // Past a paddle and off the edge of the screen: somebody scores.
    // A point won with Pluto counts double, for whoever wins it.
    const worth = planet.power === "pluto" ? 2 : 1;
    if (ball.x + planet.r < 0) score("cpu", worth);
    else if (ball.x - planet.r > W) score("player", worth);
  }

  function score(who: "player" | "cpu", worth: number) {
    if (who === "player") { playerScore += worth; beep(72, 0.2); beep(79, 0.25, 0.12); }
    else { cpuScore += worth; beep(55, 0.2); beep(48, 0.25, 0.12); }
    // A new serve clears the comet away. If it was only a warning, it tries again soon.
    if (cometMode === "flying") { cometMode = "done"; comet = null; }
    else if (cometMode === "warning") { cometMode = "waiting"; cometTimer = rand(2, 6); }
    else if (cometMode === "armed" && playerScore + cpuScore >= 2) { cometMode = "waiting"; cometTimer = rand(2, 8); }
    if (playerScore >= TIERS[tier].winScore || cpuScore >= TIERS[tier].winScore) {
      winner = playerScore > cpuScore ? "You win!" : "Computer wins";
      state = "over";
      serveTimer = 1; // keep the ball parked
      ball.vx = ball.vy = 0;
      ball.x = -50;
    } else {
      serve(who === "player" ? -1 : 1); // the next planet heads towards whoever just lost
    }
  }

  // ---------- the game loop ----------
  let raf = 0;
  let last = performance.now();
  let acc = 0; // time we owe the game, in seconds
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    // How long since the last frame ("delta time"). Capped so that coming back to a
    // busy tab doesn't make the game try to catch up on ages of missed time.
    const dt = clamp((now - last) / 1000, 0, 0.25);
    last = now;
    if (state === "playing") {
      acc += dt;
      while (acc >= STEP) { update(STEP); acc -= STEP; }
    } else {
      acc = 0;
    }
    draw(now / 1000);
  }

  // ---------- drawing ----------
  const px = (x: number, y: number, w: number, hh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, hh); // whole pixels only keeps edges crisp
  };

  function text(str: string, x: number, y: number, size: number, color: string) {
    ctx.font = `${size}px Silkscreen, "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText(str, Math.round(x) + 1, Math.round(y) + 1); // little drop shadow
    ctx.fillStyle = color;
    ctx.fillText(str, Math.round(x), Math.round(y));
  }

  function drawDigits(n: number, cx: number) {
    const s = String(n);
    const scale = 3;
    const totalW = s.length * 4 * scale - scale;
    for (let k = 0; k < s.length; k++) {
      const bits5 = DIGITS[Number(s[k])];
      for (let i = 0; i < 15; i++) {
        if (bits5[i] === "1") px(cx - totalW / 2 + k * 4 * scale + (i % 3) * scale, 10 + Math.floor(i / 3) * scale, scale, scale, "#e8ecff");
      }
    }
  }

  /** Draw the planet as a pixel circle: a pixel is in if it is within `r` of the centre. */
  function drawPlanet(cx: number, cy: number, p: Planet) {
    const x0 = Math.round(cx), y0 = Math.round(cy);
    const reach = Math.ceil(p.r);
    const drawRing = (back: boolean) => {
      if (!p.ring) return;
      const rx = p.r * 2, ry = p.r * 0.5;
      for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
          const e = (dx / rx) ** 2 + (dy / ry) ** 2;
          if (e > 1 || e < 0.55) continue;
          const onPlanet = dx * dx + dy * dy <= p.r * p.r;
          // The far half of the ring hides behind the planet; the near half passes in front.
          if (back ? dy < 0 && !onPlanet : dy >= 0) px(x0 + dx, y0 + dy, 1, 1, e > 0.8 ? p.ring[1] : p.ring[0]);
        }
      }
    };
    drawRing(true);
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (dx * dx + dy * dy > p.r * p.r) continue;
        const light = -(dx + dy) / (p.r * 1.4); // lit from the top left
        const shade = light > 0.5 ? 0 : light < -0.4 ? 2 : 1;
        let set = p.shades;
        if (p.bands && Math.floor((dy + reach) / 2) % 2 === 0) set = p.bands;
        if (p.spots?.at.some(([sx, sy]) => sx === dx && sy === dy)) set = p.spots.shades;
        px(x0 + dx, y0 + dy, 1, 1, set[shade]);
      }
    }
    drawRing(false);
  }

  function drawRock(rock: Rock) {
    if (rock.hp === 0) return;
    if (rock.appear > 0 && Math.floor(rock.appear * 16) % 2 === 0) return; // blink back in
    for (let j = 0; j < rock.sprite.length; j++) {
      for (let i = 0; i < rock.sprite[j].length; i++) {
        const s = rock.sprite[j][i];
        if (s < 0) continue;
        const mid = Math.floor(rock.w / 2);
        const hurt = rock.hp < rock.maxHp;
        const crack = hurt && (i === mid + (j % 2) - 1 || (rock.hp === 1 && rock.maxHp === 3 && i === mid + 4 - (j % 2)));
        px(rock.x + i, rock.y + j, 1, 1, crack ? "#23252b" : ROCK_SHADES[s]);
      }
    }
  }

  /** A message box in the middle. Returns the middle height of each line (so we can find the tap-able one). */
  function panel(lines: { t: string; size: number; color: string }[]) {
    const hgt = lines.length * 14 + 14;
    const y0 = Math.round(H / 2 - hgt / 2);
    const m = 40; // gap between the box and the screen edge
    px(m, y0, W - 2 * m, hgt, "#05081a");
    px(m, y0, W - 2 * m, 1, "#6c78a8");
    px(m, y0 + hgt - 1, W - 2 * m, 1, "#6c78a8");
    px(m, y0, 1, hgt, "#6c78a8");
    px(W - m - 1, y0, 1, hgt, "#6c78a8");
    return lines.map((l, i) => {
      const cy = y0 + 14 + i * 14 - 1;
      text(l.t, W / 2, cy, l.size, l.color);
      return cy;
    });
  }

  /** The level picker line, drawn like a button. Tapping it cycles the level. */
  function tierLine() {
    const info = TIERS[tier];
    return { t: `< ${info.name}${earned[tier] ? "" : " (preview)"} >`, size: 8, color: earned[tier] ? info.color : "#8e9ac8" };
  }
  function markTierRow(cy: number) {
    // The box you can tap. A faint outline hints that it is a button.
    tierHit = { x0: 60, x1: W - 60, y0: cy - 9, y1: cy + 9 };
    const o = "#3a4670";
    px(60, cy - 8, W - 120, 1, o);
    px(60, cy + 8, W - 120, 1, o);
    px(60, cy - 8, 1, 17, o);
    px(W - 61, cy - 8, 1, 17, o);
  }

  /** A paddle with shaded ends. The ends are where a hit sends the ball off steeply. */
  function drawPaddle(p: { x: number; cy: number; h: number }, body: string, side: string, edge: string, tip: string, sideRight: boolean) {
    const top = Math.round(p.cy - p.h / 2);
    const hh = Math.round(p.h);
    const e = Math.round(p.h * EDGE_FRACTION);
    px(p.x, top, PW, hh, body);
    px(sideRight ? p.x + PW - 1 : p.x, top, 1, hh, side);
    px(p.x, top, PW, e, edge); // brighter ends...
    px(p.x, top + hh - e, PW, e, edge);
    px(p.x, top, PW, 2, tip); // ...and brightest right at the tips
    px(p.x, top + hh - 2, PW, 2, tip);
  }

  /** A soft glowing dot (used for the comet's head). */
  function glow(cx: number, cy: number, r: number, color: string, alpha: number) {
    ctx.globalAlpha = alpha;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) px(cx + dx, cy + dy, 1, 1, color);
    ctx.globalAlpha = 1;
  }

  function drawComet(c: Body & { trail: { x: number; y: number }[] }) {
    // The tail: older spots are fainter.
    c.trail.forEach((t, i) => {
      const f = (i + 1) / c.trail.length;
      ctx.globalAlpha = f * 0.55;
      px(t.x - 1, t.y - 1, 2, 2, "#9fe8ff");
      ctx.globalAlpha = 1;
    });
    glow(Math.round(c.x), Math.round(c.y), 4, "#6fd0ff", 0.25); // outer glow
    glow(Math.round(c.x), Math.round(c.y), 3, "#bdeaff", 0.5);
    glow(Math.round(c.x), Math.round(c.y), 1, "#ffffff", 1); // bright head
  }

  function draw(t: number) {
    // Each frame we repaint everything from scratch, back to front.
    px(0, 0, W, H, "#0a0f1f");
    for (const s of stars) {
      const dim = s.twinkle && Math.sin(t * 3 + s.phase) > 0.4;
      px(s.x, s.y, 1, 1, dim ? "#3a4670" : s.bright ? "#e8ecff" : "#6c78a8");
    }
    px(0, 0, W, WALL, "#2a3566");
    px(0, H - WALL, W, WALL, "#2a3566");
    for (let y = WALL + 2; y < H - WALL - 2; y += 8) px(W / 2 - 1, y, 2, 4, "#26305c"); // dashed centre line

    for (const rock of rocks) drawRock(rock);
    for (const b of bits) px(b.x, b.y, 1, 1, b.life > 0.3 ? ROCK_SHADES[0] : ROCK_SHADES[1]);

    drawPaddle(player, "#ffb52b", "#ffd98a", "#ffd35c", "#fff6c8", false);
    drawPaddle(cpu, "#5cd0ff", "#bdeaff", "#9fe4ff", "#e8f9ff", true);

    // Comet warning: a blinking marker on the edge where it is about to come in.
    if (cometMode === "warning" && Math.floor(t * 8) % 2 === 0) {
      px(cometEntryX - 2, cometTop ? WALL + 1 : H - WALL - 4, 5, 3, "#9fe8ff");
    }

    if (state !== "ready") drawPlanet(ball.x, ball.y, planet);
    if (comet) drawComet(comet);
    drawDigits(playerScore, W / 2 - 34);
    drawDigits(cpuScore, W / 2 + 34);
    // The level, in small text under the scores while you play.
    if (state === "playing" || state === "paused") text(TIERS[tier].name.toUpperCase(), W / 2, 34, 8, "#6c78a8");
    if (bannerTimer > 0 && state !== "over") {
      const rows = bannerText.split("\n");
      rows.forEach((r, i) => text(r, W / 2, H - 12 - (rows.length - 1 - i) * 10, 8, "#e8ecff"));
    }

    tierHit = null;

    if (state === "ready") {
      const rows = panel([
        { t: "PLANET PONG", size: 16, color: "#ffb52b" },
        tierLine(),
        { t: "Press Space or tap to start", size: 8, color: "#e8ecff" },
        { t: `First to ${TIERS[tier].winScore} wins`, size: 8, color: "#8e9ac8" },
        { t: "1 2 3 or < > keys, or tap level", size: 8, color: "#6c78a8" },
      ]);
      markTierRow(rows[1]);
    } else if (state === "paused") {
      panel([
        { t: "PAUSED", size: 16, color: "#ffb52b" },
        { t: "P, Esc, Space or tap to go on", size: 8, color: "#e8ecff" },
      ]);
    } else if (state === "over") {
      const rows = panel([
        { t: winner.toUpperCase(), size: 16, color: winner === "You win!" ? "#5fe08a" : "#ff6b5f" },
        { t: `${playerScore} - ${cpuScore}`, size: 8, color: "#e8ecff" },
        tierLine(),
        { t: "Space / tap to play again", size: 8, color: "#e8ecff" },
      ]);
      markTierRow(rows[2]);
    }
  }

  // ---------- input ----------
  // Every listener is stored with its "undo" so cleanup can remove them all.
  const undo: (() => void)[] = [];
  function on<T extends EventTarget>(target: T, type: string, fn: (e: any) => void, opts?: AddEventListenerOptions) {
    target.addEventListener(type, fn, opts);
    undo.push(() => target.removeEventListener(type, fn, opts));
  }

  on(window, "keydown", (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    // Stop the arrow keys and Space from scrolling the page while this screen is open.
    if (k === " " || k === "ArrowUp" || k === "ArrowDown") e.preventDefault();
    soundOn = true;
    if (k === "ArrowUp" || k === "w" || k === "W") { keys.up = true; pointerY = null; }
    else if (k === "ArrowDown" || k === "s" || k === "S") { keys.down = true; pointerY = null; }
    else if (e.repeat) return;
    else if ((state === "ready" || state === "over") && (k === "ArrowLeft" || k === "ArrowRight")) stepTier(k === "ArrowRight" ? 1 : -1);
    else if ((state === "ready" || state === "over") && (k === "1" || k === "2" || k === "3")) setTier(TIER_LIST[Number(k) - 1]);
    else if (k === " ") {
      if (state === "ready" || state === "over") newGame();
      else if (state === "paused") setPaused(false);
    } else if (k === "p" || k === "P" || k === "Escape") {
      if (state === "playing") setPaused(true);
      else if (state === "paused") setPaused(false);
    }
  });
  on(window, "keyup", (e: KeyboardEvent) => {
    const k = e.key;
    if (k === "ArrowUp" || k === "w" || k === "W") keys.up = false;
    if (k === "ArrowDown" || k === "s" || k === "S") keys.down = false;
  });
  on(window, "blur", () => { keys.up = keys.down = false; });

  // Pause by itself when the tab is hidden, so you don't lose a point in the background.
  on(document, "visibilitychange", () => { if (document.hidden) setPaused(true); });

  const followPointer = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointerY = clamp(((e.clientY - r.top) / r.height) * H, 0, H);
  };
  on(canvas, "pointermove", followPointer);
  on(canvas, "pointerdown", (e: PointerEvent) => {
    soundOn = true;
    followPointer(e);
    if (state === "ready" || state === "over") {
      // Tapping the level row changes the level. Tapping anywhere else starts the match.
      const r = canvas.getBoundingClientRect();
      const gx = ((e.clientX - r.left) / r.width) * W;
      const gy = ((e.clientY - r.top) / r.height) * H;
      if (tierHit && gx >= tierHit.x0 && gx <= tierHit.x1 && gy >= tierHit.y0 && gy <= tierHit.y1) stepTier(1);
      else newGame();
    }
    else if (state === "paused") setPaused(false);
  });
  on(pauseBtn, "click", () => {
    soundOn = true;
    setPaused(state === "playing");
    pauseBtn.blur(); // so Space afterwards doesn't "press" this button again
  });

  raf = requestAnimationFrame(frame);

  // Test helpers. These only exist in the development copy, never in the real site.
  if (import.meta.env.DEV) {
    (window as any).__pong = {
      info: () => ({
        state, tier, earned, score: [playerScore, cpuScore], winScore: TIERS[tier].winScore, planet: planet.name, power: planet.power ?? null,
        mul: ballMul, cpuH: cpu.h, cometMode, comet: comet && { x: comet.x, y: comet.y }, ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy },
        rocks: rocks.map((r) => ({ slot: r.slot, small: r.small, hp: r.hp, x: r.x, y: r.y })),
      }),
      setTier,
      serveNamed: (name: string) => { const i = order.findIndex((p) => p.name === name); if (i >= 0) { serveCount = i; serve(1); } },
      startComet: () => { cometMode = "waiting"; cometTimer = 0.01; },
      armComet: () => { cometMode = "armed"; },
      setScore: (p: number, c: number) => { playerScore = p; cpuScore = c; },
    };
    undo.push(() => { delete (window as any).__pong; });
  }

  // Cleanup: stop the loop and remove every listener when leaving this screen.
  return () => {
    cancelAnimationFrame(raf);
    undo.forEach((f) => f());
  };
}
