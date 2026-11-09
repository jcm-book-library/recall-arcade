import { h, formatTime } from "../../ui/dom";
import { currentTrack } from "../../engine/progress";
import { clamp, loadBest, makeBeeper, saveBest, startLoop } from "../kit";
import type { Blip } from "../kit";
import { loadSideHero, type SideHero } from "../hero-side-art";
import { awardStamp } from "../stamps";
import { CAMERA, STEP_SECONDS, TILE, TRACK_RULES, TUNING as T, VIEW_H, VIEW_W } from "./tuning.ts";
import { bonk, boxOf, newBody, stepBody, type Body } from "./physics.ts";
import { hazardAt, hazardHit, makeHazards, packFront, type HazardView } from "./hazards.ts";
import { SIGN_KEYS, groundTop, makeWorld } from "./world.ts";
import { LEVELS } from "./levels.ts";
import { GAME_NAME, GAME_ROUTE, STORE_PREFIX } from "./names.ts";
import { setupControls } from "./input.ts";
import { makeArt } from "./art-scenery.ts";
import { KITS, OUT, R, athlete, disc, drawHammer, drawShot, drawSpear, official, puff, stars, line, type Pose } from "./art-chars.ts";

// THE BRAWL: a side-on platformer. This file is the conductor. It does not know how to run, jump or
// draw a brick (the other files do that). It knows what happens WHEN: start, play, get bonked,
// respawn, finish. Read it top to bottom:
//   1. the page          2. the state          3. update (one 60th of a second)
//   4. drawing           5. buttons, keys and the loop
// The pieces:
//   tuning.ts   all the numbers that make it feel good        physics.ts  running, jumping, walls
//   world.ts    the level as a grid                          hazards.ts  thrown things and the stampede
//   level1.ts   the level itself (letters you can edit)      art-*.ts    all the pictures
//   input.ts    keys and touch buttons

type Mode = "ready" | "playing" | "paused" | "dying" | "finishing" | "results" | "gameover";

const SOUNDS: Record<string, Blip[]> = {
  jump: [[74, 0.07, 0], [79, 0.07, 0.04]],
  land: [[52, 0.06, 0]],
  bonk: [[50, 0.1, 0], [43, 0.2, 0.07]],
  flag: [[72, 0.08, 0], [79, 0.08, 0.08], [84, 0.16, 0.16]],
  bounce: [[62, 0.08, 0], [74, 0.1, 0.06], [81, 0.14, 0.12]],
  bang: [[38, 0.2, 0], [86, 0.05, 0]],
  thud: [[40, 0.12, 0]],
  win: [[72, 0.12, 0], [76, 0.12, 0.12], [79, 0.12, 0.24], [84, 0.4, 0.36]],
  over: [[60, 0.2, 0], [55, 0.2, 0.2], [48, 0.5, 0.4]],
  warn: [[88, 0.04, 0]],
};

interface Particle { x: number; y: number; vx: number; vy: number; age: number; life: number; kind: "dust" | "confetti"; colour: string }
interface Flag { x: number; y: number; col: number; row: number; easyOnly: boolean; reached: boolean }
interface Banner { title: string; sub: string; colour: string; age: number; life: number }

