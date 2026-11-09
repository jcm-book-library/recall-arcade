// THE HERO'S BODY: running, jumping, falling and bumping into things.
// Read tuning.ts first: it explains the ideas (velocity, friction, gravity, coyote time...).
//
// HOW COLLISION WORKS (axis-separated AABB, the classic way for tile games):
//   "AABB" means a box that is not tilted. The hero is one small box. The world is a grid of 16 px tiles.
//   Each tick we move the hero SIDEWAYS first, then push it back out of any wall it ended up inside.
//   THEN we move it UP/DOWN and do the same. Doing the two directions one at a time (axis by axis)
//   is what lets you slide along a wall while falling, and stand neatly on the floor.
//   ONE-WAY PLATFORMS only count when you are falling onto them from above. Going up, you pass through.
//   They are the reason the pass-through check looks at where the feet WERE last tick.
//
// The body is described by its FEET: `x` is the middle of the hero, `y` is the bottom of its shoes.
import { TUNING as T, TILE } from "./tuning.ts";
import type { Rect, World } from "./world.ts";

export interface Body {
  x: number; y: number;           // middle of the hero, and the soles of its feet (pixels)
  vx: number; vy: number;         // velocity (pixels per second)
  onGround: boolean;
  facing: 1 | -1;
  coyote: number;                 // seconds left in which a jump still works after leaving a ledge
  buffer: number;                 // seconds left in which an early jump press is remembered
  jumping: boolean;               // true from take-off until you land (lets a short press cut the jump)
  stun: number;                   // seconds left that you can not steer (after a bonk)
  hurt: number;                   // seconds left of the "ouch" pose
  invuln: number;                 // seconds left in which nothing can hurt you
  land: number;                   // seconds left of the landing squash
  drop: number;                   // seconds left of ignoring one-way platforms (after pressing Down)
  runPhase: number;               // counts up while running: decides which run frame to show
  ground: string;                 // the letter of the tile you are standing on ("" in the air)
}

export interface Input {
  left: boolean; right: boolean; down: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;           // true only on the tick the key went down
}

export interface StepEvents { jumped: boolean; landed: number; bounced: boolean; bonkedHead: boolean }

export function newBody(x: number, y: number): Body {
  return {
    x, y, vx: 0, vy: 0, onGround: false, facing: 1, coyote: 0, buffer: 0, jumping: false,
    stun: 0, hurt: 0, invuln: 0, land: 0, drop: 0, runPhase: 0, ground: "",
  };
}

/** The hitbox as a rectangle. */
export function boxOf(b: Body): Rect {
  return { x: b.x - T.bodyW / 2, y: b.y - T.bodyH, w: T.bodyW, h: T.bodyH };
}

/** Move `v` towards `target` by at most `delta` without overshooting. */
function approach(v: number, target: number, delta: number) {
  if (v < target) return Math.min(v + delta, target);
  return Math.max(v - delta, target);
}

/**
 * Move the hero forward by `dt` seconds. `platforms` are extra one-way ledges that are not in the
 * map (the javelins that stick in the ground). Returns what happened, so the game can play sounds
 * and puff dust.
 */
export function stepBody(b: Body, input: Input, world: World, platforms: Rect[], dt: number): StepEvents {
  const ev: StepEvents = { jumped: false, landed: 0, bounced: false, bonkedHead: false };
  const wasOnGround = b.onGround;
  const stunned = b.stun > 0;

  // ---- timers count down ----
  b.stun = Math.max(0, b.stun - dt);
  b.hurt = Math.max(0, b.hurt - dt);
  b.invuln = Math.max(0, b.invuln - dt);
  b.land = Math.max(0, b.land - dt);
  b.drop = Math.max(0, b.drop - dt);
  b.coyote = b.onGround ? T.coyoteTime : Math.max(0, b.coyote - dt);
  b.buffer = input.jumpPressed && !stunned ? T.jumpBuffer : Math.max(0, b.buffer - dt);

  // ---- sideways: accelerate towards the speed you want ----
  const dir = stunned ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const slow = b.onGround && b.ground === "s" ? T.sandSlow : 1;
  if (dir !== 0) {
    b.facing = dir as 1 | -1;
    const turning = b.vx !== 0 && Math.sign(b.vx) === -dir;
    const rate = b.onGround ? T.runAccel + (turning ? T.turnBrake : 0) : T.airAccel;
    b.vx = approach(b.vx, dir * T.maxRun * slow, rate * dt);
  } else {
    b.vx = approach(b.vx, 0, (b.onGround ? T.runFriction : T.airFriction) * dt);
  }

  // ---- drop through a one-way platform ----
  if (input.down && b.onGround && !stunned && (b.ground === "=" || b.ground === "x")) b.drop = T.dropTime;

  // ---- jump: allowed while on the ground OR within coyote time; the buffer remembers early presses ----
  if (b.buffer > 0 && b.coyote > 0 && !stunned) {
    b.vy = -T.jumpSpeed;
    b.buffer = 0;
    b.coyote = 0;
    b.onGround = false;
    b.jumping = true;
    ev.jumped = true;
  }

  // ---- gravity ----
  let g = b.vy < 0 ? T.gravityRise : T.gravityFall;
  if (b.vy < 0 && b.jumping && !input.jumpHeld) g *= T.jumpCutMul; // let go early = lower jump
  if (Math.abs(b.vy) < T.apexSpeed && !b.onGround) g *= T.apexGravityMul; // float at the top
  b.vy = Math.min(b.vy + g * dt, T.maxFall);
  const fallSpeed = b.vy;

  // ---- move sideways, then push out of walls ----
  b.x += b.vx * dt;
  {
    const half = T.bodyW / 2;
    const top = b.y - T.bodyH + 0.01, bottom = b.y - 0.01;
    const ty0 = Math.floor(top / TILE), ty1 = Math.floor(bottom / TILE);
    const tx0 = Math.floor((b.x - half) / TILE), tx1 = Math.floor((b.x + half - 0.001) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (!world.solid(tx, ty)) continue;
        if (b.vx > 0 || (b.vx === 0 && b.facing === 1)) b.x = tx * TILE - half;
        else b.x = (tx + 1) * TILE + half;
        b.vx = 0;
        return finishVertical(b, input, world, platforms, dt, ev, wasOnGround, fallSpeed);
      }
    }
  }
  return finishVertical(b, input, world, platforms, dt, ev, wasOnGround, fallSpeed);
}

