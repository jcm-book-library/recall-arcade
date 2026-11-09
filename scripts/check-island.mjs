// Checks the island map is sensible. Run it with:
//   node scripts/check-island.mjs
// It reads src/arcade/island-map.ts directly (Node 22 can run TypeScript files that have no
// fancy syntax) and prints every problem it finds. Exit code 1 means something needs fixing.
//
// The island is a ROUTE, so most of the checks are about the loop:
//   - the buildings are met in order, each with a gate just past it
//   - nothing is reachable before its gate is open (the route is linear)
//   - the arcade stops, signs and the Hero Workshop can be reached along the route
//   - the plots, the hall and the off-path grass can only be reached through the free-roam fences
//   - once free roam is on, everything can be reached
import { ROWS, SIGNS, SIGN_KEYS, isSignKey, signNumber, BUILDINGS, STOPS, HALL, MAP_W, MAP_H, tileAt, blocked, reach, findTiles, gateOrder } from "../src/arcade/island-map.ts";

const problems = [];
const bad = (msg) => problems.push(msg);

const KNOWN = new Set("~.,=*dpbPwTrFf" + SIGN_KEYS + "GgSsHhAaNnMmOoKkUuCLYV_X@%&^$ZE");
const W = MAP_W;
const H = MAP_H;
ROWS.forEach((r, y) => {
  if (r.length !== W) bad(`row ${y} is ${r.length} wide, row 0 is ${W}`);
  [...r].forEach((c, x) => {
    if (!KNOWN.has(c)) bad(`unknown letter "${c}" at ${x},${y}`);
  });
});
if (problems.length) done();

const find = findTiles;
const key = (x, y) => y * W + x;
const NEIGHBOURS = [[0, 1], [-1, 0], [1, 0], [0, -1]];

// The edge must be sea.
for (let x = 0; x < W; x++) for (const y of [0, H - 1]) if (tileAt(x, y) !== "~") bad(`edge tile ${x},${y} is not sea`);
for (let y = 0; y < H; y++) for (const x of [0, W - 1]) if (tileAt(x, y) !== "~") bad(`edge tile ${x},${y} is not sea`);

const starts = find("P");
if (starts.length !== 1) bad(`expected exactly one start (P), found ${starts.length}`);

