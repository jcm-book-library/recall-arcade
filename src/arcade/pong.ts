import { h } from "../ui/dom";
import { playNote } from "../music/audio";

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
const WIN_SCORE = 7;

// Speeds are "pixels per second". Multiplying by a time step gives distance moved.
const PLAYER_KEY_SPEED = 150;
const PLAYER_POINTER_SPEED = 600; // how fast the paddle chases your mouse or finger
const CPU_SPEED = 80; // slower than the ball can go, so the computer can be beaten
const BALL_START_SPEED = 120;
const BALL_SPEEDUP = 7; // extra speed after every paddle hit...
const BALL_MAX_SPEED = 230; // ...but never faster than this
const MAX_BOUNCE_ANGLE = (55 * Math.PI) / 180; // steepest return angle (at a paddle's edge)
const SERVE_DELAY = 1; // seconds the new planet waits before it launches

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

// ---------- the rest of the cast ----------
const ROCK_SHADES = ["#b4b7bf", "#8a8d96", "#5d6069"];
const ROCK_X = [112, 146, 176, 206]; // where each asteroid drifts (up and down only)

interface Rock {
  x: number; y: number; w: number; h: number;
  vy: number; // velocity: speed AND direction (negative = up)
  hp: number; // hits left before it breaks
  respawn: number; // seconds until it comes back (0 = here now)
  appear: number; // brief blink after coming back
  sprite: number[][]; // -1 = empty, otherwise a shade (0 light, 1 middle, 2 dark)
}
interface Bit { x: number; y: number; vx: number; vy: number; life: number }
type State = "ready" | "playing" | "paused" | "over";

