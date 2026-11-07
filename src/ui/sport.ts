// SPORT: one screen shared by the six Sport games (decks/sport.ts). The results come from
// decks/sport-data.ts and the settings for each list from decks/sport-config.ts.
//
// Five ways to play, and each list offers only the ones that make sense:
//   year    "Year by year"        a year appears, type the winner.
//   fill    "Fill in their years" a champion appears, tap every year they won.
//   decade  "Decade blocks"       a block of years, type winners in any order; a name fills all its years.
//   more    "Who won more?"       two names, pick the one with more wins ("Who was faster?" for 100 m records).
//   order   "In order"            five names, put them in the order they first won.
//
// Scores are saved under the variant "<list>-<mode>-<range>", for example "nrl-year-s2000".
import type { Deck } from "../engine/types";
import { normalize } from "../engine/matcher";
import { bestFor, recordGame } from "../engine/storage";
import { h } from "./dom";
import { SPORT_LISTS, type SportChamp, type SportList, type SportWin } from "../decks/sport-data";
import { ENT_LISTS } from "../decks/entertainment-data";
import {
  DECK_LISTS,
  LIST_CONFIG,
  MODE_INFO,
  type ListConfig,
  type ModeId,
  type SportRange,
} from "../decks/sport-config";
import "./sport.css";

// Sport and Entertainment lists share this screen (the Oscars and Aussie Awards use it too).
const LISTS: Record<string, SportList> = { ...SPORT_LISTS, ...ENT_LISTS };

const QUESTIONS = 10;
const PUZZLES = 3;
const FILL_ROUNDS = 3;
const BLOCKS = 2;
const ORDER_SIZE = 5;

// ---------- small pure helpers (kept apart from the screen so they are easy to check) ----------

const askable = (w: SportWin) => !w.stripped && !w.cancelled && w.who.length > 0;

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** True when a and b are the same, or differ by one letter (insert, delete or change). */
export function withinOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** Does the typed text name this champion? Case, accents and punctuation never matter; a single
 *  slip in a long name is forgiven. `loose` also allows a surname that other champions share. */
export function champAccepts(c: SportChamp, text: string, loose: boolean): boolean {
  const t = normalize(text);
  if (!t) return false;
  const names = loose ? [...c.accept, ...(c.loose ?? [])] : c.accept;
  return names.some((n) => {
    const m = normalize(n);
    return m === t || (t.length >= 7 && m.length >= 7 && withinOne(t, m));
  });
}

const sentence = (names: string[]) =>
  names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

const signed = (wind: string) => {
  if (wind === "") return "not recorded";
  const n = Number(wind);
  return n > 0 ? `+${n.toFixed(1)}` : n < 0 ? `−${Math.abs(n).toFixed(1)}` : "0.0";
};

/** "9.58 s" for an electronic time, "9.9 (hand-timed)" for a hand time. */
const markText = (w: SportWin) => (w.rec?.hand ? w.label : `${w.label} s`);

/** The 100 m question: "9.58 s, 2009 in Berlin (GER)". */
const recordClue = (w: SportWin) => `${markText(w)}, ${w.year} in ${w.rec!.place} (${w.rec!.country})`;

const year2 = (y: number) => String(y % 100).padStart(2, "0");

interface Ctx {
  deckId: string;
  list: SportList;
  cfg: ListConfig;
  range: SportRange;
  /** Asked results inside the range (no stripped or cancelled years). */
  wins: SportWin[];
}

interface Finish {
  score: number;
  total: number;
  found: string[];
  missed: string[];
}