// Buildings (and the hall): a filled rectangle, one door on its bottom row.
for (const b of [...BUILDINGS, { id: HALL.id, body: HALL.body, door: HALL.door }]) {
  const tiles = [...find(b.body), ...find(b.door)];
  if (!tiles.length) { bad(`${b.id}: no ${b.body} tiles on the map`); continue; }
  const xs = tiles.map((t) => t[0]), ys = tiles.map((t) => t[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  if (tiles.length !== (x1 - x0 + 1) * (y1 - y0 + 1)) bad(`${b.id}: the ${b.body} block is not a filled rectangle`);
  const doors = find(b.door);
  if (doors.length !== 1) bad(`${b.id}: needs exactly one door (${b.door}), found ${doors.length}`);
  else if (doors[0][1] !== y1) bad(`${b.id}: the door must be on the bottom row of the building`);
}

// Stops: one spot each, scenery on the map.
for (const s of STOPS) {
  const spots = find(s.spot);
  if (spots.length !== 1) bad(`${s.game}: needs exactly one spot (${s.spot}), found ${spots.length}`);
  if (![...s.scenery].flatMap(find).length) bad(`${s.game}: no scenery on the map`);
  if (s.after && !BUILDINGS.some((b) => b.id === s.after)) bad(`${s.game}: "after" names a building that does not exist (${s.after})`);
}

// Signs: every digit used must have words, and every line of words should be placed.
const digits = new Set();
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isSignKey(tileAt(x, y))) digits.add(signNumber(tileAt(x, y)));
for (const d of digits) if (!SIGNS[d - 1]) bad(`signpost ${d} has no words in SIGNS`);
SIGNS.forEach((_, i) => { if (!digits.has(i + 1)) bad(`SIGNS line ${i + 1} is not placed on the map`); });
if (SIGNS.length > SIGN_KEYS.length) bad(`at most ${SIGN_KEYS.length} signposts (the characters in SIGN_KEYS)`);

// The finish line and the gates.
const finishes = find("E");
if (finishes.length !== 1) bad(`expected exactly one finish line (E), found ${finishes.length}`);
const gateTiles = find("Z");
if (gateTiles.length !== BUILDINGS.length) bad(`expected ${BUILDINGS.length} gates (Z), one per building, found ${gateTiles.length}`);

if (starts.length === 1 && finishes.length === 1) routeChecks();
done();

function routeChecks() {
  const [sx, sy] = starts[0];
  const closed = { freeRoam: false, openGates: new Set(), finishOpen: false };
  const gk = ([x, y]) => `${x},${y}`;
  const order = gateOrder();
  if (order.length !== BUILDINGS.length) { bad(`walking from the start, only ${order.length} gates can be reached one after another (expected ${BUILDINGS.length}). Is there a gap in the fences, or a gate missing?`); return; }
  const reachWith = (n, finishOpen = false) => reach(sx, sy, { freeRoam: false, openGates: new Set(order.slice(0, n).map(gk)), finishOpen });
  const doorFront = (b) => { const [x, y] = find(b.door)[0]; return [x, y + 1]; };
  const touching = (set, x, y) => NEIGHBOURS.some(([dx, dy]) => set.has(key(x + dx, y + dy)));

  // 1. THE BUILDINGS ARE MET IN ORDER: with the first n gates open, you can reach buildings 0..n and no further.
  BUILDINGS.forEach((b, i) => {
    const [fx, fy] = doorFront(b);
    if (blocked(fx, fy, closed)) { bad(`${b.id}: the tile below the door (${fx},${fy}) is not walkable`); return; }
    for (let n = 0; n <= BUILDINGS.length; n++) {
      const can = reachWith(n).has(key(fx, fy));
      if (i <= n && !can) bad(`${b.id}: its door can not be reached once ${n} gate(s) are open (it should be reachable from gate ${i} on)`);
      if (i > n && can) bad(`${b.id}: its door can be reached with only ${n} gate(s) open, so the route is not in order (the gate before it is bypassed)`);
    }
  });

  // 2. EACH GATE IS JUST PAST ITS BUILDING: the gate is the first thing you can not walk through after the door.
  order.forEach(([gx, gy], i) => {
    const b = BUILDINGS[i];
    const before = reachWith(i);
    const [fx, fy] = doorFront(b);
    if (!before.has(key(fx, fy))) return; // reported above
    if (!touching(before, gx, gy)) bad(`gate ${i + 1} (${gx},${gy}) is not next to the ground you can reach before it opens`);
    const dist = Math.abs(gx - fx) + Math.abs(gy - fy);
    if (dist > 8) bad(`${b.id}: its gate is ${dist} tiles from its door; it should be just past the building`);
  });

  // 3. EVERY GATE SITS IN A CORRIDOR: both sides of it are blocked, so it can not be walked round.
  for (const [x, y] of gateTiles) {
    const openAll = { freeRoam: false, openGates: new Set(), finishOpen: false };
    const horizontal = !blocked(x - 1, y, openAll) && !blocked(x + 1, y, openAll);
    const vertical = !blocked(x, y - 1, openAll) && !blocked(x, y + 1, openAll);
    if (!horizontal && !vertical) bad(`gate at ${x},${y} is not in a straight corridor`);
    if (horizontal && (!blocked(x, y - 1, openAll) || !blocked(x, y + 1, openAll))) bad(`gate at ${x},${y}: the path can be walked round it (open ground above or below)`);
    if (vertical && (!blocked(x - 1, y, openAll) || !blocked(x + 1, y, openAll))) bad(`gate at ${x},${y}: the path can be walked round it (open ground left or right)`);
  }

  // 4. THE ARCADE STOPS: reachable once the gate before them is open, and not before.
  for (const s of STOPS) {
    const [px, py] = find(s.spot)[0] ?? [];
    if (px === undefined) continue;
    const idx = s.after ? BUILDINGS.findIndex((b) => b.id === s.after) : -1; // the gate that must be open
    for (let n = 0; n <= BUILDINGS.length; n++) {
      const can = reachWith(n).has(key(px, py));
      const should = n >= idx + 1;
      if (should && !can) bad(`${s.game}: its spot (${px},${py}) can not be reached with ${n} gate(s) open`);
      if (!should && can) bad(`${s.game}: its spot (${px},${py}) can be reached with only ${n} gate(s) open, before the gate of ${s.after}`);
    }
    // A stop must not block the path: the spot is a spur, so the path is still walkable without stepping on it.
    const without = reach(sx, sy, { freeRoam: false, openGates: new Set(order.map(gk)), finishOpen: true });
    const around = new Set(without);
    around.delete(key(px, py));
    // everything that was reachable except stops themselves should still be reachable if the spot is removed
    const full = BUILDINGS.every((b) => { const [fx, fy] = doorFront(b); return around.has(key(fx, fy)); });
    if (!full) bad(`${s.game}: its spot is in the way of the route (the path should go past it, not through it)`);
  }

  // 5. SIGNS: each one can be reached along the route (with every gate open and the finish line open).
  const wholeRoute = reach(sx, sy, { freeRoam: false, openGates: new Set(order.map(gk)), finishOpen: true });
  for (const d of digits) for (const [x, y] of find(SIGN_KEYS[d - 1])) {
    if (!touching(wholeRoute, x, y)) bad(`signpost ${d} at ${x},${y} can not be read from the route`);
  }
  // A scenic walk needs 2 to 3 funny signs. Count the ones read between two particular gates.
  const between = (a, b) => {
    const A = reachWith(a), B = reachWith(b);
    return [...digits].filter((d) => find(SIGN_KEYS[d - 1]).some(([x, y]) => touching(B, x, y) && !touching(A, x, y))).length;
  };
  // After gate 2 (Science) and before gate 3 (History) is the first walk; after gate 4 (Travel) and before gate 5 (Nature) the second.
  const walk1 = between(1, 2), walk2 = between(3, 4);
  if (walk1 < 2) bad(`the first scenic walk (Science to History) has ${walk1} sign(s); it needs 2 or 3`);
  if (walk2 < 2) bad(`the second scenic walk (Travel to Nature) has ${walk2} sign(s); it needs 2 or 3`);
  // The welcome sign should be right at the start.
  const atStart = reachWith(0);
  const welcome = find("1")[0];
  if (welcome && !touching(atStart, welcome[0], welcome[1])) bad("the welcome sign (1) can not be read before the first gate");

  // 6. THE HERO WORKSHOP is available straight away (it is on the start side of the first gate).
  const mirror = STOPS.find((s) => s.game === "hero");
  if (mirror && !reachWith(0).has(key(...find(mirror.spot)[0]))) bad("the Hero Workshop should be reachable from the start with every gate shut");

  // 7. THE LOOP CLOSES. The finish line is the way back into the start area. Its far side (the end of
  // the loop) must not be reachable from the start until every gate has been passed, which is what
  // stops anyone going round the wrong way and skipping gates.
  const [ex, ey] = finishes[0];
  const sides = NEIGHBOURS.map(([dx, dy]) => [ex + dx, ey + dy]).filter(([x, y]) => !blocked(x, y, { freeRoam: false, openGates: new Set(), finishOpen: true }) && tileAt(x, y) !== "E");
  const startSide = sides.filter(([x, y]) => reachWith(0).has(key(x, y)));
  const laneSide = sides.filter(([x, y]) => !startSide.some(([a, b]) => a === x && b === y));
  if (startSide.length !== 1 || laneSide.length !== 1) bad(`the finish line should have the start area on one side and the end of the loop on the other (found ${startSide.length} and ${laneSide.length})`);
  else {
    const [lx, ly] = laneSide[0];
    for (let n = 0; n <= BUILDINGS.length; n++) {
      const can = reachWith(n).has(key(lx, ly));
      if (n < BUILDINGS.length && can) bad(`the end of the loop (${lx},${ly}) can be reached with only ${n} gate(s) open: someone could go round the wrong way`);
      if (n === BUILDINGS.length && !can) bad("with every gate open you can not walk all the way round to the finish line");
    }
  }

  // 8. THE ROUTE IS FENCED IN: with free roam off, everything you can reach is a path-like tile, a pad,
  // a bridge, the plaza or the pier. Grass, sand, flowers and dirt must NOT be reachable (they are free-roam ground).
  const everything = reach(sx, sy, { freeRoam: false, openGates: new Set(order.map(gk)), finishOpen: true });
  const FREE_GROUND = new Set(".,*d");
  const leaks = [];
  for (const k of everything) { const x = k % W, y = Math.floor(k / W); if (FREE_GROUND.has(tileAt(x, y))) leaks.push(`${x},${y}`); }
  if (leaks.length) bad(`${leaks.length} grass, sand, flower or dirt tiles can be walked on without free roam, for example at ${leaks.slice(0, 4).join(" and ")}: the route has a gap in its fence`);

  // 9. FREE ROAM: the plots, the hall and the off-path ground are reachable only once the free-roam fences open.
  const free = reach(sx, sy, { freeRoam: true, openGates: new Set(), finishOpen: false });
  const onlyFree = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (free.has(key(x, y)) && !everything.has(key(x, y))) onlyFree.push([x, y]);
  if (!onlyFree.length) bad("there is no free-roam ground at all");
  const dirt = find("d");
  if (!dirt.length) bad("the Coming soon plot (dirt, d) is missing");
  for (const [x, y] of dirt) {
    if (everything.has(key(x, y))) bad(`plot dirt at ${x},${y} can be reached without free roam`);
    if (!free.has(key(x, y))) bad(`plot dirt at ${x},${y} can not be reached even in free roam`);
  }
  const [hx, hy] = find(HALL.door)[0] ?? [];
  if (hx !== undefined) {
    const front = [hx, hy + 1];
    if (!free.has(key(...front))) bad("the hall's door can not be reached in free roam");
    if (blocked(...front, closed)) bad("the tile below the hall door is not walkable");
    // Without free roam the hall's door must not be usable... it is solid, so just check nobody can walk into the plot.
    for (const [x, y] of find(HALL.body)) if (everything.has(key(x, y))) bad(`the hall plot at ${x},${y} can be walked on without free roam`);
  }
  // In free roam every door, stop and sign can be reached, and no walkable tile is sealed off.
  for (const b of BUILDINGS) { const [fx, fy] = doorFront(b); if (!free.has(key(fx, fy))) bad(`${b.id}: not reachable in free roam`); }
  for (const s of STOPS) { const [px, py] = find(s.spot)[0] ?? []; if (px !== undefined && !free.has(key(px, py))) bad(`${s.game}: not reachable in free roam`); }
  for (const d of digits) for (const [x, y] of find(SIGN_KEYS[d - 1])) if (!touching(free, x, y)) bad(`signpost ${d} not reachable in free roam`);
  const sealed = [];
  const walkableTile = (x, y) => !blocked(x, y, { freeRoam: true, openGates: new Set(), finishOpen: false });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (walkableTile(x, y) && !free.has(key(x, y))) sealed.push(`${x},${y}`);
  if (sealed.length) bad(`${sealed.length} walkable tiles are cut off even in free roam, for example at ${sealed.slice(0, 3).join(" and ")}`);
}

function done() {
  if (problems.length) {
    console.log("Island map problems:\n  " + problems.join("\n  "));
    process.exit(1);
  }
  console.log(`Island map OK: ${W} x ${H}, ${BUILDINGS.length} buildings in a loop with ${BUILDINGS.length} gates, ${STOPS.length} stops, ${SIGNS.length} signs.`);
}
