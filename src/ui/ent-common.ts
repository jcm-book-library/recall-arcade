// Small shared helpers for the Entertainment screens.
import { normalize } from "../engine/matcher";
import { withinOne } from "./sport";
import { h } from "./dom";
import type { Deck } from "../engine/types";
import { bestFor } from "../engine/storage";
import { levelNotesFor } from "../engine/levels";
import { fillRules } from "./fill-quiz";
import { quizHeader, quizRow, quizRows, levelStatesFor, subjectClass } from "./quiz-shell";

export function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Does the typed text match one of the accepted names? Case, accents, punctuation and a leading
 * "The" never matter. In long answers (7 or more letters) one slip is forgiven.
 */
export function matchesAny(text: string, accepted: string[]): boolean {
  const t = normalize(text);
  if (!t) return false;
  return accepted.some((n) => {
    const m = normalize(n);
    return m === t || (t.length >= 7 && m.length >= 7 && withinOne(t, m));
  });
}

/** "US$2.94 billion" */
export const billions = (n: number) => `US$${(n / 1e9).toFixed(2)} billion`;

export interface Chip {
  id: string;
  text: string;
}

/**
 * The page for an Entertainment screen: the shared quiz header (rule 1) over the three panels
 * (setup, the game, the results). Returns the panels.
 */
export function entFrame(root: HTMLElement, deck: Deck, howItWorks: string, back?: { href: string; label?: string }, withFill = false) {
  const setup = h("div", { class: "setup sp-setup" });
  const game = h("div", { class: "sp-game" });
  game.hidden = true;
  const results = h("div", { class: "results" });
  results.hidden = true;
  const header = quizHeader({
    deck,
    howItWorks,
    rules: [h("div", { class: "qpop-levels" }, ...levelNotesFor(["medium"]).map((t) => h("p", {}, t))), ...(withFill ? [fillRules()] : [])],
    back,
  });
  root.replaceChildren(
    h(
      "main",
      { class: `play quiz ${subjectClass(deck.subject)}` },
      header,
      setup,
      game,
      results,
    ),
  );
  return { header, setup, game, results };
}

export interface WayRow {
  id: string;
  name: string;
  /** What the way is, then how many questions. */
  desc: string;
  /** The saved-score key for this row right now (the round it would play). */
  key: string;
  /** Can't start (nothing in this round). */
  disabled?: boolean;
}

/**
 * The ways to play as shared rows (★ on the first). Only Medium exists: the games have no hints to
 * add or take away, so Easy and Hard stay dashed. Medium saves under `key`, exactly as before.
 */
export function wayRows(o: { deckId: string; ways: WayRow[]; current: string; onPick: (id: string) => void; onStart: (id: string) => void }) {
  return quizRows(
    ...o.ways.map((w, i) => {
      const states = levelStatesFor(o.deckId, w.key);
      const best = bestFor(o.deckId, w.key);
      const row = quizRow({
        badge: states.medium === "done" ? "done" : i === 0 ? "star" : i + 1,
        name: w.name,
        desc: best ? `${w.desc} Best: ${best.score}/${best.total}.` : w.desc,
        levels: states,
        selected: "medium",
        current: w.id === o.current,
        onPick: () => o.onPick(w.id),
        onLevel: () => o.onPick(w.id),
        onStart: () => o.onStart(w.id),
      });
      if (w.disabled) row.querySelector<HTMLButtonElement>(".qgo")!.disabled = true;
      return row;
    }),
  );
}

export interface RoundResult {
  score: number;
  total: number;
  found: string[];
  missed: string[];
}

// ---------- the results panel every Entertainment screen ends with ----------

export function resultsPanel(o: {
  score: number;
  total: number;
  prev: { score: number; total: number } | undefined;
  verdicts: [string, string, string];
  onAgain: () => void;
  onChange: () => void;
}) {
  const share = o.total ? o.score / o.total : 0;
  const beaten = !o.prev || share > o.prev.score / o.prev.total;
  return h(
    "div",
    { class: "results-head" },
    h("div", { class: "big" }, `${o.score}`, h("small", {}, `/${o.total}`)),
    h(
      "div",
      {},
      h("p", { class: "verdict" }, share >= 0.8 ? o.verdicts[0] : share >= 0.5 ? o.verdicts[1] : o.verdicts[2]),
      h("p", { class: "muted" }, beaten ? "That's your best for this round." : `Your best is ${o.prev!.score}/${o.prev!.total}.`),
    ),
    h(
      "div",
      { class: "results-actions" },
      h("button", { type: "button", class: "btn primary", onclick: o.onAgain }, "Play again"),
      h("button", { type: "button", class: "btn ghost", onclick: o.onChange }, "Change setup"),
    ),
  );
}

