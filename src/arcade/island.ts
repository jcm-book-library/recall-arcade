import "../island.css";
import type { Deck } from "../engine/types";
import { h } from "../ui/dom";
import { ARCADE_GAMES } from "../ui/home";
import { CHALLENGES, challengeDone, clearedSubjects, currentTrack, rememberTrack, trackFor } from "../engine/progress";
import type { Track } from "../engine/progress";
import { loadSavedHero, makeHeroSheet } from "./hero-art";
import { clamp, noise, startLoop } from "./kit";
import { readStamps, writeStamps } from "./stamps";
import { BUILDINGS, HALL, MAP_H, MAP_W, SIGNS, STOPS, blocked, findTiles, gateOrder, isSignKey, signNumber, tileAt } from "./island-map";
import type { WalkState } from "./island-map";
import { FLAG_COLOURS, TILE, drawSprite, makeFence, makeTileArt } from "./island-art";
import type { Sprite, SpriteKind } from "./island-art";

// THE ISLAND: the Overworld. A little top-down world that ties the whole arcade together, and
// it is the front page of the site. It is a ROUTE: a gravel path makes one big loop round the
// island, lined with fences, and you walk it in order. Each subject is a building on the loop,
// and just past each building is a GATE that stays shut until you have done enough challenges in
// that subject. The arcade games are stops beside the path: step onto one to play it, or skip it.
//
// It borrows the Labyrinth's way of moving: the map is a grid of tiles, the hero slides smoothly
// from tile to tile, a key you tap is remembered for a moment (the "buffer"), and the camera
// follows. The map itself is in island-map.ts (rows of letters, easy to edit) and the pictures
// are in island-art.ts.
//
// What happens when you walk:
//   - into a DOOR or a SIGNPOST (they are solid, you bump them): a panel opens.
//   - into a shut GATE: a panel says what is left to do, with a button to the right quizzes.
//   - onto an ARCADE STOP's glowing pad: a panel opens with Play and Skip.
//   - all the way round the loop and back to the start: fireworks, and FREE ROAM. The side fences
//     vanish, every gate stays open, and the arcade hall appears.
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

// ---------- what is remembered ----------
// Forever (localStorage): whether free roam is on, the track the gates were set for, and the stamps.
// Only until the tab closes (sessionStorage): where the hero is standing and how many gates he has
// walked through, so coming back from a quiz puts him exactly where he was.
const ISLAND_KEY = "learning-arcade:island";
const SPOT_KEY = "learning-arcade:island-spot";

interface IslandSave { freeRoam?: boolean; track?: Track }
function readIsland(): IslandSave {
  try {
    const v = JSON.parse(localStorage.getItem(ISLAND_KEY) ?? "{}");
    if (v && typeof v === "object") return v as IslandSave;
  } catch {
    // Storage can be blocked (private windows). The island then simply starts fresh each time.
  }
  return {};
}
function writeIsland(v: IslandSave) {
  try {
    localStorage.setItem(ISLAND_KEY, JSON.stringify(v));
  } catch {
    // Nothing to do: free roam just won't be remembered.
  }
}
interface Spot { x: number; y: number; facing: Dir; passed: number }
function readSpot(): Spot | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(SPOT_KEY) ?? "null");
    if (v && Number.isInteger(v.x) && Number.isInteger(v.y) && [0, 1, 2, 3].includes(v.facing)) return { passed: 0, ...v } as Spot;
  } catch {
    // see above
  }
  return null;
}
function writeSpot(s: Spot) {
  try {
    sessionStorage.setItem(SPOT_KEY, JSON.stringify(s));
  } catch {
    // Nothing to do: next time the hero starts at the signpost.
  }
}

// ---------- reading the map ----------
const isDigit = isSignKey; // a signpost: the digits 1 to 9, 0, then the letters in SIGN_KEYS

