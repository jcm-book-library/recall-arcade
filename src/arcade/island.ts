import "../island.css";
import type { Deck } from "../engine/types";
import { h } from "../ui/dom";
import { ARCADE_GAMES } from "../ui/home";
import { ARCADE_OPENS_AT, CHALLENGES, challengeDone, clearedSubjects, rememberTrack, trackFor } from "../engine/progress";
import { loadSavedHero, makeHeroSheet } from "./hero-art";
import { clamp, noise, startLoop } from "./kit";
import { BUILDINGS, ROWS, SIGNS, STOPS } from "./island-map";
import { TILE, drawSprite, makeFence, makeTileArt } from "./island-art";
import type { Sprite, SpriteKind } from "./island-art";

// THE ISLAND: the Overworld. A little top-down world that ties the whole arcade together.
// Each subject is a building, the arcade games are stops along the path, and you walk between
// them with the arrow keys (or the buttons on a phone). It borrows the Labyrinth's way of
// moving: the map is a grid of tiles, the hero slides smoothly from tile to tile, a key you tap
// is remembered for a moment (the "buffer"), and the camera follows. The map itself is in
// island-map.ts (rows of letters, easy to edit) and the pictures are in island-art.ts.
//
// What happens when you walk:
//   - into a DOOR or a SIGNPOST (they are solid, you bump them): a panel opens.
//   - onto an ARCADE STOP's glowing pad: a panel opens with Play (or Preview if it is still locked).
// While a panel is open the island stands still. Esc, or the Close button, goes back to walking.

// ---------- sizes and speeds ----------
const VIEW_W = 20; // the screen shows 20 tiles across...
const VIEW_H = 12; // ...and 12 tiles down
const W = VIEW_W * TILE; // 320: a tiny canvas that the browser scales up with crisp pixels
const H = VIEW_H * TILE; // 192
const STEP_TIME = 0.14; // seconds the hero takes to slide from one tile to the next
const BUFFER_TIME = 0.25; // how long the game remembers a direction you tapped

type Dir = 0 | 1 | 2 | 3; // down, left, right, up (the same order as the rows of the hero's picture sheet)
const DX = [0, -1, 1, 0];
const DY = [1, 0, 0, -1];
const KEY_DIRS: Record<string, Dir> = {
  ArrowDown: 0, s: 0, S: 0, ArrowLeft: 1, a: 1, A: 1, ArrowRight: 2, d: 2, D: 2, ArrowUp: 3, w: 3, W: 3,
};

// ---------- coming back from a quiz or game ----------
// When you open a quiz or game from the island, we remember where you were standing in
// sessionStorage (it lasts until the tab closes). Every quiz has a "◂ Arcade" link that goes to
// the home page ("#"). main.ts asks `islandReturnPending()` when it opens the home page, and if
// it says yes it shows the island instead, with the hero back at the door he came out of.
//
// The `pending` flag is what stops this bouncing you somewhere you did not ask to go. It is
// switched ON only when you click a link in an island panel, and switched OFF again as soon as
// the island opens (or when you press "List view"). So: the island's own "List view" button, or
// typing the home address by hand, always gives you the normal home page.
const RETURN_KEY = "learning-arcade:island-return";
interface ReturnSpot { x: number; y: number; facing: Dir; pending: boolean }
function readReturn(): ReturnSpot | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(RETURN_KEY) ?? "null");
    if (v && Number.isInteger(v.x) && Number.isInteger(v.y) && [0, 1, 2, 3].includes(v.facing)) return v as ReturnSpot;
  } catch {
    // Storage can be blocked (private windows). Then the island simply starts at the signpost.
  }
  return null;
}
function writeReturn(spot: ReturnSpot) {
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify(spot));
  } catch {
    // Nothing to do: you will start at the signpost next time.
  }
}
function clearPending() {
  const r = readReturn();
  if (r?.pending) writeReturn({ ...r, pending: false });
}
/** True when the player went from the island into a quiz or game and has now come "back". */
export function islandReturnPending(): boolean {
  return readReturn()?.pending === true;
}

// ---------- reading the map ----------
const MAP_W = ROWS[0].length;
const MAP_H = ROWS.length;
const tileAt = (x: number, y: number) => ROWS[y]?.[x] ?? "~";
const isDigit = (c: string) => c >= "1" && c <= "9";

