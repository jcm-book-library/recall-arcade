// ERAS & DYNASTIES: the screen. Three ways to learn the same list of periods (see decks/periods.ts):
//
//   "Eras in order"  drag 5 (Easy) or 7 (Hard) eras into the order they started.   1 point per card in place.
//   "Place the era"  an era's name appears; drag both ends of a span on a timeline.  0 to 100 by overlap.
//   "Which era?"     an event appears; pick the period it belongs to out of four.     1 point per right answer.
//
// Rounds are short (about 8 questions) and every round ends with the true dates, so the list sinks in.
import type { Deck, Item } from "../engine/types";
import { bestFor, recordGame } from "../engine/storage";
import { h } from "./dom";
import { scale } from "./timeline";
import { EVENT_ITEMS, yr, periodYears, type Period } from "../decks/periods";
import "./eras.css";

type RoundId =
  | "order"
  | "place-ancient"
  | "place-recent"
  | "place-all"
  | "which";

/** The axis for a "Place the era" round. Years where it bends get an equal share of the width each. */
interface Axis {
  breaks: number[];
  ticks: number[];
  /** Which eras can be asked on this axis (they must fit on the line). */
  fits: (p: Period) => boolean;
}

const AXES: Record<string, Axis> = {
  "place-ancient": {
    breaks: [-3300, -1000, 1, 500, 1000, 1500],
    ticks: [-3000, -1000, 1, 500, 1000, 1500],
    fits: (p) => p.start >= -3300 && p.end <= 1500,
  },
  "place-recent": {
    breaks: [1300, 1600, 1800, 1900, 2025],
    ticks: [1300, 1600, 1800, 1900, 2025],
    fits: (p) => p.start >= 1300,
  },
  // Recent centuries are crowded, so they get more room (the same idea as Big Moments' "All of History").
  "place-all": {
    breaks: [-3300, -1000, 1, 1000, 1500, 1800, 1900, 2025],
    ticks: [-3000, -1000, 1, 1000, 1500, 1800, 1900, 2025],
    fits: () => true,
  },
};

const ROUNDS: {
  id: RoundId;
  label: string;
  starter?: boolean;
  note: string;
}[] = [
  {
    id: "order",
    label: "Eras in order",
    starter: true,
    note: "Drag the cards into the order the eras started, earliest first. 1 point for each card in the right place.",
  },
  {
    id: "place-ancient",
    label: "Place: Ancient & medieval",
    note: "An era's name appears. Drag both ends of the span to where you think it started and ended. Up to 100 points for how well your span overlaps the real one.",
  },
  {
    id: "place-recent",
    label: "Place: 1300 to today",
    note: "An era's name appears. Drag both ends of the span to where you think it started and ended. Up to 100 points for how well your span overlaps the real one.",
  },
  {
    id: "place-all",
    label: "Place: All of history",
    note: "An era's name appears. Drag both ends of the span to where you think it started and ended. Up to 100 points for how well your span overlaps the real one.",
  },
  {
    id: "which",
    label: "Which era?",
    note: "A moment from Big Moments appears. Pick the era, war or movement it belonged to. 1 point for each right answer.",
  },
];

const QUESTIONS = 8;
const PUZZLES = 3;

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Overlap score for "Place the era": shared years ÷ all years covered by either span, 0 to 100,
 *  plus a small bonus (up to 10) when an end lands close. */
export function spanScore(
  ga: number,
  gb: number,
  ta: number,
  tb: number,
): number {
  const shared = Math.max(0, Math.min(gb, tb) - Math.max(ga, ta));
  const covered = Math.max(gb, tb) - Math.min(ga, ta);
  const overlap = covered > 0 ? shared / covered : 0;
  const near = Math.max(10, 0.15 * (tb - ta)); // how close an end must be to earn its bonus
  const bonus = [Math.abs(ga - ta), Math.abs(gb - tb)].reduce(
    (sum, off) => sum + 5 * Math.max(0, 1 - off / near),
    0,
  );
  return Math.min(100, Math.round(overlap * 100 + bonus));
}

/** Eras items and Big Moments events both keep their period in data.period. */
const periodOf = (i: Item) => i.data!.period as Period;
const cls = (frac: number) =>
  frac >= 0.8 ? "good" : frac >= 0.4 ? "ok" : "bad";

