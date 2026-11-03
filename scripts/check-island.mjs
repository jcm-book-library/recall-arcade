// Checks the island map is sensible. Run it with:
//   node scripts/check-island.mjs
// It reads src/arcade/island-map.ts directly (Node 22 can run TypeScript files that have no
// fancy syntax) and prints every problem it finds. Exit code 1 means something needs fixing.
import { ROWS, SIGNS, BUILDINGS, STOPS } from "../src/arcade/island-map.ts";

const problems = [];
const bad = (msg) => problems.push(msg);

const KNOWN = new Set("~.,=*dpbPwTrF123456789GgSsHhAaNnMmCLY_X@%&^");
const W = ROWS[0].length;
const H = ROWS.length;
ROWS.forEach((r, y) => {
  if (r.length !== W) bad(`row ${y} is ${r.length} wide, row 0 is ${W}`);
  [...r].forEach((c, x) => {
    if (!KNOWN.has(c)) bad(`unknown letter "${c}" at ${x},${y}`);
  });
});
if (problems.length) done();

const at = (x, y) => ROWS[y]?.[x] ?? "~";
const find = (letter) => {
  const out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y) === letter) out.push([x, y]);
  return out;
};

// The edge must be sea.
for (let x = 0; x < W; x++) for (const y of [0, H - 1]) if (at(x, y) !== "~") bad(`edge tile ${x},${y} is not sea`);
for (let y = 0; y < H; y++) for (const x of [0, W - 1]) if (at(x, y) !== "~") bad(`edge tile ${x},${y} is not sea`);

// Walkable ground. Doors and signposts are not walked onto (you bump them), but the tile you stand on is.
const SOLID = new Set("~wTrFGgSsHhAaNnMmCLYX123456789");
const walk = (x, y) => !SOLID.has(at(x, y));

const starts = find("P");
if (starts.length !== 1) bad(`expected exactly one start (P), found ${starts.length}`);

// Buildings: a filled rectangle, one door on its bottom row, a walkable tile below the door.
for (const b of BUILDINGS) {
  const tiles = [...find(b.body), ...find(b.door)];
  if (!tiles.length) { bad(`${b.id}: no ${b.body} tiles on the map`); continue; }
  const xs = tiles.map((t) => t[0]), ys = tiles.map((t) => t[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  if (tiles.length !== (x1 - x0 + 1) * (y1 - y0 + 1)) bad(`${b.id}: the ${b.body} block is not a filled rectangle`);
  const doors = find(b.door);
  if (doors.length !== 1) bad(`${b.id}: needs exactly one door (${b.door}), found ${doors.length}`);
  else if (doors[0][1] !== y1) bad(`${b.id}: the door must be on the bottom row of the building`);
}

// Stops: one spot each; the scenery block must be filled (spot included if it sits inside the block).
for (const s of STOPS) {
  const spots = find(s.spot);
  if (spots.length !== 1) bad(`${s.game}: needs exactly one spot (${s.spot}), found ${spots.length}`);
  const tiles = [...s.scenery].flatMap(find);
  if (!tiles.length) bad(`${s.game}: no scenery on the map`);
}

// Signs: every digit used must have words, and every line of words should be placed.
const digits = new Set();
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (/[1-9]/.test(at(x, y))) digits.add(Number(at(x, y)));
for (const d of digits) if (!SIGNS[d - 1]) bad(`signpost ${d} has no words in SIGNS`);
SIGNS.forEach((_, i) => { if (!digits.has(i + 1)) bad(`SIGNS line ${i + 1} is not placed on the map`); });
if (SIGNS.length > 9) bad("at most 9 signposts");

// Reachability: walk outwards from the start. Doors and signposts count as reached when a walkable
// tile touches them (you walk into them from beside/below).
if (starts.length === 1) {
  const seen = new Set();
  const key = (x, y) => y * W + x;
  const queue = [starts[0]];
  seen.add(key(...starts[0]));
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (seen.has(key(nx, ny)) || !walk(nx, ny)) continue;
      seen.add(key(nx, ny));
      queue.push([nx, ny]);
    }
  }
  const reached = (x, y) => seen.has(key(x, y));
  const touching = (x, y, dirs) => dirs.some(([dx, dy]) => reached(x + dx, y + dy));
  for (const b of BUILDINGS) {
    for (const [x, y] of find(b.door)) if (!reached(x, y + 1)) bad(`${b.id}: the tile below the door (${x},${y + 1}) can't be reached from the start`);
  }
  for (const s of STOPS) for (const [x, y] of find(s.spot)) if (!reached(x, y)) bad(`${s.game}: the spot at ${x},${y} can't be reached from the start`);
  for (const d of digits) for (const [x, y] of find(String(d))) {
    if (!touching(x, y, [[0, 1], [-1, 0], [1, 0], [0, -1]])) bad(`signpost ${d} at ${x},${y} can't be reached from the start`);
  }
  // Nothing walkable should be sealed off from the rest (a stray island of grass is harmless but odd).
  const sealed = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (walk(x, y) && at(x, y) !== "~" && !reached(x, y)) sealed.push(`${x},${y}`);
  if (sealed.length) bad(`${sealed.length} walkable tiles are cut off from the start (a river or fence in the way?), for example at ${sealed.slice(0, 3).join(" and ")}`);
}

done();
function done() {
  if (problems.length) {
    console.log("Island map problems:\n  " + problems.join("\n  "));
    process.exit(1);
  }
  console.log(`Island map OK: ${W} x ${H}, ${BUILDINGS.length} buildings, ${STOPS.length} arcade stops, ${SIGNS.length} signs.`);
}
