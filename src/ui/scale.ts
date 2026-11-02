// THE SCALE OF THINGS: the game screen.
//
// A round is five puzzles of one quantity (speed, mass, size...). There are two ways to play:
//   "Put in order":       drag shuffled cards into the right order (1 point per card in place).
//   "Place on the scale": put each thing on a number line; the closer, the more points.
// The facts live in decks/scale-data.ts. This file only does the picking and the playing.
//
// WHY A "SPREAD"? Real values are wildly different (a snail 0.013 m/s, light 300,000,000 m/s).
// Each quantity has a `spread` function that turns a value into a position where equal steps
// FEEL equal (usually the logarithm). All the fairness rules and the number line work in
// spread units, never in raw values.
import type { Deck } from "../engine/types";
import { QUANTITIES, type Quantity, type ScaleThing } from "../decks/scale-data";
import { bestFor, gamesFor, loadPrefs, recordGame, savePrefs } from "../engine/storage";
import { currentTrack } from "../engine/progress";
import { h } from "./dom";

export type Level = "easy" | "medium" | "hard";
export type Way = "order" | "place";

const LEVELS: { id: Level; label: string; things: number; note: string }[] = [
  { id: "easy", label: "Easy", things: 5, note: "5 things, far apart" },
  { id: "medium", label: "Medium", things: 6, note: "6 things, closer together" },
  { id: "hard", label: "Hard", things: 7, note: "7 things, some close calls" },
];
const WAYS: { id: Way; label: string; note: string }[] = [
  { id: "order", label: "Put in order", note: "Drag the cards into order." },
  { id: "place", label: "Place on the scale", note: "Put each thing where it belongs on a number line." },
];
const PUZZLES = 5;