function finishVertical(b: Body, input: Input, world: World, platforms: Rect[], dt: number, ev: StepEvents, wasOnGround: boolean, fallSpeed: number): StepEvents {
  const half = T.bodyW / 2;
  const prevBottom = b.y;
  b.y += b.vy * dt;
  b.onGround = false;
  b.ground = "";
  const tx0 = Math.floor((b.x - half) / TILE), tx1 = Math.floor((b.x + half - 0.001) / TILE);

  if (b.vy >= 0) {
    // FALLING (or standing): find the highest floor we crossed this tick.
    let floor: number | null = null;
    let letter = "";
    const ty0 = Math.floor((prevBottom - 0.01) / TILE), ty1 = Math.floor(b.y / TILE);
    for (let ty = Math.max(0, ty0); ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const solid = world.solid(tx, ty);
        const oneWay = world.oneWay(tx, ty) && b.drop <= 0 && prevBottom <= ty * TILE + 0.01;
        if (!solid && !oneWay) continue;
        const top = ty * TILE;
        if (b.y >= top && (floor === null || top < floor)) { floor = top; letter = world.tile(tx, ty); }
        else if (top === floor && world.tile(tx, ty) === "B") letter = "B";
      }
    }
    if (b.drop <= 0) {
      for (const p of platforms) {
        if (b.x + half <= p.x || b.x - half >= p.x + p.w) continue;
        if (prevBottom <= p.y + 0.01 && b.y >= p.y && (floor === null || p.y < floor)) { floor = p.y; letter = "x"; }
      }
    }
    if (floor !== null) {
      b.y = floor;
      b.onGround = true;
      b.ground = letter;
      b.vy = 0;
      b.jumping = false;
      if (!wasOnGround) {
        ev.landed = fallSpeed;
        if (letter === "B" && fallSpeed > 120) {
          b.vy = -(input.jumpHeld ? T.bounceHeld : T.bounceSpeed);
          b.onGround = false;
          b.jumping = true;
          b.coyote = 0;
          ev.bounced = true;
        } else if (fallSpeed > T.landMinFall && letter !== "s") {
          b.land = T.landTime;
        }
      }
    }
  } else {
    // RISING: bonk the head on a solid ceiling.
    const ty = Math.floor((b.y - T.bodyH) / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      if (world.solid(tx, ty)) {
        b.y = (ty + 1) * TILE + T.bodyH;
        b.vy = 0;
        ev.bonkedHead = true;
        break;
      }
    }
  }

  // ---- the walking animation clock ----
  if (b.onGround && Math.abs(b.vx) > 8) b.runPhase += (Math.abs(b.vx) / T.maxRun) * T.runFps * dt;
  return ev;
}

/** Give the hero a bonk: knocked away from `fromX`, stunned, flashing, safe for a moment. */
export function bonk(b: Body, fromX: number) {
  const away = b.x >= fromX ? 1 : -1;
  b.vx = away * T.knockX;
  b.vy = -T.knockY;
  b.onGround = false;
  b.jumping = false;
  b.stun = T.stunTime;
  b.hurt = T.hurtTime;
  b.invuln = T.invulnTime;
}

// ---------------------------------------------------------------------------------------------
// What can this hero do? The checker script asks these questions.
// ---------------------------------------------------------------------------------------------
const FLAT: Input = { left: false, right: true, down: false, jumpHeld: true, jumpPressed: false };

/**
 * Work out, by really running the physics on an empty level, how high and how far a full
 * jump goes. `height` is the most you can rise (pixels), `reach` is how far you travel sideways
 * while at or above take-off height (for a gap), `airtime` is how long that takes. `tapHeight`
 * is the smallest hop you can make by tapping the key.
 */
export function jumpStats() {
  const empty: World = {
    w: 400, h: 40, rows: [], pxW: 6400, pxH: 640,
    tile: (_x, y) => (y >= 30 ? "#" : "."), solid: (_x, y) => y >= 30, oneWay: () => false, find: () => [],
  };
  const run = (holdFrames: number) => {
    const b = newBody(100, 30 * TILE);
    b.onGround = true;
    for (let i = 0; i < 120; i++) stepBody(b, FLAT, empty, [], 1 / 60); // get up to full speed first
    let top = b.y, x0 = b.x, i = 0, reach = 0, air = 0;
    stepBody(b, { ...FLAT, jumpPressed: true }, empty, [], 1 / 60);
    x0 = b.x;
    for (i = 0; i < 400; i++) {
      stepBody(b, { ...FLAT, jumpHeld: i < holdFrames }, empty, [], 1 / 60);
      top = Math.min(top, b.y);
      if (b.onGround) break;
    }
    air = i / 60;
    reach = b.x - x0 + b.vx * 0; // sideways travel from take-off to touch-down at the same height
    return { height: 30 * TILE - top, reach, airtime: air };
  };
  const full = run(1000);
  const tap = run(0);
  return { height: full.height, reach: full.reach, airtime: full.airtime, tapHeight: tap.height, tapReach: tap.reach };
}
