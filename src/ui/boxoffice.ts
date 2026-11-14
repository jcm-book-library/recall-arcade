// BOX OFFICE: three ways to play with the highest-grossing films and franchises.
//   more    "Which made more?"  two names, pick the one with the bigger total. 10 questions.
//   order   "In order"          five names, put them from biggest to smallest. 3 puzzles.
//   top10   "Top 10"            type the ten biggest films, in any order.
// Scores are saved under the variant "<mode>-<list>", for example "more-films".
// The numbers come from decks/entertainment-data.ts. They are worldwide, in US dollars, and are not
// adjusted for inflation (so old films look smaller than they were).
import type { Deck } from "../engine/types";
import { normalize } from "../engine/matcher";
import { bestFor, recordGame } from "../engine/storage";
import { h } from "./dom";
import { BOX_AS_OF, BOX_FILMS, BOX_FRANCHISES } from "../decks/entertainment-data";
import { billions, entFrame, wayRows, matchesAny, orderPuzzle, resultsPanel, shuffle, type OrderCard, type RoundResult } from "./ent-common";
import { topicTabs } from "./quiz-shell";
import "./sport.css";
import "./entertainment.css";

type Mode = "more" | "order" | "top10";
type ListId = "films" | "franchises";

interface Entry {
  id: string;
  name: string;
  sub: string;
  gross: number;
  accept: string[];
}

const QUESTIONS = 10;
const PUZZLES = 3;
const ORDER_SIZE = 5;

const FILMS: Entry[] = BOX_FILMS.map((f) => ({ id: f.id, name: f.name, sub: String(f.year), gross: f.gross, accept: f.accept }));
const FRANCHISES: Entry[] = BOX_FRANCHISES.map((f) => ({ id: f.id, name: f.name, sub: `${f.films} films`, gross: f.gross, accept: f.accept }));
const POOLS: Record<ListId, Entry[]> = { films: FILMS, franchises: FRANCHISES };

const MODES: { id: Mode; label: string; note: string }[] = [
  { id: "more", label: "Which made more?", note: "Two names appear. Pick the one that made more money. 10 questions." },
  { id: "order", label: "In order", note: "Five names appear. Put them in order, biggest earner on the left. Drag, tap or use the keyboard." },
  { id: "top10", label: "Top 10 films", note: "Type the ten biggest films, in any order. Each right answer fills its place in the list." },
];

const NOTE_ALL = `As of ${BOX_AS_OF}, not adjusted for inflation.`;
const NOTE_FRANCHISES = "Franchise totals overlap. The Marvel Cinematic Universe includes the Avengers films and some Spider-Man films.";