const START = findTiles("P")[0] ?? [MAP_W >> 1, MAP_H >> 1];
const GATES = gateOrder(); // the gate tiles, in the order you meet them: gate 0 belongs to BUILDINGS[0], and so on
const gateIndexAt = new Map<string, number>(GATES.map(([x, y], i) => [`${x},${y}`, i]));
// Doors by tile ("x,y"), and arcade spots by tile.
const doorAt = new Map<string, (typeof BUILDINGS)[number]>();
for (const b of BUILDINGS) for (const [x, y] of findTiles(b.door)) doorAt.set(`${x},${y}`, b);
const stopAt = new Map<string, (typeof STOPS)[number]>();
for (const s of STOPS) for (const [x, y] of findTiles(s.spot)) stopAt.set(`${x},${y}`, s);
const stopByScenery = (c: string) => STOPS.find((s) => s.scenery.includes(c));
const STOP_SCENERY = new Set(STOPS.flatMap((s) => [...s.scenery]));
const STAMP_GAMES = STOPS.filter((s) => s.stamp).map((s) => s.game);
// Most stamps come from pressing Play. A game with earnedBy "finish" gives its own stamp when you finish it.
const STAMP_ON_PLAY = new Set(STOPS.filter((s) => s.stamp && s.earnedBy !== "finish").map((s) => s.game));