// ---------- put the cards in order: drag, tap or use the keyboard ----------

export interface OrderCard {
  id: string;
  name: string;
  /** Shown on the card once checked, and in the answer list. */
  value: string;
}

/**
 * A row of cards to put in order. `truth` is the right order, left to right. The player drags a card,
 * or taps one to pick it up and taps where it goes, or presses Enter and the arrow keys. `done` is called
 * once with how many cards were in the right place.
 */
export function orderPuzzle(truth: OrderCard[], o: { ends: string; what: string; done: (right: number) => void }) {
  let arr = shuffle(truth);
  for (let t = 0; t < 20 && arr.every((c, j) => c.id === truth[j].id); t++) arr = shuffle(truth);
  let sel: number | null = null;
  let checked = false;

  const row = h("div", { class: "sc-row sp-order", role: "group", "aria-label": `Cards. ${o.ends}` });
  const live = h("p", { class: "sc-sr", "aria-live": "polite" });
  const leftBtn = h("button", { type: "button", class: "btn ghost", onclick: () => nudge(-1) }, "◂ Move left");
  const rightBtn = h("button", { type: "button", class: "btn ghost", onclick: () => nudge(1) }, "Move right ▸");
  const checkBtn = h("button", { type: "button", class: "btn primary", onclick: check }, "Check ▸");
  const feedback = h("p", { class: "tl-feedback", "aria-live": "polite" });
  const reveal = h("div", { class: "sc-reveal" });
  reveal.hidden = true;
  const how = h("p", { class: "muted sc-how" }, "Drag a card to move it. Or tap one to pick it up, then tap the card whose place you want. Keyboard: Enter picks up, arrows move.");
  const actions = h("div", { class: "tl-actions sp-actions" }, leftBtn, rightBtn, checkBtn);

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
  function card(c: OrderCard, i: number) {
    const right = checked && c.id === truth[i].id;
    const b = h(
      "button",
      {
        type: "button",
        class: `sc-card${sel === i ? " picked" : ""}${checked ? (right ? " right" : " wrong") : ""}`,
        "aria-pressed": checked ? "false" : String(sel === i),
        "aria-label": `${c.name}, number ${i + 1} of ${arr.length}${checked ? `. ${c.value}. ${right ? "Right place" : "Wrong place"}` : sel === i ? ", picked up" : ""}`,
        disabled: checked,
      },
      h("span", { class: "sc-pos" }, String(i + 1)),
      h("span", { class: "sc-name" }, c.name),
      checked ? h("span", { class: "sc-val" }, c.value) : null,
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
          live.textContent = `${c.name} moved to number ${arr.findIndex((x) => x.id === c.id) + 1} of ${arr.length}.`;
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
    const n = arr.filter((c, j) => c.id === truth[j].id).length;
    draw();
    checkBtn.hidden = leftBtn.hidden = rightBtn.hidden = how.hidden = true;
    feedback.className = `tl-feedback ${n === arr.length ? "good" : n >= arr.length / 2 ? "ok" : "bad"}`;
    feedback.textContent = n === arr.length ? `All ${n} in the right place. +${n}` : `${n} of ${arr.length} in the right place. +${n}`;
    reveal.replaceChildren(
      h("p", { class: "sc-label" }, `The right order: ${o.what}`),
      h(
        "ol",
        { class: "sc-order numbered" },
        ...truth.map((c, j) =>
          h(
            "li",
            { class: arr[j].id === c.id ? "good" : "bad" },
            h("span", { class: "sc-num" }, String(j + 1)),
            h("span", { class: "sc-o-name" }, c.name),
            h("span", { class: "sc-o-val" }, c.value),
          ),
        ),
      ),
    );
    reveal.hidden = false;
    o.done(n);
  }
  draw(0);
  return { nodes: [row, live, how, actions, feedback, reveal], actions, focusFirst: () => row.querySelector<HTMLElement>(".sc-card")?.focus() };
}
