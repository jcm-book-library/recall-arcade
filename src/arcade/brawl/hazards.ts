// THE HAZARDS: the things the athletes throw, and the stampede.
//
// THE BIG IDEA: A TIMELINE, NOT A TRACKER. Each thrower repeats the same cycle again and again:
//   wind up  ->  throw  ->  (land, roll or stick)  ->  rest  ->  wind up again ...
// Where a thrown thing is at any moment is a plain sum of the game clock, so the picture and the
// touching always agree, the game can be paused for free, and the checker script can look at any
// moment it likes. Nothing is saved between ticks, there is only `hazardAt(hazard, clock)`.
//
// FAIR WARNING. The wind up always comes first, it is always at least a second long, and it always
// shows WHERE the thing will come down (a marker on the ground) and WHEN (the marker flashes
// faster and the thrower's animation builds up).
//
// No drawing here and no page imports, so the checker script can use this file too.
import type { Rect } from "./world.ts";

// ---------- what the level file writes down ----------
export type HazardKind = "shot" | "javelin" | "hammer";

/** One hazard as the level writer describes it. Columns are tile columns (1 tile = 16 px). */
export interface HazardSpec {
  kind: HazardKind;
  /** The column the thrower stands in. */
  thrower: number;
  /** Shot and javelin: the column where it comes down. */
  land?: number;
  /** Hammer: which way it flies (1 = right, -1 = left) and how many tiles it travels. */
  dir?: 1 | -1;
  reach?: number;
  /** Seconds to shift this thrower's cycle, so neighbours do not all throw together. */
  offset?: number;
  /** Any timing from TIMING can be overridden for this one thrower. */
  period?: number; windup?: number; flight?: number;
}

/** The standard timing for each kind (seconds, and pixels per second). The level file can edit it. */
export interface Timing {
  shot: { period: number; windup: number; flight: number; roll: number; rollDist: number; arc: number };
  javelin: { period: number; windup: number; flight: number; stuck: number; removal: number; arc: number };
  hammer: { period: number; windup: number; speed: number; height: number };
}

/** A hazard with everything worked out in pixels. */
export interface Hazard {
  id: number;
  kind: HazardKind;
  x0: number;       // where the thrower stands (pixel x of the middle)
  floor: number;    // the pixel y of the ground the things come down on
  tx: number;       // landing x (shot, javelin)
  dir: 1 | -1;      // which way it travels
  period: number; offset: number; windup: number; flight: number;
  roll: number; rollDist: number; arc: number;
  stuck: number; removal: number;
  speed: number; reach: number; height: number;
}

export function makeHazards(specs: HazardSpec[], timing: Timing, floor: number, tile = 16): Hazard[] {
  return specs.map((s, id) => {
    const x0 = s.thrower * tile + tile / 2;
    const tx = (s.land ?? s.thrower) * tile + tile / 2;
    const base = timing[s.kind] as Record<string, number>;
    const dir = s.kind === "hammer" ? (s.dir ?? 1) : tx >= x0 ? 1 : -1;
    return {
      id, kind: s.kind, x0, floor, tx, dir,
      period: s.period ?? base.period, offset: s.offset ?? 0, windup: s.windup ?? base.windup,
      flight: s.flight ?? base.flight ?? 0,
      roll: base.roll ?? 0, rollDist: base.rollDist ?? 0, arc: base.arc ?? 0,
      stuck: base.stuck ?? 0, removal: base.removal ?? 0,
      speed: base.speed ?? 0, reach: (s.reach ?? 0) * tile, height: base.height ?? 0,
    };
  });
}

// ---------- what a hazard looks like at one moment ----------
export type HazardPhase = "rest" | "windup" | "flight" | "roll" | "stuck" | "removing" | "gone";

export interface HazardView {
  phase: HazardPhase;
  /** 0 to 1 through the current phase. */
  progress: number;
  /** 0 to 1 through the wind up (0 when not winding up) and seconds into the cycle. */
  wind: number;
  cycle: number;
  /** The warning on the ground, if it should show right now. */
  marker: { x: number; y: number; dir: 1 | -1; length: number } | null;
  /** The thing that bonks: a circle (shot, hammer head) ... */
  ball: { x: number; y: number; r: number; spin: number } | null;
  /** ... or a javelin: tip and tail points. */
  spear: { tipX: number; tipY: number; tailX: number; tailY: number } | null;
  /** A stuck javelin is a one-way platform you can stand on. */
  platform: Rect | null;
  /** The thrower's pose: 0 standing, 1 winding up, 2 just thrown. */
  pose: 0 | 1 | 2;
  /** A thing that is deadly right now. */
  deadly: boolean;
}

const JAV_LEN = 30; // javelin length in pixels
const STUCK_ANGLE = (72 * Math.PI) / 180; // a stuck javelin leans at this angle from flat

/** Where a stuck javelin's tail is, and the perch you can stand on. */
export function stuckSpear(h: Hazard) {
  const tipX = h.tx, tipY = h.floor + 5;
  const tailX = tipX - h.dir * Math.cos(STUCK_ANGLE) * JAV_LEN;
  const tailY = tipY - Math.sin(STUCK_ANGLE) * JAV_LEN;
  return { tipX, tipY, tailX, tailY, perch: { x: tailX - 11, y: tailY - 1, w: 22, h: 4 } as Rect };
}