/** The smallest rectangle (in tiles) that holds every tile with one of these letters. */
function bounds(letters: string) {
  let x0 = MAP_W, y0 = MAP_H, x1 = -1, y1 = -1;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (!letters.includes(tileAt(x, y))) continue;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Letters the path is made of, so a gate can tell which way the path runs through it.
const PATHY = new Set("=PbZE%&^$p@");

/** Where a flag's pole stands on each building: [pixels from the left edge, pixels from the top] of the pole's foot. */
const FLAG_AT: Record<string, [number, number]> = {
  lighthouse: [66, 94],
  observatory: [16, 28],
  museum: [56, 3],
  terminal: [14, 36],
  zoo: [76, 18],
  bandstand: [58, 14],
  stadium: [56, 2],
  theatre: [94, 15],
};

// ---------- the island screen ----------
export function renderIsland(root: HTMLElement, decks: Deck[]): () => void {
  const canvas = h("canvas", {
    class: "lab-canvas isl-canvas",
    width: String(W),
    height: String(H),
    role: "img",
    "aria-label": "Recall Arcade Island: walk the path round the island with the arrow keys. Each subject is a building with a door, and a gate after it opens when you have done enough challenges. The arcade games are stops beside the path. The List view button shows the same things as a list.",
  });
  const padDirs: [Dir, string, string][] = [[3, "up", "▲"], [1, "left", "◀"], [2, "right", "▶"], [0, "down", "▼"]];
  const padButtons = padDirs.map(([, name, arrow]) =>
    h("button", { class: `lab-key ${name}`, type: "button", tabindex: "-1", "aria-label": `Move ${name}` }, arrow),
  );
  const listLink = h("a", { class: "btn ghost isl-list", href: "#list" }, "List view");
  const hud = h("p", { class: "isl-hud" });
  const toast = h("div", { class: "isl-toast", role: "status", "aria-live": "polite" });
  const screen = h("div", { class: "lab-screen isl-screen" }, canvas);
  const page = h(
    "main",
    { class: "play labyrinth island" },
    h("div", { class: "play-top" }, h("h1", { class: "play-title" }, "Recall Arcade Island"), listLink),
    hud,
    screen,
    h("div", { class: "lab-controls" }, h("div", { class: "lab-pad", "aria-label": "Direction buttons" }, ...padButtons)),
    h(
      "p",
      { class: "lab-howto muted" },
      "Arrow keys or WASD to walk (or the buttons on a phone). Follow the path round the island. Walk into a door to see that subject's quizzes. A gate opens once you have done enough challenges there. Step onto a glowing pad to play an arcade game, or just walk past it.",
    ),
    toast,
  );
  root.replaceChildren(page);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  // ---------- progress ----------
  const deckSubjects = () => Object.fromEntries(decks.map((d) => [d.id, d.subject ?? ""]));
  const save = readIsland();
  // The gates are set for one track and stay that way until the loop is done. (Otherwise clearing
  // the last subject would flip the track to Intermediate and shut gates you had already earned.)
  // The FIRST lap is always the Easy track (one challenge per stop), even for a player who has
  // already played lots of quizzes: the first lap is the Easy playthrough. Harder laps come later.
  if (!save.track) { save.track = "easy"; writeIsland(save); }
  // The arcade games read the track the home page leaves in storage, so leave it here too.
  rememberTrack(trackFor(clearedSubjects(deckSubjects()).size));

  let freeRoam = save.freeRoam === true;
  let passed = 0; // how many gates the hero has walked through, in order, on this trip round
  const stamps = readStamps();
  const ws: WalkState = { freeRoam, openGates: new Set(), finishOpen: false };

  interface GateInfo { building: (typeof BUILDINGS)[number]; need: number; done: number; total: number; open: boolean }
  let gateInfos: GateInfo[] = [];
  /** Work out each gate from the saved challenges: how many are needed, how many are done. */
  function refreshGates() {
    const track = save.track ?? "easy";
    gateInfos = BUILDINGS.map((b) => {
      const quizzes = decks.filter((d) => d.subject === b.subject && !d.hidden && CHALLENGES[d.id]);
      const total = quizzes.length;
      const need = Math.min(total, track === "easy" ? 1 : track === "intermediate" ? 3 : total);
      const done = quizzes.filter((d) => challengeDone(d.id)).length;
      return { building: b, need, done, total, open: freeRoam || done >= need };
    });
    syncWalk();
  }
  /** Copy the gate states into the walking rules (cheap, so it can run whenever `passed` changes). */
  function syncWalk() {
    ws.freeRoam = freeRoam;
    ws.openGates = new Set(GATES.filter((_, i) => gateInfos[i]?.open).map(([x, y]) => `${x},${y}`));
    ws.finishOpen = passed >= GATES.length && ws.openGates.size === GATES.length;
    updateHud();
  }
  const bookBtn = h("button", { class: "btn ghost isl-book", type: "button", onclick: () => openBook() }, "Stamp book");
  function updateHud() {
    const have = STAMP_GAMES.filter((g) => stamps.has(g)).length;
    const open = gateInfos.filter((g) => g.open).length;
    hud.replaceChildren(
      h("span", { class: "isl-hud-item" }, h("span", { class: "isl-hud-icon", "aria-hidden": "true" }, "★"), `Stamps ${have}/${STAMP_GAMES.length}`),
      h("span", { class: "isl-hud-item" }, h("span", { class: "isl-hud-icon", "aria-hidden": "true" }, "▮"), `Gates open ${open}/${GATES.length}`),
    );
    if (freeRoam) hud.append(h("span", { class: "isl-hud-item free" }, "Free roam"));
    hud.append(bookBtn);
  }

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
  // Where each building flies its flag: the roof's top right, as a pixel spot on the map. (A flag
  // shows once a challenge is done in that subject.)
  const flagSpots = BUILDINGS.map((b) => {
    const box = bounds(b.body + b.door);
    const at = FLAG_AT[b.id] ?? [box.w * TILE - 14, 14];
    return { x: box.x * TILE + at[0], y: box.y * TILE + at[1] };
  });
  // The arcade hall is only built once free roam is on.
  let hallSprite: Sprite | null = null;
  function ensureHall() {
    if (hallSprite || !findTiles(HALL.body).length) return;
    const box = bounds(HALL.body + HALL.door);
    hallSprite = { canvas: drawSprite("hall", box.w, box.h, findTiles(HALL.door)[0][0] - box.x), ...box };
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

  refreshGates();
  const spot = readSpot();
  if (spot && !blocked(spot.x, spot.y, ws)) {
    // Back from a quiz or game (or a trip to the list): stand where we left.
    Object.assign(player, { x: spot.x, y: spot.y, nx: spot.x, ny: spot.y });
    facing = spot.facing;
    passed = Math.min(spot.passed, GATES.length);
    syncWalk();
    if (stopAt.has(`${spot.x},${spot.y}`)) lastStop = `${spot.x},${spot.y}`;
  }
  if (freeRoam) ensureHall();
  const moving = () => player.nx !== player.x || player.ny !== player.y;
  const rememberSpot = () => writeSpot({ x: player.x, y: player.y, facing, passed });

  // ---------- the panels ----------
  let panel: HTMLElement | null = null;
  let panelOpener = "";

  function closePanel() {
    if (!panel) return;
    panel.remove();
    panel = null;
    heldDirs = [];
    buffer = null;
    canvas.focus({ preventScroll: true });
  }

  function openPanel(opener: string, title: string, body: (Node | null)[], wide = true, closeLabel = "Close") {
    closePanel();
    heldDirs = [];
    buffer = null;
    const titleId = "isl-panel-title";
    const closeBtn = h("button", { class: "btn ghost isl-close", type: "button", onclick: () => closePanel() }, closeLabel);
    const box = h(
      "section",
      { class: `isl-panel${wide ? "" : " isl-small"}`, role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, tabindex: "-1" },
      h("h2", { id: titleId, class: "isl-title" }, title),
      ...body,
      h("div", { class: "isl-actions" }, closeBtn),
    );
    const overlay = h("div", { class: "isl-overlay" }, box);
    // A click on the dim backdrop closes it. A click on a "Play" link earns that game its stamp.
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) { closePanel(); return; }
      const link = (e.target as Element).closest<HTMLElement>("a[data-game]");
      if (link) addStamp(link.dataset.game ?? "");
    });
    page.append(overlay);
    panel = overlay;
    panelOpener = opener;
    // Move the keyboard focus into the panel: the first link or button if there is one, else the box.
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

  /** Playing a game from the island earns its stamp (a proper badge system comes later). */
  function addStamp(game: string) {
    if (!STAMP_ON_PLAY.has(game) || stamps.has(game)) return;
    stamps.add(game);
    writeStamps(stamps);
    updateHud();
  }

  function openSubject(b: (typeof BUILDINGS)[number]) {
    const list = decks.filter((d) => d.subject === b.subject && !d.hidden); // DECKS order, like the home page
    const doneCount = list.filter((d) => challengeDone(d.id)).length;
    const gate = gateInfos[BUILDINGS.indexOf(b)];
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
    if (!list.length) {
      openPanel(`door:${b.id}`, b.title, [h("p", { class: "isl-kicker" }, "Coming soon"), h("p", { class: "isl-text" }, "The quizzes are still being picked. The gate is not fussed.")]);
      return;
    }
    const gateLine = freeRoam || !gate
      ? `${list.length} ${list.length === 1 ? "quiz" : "quizzes"}${doneCount ? ` · ${doneCount} challenge${doneCount === 1 ? "" : "s"} done` : ""}`
      : `${list.length} ${list.length === 1 ? "quiz" : "quizzes"} · gate needs ${gate.need} challenge${gate.need === 1 ? "" : "s"} (${doneCount} done)`;
    openPanel(`door:${b.id}`, b.title, [h("p", { class: "isl-kicker" }, gateLine), h("ul", { class: "isl-quizzes" }, ...items)]);
  }

  function openGate(index: number) {
    const g = gateInfos[index];
    if (!g) return;
    const what = g.need === 1 ? "1 challenge" : `${g.need} challenges`;
    openPanel(
      `gate:${g.building.id}`,
      "The gate",
      [
        h("p", { class: "isl-text isl-sign" }, `Gate closed. Do ${what} at the ${g.building.place} to open it (${g.done} of ${g.need} done).`),
        h("button", { class: "btn isl-play", type: "button", onclick: () => openSubject(g.building) }, `See the ${g.building.subject.replace(" & ", " and ")} quizzes ▸`),
      ],
      false,
    );
  }

  function openFinish() {
    openPanel(
      "finish",
      "Finish line",
      [h("p", { class: "isl-text isl-sign" }, "Finish line. This end only opens for people who have been all the way round the island. The path goes the other way. It is a one-way sort of path.")],
      false,
    );
  }

  function openStop(s: (typeof STOPS)[number]) {
    const game = ARCADE_GAMES.find((g) => g.id === s.game);
    if (!game) return;
    const stamped = stamps.has(game.id);
    openPanel(
      `stop:${game.id}`,
      game.title,
      [
        h("p", { class: "isl-kicker" }, game.kicker ?? "Arcade game"),
        h("p", { class: "isl-text" }, game.blurb),
        s.stamp ? h("p", { class: `isl-stamp${stamped ? " got" : ""}` }, stamped ? "★ Stamp collected" : s.earnedBy === "finish" ? "☆ Finish the level to earn a stamp. Or skip it: nothing on the path needs it." : "☆ Play it once to earn a stamp. Or skip it: nothing on the path needs it.") : null,
        h("a", { class: "btn isl-play", href: `#${game.id}`, "data-game": STAMP_ON_PLAY.has(game.id) ? game.id : false }, s.stamp ? "Play ▸" : "Open ▸"),
      ],
      true,
      "Skip",
    );
  }

  /** The arcade hall's door: every arcade game, and the Hero Workshop. */
  function openHall() {
    const items = ARCADE_GAMES.map((g) => {
      const stampable = STAMP_ON_PLAY.has(g.id);
      const got = stamps.has(g.id);
      return h(
        "li",
        {},
        h(
          "a",
          { class: `isl-quiz${got ? " done" : ""}`, href: `#${g.id}`, "data-game": stampable ? g.id : false },
          h("span", { class: "isl-quiz-name" }, g.title),
          h("span", { class: "isl-quiz-challenge" }, got ? `★ Stamp collected · ${g.blurb}` : g.blurb),
          h("span", { class: "isl-go", "aria-hidden": "true" }, "Play ▸"),
        ),
      );
    });
    openPanel("hall", HALL.title, [h("p", { class: "isl-kicker" }, "Everything is open. Pick one."), h("ul", { class: "isl-quizzes" }, ...items)]);
  }

  /** The stamp book: every arcade stamp and every building's flag, collected or not, in one place. */
  function openBook() {
    const stampRows = STOPS.filter((s) => s.stamp).map((s) => {
      const game = ARCADE_GAMES.find((g) => g.id === s.game);
      const got = stamps.has(s.game);
      return h("li", { class: `isl-book-row${got ? " got" : ""}` },
        h("span", { class: "isl-book-mark", "aria-hidden": "true" }, got ? "★" : "☆"),
        h("span", { class: "isl-book-name" }, game?.title ?? s.game),
        h("span", { class: "isl-book-state" }, got ? "Stamp collected" : s.earnedBy === "finish" ? "Not finished yet" : "Not played yet"));
    });
    const flagRows = BUILDINGS.map((b, i) => {
      const g = gateInfos[i];
      const empty = !g || g.total === 0;
      const flying = !!g && g.done >= 1;
      return h("li", { class: `isl-book-row${flying ? " got" : ""}` },
        h("span", { class: "isl-book-mark isl-book-flag", "aria-hidden": "true", style: `color:${FLAG_COLOURS[i % FLAG_COLOURS.length]}` }, flying ? "⚑" : "⚐"),
        h("span", { class: "isl-book-name" }, b.title),
        h("span", { class: "isl-book-state" }, flying ? "Flag flying" : empty ? "Coming soon" : "No flag yet"));
    });
    const stampsHave = STAMP_GAMES.filter((g) => stamps.has(g)).length;
    const flagsHave = gateInfos.filter((g) => g.done >= 1).length;
    openPanel("book", "Stamp book", [
      h("p", { class: "isl-kicker" }, `Stamps ${stampsHave} of ${STAMP_GAMES.length} · Flags ${flagsHave} of ${BUILDINGS.length}`),
      h("h3", { class: "isl-book-head" }, "Arcade stamps"),
      h("ul", { class: "isl-book-list" }, ...stampRows),
      h("h3", { class: "isl-book-head" }, "Building flags"),
      h("p", { class: "isl-text isl-book-note" }, "A building flies a flag once you have done a challenge in its subject."),
      h("ul", { class: "isl-book-list" }, ...flagRows),
    ]);
  }

  function openSign(n: number) {
    openPanel(`sign:${n}`, "Sign", [h("p", { class: "isl-text isl-sign" }, SIGNS[n - 1] ?? "")], false);
  }

  // ---------- finishing the loop: free roam ----------
  interface Spark { x: number; y: number; vx: number; vy: number; age: number; life: number; colour: string }
  let sparks: Spark[] = [];
  let burstsLeft = 0;
  let burstTimer = 0;
  let toastTimer = 0;
  const reduceMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPARK_COLOURS = ["#ffd24a", "#ff7a8a", "#7fd3ff", "#86f0a8", "#ffffff", "#ffb52b"];

  function burst() {
    const cx = 40 + Math.random() * (W - 80), cy = 20 + Math.random() * (H * 0.5);
    const colour = SPARK_COLOURS[Math.floor(Math.random() * SPARK_COLOURS.length)];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2, sp = 30 + Math.random() * 40;
      sparks.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: 1.2 + Math.random() * 0.8, colour });
    }
  }
  function tickFx(dt: number) {
    if (burstsLeft > 0) {
      burstTimer -= dt;
      if (burstTimer <= 0) { burst(); burstsLeft--; burstTimer = 0.4; }
    }
    for (const p of sparks) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 55 * dt; // gravity
    }
    if (sparks.length) sparks = sparks.filter((p) => p.age < p.life);
  }
  function showToast(text: string) {
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 8000);
  }

  /** The hero has walked all the way round and back into the start. */
  function completeLoop() {
    freeRoam = true;
    save.freeRoam = true;
    writeIsland(save);
    ensureHall();
    refreshGates();
    if (!reduceMotion) { burstsLeft = 9; burstTimer = 0; }
    showToast("You've been all the way round! Free roam is open.");
  }

  // ---------- walking ----------
  /** Try to start a step in direction d. Solid things stop you (doors, signs, gates and arcade scenery open a panel instead). */
  function tryStep(d: Dir) {
    facing = d;
    const tx = player.x + DX[d], ty = player.y + DY[d];
    const c = tileAt(tx, ty);
    const key = `${tx},${ty}`;
    if (doorAt.has(key)) { openSubject(doorAt.get(key)!); return; }
    if (c === HALL.door) { if (freeRoam) openHall(); return; }
    if (isDigit(c)) { openSign(signNumber(c)); return; }
    if (c === "Z" && blocked(tx, ty, ws)) { openGate(gateIndexAt.get(key) ?? 0); return; }
    if (c === "E" && blocked(tx, ty, ws)) { openFinish(); return; }
    if (STOP_SCENERY.has(c) && c !== "_" && !stopAt.has(`${player.x},${player.y}`) && blocked(tx, ty, ws)) {
      const s = stopByScenery(c);
      if (s) { openStop(s); return; }
    }
    if (blocked(tx, ty, ws)) return;
    player.nx = tx;
    player.ny = ty;
    player.t = 0;
  }

  /** Called when a step finishes: gates passed, the finish line, or an arcade pad. */
  function arrive() {
    player.x = player.nx;
    player.y = player.ny;
    player.t = 0;
    stepCount++;
    const key = `${player.x},${player.y}`;
    const gate = gateIndexAt.get(key);
    if (gate !== undefined && gate === passed) { passed++; syncWalk(); }
    if (tileAt(player.x, player.y) === "E" && !freeRoam && ws.finishOpen) completeLoop();
    rememberSpot();
    const s = stopAt.get(key);
    if (!s) { lastStop = null; return; }
    if (lastStop === key) return;
    lastStop = key;
    openStop(s);
  }

  function chooseDir(): Dir | null {
    if (heldDirs.length) return heldDirs[heldDirs.length - 1];
    return buffer;
  }

  function update(dt: number) {
    tickFx(dt);
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
  // Free-roam fences count as fence only while they are still standing.
  const fenceShapes = new Map<number, HTMLCanvasElement>();
  const isFence = (x: number, y: number) => { const c = tileAt(x, y); return c === "F" || (c === "f" && !freeRoam); };
  const fenceFor = (x: number, y: number) => {
    const l = isFence(x - 1, y), r = isFence(x + 1, y), u = isFence(x, y - 1), dn = isFence(x, y + 1);
    const k = (l ? 1 : 0) | (r ? 2 : 0) | (u ? 4 : 0) | (dn ? 8 : 0);
    let c = fenceShapes.get(k);
    if (!c) { c = makeFence(l, r, u, dn); fenceShapes.set(k, c); }
    return c;
  };
  /** Which way the path runs through a gate or finish tile: "x" (left to right) or "y". */
  const alongOf = (x: number, y: number): "x" | "y" => (PATHY.has(tileAt(x - 1, y)) || PATHY.has(tileAt(x + 1, y)) ? "x" : "y");

  function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, t: number) {
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
    } else if (c === "=" || c === "P" || c === "%" || c === "&" || c === "^" || c === "_" || c === "Y" || c === "Z" || c === "E") {
      ctx.drawImage(tiles.gravel[n % 4], sx, sy);
      if (c === "Z") {
        const open = ws.freeRoam || ws.openGates.has(`${x},${y}`);
        ctx.drawImage(tiles.gate[`${open ? "open" : "shut"}-${alongOf(x, y)}`], sx, sy);
      } else if (c === "E") {
        const open = ws.freeRoam || ws.finishOpen;
        ctx.drawImage(tiles.finish[`${open ? "open" : "shut"}-${alongOf(x, y)}`], sx, sy);
      }
    } else if (c === "d" || ((c === "U" || c === "u") && !freeRoam)) {
      // The hall's plot is bare dirt until free roam builds the hall on top of it.
      ctx.drawImage(tiles.dirt[n % 3], sx, sy);
    } else if (c === "U" || c === "u") {
      grass();
    } else {
      grass();
      if (c === "." || c === "T" || c === "*" || c === "r" || c === "F" || c === "f" || isDigit(c)) {
        // a darker green lip where the grass meets the beach
        for (let side = 0; side < 4; side++) {
          const near = tileAt(x + (side === 1 ? 1 : side === 3 ? -1 : 0), y + (side === 0 ? -1 : side === 2 ? 1 : 0));
          if (near === ",") ctx.drawImage(tiles.lip[side], sx, sy);
        }
      }
      if (c === "*") ctx.drawImage(tiles.flowers[n % tiles.flowers.length], sx, sy);
      else if (c === "T") ctx.drawImage(tiles.trees[(n >>> 3) % 3], sx, sy);
      else if (c === "r") ctx.drawImage(tiles.rock, sx, sy);
      else if (c === "F" || (c === "f" && !freeRoam)) ctx.drawImage(fenceFor(x, y), sx, sy);
      else if (isDigit(c)) ctx.drawImage(tiles.sign, sx, sy);
    }
  }

  /** Paint the map, the buildings and the pads onto any canvas, from the camera position (camX, camY). */
  function paintWorld(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number, t: number) {
    ctx.fillStyle = "#2f7fc4";
    ctx.fillRect(0, 0, vw, vh);
    const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
    for (let y = y0; y <= y0 + Math.ceil(vh / TILE); y++) {
      for (let x = x0; x <= x0 + Math.ceil(vw / TILE); x++) {
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        drawTile(ctx, x, y, x * TILE - camX, y * TILE - camY, t);
      }
    }
    const all = freeRoam && hallSprite ? [...sprites, hallSprite] : sprites;
    for (const s of all) {
      const sx = s.x * TILE - camX, sy = s.y * TILE - camY;
      if (sx > vw || sy > vh || sx + s.w * TILE < 0 || sy + s.h * TILE < 0) continue;
      ctx.drawImage(s.canvas, sx, sy);
    }
    // a flag on the roof of every building whose subject has a challenge done
    const wave = Math.floor(t * 3) % 2;
    flagSpots.forEach((f, i) => {
      if (!gateInfos[i] || gateInfos[i].done < 1) return;
      const sx = f.x - camX - 1, sy = f.y - camY - 21;
      if (sx > vw || sy > vh || sx < -TILE || sy < -22) return;
      ctx.drawImage(tiles.flags[i % FLAG_COLOURS.length][wave], Math.round(sx), Math.round(sy));
    });
    // the glowing pads that mark an arcade stop (green with a tick once the game has been played)
    const pulse = Math.floor(t * 2.5) % 2;
    for (const [key, s] of stopAt) {
      const [px, py] = key.split(",").map(Number);
      const sx = px * TILE - camX, sy = py * TILE - camY;
      if (sx > -TILE && sy > -TILE && sx < vw && sy < vh) ctx.drawImage(stamps.has(s.game) ? tiles.stampedPad : tiles.pad[pulse], sx, sy);
    }
  }

  function draw(t: number) {
    const p = where();
    const camX = Math.round(clamp(p.x * TILE + TILE / 2 - W / 2, 0, MAP_W * TILE - W));
    const camY = Math.round(clamp(p.y * TILE + TILE / 2 - H / 2, 0, MAP_H * TILE - H));
    paintWorld(ctx, camX, camY, W, H, t);
    // the hero: a little shadow, then the right frame of the picture sheet
    const hx = Math.round(p.x * TILE - camX), hy = Math.round(p.y * TILE - camY);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(hx + 4, hy + 13, 8, 2);
    const frameNo = moving() ? stepCount % 2 : 0;
    ctx.drawImage(heroSheet, frameNo * heroFrameW, facing * heroFrameH, heroFrameW, heroFrameH, hx, hy, TILE, TILE);
    // fireworks, drawn over everything
    for (const sp of sparks) {
      ctx.globalAlpha = clamp(1 - sp.age / sp.life, 0, 1);
      ctx.fillStyle = sp.colour;
      ctx.fillRect(Math.round(sp.x), Math.round(sp.y), 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  const stopLoop = startLoop({
    playing: () => !panel,
    update,
    idle: tickFx, // the fireworks keep going behind a panel
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

  // Test helpers. These only exist in the development copy, never in the real site.
  if (import.meta.env.DEV) {
    const DONE_KEY = "learning-arcade:challenges"; // the list progress.ts keeps of ticked challenges
    (window as any).__island = {
      info: () => ({
        x: player.x, y: player.y, facing, moving: moving(), panel: panel ? panelOpener : null,
        tile: tileAt(player.x, player.y), start: START, size: [MAP_W, MAP_H],
        freeRoam, passed, track: save.track, stamps: [...stamps], sparks: sparks.length,
        gates: gateInfos.map((g, i) => ({ id: g.building.id, at: GATES[i], need: g.need, done: g.done, total: g.total, open: g.open })),
        hud: hud.textContent, toast: toast.classList.contains("show") ? toast.textContent : "",
      }),
      find: (letter: string) => findTiles(letter),
      /** The whole map in one picture (a PNG data address), for looking at the layout. */
      overview: () => {
        const c = document.createElement("canvas");
        c.width = MAP_W * TILE;
        c.height = MAP_H * TILE;
        const g = c.getContext("2d")!;
        g.imageSmoothingEnabled = false;
        paintWorld(g, 0, 0, c.width, c.height, 0);
        return c.toDataURL("image/png");
      },
      teleport: (x: number, y: number, f: Dir = facing, gatesPassed?: number) => {
        closePanel();
        Object.assign(player, { x, y, nx: x, ny: y, t: 0 });
        facing = f;
        if (gatesPassed !== undefined) { passed = gatesPassed; syncWalk(); }
        lastStop = stopAt.has(`${x},${y}`) ? `${x},${y}` : null;
        rememberSpot();
      },
      close: () => closePanel(),
      book: () => openBook(),
      doors: () => [...doorAt.entries()].map(([k, b]) => ({ at: k, id: b.id })),
      stops: () => [...stopAt.entries()].map(([k, s]) => ({ at: k, game: s.game })),
      gates: () => GATES,
      /** Pin the track the gates use ("easy" needs 1 challenge, "intermediate" 3, "hard" all). */
      setTrack: (t: Track) => { save.track = t; writeIsland(save); refreshGates(); },
      /** Tick the first `n` challenges of a subject, as if they had been done. */
      giveChallenges: (subject: string, n: number) => {
        const ids = decks.filter((d) => d.subject === subject && !d.hidden && CHALLENGES[d.id]).slice(0, n).map((d) => d.id);
        const done = new Set<string>(JSON.parse(localStorage.getItem(DONE_KEY) ?? "[]"));
        ids.forEach((id) => done.add(id));
        localStorage.setItem(DONE_KEY, JSON.stringify([...done]));
        refreshGates();
        return ids;
      },
      setFreeRoam: (on: boolean) => {
        freeRoam = on;
        save.freeRoam = on;
        writeIsland(save);
        if (on) ensureHall();
        refreshGates();
      },
    };
    undo.push(() => { delete (window as any).__island; });
  }

  // Cleanup: remember where the hero is, stop the loop and remove every listener when leaving this screen.
  return () => {
    rememberSpot();
    disposed = true;
    clearTimeout(toastTimer);
    stopLoop();
    undo.forEach((f) => f());
  };
}