// ---------------------------------------------------------------- picking a fair puzzle
function shuffle<T>(list: T[], rand: () => number = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The distance, in spread units, from the smallest to the largest thing of a quantity. */
export function spreadRange(q: Quantity): number {
  const s = q.items.map((i) => q.spread(i.value));
  return Math.max(...s) - Math.min(...s);
}

/**
 * Picks the things for one puzzle, returned smallest first (the true order).
 *   Easy:   5 things, every neighbouring gap at least 0.12 of the whole range R.
 *   Medium: 6 things, every gap at least 0.05 R.
 *   Hard:   7 things, every gap at least the quantity's minGap, and at least two close calls
 *           (neighbours less than 0.04 R apart).
 * We draw things at random and keep the first draw that meets the rule. If 2000 draws fail,
 * the rule is relaxed a little at a time, but never below `minGap`, so it always finishes.
 * `used` holds the sets already asked this round, so a round doesn't repeat a puzzle.
 */
export function makePuzzle(q: Quantity, level: Level, used: Set<string> = new Set(), rand: () => number = Math.random): ScaleThing[] {
  const n = Math.min(LEVELS.find((l) => l.id === level)!.things, q.items.length);
  const R = spreadRange(q);
  const spreadOf = new Map(q.items.map((i) => [i.id, q.spread(i.value)]));

  // Each stage is a rule: the smallest allowed gap, and how many close calls are needed.
  const stages: { gap: number; close: number }[] = [];
  if (level === "hard") {
    for (const close of [2, 1, 0]) stages.push({ gap: q.minGap, close });
  } else {
    const base = (level === "easy" ? 0.12 : 0.05) * R;
    for (let k = 0; k < 10; k++) stages.push({ gap: Math.max(q.minGap, base * (1 - k * 0.09)), close: 0 });
    stages.push({ gap: q.minGap, close: 0 });
  }

  const keyOf = (things: ScaleThing[]) => things.map((t) => t.id).sort().join("|");
  let fallback: ScaleThing[] | null = null;
  let fallbackGap = -1;

  for (const avoidRepeats of [true, false]) {
    for (let si = 0; si < stages.length; si++) {
      const stage = stages[si];
      const tries = si === 0 ? 2000 : 150;
      for (let t = 0; t < tries; t++) {
        const draw = shuffle(q.items, rand)
          .slice(0, n)
          .sort((a, b) => spreadOf.get(a.id)! - spreadOf.get(b.id)!);
        const gaps = draw.slice(1).map((x, i) => spreadOf.get(x.id)! - spreadOf.get(draw[i].id)!);
        const smallest = Math.min(...gaps);
        if (smallest > fallbackGap && smallest >= q.minGap - 1e-9) {
          fallback = draw;
          fallbackGap = smallest;
        }
        if (smallest < stage.gap - 1e-9) continue;
        if (gaps.filter((g) => g < 0.04 * R).length < stage.close) continue;
        if (avoidRepeats && used.has(keyOf(draw))) continue;
        return draw;
      }
    }
  }
  // Practically unreachable (it would mean the data is too crowded), but never hang or crash.
  return fallback ?? q.items.slice(0, n);
}

// ---------------------------------------------------------------- numbers and the number line
const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
const sup = (n: number) => String(n).replace(/./g, (c) => SUP[c] ?? c);
const minus = (s: string) => s.replace("-", "−");

const UNIT_SHORT: Record<string, string> = { speed: "m/s", mass: "kg", size: "m", temperature: "°C", time: "s", loudness: "dB", energy: "J", weight: "kg" };

/** A spread position back to a real value (the opposite of q.spread). */
function unspread(q: Quantity, s: number): number {
  if (q.id === "loudness") return s * 10;
  if (q.id === "temperature") return 10 ** s - 274.15;
  return 10 ** s;
}

/** A value to about two digits, e.g. "120,000" or "3.2 × 10⁸", with its short unit. */
function fmtValue(q: Quantity, v: number): string {
  const a = Math.abs(v);
  let text: string;
  if (a === 0) text = "0";
  else if (a >= 1e9 || a < 1e-3) {
    const e = Math.floor(Math.log10(a));
    const m = Number((v / 10 ** e).toPrecision(2));
    text = `${m} × 10${sup(e)}`;
  } else text = Number(v.toPrecision(2)).toLocaleString("en-AU", { maximumFractionDigits: 6 });
  return `${minus(text)} ${UNIT_SHORT[q.id] ?? ""}`.trim();
}

interface Tick {
  s: number;
  text: string;
}
interface Axis {
  d0: number;
  d1: number;
  pct: (s: number) => number;
  fromPct: (p: number) => number;
  /** Every tick mark, with the label to use if there is room, most important first. */
  ticks: Tick[];
}

function powerLabel(e: number): string {
  return e >= -3 && e <= 6 ? Number(10 ** e).toLocaleString("en-AU", { maximumFractionDigits: 3 }) : `10${sup(e)}`;
}

/** The line runs from the smallest to the largest thing in the quantity, with padding at each end. */
function makeAxis(q: Quantity): Axis {
  const ss = q.items.map((i) => q.spread(i.value));
  const lo = Math.min(...ss);
  const hi = Math.max(...ss);
  const pad = (hi - lo) * 0.06;
  const d0 = lo - pad;
  const d1 = hi + pad;
  let ticks: Tick[] = [];
  if (q.id === "loudness") {
    // Every 20 dB; the round numbers come first when space is short.
    for (let db = 0; db <= 180; db += 20) ticks.push({ s: db / 10, text: String(db) });
    ticks.sort((a, b) => Number(a.text) % 60 - Number(b.text) % 60 || Number(a.text) - Number(b.text));
  } else if (q.id === "temperature") {
    // Degrees Celsius at sensible points. The scale is in kelvin underneath.
    for (const c of [0, 1000, -273.15, 1000000, 100, 10000000, -100, 10000, -200]) {
      ticks.push({ s: q.spread(c), text: minus(c === -273.15 ? "-273" : c.toLocaleString("en-AU")) });
    }
  } else {
    // Powers of ten. "1" first, then every 12th, 6th, 3rd, 2nd... so labels never crowd.
    const rank = (e: number) => (e === 0 ? -1 : e % 12 === 0 ? 0 : e % 6 === 0 ? 1 : e % 3 === 0 ? 2 : e % 2 === 0 ? 3 : 4);
    for (let e = Math.ceil(d0); e <= Math.floor(d1); e++) ticks.push({ s: e, text: powerLabel(e) });
    ticks.sort((a, b) => rank(a.s) - rank(b.s) || Math.abs(a.s) - Math.abs(b.s));
  }
  ticks = ticks.filter((t) => t.s >= d0 && t.s <= d1);
  return { d0, d1, pct: (s) => ((s - d0) / (d1 - d0)) * 100, fromPct: (p) => d0 + (Math.min(100, Math.max(0, p)) / 100) * (d1 - d0), ticks };
}

/** Draws the tick marks, and labels only as many as fit without touching. */
function layoutTicks(track: HTMLElement, axis: Axis) {
  track.querySelectorAll(".sc-tick").forEach((n) => n.remove());
  const width = track.getBoundingClientRect().width || 300;
  const taken: { x: number; w: number }[] = [];
  const frag: HTMLElement[] = [];
  for (const t of axis.ticks) {
    const x = (axis.pct(t.s) / 100) * width;
    const w = t.text.length * 6.4 + 6;
    const fits = taken.every((o) => Math.abs(o.x - x) >= (o.w + w) / 2 + 4) && x - w / 2 >= -14 && x + w / 2 <= width + 14;
    if (fits) taken.push({ x, w });
    frag.push(h("span", { class: "sc-tick", style: `left:${axis.pct(t.s)}%`, "aria-hidden": "true" }, fits ? h("span", {}, t.text) : null));
  }
  track.append(...frag);
}

// ---------------------------------------------------------------- the learn card
/** "Learn it first": a few short panels on how the scale works. */
export function learnCard(): Node {
  return h(
    "div",
    { class: "sc-learn" },
    h("h3", {}, "How the scale works"),
    h("h4", {}, "Things are BIG apart."),
    h(
      "p",
      {},
      "Light is about 20 billion times faster than a snail. A normal ruler can't show that, so this game uses a scale where each step is ten times bigger than the last: 1, 10, 100, 1,000... That's called a logarithmic (log) scale.",
    ),
    h("h4", {}, "The units."),
    h(
      "ul",
      {},
      h("li", {}, "Speed: metres per second (a person walks about 1.4)"),
      h("li", {}, "Mass: kilograms"),
      h("li", {}, "Size: metres"),
      h("li", {}, "Temperature: degrees Celsius (water freezes at 0 and boils at 100)"),
      h("li", {}, "Time: seconds"),
      h("li", {}, "Loudness: decibels. Every 10 more is ten times the sound energy, so 80 dB is a hundred times 60 dB"),
      h("li", {}, "Energy: joules. Lifting an apple 1 metre takes about 1.5 joules"),
    ),
    h("h4", {}, "Mass or weight?"),
    h(
      "p",
      {},
      "Mass is how much stuff you are made of. It's the same everywhere. Weight is how hard gravity pulls on that stuff, so it changes from planet to planet. On the Moon you'd weigh about a sixth of what you do on Earth.",
    ),
  );
}

// "Don't show this again" shares its list with the other games (see ui/play.ts).
const STUDY_OFF = "learning-arcade:study-off";
function learnDismissed(deckId: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(STUDY_OFF) ?? "[]") as string[]).includes(deckId);
  } catch {
    return false;
  }
}
function dismissLearn(deckId: string) {
  try {
    const list = JSON.parse(localStorage.getItem(STUDY_OFF) ?? "[]") as string[];
    if (!list.includes(deckId)) list.push(deckId);
    localStorage.setItem(STUDY_OFF, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

// ---------------------------------------------------------------- the screen
const defaultLevel = (): Level => ({ easy: "easy", intermediate: "medium", hard: "hard" })[currentTrack()] as Level;
const defaultWay = (l: Level): Way => (l === "easy" ? "order" : "place");

/** How many points (0 to 100) a placing is worth: full marks within 0.03 R, none at 0.25 R. */
export function placePoints(off: number, R: number): number {
  const near = 0.03 * R;
  const far = 0.25 * R;
  if (off <= near) return 100;
  return Math.round(100 * Math.max(0, 1 - (off - near) / (far - near)));
}

export function renderScale(root: HTMLElement, deck: Deck) {
  // ----- choices (remembered between visits)
  const prefs = loadPrefs(deck.id);
  const prefOn = (k: string) => prefs.options?.[k] === true;
  let q: Quantity = QUANTITIES.find((x) => x.id === prefs.variant) ?? QUANTITIES.find((x) => x.id === "speed")!;
  let level: Level = (LEVELS.find((l) => prefOn(`level-${l.id}`))?.id ?? defaultLevel()) as Level;
  let wayChosen = prefOn("way-order") || prefOn("way-place");
  let way: Way = prefOn("way-place") ? "place" : prefOn("way-order") ? "order" : defaultWay(level);

  // ----- the round
  let puzzles: ScaleThing[][] = [];
  let pi = 0;
  let points = 0; // in "cards right"; Way 2 adds fractions
  let asked = 0;
  const foundIds: string[] = [];
  const missedIds: string[] = [];
  const review: { sorted: ScaleThing[]; ok: Set<string> }[] = [];
  const idOf = (t: ScaleThing) => `${q.id}-${t.id}`;

  const setup = h("div", { class: "setup" });
  const learnBar = h("div", { class: "study-bar" });
  learnBar.hidden = true;
  const game = h("div", { class: "sc-game" });
  game.hidden = true;
  const results = h("div", { class: "results" });
  results.hidden = true;
  root.replaceChildren(
    h(
      "main",
      { class: "play" },
      h("div", { class: "play-top" }, h("a", { class: "back", href: "#" }, "◂ Arcade"), h("h1", { class: "play-title" }, deck.title)),
      setup,
      learnBar,
      game,
      results,
    ),
  );

  // Things that must be tidied up when the player leaves.
  let relayout: (() => void) | null = null;
  const onResize = () => relayout?.();
  window.addEventListener("resize", onResize);

  const chip = (label: string, on: boolean, click: () => void, extra = "") =>
    h("button", { type: "button", class: on ? "chip on" : "chip", "aria-pressed": String(on), onclick: click }, label, extra ? h("span", { class: "sc-chip-note" }, extra) : null);

  // ---------- setup ----------
  function remember() {
    const options: Record<string, boolean> = { [`level-${level}`]: true };
    if (wayChosen) options[`way-${way}`] = true;
    savePrefs(deck.id, { variant: q.id, options });
  }

  function renderSetup() {
    const key = `${q.id}-${way}-${level}`;
    const best = bestFor(deck.id, key);
    setup.replaceChildren(
      h("p", { class: "sc-label" }, "What to put in order"),
      h(
        "div",
        { class: "chips", role: "group", "aria-label": "Choose a quantity" },
        ...QUANTITIES.map((x) =>
          chip(x.id === "speed" ? `★ ${x.label}` : x.label, x.id === q.id, () => {
            q = x;
            remember();
            renderSetup();
          }),
        ),
      ),
      h("p", { class: "sc-label" }, "Level"),
      h(
        "div",
        { class: "chips", role: "group", "aria-label": "Choose a level" },
        ...LEVELS.map((l) =>
          chip(l.label, l.id === level, () => {
            level = l.id;
            if (!wayChosen) way = defaultWay(level);
            remember();
            renderSetup();
          }),
        ),
      ),
      h("p", { class: "muted sc-note" }, LEVELS.find((l) => l.id === level)!.note + "."),
      h("p", { class: "sc-label" }, "Way to play"),
      h(
        "div",
        { class: "chips", role: "group", "aria-label": "Choose a way to play" },
        ...WAYS.map((w) =>
          chip(w.label, w.id === way, () => {
            way = w.id;
            wayChosen = true;
            remember();
            renderSetup();
          }),
        ),
      ),
      h("p", { class: "muted sc-note" }, `${WAYS.find((w) => w.id === way)!.note} ${PUZZLES} puzzles a round.`),
      h(
        "div",
        { class: "setup-row" },
        h("span", { class: "best" }, best ? `Best: ${best.score}/${best.total}` : "No score yet"),
        h("button", { type: "button", class: "btn ghost", onclick: () => showLearn(false) }, "Learn it first"),
        h("button", { type: "button", class: "btn primary", onclick: startOrLearn }, "Start ▸"),
      ),
      ...(deck.related ? [h("a", { class: "btn ghost related", href: deck.related.href }, deck.related.label)] : []),
    );
  }

  // ---------- the learn card ----------
  /** On the Easy track, a quiz that has never been played opens the card first (once). */
  function startOrLearn() {
    if (currentTrack() === "easy" && !gamesFor(deck.id).length && !learnDismissed(deck.id)) showLearn(true);
    else start();
  }

  function showLearn(firstTime: boolean) {
    setup.hidden = true;
    const leave = () => {
      learnBar.hidden = true;
      setup.hidden = false;
    };
    learnBar.replaceChildren(
      h("div", { class: "learn-card" }, deck.learn ? deck.learn() : learnCard()),
      h(
        "div",
        { class: "study-row" },
        h("p", {}, h("strong", {}, firstTime ? "New to this one? Have a look first. " : "Take your time. "), "You can open this again from the setup screen."),
        h(
          "div",
          { class: "study-actions" },
          h("button", { type: "button", class: "btn primary", onclick: () => { learnBar.hidden = true; start(); } }, "Got it, let's play ▸"),
          firstTime
            ? h("button", { type: "button", class: "btn ghost", onclick: () => { dismissLearn(deck.id); learnBar.hidden = true; start(); } }, "Don't show this again")
            : h("button", { type: "button", class: "btn ghost", onclick: leave }, "◂ Back"),
        ),
      ),
    );
    learnBar.hidden = false;
  }

  // ---------- starting and finishing a round ----------
  function start() {
    puzzles = [];
    const used = new Set<string>();
    for (let i = 0; i < PUZZLES; i++) {
      const p = makePuzzle(q, level, used);
      used.add(p.map((t) => t.id).sort().join("|"));
      puzzles.push(p);
    }
    pi = 0;
    points = 0;
    asked = 0;
    foundIds.length = 0;
    missedIds.length = 0;
    review.length = 0;
    setup.hidden = true;
    learnBar.hidden = true;
    results.hidden = true;
    game.hidden = false;
    startPuzzle();
  }

  const startPuzzle = () => (way === "order" ? renderOrder() : renderPlaceStart());

  /** Called when a puzzle is done: score is per thing, 0 to 1. */
  function donePuzzle(sorted: ScaleThing[], score: Map<string, number>) {
    const ok = new Set<string>();
    for (const t of sorted) {
      const s = score.get(t.id) ?? 0;
      points += s;
      asked += 1;
      const good = way === "order" ? s >= 1 : s >= 0.6;
      (good ? foundIds : missedIds).push(idOf(t));
      if (good) ok.add(t.id);
    }
    review.push({ sorted, ok });
  }

  function nextPuzzle() {
    pi++;
    if (pi < puzzles.length) startPuzzle();
    else finish();
  }

  function finish() {
    relayout = null;
    game.hidden = true;
    const variant = `${q.id}-${way}-${level}`;
    const prev = bestFor(deck.id, variant);
    const score = Math.round(points);
    recordGame({ deck: deck.id, variant, score, total: asked, seconds: 0, date: Date.now() }, foundIds, missedIds);
    const ratio = asked ? score / asked : 0;
    results.replaceChildren(
      h(
        "div",
        { class: "results-head" },
        h("div", { class: "big" }, `${score}`, h("small", {}, `/${asked}`)),
        h(
          "div",
          {},
          h("p", { class: "verdict" }, ratio >= 0.9 ? "You have a real feel for the scale." : ratio >= 0.6 ? "Good feel for it. Go again?" : "Big numbers are hard to feel. Have another go."),
          h("p", { class: "muted" }, !prev || ratio > prev.score / prev.total ? "That's your best for this setting." : `Your best here is ${prev.score}/${prev.total}.`),
        ),
        h(
          "div",
          { class: "results-actions" },
          h("button", { type: "button", class: "btn primary", onclick: start }, "Play again"),
          h("button", { type: "button", class: "btn ghost", onclick: () => { results.hidden = true; setup.hidden = false; renderSetup(); } }, "Change round"),
        ),
      ),
      h("h3", { class: "sc-order-title" }, "Everything in this round, in true order"),
      ...review.map((r, i) =>
        h(
          "div",
          { class: "sc-review" },
          h("p", { class: "sc-label" }, `Puzzle ${i + 1} · ${q.low} to ${q.high.toLowerCase()}`),
          h(
            "ol",
            { class: "sc-order" },
            ...r.sorted.map((t) => h("li", { class: r.ok.has(t.id) ? "good" : "bad" }, h("span", { class: "sc-o-name" }, t.name), h("span", { class: "sc-o-val" }, t.show))),
          ),
        ),
      ),
    );
    results.hidden = false;
    window.scrollTo(0, 0);
  }

  const head = (extra?: string) =>
    h(
      "div",
      { class: "tl-card" },
      h("span", { class: "tl-count" }, `${q.label} · puzzle ${pi + 1} of ${puzzles.length}${extra ? ` · ${extra}` : ""}`),
      h("p", { class: "tl-event" }, q.question),
    );
  const scoreLine = () => h("span", { class: "tl-score" }, `${Math.round(points)}/${asked}`);
  const sortedOf = (list: ScaleThing[]) => [...list].sort((a, b) => q.spread(a.value) - q.spread(b.value));

  // ======================================================================
  // WAY 1: PUT IN ORDER
  // ======================================================================
  function renderOrder() {
    const puzzle = puzzles[pi];
    const truth = sortedOf(puzzle);
    let arr = shuffle(puzzle);
    for (let tries = 0; tries < 20 && arr.every((t, i) => t.id === truth[i].id); tries++) arr = shuffle(puzzle);
    let sel: number | null = null; // the card picked up by tap, click or keyboard
    let checked = false;

    const row = h("div", { class: "sc-row", role: "group", "aria-label": `Cards. ${q.low} on the left, ${q.high} on the right` });
    const live = h("p", { class: "sc-sr", "aria-live": "polite" });
    const leftBtn = h("button", { type: "button", class: "btn ghost", "aria-label": "Move the picked-up card left", onclick: () => nudge(-1) }, "◂ Move left");
    const rightBtn = h("button", { type: "button", class: "btn ghost", "aria-label": "Move the picked-up card right", onclick: () => nudge(1) }, "Move right ▸");
    const checkBtn = h("button", { type: "button", class: "btn primary", onclick: check }, "Check ▸");
    const feedback = h("p", { class: "tl-feedback", "aria-live": "polite" });
    const reveal = h("div", { class: "sc-reveal" });
    reveal.hidden = true;
    const how = h("p", { class: "muted sc-how" }, "Drag a card to move it. Or tap one to pick it up, then tap the card whose place you want.");

    const move = (from: number, to: number) => {
      const [t] = arr.splice(from, 1);
      arr.splice(to, 0, t);
    };
    function nudge(d: number) {
      if (sel === null || checked) return;
      const to = sel + d;
      if (to < 0 || to >= arr.length) return;
      move(sel, to);
      sel = to;
      draw(sel);
      live.textContent = `${arr[sel].name} is now number ${sel + 1} of ${arr.length}.`;
    }
    function tap(i: number) {
      if (checked) return;
      if (sel === null) sel = i;
      else if (sel === i) sel = null;
      else {
        move(sel, i);
        live.textContent = `${arr[i].name} moved to number ${i + 1} of ${arr.length}.`;
        sel = null;
      }
      draw(sel ?? undefined);
    }

    /** While dragging: which gap (among the other cards) is the pointer nearest? 0 to others.length. */
    function slotAt(x: number, y: number, others: HTMLElement[]) {
      let best = 0;
      let bestDist = Infinity;
      let after = false;
      others.forEach((el, k) => {
        const r = el.getBoundingClientRect();
        const dx = Math.max(r.left - x, 0, x - r.right);
        const dy = Math.max(r.top - y, 0, y - r.bottom);
        const d = Math.hypot(dx, dy);
        if (d < bestDist) {
          bestDist = d;
          best = k;
          after = x > r.left + r.width / 2;
        }
      });
      return { index: best + (after ? 1 : 0), el: others[best], after };
    }

    function card(t: ScaleThing, i: number) {
      const right = checked && t.id === truth[i].id;
      const b = h(
        "button",
        {
          type: "button",
          class: `sc-card${sel === i ? " picked" : ""}${checked ? (right ? " right" : " wrong") : ""}`,
          "aria-pressed": checked ? "false" : String(sel === i),
          "aria-label": `${t.name}, number ${i + 1} of ${arr.length}${checked ? `. ${t.show}. ${right ? "Right place" : "Wrong place"}` : sel === i ? ", picked up" : ""}`,
          disabled: checked,
        },
        h("span", { class: "sc-pos" }, String(i + 1)),
        h("span", { class: "sc-name" }, t.name),
        checked ? h("span", { class: "sc-val" }, t.show) : null,
      );
      // Pointer events cover mouse, touch and pen with one piece of code.
      let from: { x: number; y: number } | null = null;
      let dragging = false;
      let target: { index: number } | null = null;
      const others = () => [...row.querySelectorAll<HTMLElement>(".sc-card")].filter((c) => c !== b);
      const clearMarks = () => row.querySelectorAll(".drop-before, .drop-after").forEach((c) => c.classList.remove("drop-before", "drop-after"));
      b.addEventListener("pointerdown", (e) => {
        if (checked || (e.pointerType === "mouse" && e.button !== 0)) return;
        from = { x: e.clientX, y: e.clientY };
        dragging = false;
        b.setPointerCapture(e.pointerId);
      });
      b.addEventListener("pointermove", (e) => {
        if (!from) return;
        const dx = e.clientX - from.x;
        const dy = e.clientY - from.y;
        if (!dragging && Math.hypot(dx, dy) > 8) {
          dragging = true;
          b.classList.add("dragging");
        }
        if (!dragging) return;
        b.style.transform = `translate(${dx}px, ${dy}px)`;
        const list = others();
        const slot = slotAt(e.clientX, e.clientY, list);
        clearMarks();
        slot.el?.classList.add(slot.after ? "drop-after" : "drop-before");
        target = slot;
      });
      const end = (e: PointerEvent, cancelled: boolean) => {
        if (!from) return;
        from = null;
        if (b.hasPointerCapture(e.pointerId)) b.releasePointerCapture(e.pointerId);
        if (dragging) {
          dragging = false;
          clearMarks();
          if (!cancelled && target) {
            move(i, target.index);
            live.textContent = `${t.name} moved to number ${arr.findIndex((x) => x.id === t.id) + 1} of ${arr.length}.`;
            sel = null;
          }
          draw();
        } else if (!cancelled) tap(i);
      };
      b.addEventListener("pointerup", (e) => end(e, false));
      b.addEventListener("pointercancel", (e) => end(e, true));
      // Keyboard: Enter or Space picks up (a click with detail 0); arrows move the picked card.
      b.addEventListener("click", (e) => {
        if (e.detail === 0) tap(i);
      });
      b.addEventListener("keydown", (e) => {
        if (checked) return;
        if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "ArrowRight" || e.key === "ArrowDown") {
          const d = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
          e.preventDefault();
          if (sel === i) nudge(d);
          else row.querySelectorAll<HTMLElement>(".sc-card")[Math.min(arr.length - 1, Math.max(0, i + d))]?.focus();
        } else if (e.key === "Escape" && sel !== null) {
          sel = null;
          draw(i);
        }
      });
      return b;
    }

    function draw(focus?: number) {
      row.replaceChildren(...arr.map(card));
      leftBtn.disabled = checked || sel === null || sel === 0;
      rightBtn.disabled = checked || sel === null || sel === arr.length - 1;
      if (focus !== undefined) row.querySelectorAll<HTMLElement>(".sc-card")[focus]?.focus();
    }

    function check() {
      checked = true;
      sel = null;
      const score = new Map<string, number>();
      arr.forEach((t, i) => score.set(t.id, t.id === truth[i].id ? 1 : 0));
      const n = [...score.values()].filter((s) => s === 1).length;
      donePuzzle(truth, score);
      draw();
      checkBtn.hidden = true;
      leftBtn.hidden = true;
      rightBtn.hidden = true;
      how.hidden = true;
      feedback.className = `tl-feedback ${n === arr.length ? "good" : n >= arr.length / 2 ? "ok" : "bad"}`;
      feedback.textContent = n === arr.length ? `All ${n} in the right place. +${n}` : `${n} of ${arr.length} in the right place. +${n}`;
      reveal.replaceChildren(
        h("p", { class: "sc-label" }, `The right order: ${q.low.toLowerCase()} to ${q.high.toLowerCase()}`),
        h("ol", { class: "sc-order" }, ...truth.map((t) => h("li", {}, h("span", { class: "sc-o-name" }, t.name), h("span", { class: "sc-o-val" }, t.show)))),
      );
      reveal.hidden = false;
      const nextBtn = h("button", { type: "button", class: "btn primary", onclick: nextPuzzle }, pi + 1 < puzzles.length ? "Next ▸" : "See results ▸");
      actions.append(nextBtn);
      scoreEl.replaceWith((scoreEl = scoreLine()));
      nextBtn.focus();
    }

    let scoreEl = scoreLine();
    const actions = h("div", { class: "tl-actions" }, leftBtn, rightBtn, scoreEl, checkBtn);
    game.replaceChildren(
      head(),
      h("div", { class: "sc-ends" }, h("span", {}, `◂ ${q.low}`), h("span", {}, `${q.high} ▸`)),
      row,
      how,
      actions,
      feedback,
      reveal,
      live,
    );
    relayout = null;
    draw();
  }

  // ======================================================================
  // WAY 2: PLACE ON THE SCALE
  // ======================================================================
  let seq: ScaleThing[] = [];
  let ti = 0;
  let placed: { t: ScaleThing; s: number; pts: number }[] = [];

  function renderPlaceStart() {
    seq = shuffle(puzzles[pi]);
    ti = 0;
    placed = [];
    renderPlaceStep();
  }

  /** The number line, with its ticks, unit and end words. Returns the track to put things on. */
  function buildLine(axis: Axis, tall: boolean) {
    const track = h("div", { class: tall ? "sc-track tall" : "sc-track" });
    track.append(h("div", { class: "sc-bar" }));
    const wrap = h(
      "div",
      { class: "sc-wrap" },
      track,
      h("div", { class: "sc-ends" }, h("span", {}, `◂ ${q.low}`), h("span", {}, `${q.high} ▸`)),
      h("p", { class: "sc-unit" }, `Each step along the line is ×10 bigger. Unit: ${q.unit}.`),
    );
    if (q.id === "loudness") wrap.querySelector(".sc-unit")!.textContent = "Unit: decibels. Every step of 10 is ten times the sound energy.";
    if (q.id === "temperature") wrap.querySelector(".sc-unit")!.textContent = `Unit: ${q.unit}. The line steps up by ×10 from absolute zero (0 kelvin), so the cold end is squeezed.`;
    relayout = () => layoutTicks(track, axis);
    return { track, wrap };
  }

  function renderPlaceStep() {
    const t = seq[ti];
    const R = spreadRange(q);
    const axis = makeAxis(q);
    let guess: number | null = null;
    let locked = false;

    const { track, wrap } = buildLine(axis, false);
    track.setAttribute("tabindex", "0");
    track.setAttribute("role", "slider");
    track.setAttribute("aria-label", `Where does "${t.name}" go on the scale? Use the arrow keys.`);
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    // Things already placed this puzzle stay on the line as small dots, in their true places.
    for (const p of placed) track.append(h("span", { class: "sc-dot", style: `left:${axis.pct(q.spread(p.t.value))}%`, title: `${p.t.name}: ${p.t.show}` }));
    const gapEl = h("span", { class: "sc-gap" });
    const guessEl = h("span", { class: "sc-guess" });
    const actualEl = h("span", { class: "sc-actual" });
    gapEl.hidden = guessEl.hidden = actualEl.hidden = true;
    track.append(gapEl, guessEl, actualEl);

    const readout = h("p", { class: "tl-readout" }, "Drag the marker onto the line, or tap a spot on the line.");
    const feedback = h("p", { class: "tl-feedback", "aria-live": "polite" });
    const scoreEl = h("span", { class: "tl-score" }, placeScoreText());
    const placeBtn = h("button", { type: "button", class: "btn primary", disabled: true }, "Place");
    const token = h("div", { class: "sc-token", "aria-hidden": "true" }, "⇧ Drag me onto the line");
    const tray = h("div", { class: "sc-tray" }, token);

    const put = (s: number) => {
      if (locked) return;
      guess = Math.min(axis.d1, Math.max(axis.d0, s));
      guessEl.hidden = false;
      guessEl.style.left = `${axis.pct(guess)}%`;
      track.setAttribute("aria-valuenow", String(Math.round(axis.pct(guess))));
      track.setAttribute("aria-valuetext", fmtValue(q, unspread(q, guess)));
      readout.textContent = `You're pointing at about ${fmtValue(q, unspread(q, guess))}.`;
      placeBtn.disabled = false;
      tray.hidden = true;
    };
    const fromX = (x: number) => {
      const r = track.getBoundingClientRect();
      put(axis.fromPct(((x - r.left) / r.width) * 100));
    };
    // Tap or drag on the line itself.
    let dragging = false;
    track.addEventListener("pointerdown", (e) => {
      if (locked) return;
      dragging = true;
      track.setPointerCapture(e.pointerId);
      fromX(e.clientX);
    });
    track.addEventListener("pointermove", (e) => dragging && fromX(e.clientX));
    track.addEventListener("pointerup", () => (dragging = false));
    track.addEventListener("pointercancel", () => (dragging = false));
    track.addEventListener("keydown", (e) => {
      const step = (e.shiftKey ? 5 : 1) * ((axis.d1 - axis.d0) / 100);
      const at = guess ?? (axis.d0 + axis.d1) / 2;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") put(at + step);
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") put(at - step);
      else if (e.key === "Enter") locked ? placeBtn.click() : lock();
      else return;
      e.preventDefault();
    });
    // The marker: drag it up onto the line.
    let tFrom: { x: number; y: number } | null = null;
    token.addEventListener("pointerdown", (e) => {
      if (locked) return;
      tFrom = { x: e.clientX, y: e.clientY };
      token.setPointerCapture(e.pointerId);
      token.classList.add("dragging");
    });
    token.addEventListener("pointermove", (e) => {
      if (tFrom) token.style.transform = `translate(${e.clientX - tFrom.x}px, ${e.clientY - tFrom.y}px)`;
    });
    const tokenEnd = (e: PointerEvent, ok: boolean) => {
      if (!tFrom) return;
      tFrom = null;
      token.classList.remove("dragging");
      token.style.transform = "";
      const r = track.getBoundingClientRect();
      if (ok && e.clientY > r.top - 90 && e.clientY < r.bottom + 40) fromX(e.clientX);
    };
    token.addEventListener("pointerup", (e) => tokenEnd(e, true));
    token.addEventListener("pointercancel", (e) => tokenEnd(e, false));

    function lock() {
      if (guess === null || locked) return;
      locked = true;
      const actual = q.spread(t.value);
      const off = Math.abs(guess - actual);
      const pts = placePoints(off, R);
      placed.push({ t, s: guess, pts });
      actualEl.hidden = false;
      actualEl.style.left = `${axis.pct(actual)}%`;
      const [a, b] = [axis.pct(guess), axis.pct(actual)].sort((x, y) => x - y);
      gapEl.hidden = false;
      gapEl.style.left = `${a}%`;
      gapEl.style.width = `${b - a}%`;
      const verdict = pts >= 100 ? "Spot on." : pts >= 60 ? "Close." : pts > 0 ? "Not very close." : "Way off.";
      feedback.className = `tl-feedback ${pts >= 80 ? "good" : pts >= 40 ? "ok" : "bad"}`;
      feedback.textContent = `${verdict} ${t.name}: ${t.show}. +${pts}`;
      readout.textContent = `You said about ${fmtValue(q, unspread(q, guess))}.`;
      const last = ti + 1 >= seq.length;
      placeBtn.textContent = last ? "See the whole line ▸" : "Next ▸";
      placeBtn.onclick = () => {
        if (last) renderPlaceSummary();
        else {
          ti++;
          renderPlaceStep();
        }
      };
      scoreEl.textContent = placeScoreText();
      track.setAttribute("aria-label", `${t.name} is at ${t.show}.`);
      placeBtn.focus();
    }
    placeBtn.onclick = lock;

    game.replaceChildren(
      head(`thing ${ti + 1} of ${seq.length}`),
      h("div", { class: "tl-card sc-thing" }, h("span", { class: "tl-count" }, "Where does this go?"), h("p", { class: "tl-event" }, t.name)),
      h("div", { class: "tl-wrap sc-linebox" }, wrap, tray),
      h("div", { class: "tl-actions" }, readout, scoreEl, placeBtn),
      feedback,
    );
    relayout = () => layoutTicks(track, axis);
    layoutTicks(track, axis);
    track.focus({ preventScroll: true });
  }

  /** The running score in Way 2 counts placed things so far, as points out of cards asked. */
  function placeScoreText() {
    const so = placed.reduce((a, p) => a + p.pts / 100, 0);
    return `${Math.round(points + so)}/${asked + placed.length}`;
  }

  function renderPlaceSummary() {
    const axis = makeAxis(q);
    const sorted = sortedOf(puzzles[pi]);
    const { track, wrap } = buildLine(axis, true);
    sorted.forEach((t, i) => {
      track.append(h("span", { class: "sc-pin", style: `left:${axis.pct(q.spread(t.value))}%;--row:${i % 3}`, title: `${t.name}: ${t.show}` }, String(i + 1)));
    });
    const byId = new Map(placed.map((p) => [p.t.id, p]));
    const total = placed.reduce((a, p) => a + p.pts, 0) / 100;
    donePuzzle(
      sorted,
      new Map(placed.map((p) => [p.t.id, p.pts / 100])),
    );
    game.replaceChildren(
      head("all on the line"),
      h("div", { class: "tl-wrap sc-linebox" }, wrap),
      h(
        "ol",
        { class: "sc-order numbered" },
        ...sorted.map((t, i) => {
          const p = byId.get(t.id)!;
          return h(
            "li",
            { class: p.pts >= 80 ? "good" : p.pts >= 40 ? "ok" : "bad" },
            h("span", { class: "sc-num" }, String(i + 1)),
            h("span", { class: "sc-o-name" }, t.name),
            h("span", { class: "sc-o-val" }, `${t.show} · you said ${fmtValue(q, unspread(q, p.s))} · +${p.pts}`),
          );
        }),
      ),
      h(
        "div",
        { class: "tl-actions" },
        h("p", { class: "tl-readout" }, `This puzzle: ${Math.round(total * 10) / 10} out of ${sorted.length}.`),
        scoreLine(),
        h("button", { type: "button", class: "btn primary", onclick: nextPuzzle }, pi + 1 < puzzles.length ? "Next puzzle ▸" : "See results ▸"),
      ),
    );
    relayout = () => layoutTicks(track, axis);
    layoutTicks(track, axis);
  }

  renderSetup();
  return () => {
    window.removeEventListener("resize", onResize);
  };
}
