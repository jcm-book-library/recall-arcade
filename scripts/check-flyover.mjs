// Checks the Flyover data is sensible and fair. Run it with:  node scripts/check-flyover.mjs
// It reads src/arcade/flyover-data.ts directly (Node 22 can run TypeScript files that have no
// fancy syntax) and prints every problem it finds. Exit code 1 means something needs fixing.
import {
  AIRCRAFT, LEGS, WORLD_H, FIRST_OBSTACLE, GATE_CLEAR_BEFORE, GATE_CLEAR_AFTER, GATE_RETRY,
  checkpointAt, legLength, gateSlots, hitboxOf, pictureOf,
} from "../src/arcade/flyover-data.ts";
import { AIRPORT_TABLE } from "../src/decks/airports-data.ts";

const problems = [];
const bad = (msg) => problems.push(msg);

const codes = new Set(AIRPORT_TABLE.trim().split("\n").map((l) => l.split("|")[0]));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

if (LEGS.length !== 3) bad(`expected 3 legs, found ${LEGS.length}`);

LEGS.forEach((leg, li) => {
  const L = `Leg ${li + 1}`;
  const ac = AIRCRAFT[leg.aircraft];
  if (!ac) return bad(`${L}: unknown aircraft "${leg.aircraft}"`);

  // ---- airports ----
  if (leg.stops.length !== 8) bad(`${L}: has ${leg.stops.length} checkpoints, needs 8`);
  if (new Set(leg.stops).size !== leg.stops.length) bad(`${L}: a checkpoint is listed twice`);
  for (const c of [leg.from, ...leg.stops]) if (!codes.has(c)) bad(`${L}: airport code ${c} is not in airports-data`);

  // ---- obstacle list: sorted, in range, clear of the gates ----
  const zones = leg.stops.map((_, i) => {
    const cp = checkpointAt(leg, i);
    return { x: cp - GATE_CLEAR_BEFORE, w: GATE_CLEAR_BEFORE + GATE_CLEAR_AFTER, y: -1000, h: 3000, cp };
  });
  const end = legLength(leg);
  leg.obstacles.forEach((o, i) => {
    const name = `${L} obstacle #${i + 1} (${o.type} at ${o.at})`;
    if (i > 0 && o.at < leg.obstacles[i - 1].at) bad(`${name}: list is not sorted by distance`);
    if (!["storm", "birds", "mountain"].includes(o.type)) bad(`${name}: unknown type`);
    if (o.at < FIRST_OBSTACLE || o.at > end - 100) bad(`${name}: too close to the start or the end`);
    const pic = pictureOf(o);
    if (zones.some((z) => overlaps(pic, z))) bad(`${name}: sits in the clear space around a checkpoint gate`);
    if (o.type === "mountain" && (o.y < 10 || o.y > 120)) bad(`${name}: mountain height should be 10 to 120`);
    if (o.type !== "mountain" && (o.y < 15 || o.y > WORLD_H - 40)) bad(`${name}: height is off the screen`);
    // No single obstacle may block the whole flying space.
    const hb = hitboxOf(o);
    const free = (ac.floor - ac.ceiling) - (Math.min(ac.floor, hb.y + hb.h + ac.hitH / 2) - Math.max(ac.ceiling, hb.y - ac.hitH / 2));
    if (free < 30) bad(`${name}: leaves only ${Math.round(free)} px to fly through`);
  });

  // ---- is there always a way through? ----
  // Walk along the leg in 5 pixel steps, keeping a list of every height the plane could be at.
  // From one step to the next it can only change height as fast as the aircraft really climbs
  // or sinks (we use 65% of the top rate, because the real plane needs time to build up speed).
  const STEP = 5;
  const lo = ac.ceiling, hi = ac.floor;
  const cells = hi - lo + 1;
  let ok = new Uint8Array(cells);
  ok[Math.round((lo + hi) / 2) - lo] = 1;
  const upRate = (ac.maxUp * 0.65 * STEP) / ac.speed;
  const downRate = (ac.maxDown * 0.65 * STEP) / ac.speed;
  const hits = leg.obstacles.map(hitboxOf);
  const slots = gateSlots(ac).ys;
  const gateXs = new Set(leg.stops.map((_, i) => checkpointAt(leg, i)));
  const gateXsDone = new Set();
  const marks = leg.obstacles.map(() => null);
  void marks;
  for (let x = 0; x <= end; x += STEP) {
    const next = new Uint8Array(cells);
    for (let c = 0; c < cells; c++) {
      if (!ok[c]) continue;
      const from = Math.max(0, Math.floor(c - upRate)), to = Math.min(cells - 1, Math.ceil(c + downRate));
      for (let d = from; d <= to; d++) next[d] = 1;
    }
    for (let c = 0; c < cells; c++) {
      if (!next[c]) continue;
      const y = lo + c;
      const plane = { x: x - ac.hitW / 2, y: y - ac.hitH / 2, w: ac.hitW, h: ac.hitH };
      // Leave a little room (4 px) round the plane so passing a gap is not a pixel-perfect job.
      const roomy = { x: plane.x - 4, y: plane.y - 4, w: plane.w + 8, h: plane.h + 8 };
      if (hits.some((r) => overlaps(roomy, r))) next[c] = 0;
    }
    ok = next;
    if (!ok.includes(1)) { bad(`${L}: no way through at distance ${x}`); break; }
    // At every gate (and its go-around position) the plane must be able to reach all three rings.
    for (const gx of gateXs) {
      for (const gxx of [gx, gx + GATE_RETRY]) {
        const key = `${gxx}`;
        if (x === Math.round(gxx / STEP) * STEP && !gateXsDone.has(key)) {
          gateXsDone.add(key);
          for (const sy of slots) {
            const c = sy - lo;
            if (!ok.slice(Math.max(0, c - 2), c + 3).includes(1)) bad(`${L}: gate ring at height ${sy} is out of reach at distance ${gxx}`);
          }
        }
      }
    }
  }
});

if (problems.length) {
  console.error(`Flyover data: ${problems.length} problem(s)`);
  for (const p of problems) console.error(" - " + p);
  process.exit(1);
}
console.log(`Flyover data OK: ${LEGS.length} legs, ${LEGS.map((l) => l.stops.length).join("/")} checkpoints, ${LEGS.map((l) => l.obstacles.length).join("/")} obstacles.`);