/** Tiles you can not walk into. Doors, signposts and the scenery round an arcade stop count: you bump them instead. */
const SOLID = new Set("~wTrFGgSsHhAaNnMmCLYX123456789");
const STOP_SCENERY = new Set(STOPS.flatMap((s) => [...s.scenery].filter((c) => c !== "_"))); // tarmac (_) is walkable
const isSolid = (c: string) => SOLID.has(c);

/** The smallest rectangle (in tiles) that holds every tile with one of these letters. */
function bounds(letters: string) {
  let x0 = MAP_W, y0 = MAP_H, x1 = -1, y1 = -1;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (!letters.includes(tileAt(x, y))) continue;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function findTiles(letter: string) {
  const out: [number, number][] = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (tileAt(x, y) === letter) out.push([x, y]);
  return out;
}

const START = findTiles("P")[0] ?? [MAP_W >> 1, MAP_H >> 1];
// Doors by tile ("x,y"), and arcade spots by tile.
const doorAt = new Map<string, (typeof BUILDINGS)[number]>();
for (const b of BUILDINGS) for (const [x, y] of findTiles(b.door)) doorAt.set(`${x},${y}`, b);
const stopAt = new Map<string, (typeof STOPS)[number]>();
for (const s of STOPS) for (const [x, y] of findTiles(s.spot)) stopAt.set(`${x},${y}`, s);
const stopByScenery = (c: string) => STOPS.find((s) => s.scenery.includes(c));
const buildingByLetter = (c: string) => BUILDINGS.find((b) => b.body === c || b.door === c);

// ---------- the island screen ----------
export function renderIsland(root: HTMLElement, decks: Deck[]): () => void {
  const canvas = h("canvas", {
    class: "lab-canvas isl-canvas",
    width: String(W),
    height: String(H),
    role: "img",
    "aria-label": "Recall Arcade Island: walk with the arrow keys. Each subject is a building with a door, and the arcade games are stops along the path. The List view button shows the same things as a list.",
  });
  const padDirs: [Dir, string, string][] = [[3, "up", "▲"], [1, "left", "◀"], [2, "right", "▶"], [0, "down", "▼"]];
  const padButtons = padDirs.map(([, name, arrow]) =>
    h("button", { class: `lab-key ${name}`, type: "button", tabindex: "-1", "aria-label": `Move ${name}` }, arrow),
  );
  const listLink = h("a", { class: "btn ghost isl-list", href: "#" }, "List view");
  const screen = h("div", { class: "lab-screen isl-screen" }, canvas);
  const page = h(
    "main",
    { class: "play labyrinth island" },
    h("div", { class: "play-top" }, h("h1", { class: "play-title" }, "Recall Arcade Island"), listLink),
    screen,
    h("div", { class: "lab-controls" }, h("div", { class: "lab-pad", "aria-label": "Direction buttons" }, ...padButtons)),
    h(
      "p",
      { class: "lab-howto muted" },
      "Arrow keys or WASD to walk (or the buttons on a phone). Walk into a door to see that subject's quizzes. Step onto a glowing pad to play an arcade game. Walk into a sign to read it.",
    ),
  );
  root.replaceChildren(page);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  // The arcade games read the track the home page leaves in storage, so leave it here too.
  const deckSubjects = () => Object.fromEntries(decks.map((d) => [d.id, d.subject ?? ""]));
  rememberTrack(trackFor(clearedSubjects(deckSubjects()).size));

  // ---------- pictures ----------
  const tiles = makeTileArt();
  const heroBuiltIn = makeHeroSheet();
  // YOUR HERO, same as the Labyrinth: the one tried out in the Hero Workshop on this device comes
  // first, then public/arcade/hero.png, and if neither is there we keep the built-in hero.
  let heroSheet: HTMLCanvasElement | HTMLImageElement = heroBuiltIn;
  let heroFrameW = TILE;
  let heroFrameH = TILE;
  let disposed = false;
  const heroImage = new Image();
  heroImage.onload = () => {
    if (disposed || heroImage.naturalWidth < TILE * 2 || heroImage.naturalHeight < TILE * 4) return;
    heroSheet = heroImage;
    heroFrameW = heroImage.naturalWidth / 2;
    heroFrameH = heroImage.naturalHeight / 4;
  };
  heroImage.onerror = () => {};
  heroImage.src = loadSavedHero() ?? `${import.meta.env.BASE_URL}arcade/hero.png`;

  // Buildings and stops are drawn once into their own pictures, and stamped on each frame.
  const sprites: Sprite[] = [];
  for (const b of BUILDINGS) {
    const box = bounds(b.body + b.door);
    const door = findTiles(b.door)[0];
    sprites.push({ canvas: drawSprite(b.id as SpriteKind, box.w, box.h, door[0] - box.x), ...box });
  }
  for (const s of STOPS) {
    const box = bounds(s.scenery);
    const plane = findTiles("Y")[0];
    sprites.push({ canvas: drawSprite(s.sprite as SpriteKind, box.w, box.h, 0, { plane: [plane[0] - box.x, plane[1] - box.y] }), ...box });
  }

  // ---------- the hero ----------
  // `x, y` is the tile the hero is leaving, `nx, ny` the tile he is heading for, and `t` how long
  // the slide has taken. When he is standing still the two tiles are the same.
  const player = { x: START[0], y: START[1], nx: START[0], ny: START[1], t: 0 };
  let facing: Dir = 0;
  let stepCount = 0; // swaps the walking feet each tile
  let heldDirs: Dir[] = [];
  let buffer: Dir | null = null;
  let bufferAge = 0;
  let lastStop: string | null = null; // the stop we are standing on, so its panel doesn't keep reopening

  const saved = readReturn();
  if (saved) {
    // Back from a quiz or game: stand where we left, and switch the "pending" flag off.
    Object.assign(player, { x: saved.x, y: saved.y, nx: saved.x, ny: saved.y });
    facing = saved.facing;
    if (stopAt.has(`${saved.x},${saved.y}`)) lastStop = `${saved.x},${saved.y}`;
    if (saved.pending) writeReturn({ ...saved, pending: false });
  }
  const moving = () => player.nx !== player.x || player.ny !== player.y;

  // ---------- the panels ----------
  let panel: HTMLElement | null = null;
  let panelReturn: ReturnSpot | null = null; // where to stand when we come back, if a link in this panel is followed
  let panelOpener = "";

  function closePanel() {
    if (!panel) return;
    panel.remove();
    panel = null;
    panelReturn = null;
    heldDirs = [];
    buffer = null;
    canvas.focus({ preventScroll: true });
  }

  function openPanel(opener: string, title: string, body: (Node | null)[], ret: ReturnSpot | null, wide = true) {
    closePanel();
    heldDirs = [];
    buffer = null;
    const titleId = "isl-panel-title";
    const closeBtn = h("button", { class: "btn ghost isl-close", type: "button", onclick: () => closePanel() }, "Close");
    const box = h(
      "section",
      { class: `isl-panel${wide ? "" : " isl-small"}`, role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, tabindex: "-1" },
      h("h2", { id: titleId, class: "isl-title" }, title),
      ...body,
      h("div", { class: "isl-actions" }, closeBtn),
    );
    const overlay = h("div", { class: "isl-overlay" }, box);
    // A click on the dim backdrop closes it. A click on a link inside remembers where to come back to.
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) { closePanel(); return; }
      const link = (e.target as Element).closest("a[href]");
      if (link && panelReturn && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey) writeReturn({ ...panelReturn, pending: true });
    });
    page.append(overlay);
    panel = overlay;
    panelReturn = ret;
    panelOpener = opener;
    // Move the keyboard focus into the panel: the first link if there is one, else the Close button.
    const first = box.querySelector<HTMLElement>("a[href], button");
    (first ?? box).focus({ preventScroll: true });
  }

  /** Keep Tab inside the open panel (so keyboard users don't wander off behind it). */
  function trapTab(e: KeyboardEvent) {
    if (!panel) return;
    const items = [...panel.querySelectorAll<HTMLElement>("a[href], button")];
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openSubject(b: (typeof BUILDINGS)[number], doorX: number, doorY: number) {
    const list = decks.filter((d) => d.subject === b.subject && !d.hidden); // DECKS order, like the home page
    const doneCount = list.filter((d) => challengeDone(d.id)).length;
    const items = list.map((d) => {
      const c = CHALLENGES[d.id];
      const done = challengeDone(d.id);
      return h(
        "li",
        {},
        h(
          "a",
          { class: `isl-quiz${done ? " done" : ""}`, href: `#${d.id}` },
          h("span", { class: "isl-quiz-name" }, d.title),
          c ? h("span", { class: "isl-quiz-challenge" }, done ? `✓ Challenge done: ${c.label}` : `Challenge: ${c.label}`) : null,
          h("span", { class: "isl-go", "aria-hidden": "true" }, "Play ▸"),
        ),
      );
    });
    openPanel(
      `door:${b.id}`,
      b.title,
      [
        h("p", { class: "isl-kicker" }, `${list.length} ${list.length === 1 ? "quiz" : "quizzes"}${doneCount ? ` · ${doneCount} challenge${doneCount === 1 ? "" : "s"} done` : ""}`),
        h("ul", { class: "isl-quizzes" }, ...items),
      ],
      { x: doorX, y: doorY + 1, facing: 0, pending: false }, // back outside the door, facing out
    );
  }

  function openStop(s: (typeof STOPS)[number], x: number, y: number) {
    const game = ARCADE_GAMES.find((g) => g.id === s.game);
    if (!game) return;
    const need = ARCADE_OPENS_AT[game.id] ?? 0;
    const have = clearedSubjects(deckSubjects()).size;
    const open = have >= need;
    openPanel(
      `stop:${game.id}`,
      game.title,
      [
        h("p", { class: "isl-kicker" }, game.kicker ?? "Arcade game"),
        h("p", { class: "isl-text" }, game.blurb),
        open ? null : h("p", { class: "isl-lock" }, `🔒 Opens after challenges in ${need} subjects (you have ${have}). You can still have a go.`),
        h("a", { class: "btn isl-play", href: `#${game.id}` }, open ? "Play ▸" : "Preview ▸"),
      ],
      { x: stopTile(s, x, y)[0], y: stopTile(s, x, y)[1], facing, pending: false },
    );
  }
  /** The spot to stand on when we come back: the pad itself. */
  function stopTile(s: (typeof STOPS)[number], x: number, y: number): [number, number] {
    const spot = findTiles(s.spot)[0];
    return spot ?? [x, y];
  }

  function openSign(n: number) {
    openPanel(`sign:${n}`, "Sign", [h("p", { class: "isl-text isl-sign" }, SIGNS[n - 1] ?? "")], null, false);
  }

  // ---------- walking ----------
  /** Try to start a step in direction d. Solid things stop you (doors, signs and arcade scenery open a panel instead). */
  function tryStep(d: Dir) {
    facing = d;
    const tx = player.x + DX[d], ty = player.y + DY[d];
    const c = tileAt(tx, ty);
    if (c !== "~" && doorAt.has(`${tx},${ty}`)) {
      const b = doorAt.get(`${tx},${ty}`)!;
      openSubject(b, tx, ty);
      return;
    }
    if (isDigit(c)) { openSign(Number(c)); return; }
    if (STOP_SCENERY.has(c)) {
      const s = stopByScenery(c);
      if (s && isSolid(c)) { openStop(s, player.x, player.y); return; }
    }
    if (isSolid(c)) return;
    player.nx = tx;
    player.ny = ty;
    player.t = 0;
  }

  /** Called when a step finishes: did we just walk onto an arcade pad? */
  function arrive() {
    player.x = player.nx;
    player.y = player.ny;
    player.t = 0;
    stepCount++;
    const key = `${player.x},${player.y}`;
    const s = stopAt.get(key);
    if (!s) { lastStop = null; return; }
    if (lastStop === key) return;
    lastStop = key;
    openStop(s, player.x, player.y);
  }

  function chooseDir(): Dir | null {
    if (heldDirs.length) return heldDirs[heldDirs.length - 1];
    return buffer;
  }

  function update(dt: number) {
    bufferAge += dt;
    if (bufferAge > BUFFER_TIME) buffer = null;
    let spare = 0; // time left over when a step finishes part-way through this tick
    if (moving()) {
      player.t += dt;
      if (player.t < STEP_TIME) return;
      spare = player.t - STEP_TIME;
      arrive();
      if (panel) return;
    }
    const d = chooseDir();
    if (d === null) return;
    buffer = null;
    tryStep(d);
    if (moving()) player.t = spare;
  }

  // ---------- drawing ----------
  const where = () => {
    const f = Math.min(1, player.t / STEP_TIME);
    return { x: player.x + (player.nx - player.x) * f, y: player.y + (player.ny - player.y) * f };
  };
  const isWater = (c: string) => c === "~" || c === "w";
  const isPierLike = (x: number, y: number) => {
    const c = tileAt(x, y);
    return c === "p" || c === "@" || c === "C" || (isDigit(c) && [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([a, b]) => tileAt(x + a, y + b) === "p"));
  };
  // Fence pieces join up with their neighbours, so there are 16 shapes. Each is made the first time it is needed.
  const fenceShapes = new Map<number, HTMLCanvasElement>();
  const fenceFor = (x: number, y: number) => {
    const l = tileAt(x - 1, y) === "F", r = tileAt(x + 1, y) === "F", u = tileAt(x, y - 1) === "F", dn = tileAt(x, y + 1) === "F";
    const k = (l ? 1 : 0) | (r ? 2 : 0) | (u ? 4 : 0) | (dn ? 8 : 0);
    let c = fenceShapes.get(k);
    if (!c) { c = makeFence(l, r, u, dn); fenceShapes.set(k, c); }
    return c;
  };

  function drawTile(x: number, y: number, sx: number, sy: number, t: number) {
    const c = tileAt(x, y);
    const n = noise(x, y, 1);
    const frame = (Math.floor(t * 1.3) + (n % 2)) % 2;
    const grass = () => ctx.drawImage(tiles.grass[n % tiles.grass.length], sx, sy);
    if (c === "~") {
      ctx.drawImage(tiles.sea[frame][n % 4], sx, sy);
      for (let side = 0; side < 4; side++) {
        const near = tileAt(x + (side === 1 ? 1 : side === 3 ? -1 : 0), y + (side === 0 ? -1 : side === 2 ? 1 : 0));
        if (!isWater(near)) ctx.drawImage(tiles.foam[frame][side], sx, sy);
      }
    } else if (c === "w" || c === "b") {
      ctx.drawImage(tiles.riverWater[frame][n % 3], sx, sy);
      if (c === "b") ctx.drawImage(tiles.bridge, sx, sy);
    } else if (c === ",") {
      ctx.drawImage(tiles.sand[n % 4], sx, sy);
    } else if (isPierLike(x, y)) {
      ctx.drawImage(tiles.sea[frame][n % 4], sx, sy); // water shows between the planks at the edges
      const up = tileAt(x, y - 1) === "~", down = tileAt(x, y + 1) === "~";
      ctx.drawImage(tiles.pier[(up ? 1 : 0) + (down ? 2 : 0)], sx, sy);
      ctx.fillStyle = "#4f3418";
      if (tileAt(x - 1, y) === "~") ctx.fillRect(sx, sy, 2, TILE);
      if (tileAt(x + 1, y) === "~") ctx.fillRect(sx + TILE - 2, sy, 2, TILE);
      if (isDigit(c)) ctx.drawImage(tiles.sign, sx, sy);
    } else if (c === "=" || c === "P" || c === "%" || c === "&" || c === "^" || c === "_" || c === "Y") {
      ctx.drawImage(tiles.gravel[n % 4], sx, sy);
    } else if (c === "d") {
      ctx.drawImage(tiles.dirt[n % 3], sx, sy);
    } else {
      grass();
      if (c === "." || c === "T" || c === "*" || c === "r" || c === "F" || isDigit(c)) {
        // a darker green lip where the grass meets the beach
        for (let side = 0; side < 4; side++) {
          const near = tileAt(x + (side === 1 ? 1 : side === 3 ? -1 : 0), y + (side === 0 ? -1 : side === 2 ? 1 : 0));
          if (near === ",") ctx.drawImage(tiles.lip[side], sx, sy);
        }
      }
      if (c === "*") ctx.drawImage(tiles.flowers[n % tiles.flowers.length], sx, sy);
      else if (c === "T") ctx.drawImage(tiles.trees[(n >>> 3) % 3], sx, sy);
      else if (c === "r") ctx.drawImage(tiles.rock, sx, sy);
      else if (c === "F") ctx.drawImage(fenceFor(x, y), sx, sy);
      else if (isDigit(c)) ctx.drawImage(tiles.sign, sx, sy);
    }
  }

  function draw(t: number) {
    const p = where();
    const camX = Math.round(clamp(p.x * TILE + TILE / 2 - W / 2, 0, MAP_W * TILE - W));
    const camY = Math.round(clamp(p.y * TILE + TILE / 2 - H / 2, 0, MAP_H * TILE - H));
    ctx.fillStyle = "#2f7fc4";
    ctx.fillRect(0, 0, W, H);
    const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
    for (let y = y0; y <= y0 + VIEW_H; y++) {
      for (let x = x0; x <= x0 + VIEW_W; x++) {
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        drawTile(x, y, x * TILE - camX, y * TILE - camY, t);
      }
    }
    for (const s of sprites) {
      const sx = s.x * TILE - camX, sy = s.y * TILE - camY;
      if (sx > W || sy > H || sx + s.w * TILE < 0 || sy + s.h * TILE < 0) continue;
      ctx.drawImage(s.canvas, sx, sy);
    }
    // the glowing pads that mark an arcade stop
    const pulse = Math.floor(t * 2.5) % 2;
    for (const key of stopAt.keys()) {
      const [px, py] = key.split(",").map(Number);
      const sx = px * TILE - camX, sy = py * TILE - camY;
      if (sx > -TILE && sy > -TILE && sx < W && sy < H) ctx.drawImage(tiles.pad[pulse], sx, sy);
    }
    // the hero: a little shadow, then the right frame of the picture sheet
    const hx = Math.round(p.x * TILE - camX), hy = Math.round(p.y * TILE - camY);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(hx + 4, hy + 13, 8, 2);
    const frameNo = moving() ? stepCount % 2 : 0;
    ctx.drawImage(heroSheet, frameNo * heroFrameW, facing * heroFrameH, heroFrameW, heroFrameH, hx, hy, TILE, TILE);
  }

  const stopLoop = startLoop({
    playing: () => !panel,
    update,
    draw,
  });

  // ---------- input ----------
  const undo: (() => void)[] = [];
  function on<T extends EventTarget>(target: T, type: string, fn: (e: any) => void, opts?: AddEventListenerOptions) {
    target.addEventListener(type, fn, opts);
    undo.push(() => target.removeEventListener(type, fn, opts));
  }
  const keyDir = (k: string) => (Object.hasOwn(KEY_DIRS, k) ? KEY_DIRS[k] : undefined);
  function press(d: Dir) {
    heldDirs = heldDirs.filter((x) => x !== d);
    heldDirs.push(d);
    buffer = d;
    bufferAge = 0;
  }
  function release(d: Dir) {
    heldDirs = heldDirs.filter((x) => x !== d);
  }

  on(window, "keydown", (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (panel) {
      if (e.key === "Escape") { e.preventDefault(); closePanel(); }
      else if (e.key === "Tab") trapTab(e);
      return; // the arrow keys do nothing to the island while a panel is open
    }
    const d = keyDir(e.key);
    if (d === undefined) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    e.preventDefault(); // so the arrow keys don't scroll the page
    if (!e.repeat) press(d);
  });
  on(window, "keyup", (e: KeyboardEvent) => {
    const d = keyDir(e.key);
    if (d !== undefined) release(d);
  });
  on(window, "blur", () => { heldDirs = []; });

  // The on-screen direction buttons. Pressing one is the same as holding an arrow key.
  padDirs.forEach(([d], i) => {
    const btn = padButtons[i];
    const stop = () => { release(d); btn.classList.remove("pressed"); };
    on(btn, "pointerdown", (e: PointerEvent) => {
      e.preventDefault();
      try {
        btn.setPointerCapture(e.pointerId); // keep hearing about this finger even if it slides off
      } catch {
        // Not every pointer can be captured. The button still works.
      }
      btn.classList.add("pressed");
      if (!panel) press(d);
    });
    on(btn, "pointerup", stop);
    on(btn, "pointercancel", stop);
    on(btn, "lostpointercapture", stop);
    on(btn, "contextmenu", (e: Event) => e.preventDefault());
  });

  // "List view" is a deliberate trip to the home page, so make sure it can't bounce back here.
  on(listLink, "click", () => clearPending());

  // Test helpers. These only exist in the development copy, never in the real site.
  if (import.meta.env.DEV) {
    (window as any).__island = {
      info: () => ({
        x: player.x, y: player.y, facing, moving: moving(), panel: panel ? panelOpener : null,
        tile: tileAt(player.x, player.y), start: START, size: [MAP_W, MAP_H],
      }),
      find: (letter: string) => findTiles(letter),
      teleport: (x: number, y: number, f: Dir = facing) => {
        closePanel();
        Object.assign(player, { x, y, nx: x, ny: y, t: 0 });
        facing = f;
        lastStop = stopAt.has(`${x},${y}`) ? `${x},${y}` : null;
      },
      close: () => closePanel(),
      doors: () => [...doorAt.entries()].map(([k, b]) => ({ at: k, id: b.id })),
      stops: () => [...stopAt.entries()].map(([k, s]) => ({ at: k, game: s.game })),
    };
    undo.push(() => { delete (window as any).__island; });
  }

  // Cleanup: stop the loop and remove every listener when leaving this screen.
  return () => {
    disposed = true;
    stopLoop();
    undo.forEach((f) => f());
  };
}