export function hazardAt(h: Hazard, clock: number): HazardView {
  const c = (((clock + h.offset) % h.period) + h.period) % h.period;
  const view: HazardView = {
    phase: "rest", progress: 0, wind: 0, cycle: c, marker: null, ball: null, spear: null, platform: null, pose: 0, deadly: false,
  };
  const wind = Math.min(1, c / h.windup);
  const handY = h.floor - 26; // roughly where the thrower's hand is
  const handX = h.x0 + h.dir * 6;

  if (c < h.windup) {
    view.phase = "windup"; view.progress = wind; view.wind = wind; view.pose = 1;
    if (h.kind === "hammer") {
      view.marker = { x: h.x0, y: h.floor, dir: h.dir, length: h.reach };
      // the head swings round the thrower while he spins
      const spin = wind * wind * 14 + wind * 6;
      view.ball = { x: h.x0 + Math.cos(spin) * 15, y: h.floor - 22 + Math.sin(spin) * 5, r: 6, spin };
    } else {
      view.marker = { x: h.tx, y: h.floor, dir: h.dir, length: h.kind === "shot" ? h.rollDist : 0 };
    }
    return view;
  }

  const after = c - h.windup;

  if (h.kind === "hammer") {
    const fly = h.reach / h.speed;
    if (after < fly) {
      const x = h.x0 + h.dir * (10 + h.speed * after);
      view.phase = "flight"; view.progress = after / fly; view.pose = 2; view.deadly = true;
      view.ball = { x, y: h.floor - h.height, r: 6, spin: after * 30 };
      view.marker = { x: h.x0, y: h.floor, dir: h.dir, length: h.reach };
    } else if (after < fly + 0.4) {
      view.phase = "gone"; view.progress = (after - fly) / 0.4;
    }
    return view;
  }

  if (h.kind === "shot") {
    if (after < h.flight) {
      const q = after / h.flight;
      const sx = handX + (h.tx - handX) * q;
      const sy = handY + (h.floor - 6 - handY) * q - h.arc * 4 * q * (1 - q);
      view.phase = "flight"; view.progress = q; view.pose = 2; view.deadly = true;
      view.ball = { x: sx, y: sy, r: 6, spin: after * 8 };
      view.marker = { x: h.tx, y: h.floor, dir: h.dir, length: h.rollDist };
    } else if (after < h.flight + h.roll) {
      const s = (after - h.flight) / h.roll;
      const eased = 1 - (1 - s) * (1 - s);
      view.phase = "roll"; view.progress = s; view.deadly = true;
      view.ball = { x: h.tx + h.dir * h.rollDist * eased, y: h.floor - 6, r: 6, spin: (after - h.flight) * 10 * (1 - s * 0.7) };
    } else if (after < h.flight + h.roll + 0.5) {
      view.phase = "gone"; view.progress = (after - h.flight - h.roll) / 0.5;
      view.ball = { x: h.tx + h.dir * h.rollDist, y: h.floor - 6, r: 6, spin: 0 };
    }
    return view;
  }

  // javelin
  if (after < h.flight) {
    const q = after / h.flight;
    const tipX = handX + (h.tx - handX) * q;
    const tipY = handY + (h.floor + 5 - handY) * q - h.arc * 4 * q * (1 - q);
    // the way it points is the way it is going: the slope of the arc at this moment
    const dx = h.tx - handX;
    const dy = h.floor + 5 - handY - h.arc * 4 * (1 - 2 * q);
    const len = Math.hypot(dx, dy) || 1;
    view.phase = "flight"; view.progress = q; view.pose = 2; view.deadly = true;
    view.spear = { tipX, tipY, tailX: tipX - (dx / len) * JAV_LEN, tailY: tipY - (dy / len) * JAV_LEN };
    view.marker = { x: h.tx, y: h.floor, dir: h.dir, length: 0 };
    return view;
  }
  const stuckFor = after - h.flight;
  if (stuckFor < h.stuck) {
    const sp = stuckSpear(h);
    view.phase = stuckFor > h.stuck - h.removal ? "removing" : "stuck";
    view.progress = stuckFor / h.stuck;
    view.spear = sp;
    view.platform = sp.perch;
  } else if (stuckFor < h.stuck + 0.4) {
    view.phase = "gone"; view.progress = (stuckFor - h.stuck) / 0.4;
  }
  return view;
}

/** Does anything deadly in this view touch the hero's box? Returns the x it came from (to knock the hero away), or null. */
export function hazardHit(view: HazardView, box: Rect): number | null {
  if (!view.deadly) return null;
  const inflate = -1; // a small mercy: the circle must really overlap
  if (view.ball) {
    const { x, y, r } = view.ball;
    const nx = Math.max(box.x, Math.min(x, box.x + box.w));
    const ny = Math.max(box.y, Math.min(y, box.y + box.h));
    if ((x - nx) ** 2 + (y - ny) ** 2 < (r + inflate) ** 2) return x;
  }
  if (view.spear) {
    const s = view.spear;
    for (let i = 0; i <= 8; i++) {
      const px = s.tailX + ((s.tipX - s.tailX) * i) / 8;
      const py = s.tailY + ((s.tipY - s.tailY) * i) / 8;
      if (px > box.x && px < box.x + box.w && py > box.y && py < box.y + box.h) return s.tipX;
    }
  }
  return null;
}

// ---------- the stampede ----------
export interface StampedeSpec {
  /** The column of the starter's line. Crossing it fires the pistol. */
  line: number;
  /** How far behind the line (pixels) the front of the pack starts. */
  lead: number;
  /** Pack speed at the start (pixels per second), and how much faster it gets every second. */
  speed: number;
  ramp: number;
  /** Seconds between the pistol and the pack starting to move (the "get ready" beat). */
  delay: number;
}

/** The x of the front of the pack, `t` seconds after the pistol. */
export function packFront(s: StampedeSpec, lineX: number, t: number): number {
  const run = Math.max(0, t - s.delay);
  return lineX - s.lead + s.speed * run + 0.5 * s.ramp * run * run;
}