// Tiny 3x5 pixel digits for the score, drawn by hand so they look the same everywhere.
const DIGITS = [
  "111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001",
  "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111",
];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

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
        h("p", { class: "pong-howto muted" }, "W / S or ↑ / ↓ moves your paddle. On a phone or with a mouse, slide up and down over the game. First to 7 wins. P or Esc pauses."),
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
  let serveTimer = 0; // while above 0 the planet just sits in the middle
  let bannerTimer = 0;
  let bannerText = "";
  let cpuError = 0; // the computer aims a little off, a different amount each time

  // Position is where something IS. Velocity (vx, vy) is how far it moves each
  // second. Every update we nudge position by velocity * time.
  const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: BALL_START_SPEED };
  const player = { x: PADDLE_GAP, cy: H / 2 };
  const cpu = { x: W - PADDLE_GAP - PW, cy: H / 2 };
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
  function newRock(i: number): Rock {
    const w = 11 + Math.floor(Math.random() * 3);
    const h2 = 9 + Math.floor(Math.random() * 3);
    return {
      x: ROCK_X[i] + Math.floor(rand(-4, 5)), y: rand(WALL + 4, H - WALL - h2 - 4), w, h: h2,
      vy: (Math.random() < 0.5 ? -1 : 1) * rand(6, 14), hp: 2, respawn: 0, appear: 0,
      sprite: makeRockSprite(w, h2),
    };
  }

  function newGame() {
    playerScore = cpuScore = 0;
    serveCount = 0;
    rocks = ROCK_X.map((_, i) => newRock(i));
    bits = [];
    player.cy = cpu.cy = H / 2;
    state = "playing";
    pauseBtn.textContent = "Pause";
    serve(Math.random() < 0.5 ? 1 : -1);
  }

  /** Put the next planet in the middle. `dir` is +1 (towards the computer) or -1 (towards you). */
  function serve(dir: 1 | -1) {
    planet = PLANETS[serveCount % PLANETS.length];
    serveCount++;
    ball.x = W / 2;
    ball.y = rand(60, H - 60);
    ball.speed = BALL_START_SPEED;
    // Aim a bit up or down so the serve is never perfectly flat.
    const angle = rand(-0.4, 0.4);
    ball.vx = Math.cos(angle) * ball.speed * dir;
    ball.vy = Math.sin(angle) * ball.speed;
    serveTimer = SERVE_DELAY;
    bannerText = `Serving: ${planet.name}`;
    bannerTimer = SERVE_DELAY + 1.4;
    cpuError = rand(-10, 10);
  }

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
  function nearestOnRect(rx: number, ry: number, rw: number, rh: number) {
    const px = clamp(ball.x, rx, rx + rw);
    const py = clamp(ball.y, ry, ry + rh);
    return { dx: ball.x - px, dy: ball.y - py };
  }

  /** Bounce the ball off a paddle. Returns true if it hit. `dir` is the way the ball should leave (+1 right, -1 left). */
  function hitPaddle(p: { x: number; cy: number }, dir: 1 | -1) {
    if (ball.vx * dir > 0) return false; // already heading away from this paddle
    const { dx, dy } = nearestOnRect(p.x, p.cy - PH / 2, PW, PH);
    if (dx * dx + dy * dy > planet.r * planet.r) return false;
    // WHY THE ANGLE CHANGES: where the ball lands on the paddle decides the way it
    // leaves. Dead centre (-1..1 maps to top..bottom) sends it straight; near an
    // edge sends it off steeply, like the paddle was tilted. It's how you aim.
    const where = clamp((ball.y - p.cy) / (PH / 2), -1, 1);
    const angle = where * MAX_BOUNCE_ANGLE;
    ball.speed = Math.min(BALL_MAX_SPEED, ball.speed + BALL_SPEEDUP);
    ball.vx = Math.cos(angle) * ball.speed * dir;
    ball.vy = Math.sin(angle) * ball.speed;
    ball.x = dir > 0 ? p.x + PW + planet.r : p.x - planet.r; // pop it out so it can't stick
    beep(dir > 0 ? 76 : 72, 0.12);
    return true;
  }

  /** Bounce the ball off a rock; returns true if it touched. */
  function hitRock(rock: Rock) {
    const rx = rock.x + 1, ry = rock.y + 1, rw = rock.w - 2, rh = rock.h - 2; // a touch smaller than the picture
    const { dx, dy } = nearestOnRect(rx, ry, rw, rh);
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
      const minVx = ball.speed * 0.35;
      if (Math.abs(ball.vx) < minVx) {
        ball.vx = (ball.vx < 0 ? -1 : 1) * minVx;
        const vy = Math.sqrt(Math.max(0, ball.speed * ball.speed - ball.vx * ball.vx));
        ball.vy = (ball.vy < 0 ? -1 : 1) * vy;
      }
    }
    return true;
  }

  function breakRock(rock: Rock) {
    rock.hp = 0;
    rock.respawn = rand(3, 5);
    for (let i = 0; i < 12; i++) {
      const a = rand(0, 6.28), s = rand(15, 50);
      bits.push({ x: rock.x + rock.w / 2, y: rock.y + rock.h / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.4, 0.9) });
    }
    beep(43, 0.25);
    beep(38, 0.25, 0.06);
  }

  // ---------- one tiny slice of game time ----------
  function update(dt: number) {
    if (bannerTimer > 0) bannerTimer -= dt;

    // Your paddle: keys move it at a steady speed; a mouse or finger pulls it along.
    const dirKey = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (dirKey) player.cy += dirKey * PLAYER_KEY_SPEED * dt;
    else if (pointerY !== null) player.cy += clamp(pointerY - player.cy, -PLAYER_POINTER_SPEED * dt, PLAYER_POINTER_SPEED * dt);
    player.cy = clamp(player.cy, WALL + PH / 2, H - WALL - PH / 2);

    // The computer paddle chases the ball, but with a speed limit so it can miss.
    const aim = ball.vx > 0 ? ball.y + cpuError : H / 2; // drifts back to the middle when the ball is going away
    const gap = aim - cpu.cy;
    if (Math.abs(gap) > 3) cpu.cy += clamp(gap, -CPU_SPEED * dt, CPU_SPEED * dt);
    cpu.cy = clamp(cpu.cy, WALL + PH / 2, H - WALL - PH / 2);

    // Rocks drift up and down and turn round at the walls. Broken ones count down to return.
    for (const rock of rocks) {
      if (rock.appear > 0) rock.appear -= dt;
      if (rock.hp === 0) {
        rock.respawn -= dt;
        const ballClose = Math.abs(ball.x - (rock.x + rock.w / 2)) < 24 && Math.abs(ball.y - (rock.y + rock.h / 2)) < 24;
        if (rock.respawn <= 0 && !ballClose) {
          const i = rocks.indexOf(rock);
          Object.assign(rock, newRock(i), { appear: 0.7 });
        }
        continue;
      }
      rock.y += rock.vy * dt;
      if (rock.y < WALL + 1) { rock.y = WALL + 1; rock.vy = Math.abs(rock.vy); }
      if (rock.y + rock.h > H - WALL - 1) { rock.y = H - WALL - 1 - rock.h; rock.vy = -Math.abs(rock.vy); }
    }

    // Little rock crumbs fly outwards and fade.
    for (const b of bits) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
    bits = bits.filter((b) => b.life > 0);

    // The planet waits in the middle for a moment, then launches.
    if (serveTimer > 0) { serveTimer -= dt; return; }

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Top and bottom walls: flip the up/down part of the velocity.
    if (ball.y - planet.r < WALL) { ball.y = WALL + planet.r; ball.vy = Math.abs(ball.vy); beep(60, 0.12); }
    if (ball.y + planet.r > H - WALL) { ball.y = H - WALL - planet.r; ball.vy = -Math.abs(ball.vy); beep(60, 0.12); }

    if (hitPaddle(player, 1)) cpuError = rand(-10, 10);
    hitPaddle(cpu, -1);

    for (const rock of rocks) {
      if (rock.hp === 0 || rock.appear > 0) continue;
      if (hitRock(rock)) {
        rock.hp--;
        if (rock.hp === 0) breakRock(rock);
        else beep(50, 0.15);
      }
    }

    // Past a paddle and off the edge of the screen: somebody scores.
    if (ball.x + planet.r < 0) score("cpu");
    else if (ball.x - planet.r > W) score("player");
  }

  function score(who: "player" | "cpu") {
    if (who === "player") { playerScore++; beep(72, 0.2); beep(79, 0.25, 0.12); }
    else { cpuScore++; beep(55, 0.2); beep(48, 0.25, 0.12); }
    if (playerScore >= WIN_SCORE || cpuScore >= WIN_SCORE) {
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
        const crack = rock.hp === 1 && i === Math.floor(rock.w / 2) + (j % 2) - 1;
        px(rock.x + i, rock.y + j, 1, 1, crack ? "#23252b" : ROCK_SHADES[s]);
      }
    }
  }

  function panel(lines: { t: string; size: number; color: string }[]) {
    const hgt = lines.length * 14 + 14;
    const y0 = Math.round(H / 2 - hgt / 2);
    px(60, y0, W - 120, hgt, "#05081a");
    px(60, y0, W - 120, 1, "#6c78a8");
    px(60, y0 + hgt - 1, W - 120, 1, "#6c78a8");
    px(60, y0, 1, hgt, "#6c78a8");
    px(W - 61, y0, 1, hgt, "#6c78a8");
    lines.forEach((l, i) => text(l.t, W / 2, y0 + 14 + i * 14 - 1, l.size, l.color));
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

    px(player.x, player.cy - PH / 2, PW, PH, "#ffb52b");
    px(player.x, player.cy - PH / 2, 1, PH, "#ffd98a");
    px(cpu.x, cpu.cy - PH / 2, PW, PH, "#5cd0ff");
    px(cpu.x + PW - 1, cpu.cy - PH / 2, 1, PH, "#bdeaff");

    if (state !== "ready") drawPlanet(ball.x, ball.y, planet);
    drawDigits(playerScore, W / 2 - 34);
    drawDigits(cpuScore, W / 2 + 34);
    if (bannerTimer > 0 && state !== "over") text(bannerText, W / 2, H - 12, 8, "#e8ecff");

    if (state === "ready") {
      panel([
        { t: "PLANET PONG", size: 16, color: "#ffb52b" },
        { t: "Press Space or tap to start", size: 8, color: "#e8ecff" },
        { t: "First to 7 wins", size: 8, color: "#8e9ac8" },
      ]);
    } else if (state === "paused") {
      panel([
        { t: "PAUSED", size: 16, color: "#ffb52b" },
        { t: "P, Esc, Space or tap to go on", size: 8, color: "#e8ecff" },
      ]);
    } else if (state === "over") {
      panel([
        { t: winner.toUpperCase(), size: 16, color: winner === "You win!" ? "#5fe08a" : "#ff6b5f" },
        { t: `${playerScore} - ${cpuScore}`, size: 8, color: "#e8ecff" },
        { t: "Space / tap to play again", size: 8, color: "#e8ecff" },
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

  on(window, "keydown", (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    // Stop the arrow keys and Space from scrolling the page while this screen is open.
    if (k === " " || k === "ArrowUp" || k === "ArrowDown") e.preventDefault();
    soundOn = true;
    if (k === "ArrowUp" || k === "w" || k === "W") { keys.up = true; pointerY = null; }
    else if (k === "ArrowDown" || k === "s" || k === "S") { keys.down = true; pointerY = null; }
    else if (e.repeat) return;
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
    if (state === "ready" || state === "over") newGame();
    else if (state === "paused") setPaused(false);
  });
  on(pauseBtn, "click", () => {
    soundOn = true;
    setPaused(state === "playing");
    pauseBtn.blur(); // so Space afterwards doesn't "press" this button again
  });

  raf = requestAnimationFrame(frame);

  // Cleanup: stop the loop and remove every listener when leaving this screen.
  return () => {
    cancelAnimationFrame(raf);
    undo.forEach((f) => f());
  };
}