export function renderSport(root: HTMLElement, deck: Deck) {
  const listIds = DECK_LISTS[deck.id];
  let listId = listIds[0];
  let mode: ModeId = "year";
  let rangeId = LIST_CONFIG[listId].ranges[0].id;
  let startedAt = 0;
  let cleanups: (() => void)[] = [];

  const setup = h("div", { class: "setup sp-setup" });
  const game = h("div", { class: "sp-game" });
  game.hidden = true;
  const results = h("div", { class: "results" });
  results.hidden = true;
  root.replaceChildren(
    h(
      "main",
      { class: "play" },
      h(
        "div",
        { class: "play-top" },
        h("a", { class: "back", href: "#" }, "◂ Arcade"),
        h("h1", { class: "play-title" }, deck.title),
      ),
      setup,
      game,
      results,
    ),
  );

  const cfgOf = () => LIST_CONFIG[listId];
  const rangeOf = () => cfgOf().ranges.find((r) => r.id === rangeId) ?? cfgOf().ranges[0];
  const context = (): Ctx => {
    const list = LISTS[listId];
    const range = rangeOf();
    return {
      deckId: deck.id,
      list,
      cfg: cfgOf(),
      range,
      wins: list.wins.filter((w) => askable(w) && w.year >= range.from && w.year <= range.to),
    };
  };

  /** The first year each champion won, over the whole list (not just the range). */
  function firstYears(list: SportList): Map<string, number> {
    const first = new Map<string, number>();
    for (const w of list.wins) {
      if (!askable(w)) continue;
      for (const k of w.who) first.set(k, Math.min(first.get(k) ?? 9999, w.year));
    }
    return first;
  }
  function counts(wins: SportWin[]): Map<string, number> {
    const n = new Map<string, number>();
    for (const w of wins) for (const k of new Set(w.who)) n.set(k, (n.get(k) ?? 0) + 1);
    return n;
  }
  function blocksOf(c: Ctx): { start: number; end: number; wins: SportWin[] }[] {
    const size = c.cfg.block;
    const byStart = new Map<number, SportWin[]>();
    for (const w of c.wins) {
      const s = Math.floor(w.year / size) * size;
      byStart.set(s, [...(byStart.get(s) ?? []), w]);
    }
    return [...byStart.entries()]
      .filter(([, ws]) => ws.length >= 3)
      .map(([start, wins]) => ({ start, end: start + size - 1, wins }))
      .sort((a, b) => a.start - b.start);
  }

  /** Why this way of playing cannot run on this range, or null if it can. */
  function problem(): string | null {
    const c = context();
    const bigger = "There are not enough results in this range for this way of playing. Pick a bigger range.";
    if (mode === "year") return c.wins.length >= 3 ? null : bigger;
    if (mode === "fill") return [...counts(c.wins).values()].some((n) => n >= 2) ? null : bigger;
    if (mode === "decade") return blocksOf(c).length ? null : bigger;
    if (mode === "more") {
      if (listId === "sprint") return sprintPairs(c, 1).length ? null : bigger;
      const vals = [...counts(c.wins).values()];
      return new Set(vals).size >= 2 ? null : bigger;
    }
    const first = firstYears(c.list);
    const years = new Set([...counts(c.wins).keys()].map((k) => first.get(k)));
    return years.size >= ORDER_SIZE ? null : bigger;
  }

  // ---------- setup ----------
  function chipRow(label: string, items: { id: string; text: string }[], current: string, pick: (id: string) => void) {
    return h(
      "div",
      { class: "sp-group" },
      h("p", { class: "chip-heading sp-heading" }, label),
      h(
        "div",
        { class: "chips", role: "group", "aria-label": label },
        ...items.map((it) =>
          h(
            "button",
            {
              type: "button",
              class: it.id === current ? "chip on" : "chip",
              "aria-pressed": String(it.id === current),
              onclick: () => pick(it.id),
            },
            it.text,
          ),
        ),
      ),
    );
  }

  function renderSetup(focusAfter?: string) {
    const cfg = cfgOf();
    if (!cfg.modes.includes(mode)) mode = cfg.modes[0];
    if (!cfg.ranges.some((r) => r.id === rangeId)) rangeId = cfg.ranges[0].id;
    const why = problem();
    const best = bestFor(deck.id, `${listId}-${mode}-${rangeId}`);
    setup.replaceChildren(
      h("p", { class: "muted sp-about" }, cfg.about),
      ...(listIds.length > 1
        ? [
            chipRow(
              "List",
              listIds.map((id) => ({ id, text: LIST_CONFIG[id].chip })),
              listId,
              (id) => {
                listId = id;
                renderSetup("list");
              },
            ),
          ]
        : []),
      chipRow(
        "Way to play",
        cfg.modes.map((m) => ({
          id: m,
          text: m === "year" ? `★ ${modeLabel(m)}` : modeLabel(m),
        })),
        mode,
        (id) => {
          mode = id as ModeId;
          renderSetup("mode");
        },
      ),
      chipRow(
        "Years",
        cfg.ranges.map((r) => ({ id: r.id, text: r.label })),
        rangeId,
        (id) => {
          rangeId = id;
          renderSetup("range");
        },
      ),
      h(
        "div",
        { class: "setup-row" },
        h("p", { class: "muted tl-how", "aria-live": "polite" }, why ?? modeNote()),
        h("span", { class: "best" }, best ? `Best: ${best.score}/${best.total}` : ""),
        h(
          "button",
          { type: "button", class: "btn primary", id: "sp-start", disabled: why !== null, onclick: start },
          "Start ▸",
        ),
      ),
    );
    if (focusAfter) {
      const group = { list: 0, mode: 1, range: 2 }[focusAfter as "list" | "mode" | "range"];
      const idx = listIds.length > 1 ? group : group - 1;
      const on = setup.querySelectorAll<HTMLElement>(".sp-group")[idx]?.querySelector<HTMLElement>(".chip.on");
      on?.focus();
    }
  }

  const modeLabel = (m: ModeId) => (listId === "sprint" && m === "more" ? "Who was faster?" : MODE_INFO[m].label);
  function modeNote() {
    const own = cfgOf().notes?.[mode];
    if (own) return own;
    if (listId === "sprint" && mode === "more")
      return "Two record holders appear. Pick the one who ran faster. 10 questions.";
    if (listId === "sprint" && mode === "year")
      return "A time, a year and a place appear. Type who ran it. 10 questions.";
    if (listId === "olympics" && mode === "more")
      return "Two cities appear. Pick the one that has hosted more Games. 10 questions.";
    if (mode === "decade" && cfgOf().block === 20)
      return "A block of twenty years appears. Type hosts or winners in any order, and each name fills every year it won.";
    if (mode === "order" && listId === "olympics")
      return "Five cities appear. Put them in the order they first hosted. Drag, tap or use the keyboard.";
    if (mode === "order" && listId === "sprint")
      return "Five record holders appear. Put them in the order they first set a record. Drag, tap or use the keyboard.";
    return MODE_INFO[mode].note;
  }

  // ---------- round plumbing ----------
  function clearGame() {
    cleanups.forEach((f) => f());
    cleanups = [];
  }
  function start() {
    clearGame();
    setup.hidden = true;
    results.hidden = true;
    game.hidden = false;
    startedAt = Date.now();
    const c = context();
    if (mode === "year") runYear(c);
    else if (mode === "fill") runFill(c);
    else if (mode === "decade") runDecade(c);
    else if (mode === "more") runMore(c);
    else runOrder(c);
  }

  function finish(f: Finish) {
    clearGame();
    game.hidden = true;
    const variant = `${listId}-${mode}-${rangeId}`;
    const prev = bestFor(deck.id, variant);
    recordGame(
      { deck: deck.id, variant, score: f.score, total: f.total, seconds: Math.round((Date.now() - startedAt) / 1000), date: Date.now() },
      f.found,
      f.missed,
    );
    const share = f.total ? f.score / f.total : 0;
    const beaten = !prev || share > prev.score / prev.total;
    results.replaceChildren(
      h(
        "div",
        { class: "results-head" },
        h("div", { class: "big" }, `${f.score}`, h("small", {}, `/${f.total}`)),
        h(
          "div",
          {},
          h("p", { class: "verdict" }, share >= 0.8 ? "Top effort. You know your sport." : share >= 0.5 ? "Not bad at all." : "Have another go. It sinks in."),
          h("p", { class: "muted" }, beaten ? "That's your best for this round." : `Your best is ${prev!.score}/${prev!.total}.`),
        ),
        h(
          "div",
          { class: "results-actions" },
          h("button", { type: "button", class: "btn primary", onclick: start }, "Play again"),
          h(
            "button",
            {
              type: "button",
              class: "btn ghost",
              onclick: () => {
                results.hidden = true;
                setup.hidden = false;
                renderSetup();
                document.getElementById("sp-start")?.focus();
              },
            },
            "Change setup",
          ),
        ),
      ),
    );
    results.hidden = false;
    results.querySelector<HTMLElement>(".btn.primary")?.focus();
  }

  /** The shell every question sits in: a count line, the card, and a place for the rest. */
  function shell(count: string, body: (Node | null | false)[]) {
    game.replaceChildren(h("div", { class: "tl-card sp-card" }, h("span", { class: "tl-count" }, count), ...body));
  }
  const noteLines = (ws: SportWin[]) => [...new Set(ws.map((w) => w.note).filter((n): n is string => !!n))];

  // ---------- 1. Year by year ----------
  function runYear(c: Ctx) {
    let groups: SportWin[][];
    if (listId === "sprint") groups = c.wins.map((w) => [w]);
    else {
      // Results in one year go together (NRL 1997 has two premiers), unless the list gives each its own key (`gid`).
      const byYear = new Map<string, SportWin[]>();
      for (const w of c.wins) {
        const k = w.gid ?? String(w.year);
        byYear.set(k, [...(byYear.get(k) ?? []), w]);
      }
      groups = [...byYear.values()];
    }
    const qs = shuffle(groups).slice(0, QUESTIONS);
    let i = 0;
    let score = 0;
    const found: string[] = [];
    const missed: string[] = [];

    function show() {
      const g = qs[i];
      const sprint = listId === "sprint";
      const input = h("input", {
        class: "answer",
        type: "text",
        autocomplete: "off",
        autocapitalize: "off",
        spellcheck: "false",
        "aria-label": sprint ? "Name of the runner" : `Winner for ${g[0].label}`,
        placeholder: sprint ? "Type the runner's name" : `Type the ${c.cfg.who}`,
      });
      const feedback = h("p", { class: "tl-feedback", "aria-live": "polite" });
      const reveal = h("div", { class: "sc-reveal sp-reveal" });
      reveal.hidden = true;
      const next = h("button", { type: "button", class: "btn primary", onclick: advance }, i + 1 < qs.length ? "Next ▸" : "See results ▸");
      next.hidden = true;
      const checkBtn = h("button", { type: "button", class: "btn primary", onclick: () => answer(false) }, "Check");
      const giveUp = h("button", { type: "button", class: "btn ghost", onclick: () => answer(true) }, "Give up");

      function answer(gaveUp: boolean) {
        const text = input.value;
        if (!gaveUp && !normalize(text)) {
          feedback.className = "tl-feedback ok";
          feedback.textContent = "Type a name first, or give up.";
          input.focus();
          return;
        }
        const right = !gaveUp && g.some((w) => w.who.some((k) => champAccepts(c.list.champs[k], text, true)));
        if (right) {
          score++;
          found.push(...g.map((w) => w.id));
        } else missed.push(...g.map((w) => w.id));
        input.disabled = checkBtn.disabled = giveUp.disabled = true;
        checkBtn.hidden = giveUp.hidden = true;
        feedback.className = `tl-feedback ${right ? "good" : "bad"}`;
        feedback.textContent = right ? "Right! +1" : gaveUp ? "No worries. Here it is." : "Not this time.";
        reveal.replaceChildren(...revealYear(g));
        reveal.hidden = false;
        next.hidden = false;
        next.focus();
      }
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          answer(false);
        }
      });
      shell(`Question ${i + 1} of ${qs.length} · ${c.range.label}`, [
        sprint ? null : h("p", { class: "sp-year" }, g[0].label),
        g[0].sub ? h("p", { class: "muted sp-sub" }, g[0].sub) : null,
        h("p", { class: "tl-event sp-ask" }, sprint ? `${recordClue(g[0])}. Who ran it?` : c.cfg.ask(g[0].label)),
        h("div", { class: "sp-input-row" }, input, checkBtn, giveUp),
        feedback,
        reveal,
        h("div", { class: "tl-actions sp-actions" }, h("span", { class: "tl-score" }, `Score: ${score}`), next),
      ]);
      input.focus();
    }
    function advance() {
      i++;
      if (i < qs.length) show();
      else finish({ score, total: qs.length, found, missed });
    }
    show();
  }

  function revealYear(g: SportWin[]): Node[] {
    const out: Node[] = [];
    if (g[0].rec) {
      const w = g[0];
      const r = w.rec!;
      out.push(
        h("p", { class: "sp-answer" }, `${w.shown} (${r.cc})`),
        h("p", { class: "muted" }, `Born ${r.dob}. ${markText(w)}, wind ${signed(r.wind)} m/s.`),
        h("p", { class: "muted" }, `${r.venue}, ${fmtDate(r.date)}.`),
      );
      return out;
    }
    out.push(h("p", { class: "sp-answer" }, sentence(g.map((w) => w.shown))));
    for (const x of [...new Set(g.map((w) => w.extra).filter((t): t is string => !!t))]) out.push(h("p", {}, x));
    for (const n of noteLines(g)) out.push(h("p", { class: "muted" }, n));
    return out;
  }
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  };

  // ---------- 2. Fill in their years ----------
  function runFill(c: Ctx) {
    const n = counts(c.wins);
    const pool = shuffle([...n.entries()].filter(([, v]) => v >= 2).map(([k]) => k)).slice(0, FILL_ROUNDS);
    // Every year in the range that has a result (stripped years are kept, greyed out).
    const rangeWins = c.list.wins.filter((w) => w.year >= c.range.from && w.year <= c.range.to);
    const years = [...new Set(rangeWins.map((w) => w.year))].sort((a, b) => a - b);
    const labelOf = (y: number) => rangeWins.find((w) => w.year === y)!.label;
    let i = 0;
    let score = 0;
    let total = 0;
    const found: string[] = [];
    const missed: string[] = [];

    function show() {
      const key = pool[i];
      const champ = c.list.champs[key];
      const mine = c.wins.filter((w) => w.who.includes(key));
      const wonYears = new Set(mine.map((w) => w.year));
      const picked = new Set<number>();
      let checked = false;
      const cells = new Map<number, HTMLButtonElement>();
      const grid = h("div", { class: "sp-grid", role: "group", "aria-label": `Years. Tap every year ${champ.name} ${c.cfg.verb}.` });
      const decades = [...new Set(years.map((y) => Math.floor(y / 10) * 10))];
      for (const d of decades) {
        const row = h("div", { class: "sp-drow", role: "group", "aria-label": `${d}s` }, h("span", { class: "sp-dlabel", "aria-hidden": "true" }, `${d}s`));
        const cellsEl = h("div", { class: "sp-cells" });
        for (let y = d; y < d + 10; y++) {
          if (!years.includes(y)) {
            cellsEl.append(h("span", { class: "sp-cell ghost", "aria-hidden": "true" }, "·"));
            continue;
          }
          const offWin = rangeWins.find((w) => w.year === y && (w.stripped || w.cancelled));
          if (offWin && !c.wins.some((w) => w.year === y)) {
            const why = offWin.cancelled ? (offWin.off ?? "Cancelled") : "Stripped";
            cellsEl.append(h("span", { class: "sp-cell ghost", title: `${why}, so not counted`, "aria-label": `${labelOf(y)}: ${why.toLowerCase()}, not counted` }, offWin.cancelled ? "\u2013" : "S"));
            continue;
          }
          const b = h(
            "button",
            { type: "button", class: "sp-cell", "aria-pressed": "false", "aria-label": labelOf(y), title: labelOf(y), onclick: () => toggle(y) },
            year2(y),
          );
          cells.set(y, b);
          cellsEl.append(b);
        }
        row.append(cellsEl);
        grid.append(row);
      }
      function toggle(y: number) {
        if (checked) return;
        if (picked.has(y)) picked.delete(y);
        else picked.add(y);
        const b = cells.get(y)!;
        b.classList.toggle("on", picked.has(y));
        b.setAttribute("aria-pressed", String(picked.has(y)));
        tally.textContent = `${picked.size} picked`;
      }
      const tally = h("span", { class: "muted sp-tally", "aria-live": "polite" }, "0 picked");
      const feedback = h("p", { class: "tl-feedback", "aria-live": "polite" });
      const reveal = h("div", { class: "sc-reveal sp-reveal" });
      reveal.hidden = true;
      const next = h("button", { type: "button", class: "btn primary", onclick: advance }, i + 1 < pool.length ? "Next ▸" : "See results ▸");
      next.hidden = true;
      const check = h("button", { type: "button", class: "btn primary", onclick: doCheck }, "Check");
      function doCheck() {
        checked = true;
        const right = [...picked].filter((y) => wonYears.has(y));
        const wrong = [...picked].filter((y) => !wonYears.has(y)).sort((a, b) => a - b);
        const miss = [...wonYears].filter((y) => !picked.has(y)).sort((a, b) => a - b);
        const pts = Math.max(0, right.length - wrong.length);
        score += pts;
        total += wonYears.size;
        found.push(...mine.filter((w) => picked.has(w.year)).map((w) => w.id));
        missed.push(...mine.filter((w) => !picked.has(w.year)).map((w) => w.id));
        for (const [y, b] of cells) {
          b.disabled = true;
          const won = wonYears.has(y);
          const was = picked.has(y);
          if (won && was) mark(b, "hit", "✓", "right");
          else if (!won && was) mark(b, "slip", "✗", "wrong");
          else if (won) mark(b, "miss", "!", "missed");
        }
        function mark(b: HTMLElement, cls: string, sym: string, word: string) {
          b.classList.add(cls);
          b.append(h("span", { class: "sp-sym", "aria-hidden": "true" }, sym));
          b.setAttribute("aria-label", `${b.getAttribute("aria-label")}: ${word}`);
        }
        check.hidden = tally.hidden = true;
        feedback.className = `tl-feedback ${pts === wonYears.size ? "good" : pts > 0 ? "ok" : "bad"}`;
        feedback.textContent = `${right.length} right, ${wrong.length} wrong. +${pts}`;
        reveal.replaceChildren(
          h("p", { class: "sp-answer" }, miss.length ? `You missed ${miss.map((y) => labelOf(y)).join(", ")}.` : `You found every one.`),
          ...(wrong.length ? [h("p", { class: "muted" }, `Wrong: ${wrong.map((y) => labelOf(y)).join(", ")}.`)] : []),
          h("p", { class: "muted" }, `${champ.name} ${c.cfg.verb} ${wonYears.size} ${c.cfg.count} ${c.range.phrase}: ${[...wonYears].sort((a, b) => a - b).map((y) => labelOf(y)).join(", ")}.`),
          ...noteLines(mine).map((t) => h("p", { class: "muted" }, t)),
        );
        reveal.hidden = false;
        next.hidden = false;
        next.focus();
        scoreEl.textContent = `Score: ${score}`;
      }
      const scoreEl = h("span", { class: "tl-score" }, `Score: ${score}`);
      shell(`${c.cfg.who[0].toUpperCase()}${c.cfg.who.slice(1)} ${i + 1} of ${pool.length} · ${c.range.label}`, [
        h("p", { class: "tl-event sp-ask" }, champ.name),
        h(
          "p",
          { class: "muted" },
          `${champ.name} ${c.cfg.verb} ${wonYears.size} ${c.cfg.count} ${c.range.phrase}. Tap each year.`,
        ),
        ...(c.cfg.period === "Season" ? [h("p", { class: "muted sp-small" }, "Each box is the season that ended in that year. 05 means 2004–05.")] : []),
        grid,
        h("div", { class: "tl-actions sp-actions" }, scoreEl, tally, check, next),
        feedback,
        reveal,
      ]);
    }
    function advance() {
      i++;
      if (i < pool.length) show();
      else finish({ score, total, found, missed });
    }
    show();
  }

  // ---------- 3. Decade blocks ----------
  function runDecade(c: Ctx) {
    const blocks = shuffle(blocksOf(c)).slice(0, BLOCKS).sort((a, b) => a.start - b.start);
    let i = 0;
    let score = 0;
    let total = 0;
    const found: string[] = [];
    const missed: string[] = [];

    function show() {
      const b = blocks[i];
      const rangeWins = c.list.wins
        .filter((w) => w.year >= Math.max(b.start, c.range.from) && w.year <= Math.min(b.end, c.range.to))
        .sort((a, z) => a.year - z.year);
      const asked = rangeWins.filter(askable);
      const filled = new Set<string>();
      let over = false;
      const tiles = new Map<string, HTMLElement>();
      const list = h("ul", { class: "sp-tiles" });
      for (const w of rangeWins) {
        const same = rangeWins.filter((o) => o.year === w.year);
        const tag = same.length > 1 ? ` (${same.indexOf(w) + 1} of ${same.length})` : "";
        const slot = h("span", { class: "sp-name" }, askable(w) ? "?" : w.cancelled ? (w.off ?? "Cancelled") : "Stripped");
        const li = h(
          "li",
          { class: `sp-tile${askable(w) ? "" : " off"}`, title: w.note ?? "" },
          h("span", { class: "sp-tyear" }, w.label + tag),
          slot,
        );
        if (askable(w)) tiles.set(w.id, li);
        list.append(li);
      }
      const input = h("input", {
        class: "answer",
        type: "text",
        autocomplete: "off",
        autocapitalize: "off",
        spellcheck: "false",
        "aria-label": `Type a ${c.cfg.who} name`,
        placeholder: `Type a ${c.cfg.who}, then press Enter`,
      });
      const feedback = h("p", { class: "tl-feedback sp-fb", "aria-live": "polite" });
      const reveal = h("div", { class: "sc-reveal sp-reveal" });
      reveal.hidden = true;
      const next = h("button", { type: "button", class: "btn primary", onclick: advance }, i + 1 < blocks.length ? "Next block ▸" : "See results ▸");
      next.hidden = true;
      const scoreEl = h("span", { class: "tl-score" }, "");
      const upd = () => (scoreEl.textContent = `${filled.size} of ${asked.length} filled`);
      upd();

      function fillWin(w: SportWin, style: "hit" | "miss") {
        const li = tiles.get(w.id)!;
        li.classList.add(style);
        li.querySelector(".sp-name")!.textContent = (style === "hit" ? "✓ " : "! ") + w.shown;
        if (style === "hit") filled.add(w.id);
      }
      function submit() {
        if (over) return;
        const text = input.value;
        if (!normalize(text)) return;
        const hits = asked.filter((w) => w.who.some((k) => champAccepts(c.list.champs[k], text, false)));
        const fresh = hits.filter((w) => !filled.has(w.id));
        if (fresh.length) {
          fresh.forEach((w) => fillWin(w, "hit"));
          feedback.className = "tl-feedback sp-fb good";
          feedback.textContent = `${fresh.length === 1 ? "1 year" : `${fresh.length} years`} filled.`;
          input.value = "";
          upd();
          if (filled.size === asked.length) finishBlock(false);
        } else if (hits.length) {
          feedback.className = "tl-feedback sp-fb ok";
          feedback.textContent = "Already filled in.";
          input.value = "";
        } else {
          const looseOnly = asked.some((w) => w.who.some((k) => champAccepts(c.list.champs[k], text, true)));
          feedback.className = "tl-feedback sp-fb bad";
          feedback.textContent = looseOnly
            ? "More than one name fits that. Type the full name."
            : `No year in this block went to that ${c.cfg.who}.`;
          input.classList.remove("nope");
          void input.offsetWidth;
          input.classList.add("nope");
        }
        input.focus();
      }
      function finishBlock(gaveUp: boolean) {
        over = true;
        score += filled.size;
        total += asked.length;
        found.push(...filled);
        for (const w of asked) {
          if (!filled.has(w.id)) {
            fillWin(w, "miss");
            missed.push(w.id);
          }
        }
        input.disabled = fillBtn.disabled = giveUp.disabled = true;
        fillBtn.hidden = giveUp.hidden = true;
        feedback.className = `tl-feedback sp-fb ${filled.size === asked.length ? "good" : "ok"}`;
        feedback.textContent = gaveUp ? `${filled.size} of ${asked.length}. The rest are shown with a !.` : `All ${asked.length} filled. Well done!`;
        const notes = noteLines(rangeWins);
        reveal.replaceChildren(...notes.map((t) => h("p", { class: "muted" }, t)));
        reveal.hidden = notes.length === 0;
        next.hidden = false;
        next.focus();
      }
      const fillBtn = h("button", { type: "button", class: "btn primary", onclick: submit }, "Fill in");
      const giveUp = h("button", { type: "button", class: "btn ghost", onclick: () => finishBlock(true) }, "Give up");
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      });
      shell(`Block ${i + 1} of ${blocks.length} · ${b.start}–${b.end}`, [
        h("p", { class: "tl-event sp-ask" }, c.cfg.blockAsk ? c.cfg.blockAsk(`${b.start}–${b.end}`) : `Who ${c.cfg.verb === "hosted" ? "hosted" : "won"} in ${b.start}–${b.end}?`),
        h("p", { class: "muted" }, "Type a name and press Enter. It fills every year in the block that name won."),
        list,
        h("div", { class: "sp-input-row" }, input, fillBtn, giveUp),
        feedback,
        reveal,
        h("div", { class: "tl-actions sp-actions" }, scoreEl, next),
      ]);
      input.focus();
    }
    function advance() {
      i++;
      if (i < blocks.length) show();
      else finish({ score, total, found, missed });
    }
    show();
  }

  // ---------- 4. Who won more? / Who was faster? ----------
  interface Side {
    name: string;
    sub?: string;
    detail: string;
  }
  interface Pair {
    a: Side;
    b: Side;
    /** 0 if a is right, 1 if b is. */
    right: 0 | 1;
    prompt: string;
    result: string;
  }

  function sprintPairs(c: Ctx, want: number): Pair[] {
    const recs = c.wins.filter((w) => w.rec);
    const out: Pair[] = [];
    const seen = new Set<string>();
    for (let tries = 0; tries < 400 && out.length < want; tries++) {
      const x = recs[Math.floor(Math.random() * recs.length)];
      const y = recs[Math.floor(Math.random() * recs.length)];
      if (!x || !y || x.who[0] === y.who[0]) continue;
      const diff = Math.abs(x.rec!.mark - y.rec!.mark);
      // A hand time and an electronic time within a tenth of a second can't be fairly compared.
      const gap = x.rec!.hand !== y.rec!.hand ? 0.1005 : 0.005;
      if (diff < gap) continue;
      const k = [x.id, y.id].sort().join("|");
      if (seen.has(k)) continue;
      seen.add(k);
      const side = (w: SportWin): Side => ({
        name: w.shown,
        sub: `${w.rec!.place}, ${w.year}`,
        detail: `${w.shown}: ${markText(w)} in ${w.rec!.place}, ${w.year}`,
      });
      out.push({
        a: side(x),
        b: side(y),
        right: x.rec!.mark < y.rec!.mark ? 0 : 1,
        prompt: "Who ran the faster time?",
        result: "",
      });
    }
    return out;
  }

  function champPairs(c: Ctx): Pair[] {
    const n = counts(c.wins);
    const keys = [...n.keys()];
    const out: Pair[] = [];
    const seen = new Set<string>();
    for (let tries = 0; tries < 600 && out.length < QUESTIONS; tries++) {
      const x = keys[Math.floor(Math.random() * keys.length)];
      const y = keys[Math.floor(Math.random() * keys.length)];
      if (x === y || n.get(x) === n.get(y)) continue;
      const k = [x, y].sort().join("|");
      if (seen.has(k)) continue;
      seen.add(k);
      const side = (key: string): Side => ({ name: c.list.champs[key].name, detail: `${c.list.champs[key].name}: ${n.get(key)}` });
      out.push({ a: side(x), b: side(y), right: n.get(x)! > n.get(y)! ? 0 : 1, prompt: c.cfg.more, result: "" });
    }
    return out;
  }

  function runMore(c: Ctx) {
    const qs = listId === "sprint" ? sprintPairs(c, QUESTIONS) : champPairs(c);
    let i = 0;
    let score = 0;
    const sprint = listId === "sprint";
    function show() {
      const q = qs[i];
      const feedback = h("p", { class: "tl-feedback", "aria-live": "polite" });
      const reveal = h("div", { class: "sc-reveal sp-reveal" });
      reveal.hidden = true;
      const next = h("button", { type: "button", class: "btn primary", onclick: advance }, i + 1 < qs.length ? "Next ▸" : "See results ▸");
      next.hidden = true;
      const btns: HTMLButtonElement[] = [];
      const pick = (side: 0 | 1) => {
        const ok = side === q.right;
        if (ok) score++;
        btns.forEach((b, k) => {
          b.disabled = true;
          if (k === q.right) b.classList.add("right");
          else if (k === side) b.classList.add("wrong");
        });
        feedback.className = `tl-feedback ${ok ? "good" : "bad"}`;
        feedback.textContent = ok ? "Right! +1" : "Not this time.";
        reveal.replaceChildren(
          h("p", { class: "sp-answer" }, sprint ? "The marks" : `${c.cfg.count[0].toUpperCase()}${c.cfg.count.slice(1)} ${c.range.phrase}`),
          h("p", {}, q.a.detail),
          h("p", {}, q.b.detail),
          ...(sprint ? [h("p", { class: "muted" }, "Lower is faster. A hand-timed mark is not as exact as an electronic one.")] : []),
        );
        reveal.hidden = false;
        next.hidden = false;
        next.focus();
        scoreEl.textContent = `Score: ${score}`;
      };
      const mk = (s: Side, k: 0 | 1) => {
        const b = h(
          "button",
          { type: "button", class: "sp-pick", onclick: () => pick(k) },
          h("span", { class: "sp-pick-name" }, s.name),
          s.sub ? h("span", { class: "sp-pick-sub" }, s.sub) : null,
        );
        btns.push(b);
        return b;
      };
      const scoreEl = h("span", { class: "tl-score" }, `Score: ${score}`);
      shell(`Question ${i + 1} of ${qs.length} · ${c.range.label}`, [
        h("p", { class: "tl-event sp-ask" }, q.prompt),
        sprint ? null : h("p", { class: "muted" }, c.range.id === "all" ? "Counting every year." : `Counting ${c.range.phrase}.`),
        h("div", { class: "sp-picks", role: "group", "aria-label": "Pick one" }, mk(q.a, 0), mk(q.b, 1)),
        feedback,
        reveal,
        h("div", { class: "tl-actions sp-actions" }, scoreEl, next),
      ]);
      btns[0].focus();
    }
    function advance() {
      i++;
      if (i < qs.length) show();
      else finish({ score, total: qs.length, found: [], missed: [] });
    }
    show();
  }

  // ---------- 5. In order ----------
  function runOrder(c: Ctx) {
    const first = firstYears(c.list);
    const pool = [...counts(c.wins).keys()];
    const usedKeys = new Set<string>();
    const puzzles: string[][] = [];
    for (let p = 0; p < PUZZLES; p++) {
      const picked: string[] = [];
      const years = new Set<number>();
      const fresh = shuffle(pool.filter((k) => !usedKeys.has(k)));
      for (const k of [...fresh, ...shuffle(pool)]) {
        if (picked.length === ORDER_SIZE) break;
        const y = first.get(k)!;
        if (picked.includes(k) || years.has(y)) continue;
        picked.push(k);
        years.add(y);
      }
      picked.forEach((k) => usedKeys.add(k));
      puzzles.push(picked);
    }
    let index = 0;
    let score = 0;
    let total = 0;
    const nameOf = (k: string) => c.list.champs[k].name;

    function show() {
      const truth = [...puzzles[index]].sort((a, b) => first.get(a)! - first.get(b)!);
      let arr = shuffle(truth);
      for (let t = 0; t < 20 && arr.every((k, j) => k === truth[j]); t++) arr = shuffle(truth);
      let sel: number | null = null;
      let checked = false;

      const row = h("div", { class: "sc-row sp-order", role: "group", "aria-label": "Cards. Earliest on the left, latest on the right" });
      const live = h("p", { class: "sc-sr", "aria-live": "polite" });
      const leftBtn = h("button", { type: "button", class: "btn ghost", onclick: () => nudge(-1) }, "◂ Move left");
      const rightBtn = h("button", { type: "button", class: "btn ghost", onclick: () => nudge(1) }, "Move right ▸");
      const checkBtn = h("button", { type: "button", class: "btn primary", onclick: check }, "Check ▸");
      const feedback = h("p", { class: "tl-feedback", "aria-live": "polite" });
      const reveal = h("div", { class: "sc-reveal" });
      reveal.hidden = true;
      const how = h("p", { class: "muted sc-how" }, "Drag a card to move it. Or tap one to pick it up, then tap the card whose place you want. Keyboard: Enter picks up, arrows move.");
      const scoreEl = h("span", { class: "tl-score" }, `Score: ${score}`);
      const nextBtn = h("button", { type: "button", class: "btn primary", onclick: advance }, index + 1 < puzzles.length ? "Next puzzle ▸" : "See results ▸");
      nextBtn.hidden = true;

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
        live.textContent = `${nameOf(arr[sel])} is now number ${sel + 1} of ${arr.length}.`;
      }
      function tap(i: number) {
        if (checked) return;
        if (sel === null) sel = i;
        else if (sel === i) sel = null;
        else {
          move(sel, i);
          live.textContent = `${nameOf(arr[i])} moved to number ${i + 1} of ${arr.length}.`;
          sel = null;
        }
        draw(sel ?? undefined);
      }
      /** While dragging: which gap among the other cards is the pointer nearest? */
      function slotAt(x: number, y: number, others: HTMLElement[]) {
        let best = 0;
        let bestDist = Infinity;
        let after = false;
        others.forEach((el, k) => {
          const r = el.getBoundingClientRect();
          const d = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
          if (d < bestDist) {
            bestDist = d;
            best = k;
            after = x > r.left + r.width / 2;
          }
        });
        return { index: best + (after ? 1 : 0), el: others[best], after };
      }
      function card(key: string, i: number) {
        const right = checked && key === truth[i];
        const b = h(
          "button",
          {
            type: "button",
            class: `sc-card${sel === i ? " picked" : ""}${checked ? (right ? " right" : " wrong") : ""}`,
            "aria-pressed": checked ? "false" : String(sel === i),
            "aria-label": `${nameOf(key)}, number ${i + 1} of ${arr.length}${checked ? `. ${c.cfg.firstWord} ${first.get(key)}. ${right ? "Right place" : "Wrong place"}` : sel === i ? ", picked up" : ""}`,
            disabled: checked,
          },
          h("span", { class: "sc-pos" }, String(i + 1)),
          h("span", { class: "sc-name" }, nameOf(key)),
          checked ? h("span", { class: "sc-val" }, String(first.get(key))) : null,
        );
        let from: { x: number; y: number } | null = null;
        let dragging = false;
        let target: { index: number } | null = null;
        const others = () => [...row.querySelectorAll<HTMLElement>(".sc-card")].filter((el) => el !== b);
        const clearMarks = () => row.querySelectorAll(".drop-before, .drop-after").forEach((el) => el.classList.remove("drop-before", "drop-after"));
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
          const slot = slotAt(e.clientX, e.clientY, others());
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
              live.textContent = `${nameOf(key)} moved to number ${arr.indexOf(key) + 1} of ${arr.length}.`;
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
        const n = arr.filter((k, j) => k === truth[j]).length;
        score += n;
        total += arr.length;
        draw();
        checkBtn.hidden = leftBtn.hidden = rightBtn.hidden = how.hidden = true;
        feedback.className = `tl-feedback ${n === arr.length ? "good" : n >= arr.length / 2 ? "ok" : "bad"}`;
        feedback.textContent = n === arr.length ? `All ${n} in the right place. +${n}` : `${n} of ${arr.length} in the right place. +${n}`;
        reveal.replaceChildren(
          h("p", { class: "sc-label" }, `The right order: ${c.cfg.firstWord}, earliest first`),
          h(
            "ol",
            { class: "sc-order numbered" },
            ...truth.map((k, j) =>
              h(
                "li",
                { class: arr[j] === k ? "good" : "bad" },
                h("span", { class: "sc-num" }, String(j + 1)),
                h("span", { class: "sc-o-name" }, nameOf(k)),
                h("span", { class: "sc-o-val" }, String(first.get(k))),
              ),
            ),
          ),
        );
        reveal.hidden = false;
        nextBtn.hidden = false;
        nextBtn.focus();
        scoreEl.textContent = `Score: ${score}`;
      }
      shell(`Put in order · puzzle ${index + 1} of ${puzzles.length}`, [
        h("p", { class: "tl-event sp-ask" }, `Which ${c.cfg.verb === "hosted" ? "hosted" : c.cfg.verb === "set" ? "set a record" : "won"} first? Earliest on the left.`),
        h("span", { class: "muted" }, `Order by the year of each one's ${c.cfg.firstWord}.`),
        row,
        live,
        how,
        h("div", { class: "tl-actions sp-actions" }, leftBtn, rightBtn, scoreEl, checkBtn, nextBtn),
        feedback,
        reveal,
      ]);
      draw(0);
    }
    function advance() {
      index++;
      if (index < puzzles.length) show();
      else finish({ score, total, found: [], missed: [] });
    }
    show();
  }

  renderSetup();
  return () => clearGame();
}