/** One finished question, kept for the results list. */
interface Entry {
  item: Item;
  said: string;
  /** 0 to 1 */
  frac: number;
  points: number;
}

export function renderEras(root: HTMLElement, deck: Deck) {
  let roundId: RoundId = "order";
  let hard = false;
  let queue: Item[] = [];
  let index = 0;
  let total = 0;
  let max = 0;
  const log: Entry[] = [];

  const setup = h("div", { class: "setup" });
  const game = h("div", { class: "er-game" });
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

  const periods = deck.items.map(periodOf);
  const whichPool = EVENT_ITEMS.filter((e) => e.data!.period);
  const poolSize = () =>
    roundId === "which"
      ? whichPool.length
      : roundId === "order"
        ? periods.length
        : periods.filter((p) => AXES[roundId].fits(p)).length;

  // ---------- setup ----------
  function renderSetup() {
    const round = ROUNDS.find((r) => r.id === roundId)!;
    const best = bestFor(deck.id, roundId);
    setup.replaceChildren(
      h(
        "details",
        { class: "er-learn", open: true },
        h("summary", {}, "Learn it first"),
        h(
          "p",
          {},
          "An era is a stretch of time with its own character: a dynasty ruling China, the Victorian age, the Cold War. Learn the order first, then where each starts and ends.",
        ),
        h(
          "p",
          { class: "muted" },
          `${periods.length} eras, wars and movements are in this game. Start with Eras in order, then try placing them on a timeline.`,
        ),
      ),
      h(
        "div",
        { class: "chips", role: "group", "aria-label": "Choose a round" },
        ...ROUNDS.map((r) =>
          h(
            "button",
            {
              type: "button",
              class: r.id === roundId ? "chip on" : "chip",
              "aria-pressed": String(r.id === roundId),
              onclick: () => {
                roundId = r.id;
                renderSetup();
              },
            },
            r.starter ? `★ ${r.label}` : r.label,
          ),
        ),
      ),
      ...(roundId === "order"
        ? [
            h(
              "div",
              { class: "chips", role: "group", "aria-label": "How many cards" },
              ...[false, true].map((isHard) =>
                h(
                  "button",
                  {
                    type: "button",
                    class: isHard === hard ? "chip on" : "chip",
                    "aria-pressed": String(isHard === hard),
                    onclick: () => {
                      hard = isHard;
                      renderSetup();
                    },
                  },
                  isHard ? "Hard: 7 cards" : "Easy: 5 cards",
                ),
              ),
            ),
          ]
        : []),
      h(
        "div",
        { class: "setup-row" },
        h(
          "p",
          { class: "muted tl-how" },
          `${round.note} ${roundId === "order" ? `${PUZZLES} puzzles` : `${QUESTIONS} questions`} from ${poolSize()}.`,
        ),
        h(
          "span",
          { class: "best" },
          best ? `Best: ${best.score}/${best.total}` : "",
        ),
        h(
          "button",
          { type: "button", class: "btn primary", onclick: start },
          "Start ▸",
        ),
      ),
      ...(deck.related
        ? [
            h(
              "a",
              { class: "btn ghost related", href: deck.related.href },
              deck.related.label,
            ),
          ]
        : []),
    );
  }

  function start() {
    index = 0;
    total = 0;
    log.length = 0;
    setup.hidden = true;
    results.hidden = true;
    game.hidden = false;
    if (roundId === "order") {
      queue = makeOrderPuzzles();
      max = PUZZLES * (hard ? 7 : 5);
      showOrder();
    } else if (roundId === "which") {
      queue = pickWhich();
      max = queue.length;
      showWhich();
    } else {
      const axis = AXES[roundId];
      queue = shuffle(deck.items.filter((i) => axis.fits(periodOf(i)))).slice(
        0,
        QUESTIONS,
      );
      max = queue.length * 100;
      showPlace();
    }
  }

  const scoreLine = () =>
    h(
      "span",
      { class: "tl-score" },
      roundId === "which" || roundId === "order"
        ? `${total}/${log.length}`
        : `Score: ${total}`,
    );

  // ---------- Eras in order ----------
  // A puzzle is a list of periods whose start years are at least 25 years apart, so there is one right order.
  let puzzles: Item[][] = [];
  function makeOrderPuzzles(): Item[] {
    const n = hard ? 7 : 5;
    const used = new Set<string>();
    puzzles = [];
    for (let p = 0; p < PUZZLES; p++) {
      const picked: Item[] = [];
      const fresh = shuffle(deck.items.filter((i) => !used.has(i.id)));
      for (const i of [...fresh, ...shuffle(deck.items)]) {
        if (picked.length === n) break;
        if (picked.includes(i)) continue;
        if (
          picked.some(
            (o) => Math.abs(periodOf(o).start - periodOf(i).start) < 25,
          )
        )
          continue;
        picked.push(i);
      }
      picked.forEach((i) => used.add(i.id));
      puzzles.push(picked);
    }
    return puzzles.map((p) => p[0]); // one entry per puzzle, so `index` counts puzzles
  }

  function showOrder() {
    const truth = [...puzzles[index]].sort(
      (a, b) => periodOf(a).start - periodOf(b).start,
    );
    let arr = shuffle(truth);
    for (
      let tries = 0;
      tries < 20 && arr.every((t, i) => t === truth[i]);
      tries++
    )
      arr = shuffle(truth);
    let sel: number | null = null; // the card picked up by tap, click or keyboard
    let checked = false;

    const row = h("div", {
      class: "sc-row er-row",
      role: "group",
      "aria-label": "Cards. Earliest on the left, latest on the right",
    });
    const live = h("p", { class: "sc-sr", "aria-live": "polite" });
    const leftBtn = h(
      "button",
      { type: "button", class: "btn ghost", onclick: () => nudge(-1) },
      "◂ Move left",
    );
    const rightBtn = h(
      "button",
      { type: "button", class: "btn ghost", onclick: () => nudge(1) },
      "Move right ▸",
    );
    const checkBtn = h(
      "button",
      { type: "button", class: "btn primary", onclick: check },
      "Check ▸",
    );
    const feedback = h("p", { class: "tl-feedback", "aria-live": "polite" });
    const reveal = h("div", { class: "sc-reveal" });
    reveal.hidden = true;
    const how = h(
      "p",
      { class: "muted sc-how" },
      "Drag a card to move it. Or tap one to pick it up, then tap the card whose place you want. Keyboard: Enter picks up, arrows move.",
    );

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

    /** While dragging: which gap among the other cards is the pointer nearest? */
    function slotAt(x: number, y: number, others: HTMLElement[]) {
      let best = 0;
      let bestDist = Infinity;
      let after = false;
      others.forEach((el, k) => {
        const r = el.getBoundingClientRect();
        const d = Math.hypot(
          Math.max(r.left - x, 0, x - r.right),
          Math.max(r.top - y, 0, y - r.bottom),
        );
        if (d < bestDist) {
          bestDist = d;
          best = k;
          after = x > r.left + r.width / 2;
        }
      });
      return { index: best + (after ? 1 : 0), el: others[best], after };
    }

    function card(t: Item, i: number) {
      const right = checked && t === truth[i];
      const b = h(
        "button",
        {
          type: "button",
          class: `sc-card${sel === i ? " picked" : ""}${checked ? (right ? " right" : " wrong") : ""}`,
          "aria-pressed": checked ? "false" : String(sel === i),
          "aria-label": `${t.name}, number ${i + 1} of ${arr.length}${checked ? `. ${periodYears(periodOf(t))}. ${right ? "Right place" : "Wrong place"}` : sel === i ? ", picked up" : ""}`,
          disabled: checked,
        },
        h("span", { class: "sc-pos" }, String(i + 1)),
        h("span", { class: "sc-name" }, t.name),
        checked
          ? h("span", { class: "sc-val" }, periodYears(periodOf(t)))
          : null,
      );
      // Pointer events cover mouse, touch and pen with one piece of code.
      let from: { x: number; y: number } | null = null;
      let dragging = false;
      let target: { index: number } | null = null;
      const others = () =>
        [...row.querySelectorAll<HTMLElement>(".sc-card")].filter(
          (c) => c !== b,
        );
      const clearMarks = () =>
        row
          .querySelectorAll(".drop-before, .drop-after")
          .forEach((c) => c.classList.remove("drop-before", "drop-after"));
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
        if (b.hasPointerCapture(e.pointerId))
          b.releasePointerCapture(e.pointerId);
        if (dragging) {
          dragging = false;
          clearMarks();
          if (!cancelled && target) {
            move(i, target.index);
            live.textContent = `${t.name} moved to number ${arr.indexOf(t) + 1} of ${arr.length}.`;
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
        if (
          e.key === "ArrowLeft" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowRight" ||
          e.key === "ArrowDown"
        ) {
          const d = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
          e.preventDefault();
          if (sel === i) nudge(d);
          else
            row
              .querySelectorAll<HTMLElement>(".sc-card")
              [Math.min(arr.length - 1, Math.max(0, i + d))]?.focus();
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
      if (focus !== undefined)
        row.querySelectorAll<HTMLElement>(".sc-card")[focus]?.focus();
    }

    function check() {
      checked = true;
      sel = null;
      const n = arr.filter((t, i) => t === truth[i]).length;
      total += n;
      for (const t of truth)
        log.push({
          item: t,
          said: `number ${arr.indexOf(t) + 1}`,
          frac: t === truth[arr.indexOf(t)] ? 1 : 0,
          points: t === truth[arr.indexOf(t)] ? 1 : 0,
        });
      draw();
      checkBtn.hidden = leftBtn.hidden = rightBtn.hidden = how.hidden = true;
      feedback.className = `tl-feedback ${n === arr.length ? "good" : n >= arr.length / 2 ? "ok" : "bad"}`;
      feedback.textContent =
        n === arr.length
          ? `All ${n} in the right place. +${n}`
          : `${n} of ${arr.length} in the right place. +${n}`;
      reveal.replaceChildren(
        h("p", { class: "sc-label" }, "The right order: earliest first"),
        h(
          "ol",
          { class: "sc-order numbered" },
          ...truth.map((t, i) =>
            h(
              "li",
              { class: arr[i] === t ? "good" : "bad" },
              h("span", { class: "sc-num" }, String(i + 1)),
              h("span", { class: "sc-o-name" }, t.name),
              h("span", { class: "sc-o-val" }, periodYears(periodOf(t))),
            ),
          ),
        ),
      );
      reveal.hidden = false;
      nextBtn.hidden = false;
      nextBtn.focus();
      score.replaceChildren(`Score: ${total}`);
    }

    const score = h("span", { class: "tl-score" }, `Score: ${total}`);
    const nextBtn = h(
      "button",
      { type: "button", class: "btn primary", onclick: () => advance() },
      index + 1 < PUZZLES ? "Next puzzle ▸" : "See results ▸",
    );
    nextBtn.hidden = true;
    game.replaceChildren(
      h(
        "div",
        { class: "tl-card" },
        h(
          "span",
          { class: "tl-count" },
          `Put in order · puzzle ${index + 1} of ${PUZZLES}`,
        ),
        h(
          "p",
          { class: "tl-event" },
          "Which started first? Earliest on the left.",
        ),
        h("span", { class: "muted" }, "Order by the year each one started."),
      ),
      row,
      live,
      how,
      h(
        "div",
        { class: "tl-actions" },
        leftBtn,
        rightBtn,
        score,
        checkBtn,
        nextBtn,
      ),
      feedback,
      reveal,
    );
    draw(0);
  }

  // ---------- Place the era ----------
  function showPlace() {
    const item = queue[index];
    const p = periodOf(item);
    const axis = AXES[roundId];
    const sc = scale(axis);
    const lo = axis.breaks[0];
    const hi = axis.breaks[axis.breaks.length - 1];
    // The two handles start in the middle, apart, so both are easy to find and grab.
    let a = sc.toYear(38);
    let b = sc.toYear(62);
    let touched = false;
    let locked = false;

    const track = h("div", { class: "er-track" });
    const bar = h("div", { class: "er-bar" });
    track.append(bar);
    for (const t of axis.ticks)
      track.append(
        h(
          "span",
          { class: "er-tick", style: `left:${sc.toPct(t)}%` },
          h("span", {}, yr(t)),
        ),
      );
    const mine = h("span", { class: "er-mine" });
    const truthSpan = h("span", { class: "er-true" });
    truthSpan.hidden = true;
    const ha = h("span", {
      class: "er-handle",
      tabindex: "0",
      role: "slider",
      "aria-label": "Start year",
      "aria-valuemin": String(lo),
      "aria-valuemax": String(hi),
    });
    const hb = h("span", {
      class: "er-handle",
      tabindex: "0",
      role: "slider",
      "aria-label": "End year",
      "aria-valuemin": String(lo),
      "aria-valuemax": String(hi),
    });
    track.append(mine, truthSpan, ha, hb);

    const readout = h("p", { class: "tl-readout" });
    const lockBtn = h(
      "button",
      { type: "button", class: "btn primary", disabled: true },
      "Lock in",
    );
    const feedback = h("p", { class: "tl-feedback", "aria-live": "polite" });

    const fix = (y: number) => {
      const r = Math.min(hi, Math.max(lo, Math.round(y)));
      return r === 0 ? 1 : r; // there is no year 0
    };
    function paint() {
      ha.style.left = `${sc.toPct(a)}%`;
      hb.style.left = `${sc.toPct(b)}%`;
      ha.setAttribute("aria-valuenow", String(a));
      hb.setAttribute("aria-valuenow", String(b));
      ha.setAttribute("aria-valuetext", yr(a));
      hb.setAttribute("aria-valuetext", yr(b));
      mine.style.left = `${sc.toPct(a)}%`;
      mine.style.width = `${sc.toPct(b) - sc.toPct(a)}%`;
      readout.textContent = touched
        ? `Your span: ${yr(a)} to ${yr(b)}`
        : "Drag the two handles to where it started and ended.";
      lockBtn.disabled = !touched || locked;
    }
    /** Move one end, never past the other. */
    function setEnd(which: "a" | "b", year: number) {
      if (locked) return;
      touched = true;
      if (which === "a") a = Math.min(fix(year), b - 1);
      else b = Math.max(fix(year), a + 1);
      paint();
    }
    const fromPointer = (e: PointerEvent) =>
      sc.toYear(
        ((e.clientX - bar.getBoundingClientRect().left) /
          bar.getBoundingClientRect().width) *
          100,
      );
    let dragging: "a" | "b" | null = null;
    track.addEventListener("pointerdown", (e) => {
      if (locked) return;
      const onHandle = (e.target as HTMLElement).closest(".er-handle");
      const y = fromPointer(e);
      // Touching a handle grabs it; touching the line elsewhere grabs whichever end is nearer.
      dragging =
        onHandle === ha
          ? "a"
          : onHandle === hb
            ? "b"
            : Math.abs(sc.toPct(y) - sc.toPct(a)) <=
                Math.abs(sc.toPct(y) - sc.toPct(b))
              ? "a"
              : "b";
      track.setPointerCapture(e.pointerId);
      setEnd(dragging, y);
      (dragging === "a" ? ha : hb).focus({ preventScroll: true });
      e.preventDefault();
    });
    track.addEventListener(
      "pointermove",
      (e) => dragging && setEnd(dragging, fromPointer(e)),
    );
    const drop = () => (dragging = null);
    track.addEventListener("pointerup", drop);
    track.addEventListener("pointercancel", drop);
    // Keyboard: arrows move an end by 1 year, Shift by 10, Page Up/Down by 100.
    for (const [el, which] of [
      [ha, "a"],
      [hb, "b"],
    ] as const) {
      el.addEventListener("keydown", (e) => {
        const big =
          e.key === "PageUp" || e.key === "PageDown"
            ? 100
            : e.shiftKey
              ? 10
              : 1;
        const dir =
          e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "PageUp"
            ? 1
            : e.key === "ArrowLeft" ||
                e.key === "ArrowDown" ||
                e.key === "PageDown"
              ? -1
              : 0;
        if (dir) {
          const cur = which === "a" ? a : b;
          // step over the missing year 0
          let to = cur + dir * big;
          if (cur < 0 && to >= 0) to = to === 0 && big === 1 ? 1 : to + 1;
          else if (cur > 0 && to <= 0) to = to === 0 && big === 1 ? -1 : to - 1;
          setEnd(which, to);
        } else if (e.key === "Enter") locked ? advance() : lock();
        else return;
        e.preventDefault();
      });
    }

    function lock() {
      if (!touched || locked) return;
      locked = true;
      const points = spanScore(a, b, p.start, p.end);
      total += points;
      log.push({
        item,
        said: `${yr(a)} to ${yr(b)}`,
        frac: points / 100,
        points,
      });
      truthSpan.hidden = false;
      truthSpan.style.left = `${sc.toPct(p.start)}%`;
      truthSpan.style.width = `${sc.toPct(p.end) - sc.toPct(p.start)}%`;
      truthSpan.dataset.label = `${yr(p.start)} to ${p.ongoing ? "today" : yr(p.end)}`;
      feedback.className = `tl-feedback ${cls(points / 100)}`;
      feedback.textContent = `${p.name}: ${periodYears(p)}. You said ${yr(a)} to ${yr(b)}. +${points}`;
      lockBtn.textContent =
        index + 1 < queue.length ? "Next ▸" : "See results ▸";
      lockBtn.disabled = false;
      lockBtn.onclick = () => advance();
      score.textContent = `Score: ${total}`;
      lockBtn.focus();
    }
    lockBtn.onclick = lock;

    const score = h("span", { class: "tl-score" }, `Score: ${total}`);
    game.replaceChildren(
      h(
        "div",
        { class: "tl-card" },
        h(
          "span",
          { class: "tl-count" },
          `When did it start and end? · ${index + 1} of ${queue.length}`,
        ),
        h("p", { class: "tl-event" }, p.name),
        p.approx
          ? h(
              "span",
              { class: "muted tl-approx" },
              "The exact dates are debated, so close counts.",
            )
          : null,
      ),
      h("div", { class: "tl-wrap er-wrap" }, track),
      h("div", { class: "tl-actions" }, readout, score, lockBtn),
      feedback,
    );
    paint();
    ha.focus({ preventScroll: true });
  }

  // ---------- Which era? ----------
  /** Moments that belong to a period, one per period where possible so the round has variety. */
  function pickWhich(): Item[] {
    const picked: Item[] = [];
    const seen = new Set<string>();
    for (const e of shuffle(whichPool)) {
      if (seen.has(periodOf(e).id)) continue;
      seen.add(periodOf(e).id);
      picked.push(e);
    }
    for (const e of shuffle(whichPool))
      if (picked.length < QUESTIONS && !picked.includes(e)) picked.push(e);
    return picked.slice(0, QUESTIONS);
  }

  /**
   * Three wrong answers that make you think: eras near in time. Any era that also contains the
   * moment's year is left out, because it could be a fair answer too.
   */
  function optionsFor(event: Item): Period[] {
    const right = periodOf(event);
    const year = event.data!.year as number;
    const gap = (p: Period) =>
      year < p.start ? p.start - year : year > p.end ? year - p.end : 0;
    const overlapsRight = (p: Period) =>
      p.start <= right.end && p.end >= right.start;
    const near = periods
      .filter((p) => p.id !== right.id && gap(p) > 0)
      .sort(
        (x, y) =>
          gap(x) -
          (overlapsRight(x) ? 150 : 0) -
          (gap(y) - (overlapsRight(y) ? 150 : 0)),
      )
      .slice(0, 7);
    return shuffle([right, ...shuffle(near).slice(0, 3)]);
  }

  function showWhich() {
    const event = queue[index];
    const right = periodOf(event);
    const opts = optionsFor(event);
    let answered = false;
    const feedback = h("p", { class: "mc-feedback", "aria-live": "polite" });
    const next = h(
      "button",
      { type: "button", class: "btn primary", onclick: () => advance() },
      index + 1 < queue.length ? "Next ▸" : "See results ▸",
    );
    next.hidden = true;
    const buttons = opts.map((o, n) =>
      h(
        "button",
        { type: "button", class: "mc-option", "data-id": o.id },
        h("span", { class: "mc-key" }, String(n + 1)),
        o.name,
      ),
    );
    const pick = (btn: HTMLButtonElement) => {
      if (answered) return;
      answered = true;
      const ok = btn.dataset.id === right.id;
      if (ok) total++;
      log.push({
        item: event,
        said: opts.find((o) => o.id === btn.dataset.id)!.name,
        frac: ok ? 1 : 0,
        points: ok ? 1 : 0,
      });
      for (const x of buttons) {
        x.disabled = true;
        if (x.dataset.id === right.id) x.classList.add("right");
      }
      if (!ok) btn.classList.add("wrong");
      feedback.className = `mc-feedback ${ok ? "good" : "bad"}`;
      feedback.textContent = `${ok ? "Correct." : `Not quite: it's ${right.name}.`} ${right.name}: ${periodYears(right)}.`;
      score.textContent = `${total}/${log.length}`;
      next.hidden = false;
      next.focus();
    };
    for (const btn of buttons) btn.addEventListener("click", () => pick(btn));
    keyHandler = (e) => {
      const n = Number(e.key);
      if (!answered && n >= 1 && n <= buttons.length) pick(buttons[n - 1]);
    };
    const score = h("span", { class: "tl-score" }, `${total}/${log.length}`);
    game.replaceChildren(
      h(
        "div",
        { class: "tl-card" },
        h(
          "span",
          { class: "tl-count" },
          `Which era? · ${index + 1} of ${queue.length}`,
        ),
        h("p", { class: "tl-event" }, event.name),
        h(
          "span",
          { class: "muted" },
          `${yr(event.data!.year as number)}. Which era, war or movement was this part of?`,
        ),
      ),
      h("div", { class: "mc-options" }, ...buttons),
      h("div", { class: "tl-actions" }, feedback, score, next),
    );
  }

  let keyHandler: ((e: KeyboardEvent) => void) | null = null;
  const onKey = (e: KeyboardEvent) => keyHandler?.(e);
  document.addEventListener("keydown", onKey);

  function advance() {
    index++;
    if (index < queue.length) {
      if (roundId === "order") showOrder();
      else if (roundId === "which") showWhich();
      else showPlace();
    } else finish();
  }

  // ---------- results ----------
  function finish() {
    keyHandler = null;
    game.hidden = true;
    const prev = bestFor(deck.id, roundId);
    const good = log
      .filter((l) => l.frac >= 0.6)
      .map((l) => (roundId === "which" ? periodOf(l.item).id : l.item.id));
    const bad = log
      .filter((l) => l.frac < 0.6)
      .map((l) => (roundId === "which" ? periodOf(l.item).id : l.item.id));
    recordGame(
      {
        deck: deck.id,
        variant: roundId,
        score: total,
        total: max,
        seconds: 0,
        date: Date.now(),
      },
      good,
      bad,
    );
    const beaten = !prev || total / max > prev.score / prev.total;
    results.replaceChildren(
      h(
        "div",
        { class: "results-head" },
        h("div", { class: "big" }, `${total}`, h("small", {}, `/${max}`)),
        h(
          "div",
          {},
          h(
            "p",
            { class: "verdict" },
            total >= max * 0.8
              ? "You know your eras."
              : total >= max * 0.5
                ? "Not bad at all."
                : "Eras take time. Go again.",
          ),
          h(
            "p",
            { class: "muted" },
            beaten
              ? "That's your best for this round."
              : `Your best is ${prev.score}/${prev.total}.`,
          ),
        ),
        h(
          "div",
          { class: "results-actions" },
          h(
            "button",
            { type: "button", class: "btn primary", onclick: start },
            "Play again",
          ),
          h(
            "button",
            {
              type: "button",
              class: "btn ghost",
              onclick: () => {
                results.hidden = true;
                setup.hidden = false;
                renderSetup();
              },
            },
            "Change round",
          ),
        ),
      ),
      h(
        "h3",
        { class: "tl-order-title" },
        roundId === "order"
          ? "Every era in this round, with its dates"
          : "The true dates",
      ),
      h(
        "ol",
        { class: "er-results" },
        ...(roundId === "order"
          ? [...log].sort(
              (x, y) => periodOf(x.item).start - periodOf(y.item).start,
            )
          : log
        ).map((l) => {
          const p = periodOf(l.item);
          const detail =
            roundId === "which"
              ? `${l.item.name} (${yr(l.item.data!.year as number)}) · you said ${l.said}`
              : roundId === "order"
                ? `you put it ${l.said}`
                : `you said ${l.said} · +${l.points}`;
          return h(
            "li",
            { class: cls(l.frac) },
            h("span", { class: "tl-y" }, p.name),
            h("span", { class: "tl-e" }, periodYears(p)),
            h("span", { class: "tl-g" }, detail),
          );
        }),
      ),
    );
    results.hidden = false;
  }

  renderSetup();
  return () => document.removeEventListener("keydown", onKey);
}