export function renderBrawl(root: HTMLElement): () => void {
  // =============================================================================================
  // 1. THE PAGE
  // =============================================================================================
  const levelNumber = Math.max(1, Math.min(LEVELS.length, Number(location.hash.split("/")[1]) || 1));
  const level = LEVELS[levelNumber - 1];
  const world = makeWorld(level.rows);
  const track = currentTrack();
  const rules = TRACK_RULES[track];
  const bestKey = `${STORE_PREFIX}:${level.id}`;

  const canvas = h("canvas", {
    class: "brawl-canvas", width: String(VIEW_W), height: String(VIEW_H), role: "img",
    "aria-label": `${GAME_NAME}: a side-on platformer. Run and jump along an athletics stadium, dodge what the athletes throw, and outrun the stampede.`,
  });
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  void document.fonts?.load("8px Silkscreen").catch(() => {});

  const hudHearts = h("span", { class: "brawl-stat brawl-hearts", "aria-label": "Hearts" });
  const hudLives = h("span", { class: "brawl-stat" });
  const hudFlag = h("span", { class: "brawl-stat" });
  const hudPart = h("span", { class: "brawl-stat brawl-part" });
  const hudTime = h("span", { class: "brawl-stat" });
  const pauseBtn = h("button", { class: "btn ghost", type: "button" }, "Pause");
  const padLeft = h("button", { class: "brawl-key", type: "button", tabindex: "-1", "aria-label": "Run left" }, "◀");
  const padRight = h("button", { class: "brawl-key", type: "button", tabindex: "-1", "aria-label": "Run right" }, "▶");
  const padJump = h("button", { class: "brawl-key brawl-jump", type: "button", tabindex: "-1", "aria-label": "Jump" }, "JUMP");
  const card = h("div", { class: "brawl-card-wrap" });
  const screenBox = h("div", { class: "brawl-screen" }, canvas, card);

  root.replaceChildren(
    h(
      "main",
      { class: "play brawl" },
      h("div", { class: "play-top" }, h("a", { class: "back", href: "#" }, "◂ Arcade"), h("h1", { class: "play-title" }, GAME_NAME)),
      h("div", { class: "brawl-hud" }, hudHearts, hudLives, hudFlag, hudPart, hudTime),
      screenBox,
      h("div", { class: "brawl-pad", "aria-label": "On-screen buttons" }, h("div", { class: "brawl-pad-move" }, padLeft, padRight), padJump),
      h(
        "div",
        { class: "brawl-foot" },
        h("p", { class: "brawl-howto muted" }, "Arrows or A and D to run. Space, Up or W to jump: hold for a high jump, tap for a hop. Down drops through a ledge. P or Esc pauses."),
        pauseBtn,
      ),
    ),
  );

  // Fit the picture to the space: whole-number scaling when there is room, so pixels stay sharp.
  function fit() {
    const availW = screenBox.parentElement?.clientWidth || VIEW_W;
    const availH = Math.max(160, window.innerHeight - 250);
    let scale = Math.min(availW / VIEW_W, availH / VIEW_H);
    if (scale >= 2) scale = Math.floor(scale);
    canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
    canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
  }

  // =============================================================================================
  // 2. THE STATE
  // =============================================================================================
  const art = makeArt(world, level);
  const hazards = makeHazards(level.hazards, level.timing, level.floorY, TILE);
  let views: HazardView[] = hazards.map((hz) => hazardAt(hz, 0));
  let hero: SideHero | null = null;
  void loadSideHero().then((hh) => { hero = hh; });

  let mode: Mode = "ready";
  let soundOn = false;
  const beep = makeBeeper(SOUNDS, () => soundOn);

  // The flags: "C" on every track, "c" (extra) only on Easy and Intermediate.
  const flags: Flag[] = [];
  for (const letter of ["C", "c"]) {
    for (const [col, row] of world.find(letter)) {
      if (letter === "c" && rules.fewerFlags) continue;
      flags.push({ x: col * TILE + TILE / 2, y: (row + 1) * TILE, col, row, easyOnly: letter === "c", reached: false });
    }
  }
  flags.sort((a, b) => a.x - b.x);
  const startTile = world.find("P")[0] ?? [2, 11];
  const startPoint = { x: startTile[0] * TILE + TILE / 2, y: (startTile[1] + 1) * TILE };
  const finishX = (world.find("F")[0]?.[0] ?? world.w - 4) * TILE + TILE / 2;
  // The stampede's head start depends on the track: bigger on Easy, smaller on Hard.
  const stampede = level.stampede && { ...level.stampede, lead: level.stampede.lead + rules.stampedeSlack };
  const lineX = stampede ? stampede.line * TILE + TILE / 2 : Infinity;
  const signSpots = world.rows.flatMap((row, ty) => [...row].flatMap((ch, tx) => {
    const i = SIGN_KEYS.indexOf(ch);
    return i >= 0 && level.signs[i] ? [{ x: tx * TILE + TILE / 2, y: (ty + 1) * TILE, text: level.signs[i] }] : [];
  }));

  let body: Body = newBody(startPoint.x, startPoint.y);
  let clock = 0;          // seconds of play; drives every hazard's timeline
  let elapsed = 0;        // the level timer shown to the player
  let lives = rules.lives;
  let hearts = rules.hearts;
  let hits = 0;           // bonks from throwers and the stampede
  let falls = 0;          // tumbles into pits
  let lastFlag = -1;      // index into `flags` of the last one reached (-1 = the start)
  let stamp = { on: false, t: 0 };
  let dying = { t: 0, text: "", lifeLost: false };
  let fade = 0;           // 0 = clear, 1 = black
  let fadeDir: -1 | 0 | 1 = 0;
  let finishT = 0;
  let tapeBroken = false;
  let medalShown = "";
  let banner: Banner | null = null;
  let particles: Particle[] = [];
  let shake = 0;
  let pulse = 0;          // a number that rises with play time, for animation
  let wasWarning = false;
  let godMode = false;    // development only: nothing can hurt the hero
  const cam = { x: 0, y: 0, lean: 0, focusY: startPoint.y };

  const say = (title: string, sub = "", colour = "#ffd24a", life = 1.8) => { banner = { title, sub, colour, age: 0, life }; };

  // =============================================================================================
  // 3. UPDATE: one 60th of a second
  // =============================================================================================
  const undo: (() => void)[] = [];
  const controls = setupControls({
    on: (target, type, fn) => { target.addEventListener(type, fn); undo.push(() => target.removeEventListener(type, fn)); },
    pad: { left: padLeft, right: padRight, jump: padJump },
    onJumpDown: () => { soundOn = true; if (mode === "ready") begin(); else if (mode === "paused") setPaused(false); },
    onPause: () => { soundOn = true; if (mode === "playing") setPaused(true); else if (mode === "paused") setPaused(false); },
    onTouch: () => { soundOn = true; },
  });

  function begin() {
    mode = "playing";
    clock = 0; elapsed = 0; lives = rules.lives; hearts = rules.hearts; hits = 0; falls = 0; lastFlag = -1;
    for (const f of flags) f.reached = false;
    stamp = { on: false, t: 0 };
    tapeBroken = false; finishT = 0; medalShown = "";
    particles = [];
    placeHero(startPoint.x, startPoint.y);
    showCard(null);
    say("Go!", level.name, "#ffd24a", 1.4);
  }

  function placeHero(x: number, y: number) {
    body = newBody(x, y);
    body.onGround = true;
    body.invuln = T.respawnInvuln;
    cam.focusY = y;
    cam.lean = 0;
    cam.x = clamp(x - VIEW_W / 2, 0, world.pxW - VIEW_W);
    cam.y = clamp(y - VIEW_H * CAMERA.heroScreenY, 0, world.pxH - VIEW_H);
    if (x < lineX) stamp = { on: false, t: 0 };
  }

  function setPaused(p: boolean) {
    if (p && mode === "playing") { mode = "paused"; controls.releaseAll(); showCard("paused"); }
    else if (!p && mode === "paused") { mode = "playing"; showCard(null); }
    pauseBtn.textContent = mode === "paused" ? "Resume" : "Pause";
  }

  function spawn(kind: Particle["kind"], x: number, y: number, vx: number, vy: number, life: number, colour = "#e9dfc9") {
    particles.push({ x, y, vx, vy, age: 0, life, kind, colour });
  }
  function dust(x: number, y: number, n: number, spread = 30) {
    for (let i = 0; i < n; i++) spawn("dust", x + (Math.random() - 0.5) * 6, y, (Math.random() - 0.5) * spread, -Math.random() * 14, 0.35 + Math.random() * 0.2);
  }

  /** The y of the track under a pixel x, for the stampede runners (they ignore hurdles and pits). */
  function trackY(x: number) {
    const tx = clamp(Math.floor(x / TILE), 0, world.w - 1);
    for (let ty = 4; ty < world.h; ty++) if ("#TgsB".includes(world.tile(tx, ty))) return ty * TILE;
    return level.floorY;
  }

  function currentPart() {
    let name = level.sections[0]?.name ?? "";
    for (const s of level.sections) if (body.x >= s.from * TILE) name = s.name;
    return name;
  }

  function loseHeart(reason: string, fromPit = false) {
    hearts--;
    if (hearts <= 0) startDying(fromPit ? "Splash. Well, thud." : reason, true);
    else if (fromPit) startDying("Mind the gap.", false);
  }

  function startDying(text: string, lifeLost: boolean) {
    mode = "dying";
    dying = { t: 0, text, lifeLost };
    controls.releaseAll();
  }

  /** A bonk from a hazard. */
  function hurt(fromX: number) {
    bonk(body, fromX);
    hits++;
    shake = 0.25;
    beep("bonk");
    for (let i = 0; i < 5; i++) spawn("dust", body.x, body.y - 10, (Math.random() - 0.5) * 80, -Math.random() * 40, 0.4, "#ffd24a");
    if (hearts - 1 <= 0) say("BONK!", "Out of hearts", "#ff7a6a", 1.4);
    else say("BONK!", "", "#ff7a6a", 0.9);
    loseHeart("Out of hearts.");
  }

  function respawn() {
    if (dying.lifeLost) {
      if (Number.isFinite(lives)) lives--;
      hearts = rules.hearts;
      if (lives <= 0) { mode = "gameover"; fade = 0; fadeDir = 0; beep("over"); showCard("gameover"); return; }
    }
    const f = lastFlag >= 0 ? flags[lastFlag] : null;
    placeHero(f ? f.x : startPoint.x, f ? f.y : startPoint.y);
    mode = "playing";
    fadeDir = -1;
    say(f ? "Back at the flag" : "Back at the start", "", "#ffffff", 1.2);
  }

  function update(dt: number) {
    pulse += dt;
    if (banner) { banner.age += dt; if (banner.age > banner.life) banner = null; }
    shake = Math.max(0, shake - dt);
    // particles
    for (const p of particles) {
      p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === "confetti") { p.vy += 120 * dt; p.vx *= 0.99; }
    }
    particles = particles.filter((p) => p.age < p.life);
    // fades
    if (fadeDir !== 0) {
      fade = clamp(fade + fadeDir * dt * 3.2, 0, 1);
      if ((fadeDir === 1 && fade >= 1) || (fadeDir === -1 && fade <= 0)) fadeDir = 0;
    }

    if (mode === "playing" || mode === "dying") elapsed += dt; // a fall or a bonk costs you time, as it should
    if (mode === "playing" || mode === "dying" || mode === "finishing") clock += dt;

    views = hazards.map((hz) => hazardAt(hz, clock));
    const platforms = views.flatMap((v) => (v.platform ? [v.platform] : []));

    // ---- the hero ----
    const live = mode === "playing";
    const held = controls.jumpHeld();
    const input = live
      ? { left: controls.left, right: controls.right, down: controls.down, jumpHeld: held, jumpPressed: controls.takeJumpPress() }
      : { left: false, right: mode === "finishing" && finishT < 0.8, down: false, jumpHeld: false, jumpPressed: false }; // after the tape you run on a moment, then coast
    if (!live) controls.takeJumpPress();
    const ev = stepBody(body, input, world, platforms, dt);
    if (ev.jumped) { beep("jump"); dust(body.x, body.y, 3); }
    if (ev.landed > T.landMinFall) { beep("land"); dust(body.x, body.y, 4, 50); }
    if (ev.bounced) { beep("bounce"); dust(body.x, body.y, 6, 70); }

    // ---- the warning tick: a quiet blip as a wind up is about to finish ----
    const warning = views.some((v) => v.phase === "windup" && v.wind > 0.8 && Math.abs(hazards[views.indexOf(v)].x0 - body.x) < 260);
    if (warning && !wasWarning && live) beep("warn");
    wasWarning = warning;

    if (live) {
      // a pit
      if (body.y > world.pxH + T.fallDeadZone && !godMode) { falls++; shake = 0.2; beep("thud"); loseHeart("Out of hearts.", true); }

      // hazards
      if (mode === "playing" && body.invuln <= 0 && !godMode) {
        const box = boxOf(body);
        for (let i = 0; i < views.length; i++) {
          const from = hazardHit(views[i], box);
          if (from !== null) { hurt(from); break; }
        }
      }

      // flags
      flags.forEach((f, i) => {
        if (!f.reached && body.x >= f.x - 2 && i > lastFlag) {
          f.reached = true; lastFlag = i;
          beep("flag"); say("Checkpoint!", `Flag ${flags.filter((q) => q.reached).length} of ${flags.length}`, "#7fe0a0", 1.6);
        }
      });

      // the stampede
      if (stampede && !stamp.on && body.x >= lineX) {
        stamp = { on: true, t: 0 };
        beep("bang"); say("BANG!", "The stampede. Run!", "#ff7a6a", 2.2); shake = 0.3;
      }
      if (stamp.on && stampede && mode === "playing") {
        stamp.t += dt;
        if (!godMode && body.x - 5 < packFront(stampede!, lineX, stamp.t)) {
          bonk(body, body.x - 60);
          hits++; shake = 0.4; beep("bonk");
          startDying("Trampled. Politely.", true);
        }
      }

      // the finish tape
      if (body.x >= finishX && mode === "playing") {
        mode = "finishing"; finishT = 0; tapeBroken = true; stamp.on = false;
        beep("win");
        for (let i = 0; i < 70; i++) spawn("confetti", finishX + (Math.random() - 0.5) * 40, body.y - 50 - Math.random() * 30, (Math.random() - 0.5) * 130, -60 - Math.random() * 80, 2 + Math.random(), ["#d8402f", "#f0a31a", "#3fae6a", "#2f7fc4", "#f4efe6", "#e86fa0"][i % 6]);
        say("FINISH!", "", "#ffd24a", 2.5);
      }
    }

    if (mode === "dying") {
      dying.t += dt;
      if (dying.t > 0.75 && fadeDir === 0 && fade < 1) fadeDir = 1;
      if (fade >= 1 && dying.t > 0.9) respawn();
    }
    if (mode === "finishing") {
      finishT += dt;
      if (finishT > 1.9) finishLevel();
    }
    if (stamp.on && mode === "dying") stamp.t += dt;

    updateCamera(dt);
  }

  function updateCamera(dt: number) {
    const moving = Math.abs(body.vx) > 20;
    const wantLean = moving ? Math.sign(body.vx) * CAMERA.lookAhead : cam.lean;
    cam.lean += (wantLean - cam.lean) * Math.min(1, CAMERA.leanSpeed * dt);
    const target = clamp(body.x + cam.lean - VIEW_W / 2, 0, world.pxW - VIEW_W);
    const diff = target - cam.x;
    const over = Math.abs(diff) - CAMERA.deadZone;
    if (over > 0) cam.x += Math.sign(diff) * over * Math.min(1, CAMERA.followSpeed * dt);
    // up and down: follow the ground you stand on, not every hop
    if (body.onGround) cam.focusY = body.y;
    else if (body.y > cam.focusY + CAMERA.vertDead) cam.focusY = body.y - CAMERA.vertDead;
    else if (body.y < cam.focusY - 60) cam.focusY = body.y + 60;
    const wantY = clamp(cam.focusY - VIEW_H * CAMERA.heroScreenY, 0, world.pxH - VIEW_H);
    cam.y += (wantY - cam.y) * Math.min(1, CAMERA.vertSpeed * dt);
  }

  // ---- finishing ----
  const medalNames: Record<string, string> = { gold: "Gold", silver: "Silver", bronze: "Bronze", ribbon: "Participation ribbon" };
  function medalFor(seconds: number) {
    const m = level.medals;
    return seconds <= m.gold ? "gold" : seconds <= m.silver ? "silver" : seconds <= m.bronze ? "bronze" : "ribbon";
  }
  function finishLevel() {
    const time = elapsed;
    const best = loadBest(bestKey);
    const isBest = best === null || time < best;
    if (isBest) saveBest(bestKey, time);
    awardStamp(GAME_ROUTE);
    medalShown = medalFor(time);
    mode = "results";
    showCard("results", { time, best: isBest ? time : best!, isBest });
  }

  // =============================================================================================
  // 4. DRAWING
  // =============================================================================================
  const PX = "Silkscreen, 'Courier New', monospace";
  function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, colour: string, align: CanvasTextAlign = "left") {
    g.font = `${size}px ${PX}`;
    g.textBaseline = "top";
    g.textAlign = align;
    g.fillStyle = OUT;
    g.fillText(s, Math.round(x) + 1, Math.round(y) + 1);
    g.fillStyle = colour;
    g.fillText(s, Math.round(x), Math.round(y));
  }

  function drawHero(g: CanvasRenderingContext2D, camX: number, camY: number) {
    if (!hero) return;
    const b = body;
    // a soft shadow on the ground
    if (b.onGround) { g.globalAlpha = 0.25; R(g, b.x - camX - 6, b.y - camY - 1, 12, 2, "#000000"); g.globalAlpha = 1; }
    // which of the 10 frames?
    let pose: number;
    if (b.hurt > 0) pose = 9;
    else if (!b.onGround) pose = b.vy < 0 ? 6 : 7;
    else if (b.land > 0) pose = 8;
    else if (Math.abs(b.vx) > 14) pose = 2 + (Math.floor(b.runPhase) % 4);
    else pose = Math.floor(pulse / 0.6) % 2;
    const frame = hero.frameMap[pose] ?? pose;
    // flash while safe after a bonk or a respawn
    if (b.invuln > 0 && Math.floor(b.invuln * 14) % 2 === 0) return;
    g.save();
    g.translate(Math.round(b.x - camX), Math.round(b.y - camY));
    g.scale(b.facing, 1);
    g.drawImage(hero.image, frame * hero.frameW, 0, hero.frameW, hero.frameH, -Math.round(hero.frameW / 2), -hero.frameH, hero.frameW, hero.frameH);
    g.restore();
    if (b.hurt > 0) stars(g, b.x - camX, b.y - camY - 30, pulse);
  }

  /** A small warning triangle with an exclamation mark. */
  function warnIcon(g: CanvasRenderingContext2D, cx: number, top: number, colour: string) {
    for (let k = 0; k < 12; k++) {
      const half = 1 + Math.floor(k * 0.6);
      R(g, cx - half - 1, top + k, half * 2 + 3, 1, OUT);
    }
    for (let k = 1; k < 11; k++) {
      const half = Math.floor(k * 0.6);
      R(g, cx - half, top + k, half * 2 + 1, 1, colour);
    }
    R(g, cx - 1, top + 4, 2, 4, OUT); R(g, cx - 1, top + 9, 2, 1, OUT);
  }

  /**
   * THE WARNINGS. Every hazard shows where and when before it arrives. They flash faster as the
   * moment gets closer: a ring on the ground and a red beam for a shot or javelin, a lane of
   * marching arrows for the hammer.
   */
  function drawMarkers(g: CanvasRenderingContext2D, camX: number, camY: number) {
    views.forEach((v, i) => {
      const hz = hazards[i];
      if (!v.marker) return;
      const m = v.marker;
      const x = m.x - camX, y = m.y - camY;
      if (x < -300 || x > VIEW_W + 300) return;
      const urgency = v.phase === "windup" ? v.wind : 1;
      const rate = 3 + 9 * urgency;
      const on = Math.floor(pulse * rate) % 2 === 0;
      const strong = 0.5 + 0.5 * urgency;
      if (hz.kind === "hammer") {
        const len = m.length;
        const x0 = m.dir > 0 ? x : x - len;
        g.globalAlpha = (on ? 0.32 : 0.16) * strong + 0.06;
        R(g, x0, y - 20, len, 20, "#ff3b2e");
        g.globalAlpha = Math.min(1, strong + 0.2);
        const march = (pulse * 70) % 22;
        for (let d = 8; d < len - 4; d += 22) {
          const cx = x + m.dir * (d + (v.phase === "windup" ? 0 : march));
          if (Math.abs(cx - x) > len - 4) continue;
          for (let k = 0; k < 5; k++) {
            const off = (k < 3 ? k : 4 - k) * m.dir;
            R(g, cx - 5 * m.dir * 0 + off - (m.dir > 0 ? 0 : 1), y - 14 + k * 2, 3, 2, OUT);
            R(g, cx + off - (m.dir > 0 ? 0 : 1) + 0, y - 14 + k * 2, 2, 2, on ? "#ffffff" : "#ff7a6a");
          }
        }
        g.globalAlpha = 1;
        warnIcon(g, x, y - 58 + Math.round(Math.sin(pulse * 8) * 2), on ? "#ff5a4a" : "#ffd24a");
      } else {
        const col = hz.kind === "shot" ? "#ff4a3a" : "#ffa21e";
        // a beam of light from the sky onto the spot
        g.globalAlpha = 0.2 + (on ? 0.16 : 0.04) * strong;
        R(g, x - 10, y - 84, 20, 84, col);
        g.globalAlpha = 1;
        // the ring on the ground
        g.globalAlpha = on ? 1 : 0.55;
        R(g, x - 15, y - 1, 30, 4, OUT);
        R(g, x - 14, y, 28, 2, col);
        R(g, x - 9, y - 2, 18, 1, col);
        g.globalAlpha = 1;
        // the arrow pointing at it
        const bob = Math.round(Math.sin(pulse * 8) * 2);
        for (let k = 0; k < 9; k++) R(g, x - 8 + Math.floor(k / 2) - 1, y - 40 + bob + k, 18 - Math.floor(k / 2) * 2 + 0, 1, OUT);
        for (let k = 1; k < 8; k++) R(g, x - 8 + Math.floor(k / 2), y - 40 + bob + k, 16 - Math.floor(k / 2) * 2, 1, on ? col : "#ffffff");
        R(g, x - 3, y - 52 + bob, 7, 12, OUT); R(g, x - 2, y - 51 + bob, 5, 11, on ? col : "#ffffff");
        // which way a shot will roll after it lands
        if (hz.kind === "shot") for (let d = 0; d < 3; d++) {
          const ax = x + m.dir * (20 + d * 10);
          R(g, ax - 1, y - 7, 3, 7, OUT); R(g, ax - (m.dir > 0 ? 0 : -1), y - 6, 2, 5, col);
        }
      }
    });
  }

  function drawThrowers(g: CanvasRenderingContext2D, camX: number, camY: number) {
    hazards.forEach((hz, i) => {
      const v = views[i];
      const x = hz.x0 - camX;
      if (x < -40 || x > VIEW_W + 40) return;
      const feetY = hz.floor - 10 - camY;
      const kit = KITS[(i + 1) % KITS.length];
      let pose: Pose = "stand";
      if (v.pose === 1) pose = hz.kind === "hammer" ? "spin" : "windup";
      else if (v.pose === 2) pose = "throw";
      const crouch = v.pose === 1 && hz.kind !== "hammer" && Math.floor(pulse * 6) % 2 === 0;
      athlete(g, x, feetY + (crouch ? 1 : 0), hz.dir, pose, kit, pulse * 2, String(i + 3));
      // the javelin / shot waiting in the hand while winding up
      if (v.phase === "windup" && hz.kind === "javelin") line(g, x - hz.dir * 7, feetY - 30, x + hz.dir * 14, feetY - 38, 2, "#e6ebf0");
      if (v.phase === "windup" && hz.kind === "shot") disc(g, x + hz.dir * 4, feetY - 24, 4, "#5d6672");
      // the officials who take a stuck javelin away
      if (hz.kind === "javelin" && (v.phase === "removing")) {
        const sp = v.spear!;
        const k = clamp((v.progress - (1 - level.timing.javelin.removal / level.timing.javelin.stuck)) * (level.timing.javelin.stuck / level.timing.javelin.removal), 0, 1);
        const ox = sp.tailX - camX - hz.dir * (30 - 22 * Math.min(1, k * 3));
        official(g, ox, sp.tipY - 5 - camY - 4, hz.dir, k > 0.34 ? "tug" : "stand", pulse * 3, "#b03a2e");
      }
    });
    // the starter, standing by the line with a pistol
    if (stampede) {
      const sx = lineX - camX + 20;
      if (sx > -30 && sx < VIEW_W + 30) {
        const fired = stamp.on && stamp.t < 0.6;
        official(g, sx, level.floorY - 10 - camY, -1, fired ? "pistol" : "pistol", 0, "#2b3a8f");
        if (fired) { disc(g, sx - 12, level.floorY - 10 - camY - 30, 5 + stamp.t * 10, "#fff6dc"); }
      }
    }
  }

  function drawProjectiles(g: CanvasRenderingContext2D, camX: number, camY: number) {
    views.forEach((v, i) => {
      const hz = hazards[i];
      if (v.ball) {
        const b = v.ball;
        const fade = v.phase === "gone" ? 1 - v.progress : 1;
        g.globalAlpha = fade;
        if (hz.kind === "hammer") drawHammer(g, b.x - camX, b.y - camY, hz.dir, b.spin, v.phase === "flight");
        else drawShot(g, b.x - camX, b.y - camY, b.spin, b.r);
        g.globalAlpha = 1;
      }
      if (v.spear) {
        const s = v.spear;
        const removing = v.phase === "removing" && Math.floor(pulse * 10) % 2 === 0;
        g.globalAlpha = removing ? 0.45 : 1;
        drawSpear(g, s.tipX - camX, s.tipY - camY, s.tailX - camX, s.tailY - camY);
        g.globalAlpha = 1;
        if (v.platform) {
          // a ribbon and a little cap at the tail so it looks like something to stand on
          R(g, s.tailX - camX - 11, s.tailY - camY - 2, 22, 4, OUT);
          R(g, s.tailX - camX - 10, s.tailY - camY - 2, 20, 2, v.phase === "removing" ? "#ffd24a" : "#d8402f");
          for (let k = 0; k < 5; k++) R(g, s.tailX - camX - 10 + k * 4 + 2, s.tailY - camY - 2, 2, 2, "#f4efe6");
        }
      }
      // landing thuds
      if (v.phase === "flight" && v.progress > 0.93 && hz.kind !== "hammer") puff(g, hz.tx - camX, hz.floor - camY, 0.3, 1);
      if (hz.kind === "javelin" && v.phase === "stuck" && v.progress * hz.stuck < 0.4) puff(g, hz.tx - camX, hz.floor - camY, (v.progress * hz.stuck) / 0.4, 1.2);
    });
  }

  function drawPack(g: CanvasRenderingContext2D, camX: number, camY: number) {
    if (!stamp.on || !stampede) return;
    const front = packFront(stampede!, lineX, stamp.t);
    const n = 15;
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => ((a * 7) % 3) - ((b * 7) % 3));
    for (const i of order) {
      const back = (i * 17) % 92;
      const lane = ((i * 7) % 3) * 2 - 1;
      const x = front - back;
      if (x - camX < -30 || x - camX > VIEW_W + 30) continue;
      const bounce = Math.abs(Math.sin((stamp.t + i * 0.37) * 11)) * 2;
      const y = trackY(x) - lane; // the same lane as the hero, a little spread out
      athlete(g, x - camX, y - camY - bounce, 1, "run", KITS[i % KITS.length], stamp.t * 2.6 + i * 0.31, String((i * 13) % 90 + 10));
      if (i % 4 === 0) spawnTrailDust(x, y);
    }
    // an arrow at the edge of the screen when the pack is just off it
    const edge = front - camX;
    if (edge < 12 && edge > -260) {
      const on = Math.floor(pulse * 6) % 2 === 0;
      if (on) { text(g, "< RUNNERS", 6, 40, 8, "#ff7a6a"); }
    }
  }
  let trailTick = 0;
  function spawnTrailDust(x: number, y: number) {
    trailTick++;
    if (trailTick % 14 === 0) spawn("dust", x - 6, y, -20, -10, 0.4);
  }

  function drawParticles(g: CanvasRenderingContext2D, camX: number, camY: number) {
    for (const p of particles) {
      if (p.kind === "dust") puff(g, p.x - camX, p.y - camY, p.age / p.life, 1);
      else {
        g.globalAlpha = Math.min(1, (p.life - p.age) * 2);
        R(g, p.x - camX, p.y - camY, 3, 2, p.colour);
        g.globalAlpha = 1;
      }
    }
  }

  function drawTape(g: CanvasRenderingContext2D, camX: number, camY: number) {
    const x = finishX - camX;
    if (x < -40 || x > VIEW_W + 40) return;
    const y = level.floorY - camY;
    if (!tapeBroken) {
      R(g, x - 1, y - 40, 3, 30, "#f4efe6");
      for (let k = 0; k < 6; k++) R(g, x - 1, y - 40 + k * 5, 3, 2, "#d8402f");
    } else {
      const t = finishT;
      // two halves fluttering away
      for (const s of [-1, 1]) {
        for (let k = 0; k < 14; k++) R(g, x + s * (k + t * 20), y - 36 + k * 0.5 + t * 14 * (k / 14) + Math.sin(pulse * 9 + k) * 1.5, 3, 2, k % 2 ? "#d8402f" : "#f4efe6");
      }
    }
  }

  function draw() {
    const g = ctx;
    const sx = shake > 0 ? Math.round((Math.random() - 0.5) * 6 * Math.min(1, shake * 4)) : 0;
    const sy = shake > 0 ? Math.round((Math.random() - 0.5) * 4 * Math.min(1, shake * 4)) : 0;
    const camX = Math.round(cam.x) + sx, camY = Math.round(cam.y) + sy;
    g.imageSmoothingEnabled = false;
    art.drawBack(g, camX, camY, pulse);
    art.drawTiles(g, camX, camY, pulse, new Set(flags.filter((f) => f.reached).map((f) => `${f.col},${f.row}`)));
    drawMarkers(g, camX, camY);
    drawThrowers(g, camX, camY);
    drawTape(g, camX, camY);
    drawHero(g, camX, camY);
    drawPack(g, camX, camY);
    drawProjectiles(g, camX, camY);
    drawParticles(g, camX, camY);

    // a sign you are standing near: its words
    if (mode === "playing" || mode === "paused") {
      const near = signSpots.find((s) => Math.abs(s.x - body.x) < 26 && Math.abs(s.y - body.y) < 40);
      if (near) drawSignText(g, near.text);
    }
    // the banner
    if (banner) {
      const k = banner.age < 0.15 ? banner.age / 0.15 : banner.age > banner.life - 0.3 ? (banner.life - banner.age) / 0.3 : 1;
      g.globalAlpha = clamp(k, 0, 1) * 0.85;
      R(g, 0, 32, VIEW_W, banner.sub ? 44 : 28, "#0a0f1f"); // a dark band so the words read over the crowd and the scoreboard
      g.globalAlpha = clamp(k, 0, 1);
      text(g, banner.title, VIEW_W / 2, 40 - (1 - k) * 6, 16, banner.colour, "center");
      if (banner.sub) text(g, banner.sub, VIEW_W / 2, 62, 8, "#ffffff", "center");
      g.globalAlpha = 1;
    }
    // the dying text
    if (mode === "dying" && dying.t > 0.1) text(g, dying.text, VIEW_W / 2, 90, 8, "#ffffff", "center");
    if (fade > 0) { g.globalAlpha = fade; R(g, 0, 0, VIEW_W, VIEW_H, "#000000"); g.globalAlpha = 1; }
  }

  function drawSignText(g: CanvasRenderingContext2D, s: string) {
    g.font = `8px ${PX}`;
    const maxW = VIEW_W - 40;
    const words = s.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (g.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    lines.push(cur);
    const w = Math.min(maxW, Math.max(...lines.map((l) => g.measureText(l).width))) + 12;
    const hh = lines.length * 10 + 8;
    const x = Math.round((VIEW_W - w) / 2), y = 8;
    R(g, x - 1, y - 1, w + 2, hh + 2, OUT);
    R(g, x, y, w, hh, "#f3e6c4");
    lines.forEach((l, i) => { g.font = `8px ${PX}`; g.textBaseline = "top"; g.textAlign = "left"; g.fillStyle = "#4a2f16"; g.fillText(l, x + 6, y + 5 + i * 10); });
  }

  // =============================================================================================
  // 5. THE CARDS, THE HUD, THE LOOP
  // =============================================================================================
  function showCard(kind: null | "ready" | "paused" | "results" | "gameover", extra?: { time: number; best: number; isBest: boolean }) {
    card.replaceChildren();
    card.classList.toggle("open", kind !== null);
    if (kind === null) return;
    const again = h("button", { class: "btn", type: "button", onclick: () => { soundOn = true; begin(); } }, kind === "results" ? "Play again" : "Try again");
    const back = h("a", { class: "btn ghost", href: "#" }, "◂ Back to the island");
    let body: (HTMLElement | null)[];
    if (kind === "ready") {
      body = [
        h("p", { class: "brawl-kicker" }, `Level ${levelNumber}`),
        h("h2", {}, level.name),
        h("p", {}, level.tagline),
        h("p", { class: "muted" }, track === "easy" ? "Unlimited tries. Five hearts." : track === "intermediate" ? "Five tries. Three hearts." : "Three tries. Two hearts. Fewer flags."),
        h("button", { class: "btn", type: "button", onclick: () => { soundOn = true; begin(); } }, "Start ▸"),
        h("p", { class: "muted" }, "Press Space or tap Start."),
      ];
    } else if (kind === "paused") {
      body = [h("h2", {}, "Paused"), h("button", { class: "btn", type: "button", onclick: () => setPaused(false) }, "Resume ▸"), back];
    } else if (kind === "gameover") {
      body = [h("h2", {}, "Out of tries"), h("p", {}, "The meet goes on without you. It barely noticed."), again, back];
    } else {
      const e = extra!;
      body = [
        h("p", { class: "brawl-kicker" }, "Finished"),
        h("h2", { class: `brawl-medal ${medalShown}` }, medalShown === "ribbon" ? "Participation ribbon" : `${medalNames[medalShown]} medal`),
        h("dl", { class: "brawl-results" },
          h("dt", {}, "Time"), h("dd", {}, fmt(e.time)),
          h("dt", {}, "Best"), h("dd", {}, e.isBest ? `${fmt(e.best)} (new best)` : fmt(e.best)),
          h("dt", {}, "Hits taken"), h("dd", {}, String(hits)),
          h("dt", {}, "Tumbles"), h("dd", {}, String(falls)),
        ),
        h("p", { class: "muted" }, `Gold under ${formatTime(level.medals.gold)}, silver under ${formatTime(level.medals.silver)}, bronze under ${formatTime(level.medals.bronze)}.`),
        h("p", { class: "brawl-stamp" }, "★ Stamp collected on the island"),
        again, back,
      ];
    }
    card.append(h("div", { class: "brawl-card", role: "dialog", "aria-modal": "true" }, ...body));
    (card.querySelector("button, a") as HTMLElement | null)?.focus({ preventScroll: true });
  }
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

  let lastHud = "";
  function updateHud() {
    const heartsText = Array.from({ length: rules.hearts }, (_, i) => (i < hearts ? "♥" : "♡")).join("");
    const livesText = Number.isFinite(lives) ? `Tries ${lives}` : "Tries ∞";
    const reached = flags.filter((f) => f.reached).length;
    const key = [heartsText, livesText, reached, flags.length, currentPart(), Math.floor(elapsed * 10)].join("|");
    if (key === lastHud) return;
    lastHud = key;
    hudHearts.textContent = heartsText;
    hudLives.textContent = livesText;
    hudFlag.textContent = `Flags ${reached}/${flags.length}`;
    hudPart.textContent = currentPart();
    hudTime.textContent = `Time ${fmt(elapsed)}`;
  }

  // keys and buttons are wired in setupControls above; here are the rest
  const listen = <T extends EventTarget>(target: T, type: string, fn: (e: any) => void) => {
    target.addEventListener(type, fn);
    undo.push(() => target.removeEventListener(type, fn));
  };
  listen(pauseBtn, "click", () => { soundOn = true; setPaused(mode === "playing"); pauseBtn.blur(); });
  listen(document, "visibilitychange", () => { if (document.hidden) setPaused(true); });
  listen(window, "blur", () => { controls.releaseAll(); });
  listen(window, "resize", fit);
  listen(canvas, "pointerdown", () => { soundOn = true; if (mode === "ready") begin(); else if (mode === "paused") setPaused(false); });
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
  if (screenBox.parentElement) ro?.observe(screenBox.parentElement);
  fit();

  // The development copy gets a few handles for testing by script. They do not exist on the real site.
  if (import.meta.env.DEV) {
    const api = {
      info: () => ({
        mode, x: body.x, y: body.y, vx: body.vx, vy: body.vy, onGround: body.onGround, ground: body.ground, hearts, lives, hits, falls, elapsed, clock,
        lastFlag, flags: flags.map((f) => ({ x: f.x, reached: f.reached })), stamp: { ...stamp }, cam: { x: cam.x, y: cam.y }, invuln: body.invuln,
        views: views.map((v, i) => ({ kind: hazards[i].kind, phase: v.phase, wind: v.wind, cycle: v.cycle, ball: v.ball, platform: v.platform })),
        track, medal: medalShown, packX: stampede && stamp.on ? packFront(stampede, lineX, stamp.t) : null, finishX, lineX,
      }),
      rows: level.rows,
      start: () => { if (mode === "ready") begin(); },
      warp: (px: number, py?: number) => { const y = py ?? groundTop(world, Math.floor(px / TILE), 4) ?? level.floorY; body.x = px; body.y = y; body.vx = 0; body.vy = 0; cam.x = clamp(px - VIEW_W / 2, 0, world.pxW - VIEW_W); cam.focusY = y; cam.y = clamp(y - VIEW_H * CAMERA.heroScreenY, 0, world.pxH - VIEW_H); },
      setClock: (t: number) => { clock = t; },
      god: (on: boolean) => { godMode = on; },
      step: (n: number) => { for (let i = 0; i < n; i++) update(STEP_SECONDS); },
    };
    (window as any).__brawl = api;
    undo.push(() => { delete (window as any).__brawl; });
  }

  showCard("ready");
  placeHero(startPoint.x, startPoint.y);
  body.invuln = 0;

  const stopLoop = startLoop({
    step: STEP_SECONDS,
    // (In the development copy a test script can set window.__brawlFrozen to hold the game still and step it by hand.)
    playing: () => (mode === "playing" || mode === "dying" || mode === "finishing") && !(import.meta.env.DEV && (window as any).__brawlFrozen),
    update,
    idle: () => { if (mode === "ready") { pulse += 0.016; updateCamera(0.016); } },
    draw: () => { draw(); updateHud(); },
  });

  return () => {
    stopLoop();
    ro?.disconnect();
    undo.forEach((f) => f());
  };
}