export function renderBoxOffice(root: HTMLElement, deck: Deck) {
  let mode: Mode = "more";
  let list: ListId = "films";
  let startedAt = 0;

  const { setup, game, results } = entFrame(root, deck, "Pick the film or franchise that made more money, or put them in order.");

  // The Top 10 is only about films, whichever list tab is showing.
  const listFor = (m: Mode) => (m === "top10" ? "films" : list);
  const variant = () => `${mode}-${listFor(mode)}`;
  const pool = () => POOLS[list];

  function renderSetup() {
    setup.replaceChildren(
      topicTabs({
        tabs: [
          { id: "films", label: "Films" },
          { id: "franchises", label: "Franchises" },
        ],
        active: list,
        note: list === "franchises" ? `${NOTE_ALL} ${NOTE_FRANCHISES}` : NOTE_ALL,
        onPick: (id) => {
          list = id as ListId;
          renderSetup();
          setup.querySelector<HTMLElement>(".qtab.on")?.focus();
        },
      }),
      wayRows({
        deckId: deck.id,
        current: mode,
        ways: MODES.map((m) => ({ id: m.id, name: m.label, desc: m.id === "top10" ? `${m.note} (Always films.)` : m.note, key: `${m.id}-${listFor(m.id)}` })),
        onPick: (id) => {
          mode = id as Mode;
          renderSetup();
        },
        onStart: (id) => {
          mode = id as Mode;
          start();
        },
      }),
    );
  }

  function start() {
    setup.hidden = true;
    results.hidden = true;
    game.hidden = false;
    startedAt = Date.now();
    if (mode === "more") runMore();
    else if (mode === "order") runOrder();
    else runTop10();
  }

  function finish(r: RoundResult) {
    game.hidden = true;
    const prev = bestFor(deck.id, variant());
    recordGame({ deck: deck.id, variant: variant(), score: r.score, total: r.total, seconds: Math.round((Date.now() - startedAt) / 1000), date: Date.now() }, r.found, r.missed);
    results.replaceChildren(
      resultsPanel({
        score: r.score,
        total: r.total,
        prev,
        verdicts: ["Top effort. You know your blockbusters.", "Not bad at all.", "Have another go. It sinks in."],
        onAgain: start,
        onChange: () => {
          results.hidden = true;
          setup.hidden = false;
          renderSetup();
          setup.querySelector<HTMLElement>(".qrow.current .qgo")?.focus();
        },
      }),
    );
    results.hidden = false;
    results.querySelector<HTMLElement>(".btn.primary")?.focus();
  }

  const shell = (count: string, body: (Node | null | false)[]) =>
    game.replaceChildren(h("div", { class: "tl-card sp-card" }, h("span", { class: "tl-count" }, count), h("p", { class: "ent-asof" }, NOTE_ALL), ...body));

  // ---------- Which made more? ----------
  function pairs(): [Entry, Entry][] {
    const all = pool();
    const out: [Entry, Entry][] = [];
    const used = new Set<string>();
    for (let tries = 0; tries < 800 && out.length < QUESTIONS; tries++) {
      const a = all[Math.floor(Math.random() * all.length)];
      const b = all[Math.floor(Math.random() * all.length)];
      if (a === b) continue;
      // Too close to call is not fair: the bigger one must make at least 6% more.
      if (Math.max(a.gross, b.gross) / Math.min(a.gross, b.gross) < 1.06) continue;
      if (tries < 500 && (used.has(a.id) || used.has(b.id))) continue;
      used.add(a.id);
      used.add(b.id);
      out.push([a, b]);
    }
    return out;
  }

  function runMore() {
    const qs = pairs();
    let i = 0;
    let score = 0;
    const found: string[] = [];
    const missed: string[] = [];
    function show() {
      const [a, b] = qs[i];
      const right = a.gross > b.gross ? 0 : 1;
      const feedback = h("p", { class: "tl-feedback", "aria-live": "polite" });
      const reveal = h("div", { class: "sc-reveal sp-reveal" });
      reveal.hidden = true;
      const next = h("button", { type: "button", class: "btn primary", onclick: advance }, i + 1 < qs.length ? "Next ▸" : "See results ▸");
      next.hidden = true;
      const scoreEl = h("span", { class: "tl-score" }, `Score: ${score}`);
      const btns: HTMLButtonElement[] = [];
      const pick = (side: number) => {
        const ok = side === right;
        if (ok) score++;
        (ok ? found : missed).push(qs[i][right].id);
        btns.forEach((x, k) => {
          x.disabled = true;
          if (k === right) x.classList.add("right");
          else if (k === side) x.classList.add("wrong");
        });
        feedback.className = `tl-feedback ${ok ? "good" : "bad"}`;
        feedback.textContent = ok ? "Right! +1" : "Not this time.";
        reveal.replaceChildren(
          h("p", { class: "sp-answer" }, "The totals"),
          ...[a, b].map((e) => h("p", {}, `${e.name}${list === "films" ? ` (${e.sub})` : ""}: ${billions(e.gross)}`)),
        );
        reveal.hidden = false;
        next.hidden = false;
        next.focus();
        scoreEl.textContent = `Score: ${score}`;
      };
      const mk = (e: Entry, k: number) => {
        const btn = h("button", { type: "button", class: "sp-pick", onclick: () => pick(k) }, h("span", { class: "sp-pick-name" }, e.name), h("span", { class: "sp-pick-sub" }, e.sub));
        btns.push(btn);
        return btn;
      };
      shell(`Question ${i + 1} of ${qs.length}`, [
        h("p", { class: "tl-event sp-ask" }, list === "films" ? "Which film made more?" : "Which franchise made more?"),
        h("div", { class: "sp-picks", role: "group", "aria-label": "Pick one" }, mk(a, 0), mk(b, 1)),
        feedback,
        reveal,
        h("div", { class: "tl-actions sp-actions" }, scoreEl, next),
      ]);
      btns[0].focus();
    }
    function advance() {
      i++;
      if (i < qs.length) show();
      else finish({ score, total: qs.length, found, missed });
    }
    show();
  }

  // ---------- In order ----------
  function puzzle(used: Set<string>): Entry[] {
    const all = pool();
    for (let tries = 0; tries < 400; tries++) {
      const fresh = tries < 200 ? shuffle(all.filter((e) => !used.has(e.id))) : shuffle(all);
      const pick = fresh.slice(0, ORDER_SIZE).sort((a, b) => b.gross - a.gross);
      if (pick.length === ORDER_SIZE && pick.every((e, k) => k === 0 || pick[k - 1].gross / e.gross >= 1.05)) {
        pick.forEach((e) => used.add(e.id));
        return pick;
      }
    }
    return shuffle(all).slice(0, ORDER_SIZE).sort((a, b) => b.gross - a.gross);
  }

  function runOrder() {
    const used = new Set<string>();
    const puzzles = Array.from({ length: PUZZLES }, () => puzzle(used));
    let index = 0;
    let score = 0;
    let total = 0;
    const found: string[] = [];
    const missed: string[] = [];
    function show() {
      const truth = puzzles[index];
      const cards: OrderCard[] = truth.map((e) => ({ id: e.id, name: e.name, value: `${billions(e.gross)}${list === "films" ? ` · ${e.sub}` : ""}` }));
      const scoreEl = h("span", { class: "tl-score" }, `Score: ${score}`);
      const next = h("button", { type: "button", class: "btn primary", onclick: advance }, index + 1 < puzzles.length ? "Next puzzle ▸" : "See results ▸");
      next.hidden = true;
      const p = orderPuzzle(cards, {
        ends: "Biggest earner on the left, smallest on the right",
        what: "biggest earner first",
        done: (n) => {
          score += n;
          total += truth.length;
          scoreEl.textContent = `Score: ${score}`;
          next.hidden = false;
          next.focus();
        },
      });
      p.actions.append(scoreEl, next);
      shell(`Put in order · puzzle ${index + 1} of ${puzzles.length}`, [
        h("p", { class: "tl-event sp-ask" }, `Which ${list === "films" ? "film" : "franchise"} made the most? Biggest on the left.`),
        ...p.nodes,
      ]);
      p.focusFirst();
    }
    function advance() {
      const done = puzzles[index].map((e) => e.id);
      // The right-place count is already scored; every name in the puzzle counts as seen.
      found.push(...done);
      index++;
      if (index < puzzles.length) show();
      else finish({ score, total, found, missed });
    }
    show();
  }

  // ---------- Top 10 ----------
  function runTop10() {
    const top = FILMS.slice(0, 10);
    const filled = new Set<string>();
    let over = false;
    const tiles = new Map<string, HTMLElement>();
    const ul = h("ul", { class: "sp-tiles ent-top10" });
    top.forEach((e, k) => {
      const li = h("li", { class: "sp-tile" }, h("span", { class: "sp-tyear" }, `No. ${k + 1}`), h("span", { class: "sp-name" }, "?"), h("span", { class: "sp-pick-sub ent-gross" }, ""));
      tiles.set(e.id, li);
      ul.append(li);
    });
    const input = h("input", {
      class: "answer", type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false",
      "aria-label": "Type a film", placeholder: "Type a film, then press Enter",
    });
    const feedback = h("p", { class: "tl-feedback sp-fb", "aria-live": "polite" });
    const scoreEl = h("span", { class: "tl-score" }, "");
    const upd = () => (scoreEl.textContent = `${filled.size} of 10 found`);
    upd();
    const next = h("button", { type: "button", class: "btn primary", onclick: () => finish({ score: filled.size, total: 10, found: [...filled], missed: top.filter((e) => !filled.has(e.id)).map((e) => e.id) }) }, "See results ▸");
    next.hidden = true;
    function fill(e: Entry, style: "hit" | "miss") {
      const li = tiles.get(e.id)!;
      li.classList.add(style);
      li.querySelector(".sp-name")!.textContent = (style === "hit" ? "✓ " : "! ") + e.name;
      li.querySelector(".ent-gross")!.textContent = `${billions(e.gross)} · ${e.sub}`;
      if (style === "hit") filled.add(e.id);
    }
    function end(gaveUp: boolean) {
      over = true;
      for (const e of top) if (!filled.has(e.id)) fill(e, "miss");
      input.disabled = addBtn.disabled = giveUp.disabled = true;
      addBtn.hidden = giveUp.hidden = true;
      feedback.className = `tl-feedback sp-fb ${filled.size === 10 ? "good" : "ok"}`;
      feedback.textContent = gaveUp ? `${filled.size} of 10. The rest are shown with a !.` : "All 10 found. Well done!";
      next.hidden = false;
      next.focus();
    }
    function submit() {
      if (over) return;
      const text = input.value;
      if (!normalize(text)) return;
      const hit = top.find((e) => matchesAny(text, e.accept));
      if (hit && filled.has(hit.id)) {
        feedback.className = "tl-feedback sp-fb ok";
        feedback.textContent = "Already found that one.";
        input.value = "";
      } else if (hit) {
        fill(hit, "hit");
        feedback.className = "tl-feedback sp-fb good";
        feedback.textContent = `Yes! That is No. ${top.indexOf(hit) + 1}.`;
        input.value = "";
        upd();
        if (filled.size === 10) end(false);
      } else {
        const other = FILMS.find((e) => matchesAny(text, e.accept));
        feedback.className = "tl-feedback sp-fb bad";
        feedback.textContent = other ? `${other.name} made a lot, but it is not in the top 10.` : "That is not in the top 10.";
        input.classList.remove("nope");
        void input.offsetWidth;
        input.classList.add("nope");
      }
      input.focus();
    }
    const addBtn = h("button", { type: "button", class: "btn primary", onclick: submit }, "Add");
    const giveUp = h("button", { type: "button", class: "btn ghost", onclick: () => end(true) }, "Give up");
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    });
    shell("Top 10 films", [
      h("p", { class: "tl-event sp-ask" }, "Name the 10 films that made the most money."),
      h("p", { class: "muted" }, "Any order. Each right answer lands in its place."),
      ul,
      h("div", { class: "sp-input-row" }, input, addBtn, giveUp),
      feedback,
      h("div", { class: "tl-actions sp-actions" }, scoreEl, next),
    ]);
    input.focus();
  }

  renderSetup();
  return () => {};
}
