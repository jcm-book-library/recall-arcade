import type { Deck, Item } from "../engine/types";
import { bestFor, recordGame } from "../engine/storage";
import { h } from "./dom";

const ROUND = 10;

export interface Era {
  id: string;
  label: string;
  starter?: boolean;
  /** Years where the axis bends. Each gap gets an equal share of the width. */
  breaks: number[];
  ticks: number[];
}

export const yearText = (y: number) => (y < 0 ? `${-y} BC` : y < 1000 ? `AD ${y}` : `${y}`);

/** How far off you can be before scoring nothing. Recent history is judged more tightly. */
const tolerance = (year: number) => (year >= 1900 ? 30 : year >= 1500 ? 60 : year >= 500 ? 200 : 500);

/** Distance from a guess to a year, or to a span of years (a lifetime). */
const distance = (guess: number, from: number, to: number) => (guess < from ? from - guess : guess > to ? guess - to : 0);

export function score(guess: number, from: number, to = from) {
  const tol = tolerance((from + to) / 2);
  const off = distance(guess, from, to);
  if (off <= Math.max(1, tol / 30)) return 100;
  return Math.round(100 * Math.max(0, 1 - off / tol));
}

function scale(era: Era) {
  const b = era.breaks;
  const seg = 1 / (b.length - 1);
  return {
    toPct(year: number) {
      const y = Math.min(b[b.length - 1], Math.max(b[0], year));
      for (let i = 0; i < b.length - 1; i++) {
        if (y <= b[i + 1]) return (i + (y - b[i]) / (b[i + 1] - b[i])) * seg * 100;
      }
      return 100;
    },
    toYear(pct: number) {
      const p = Math.min(1, Math.max(0, pct / 100));
      const i = Math.min(b.length - 2, Math.floor(p / seg));
      const y = b[i] + ((p - i * seg) / seg) * (b[i + 1] - b[i]);
      const r = Math.round(y);
      return r === 0 ? 1 : r; // there is no year 0
    },
  };
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface TimelineText {
  /** Small heading above each card, e.g. "When did this happen?" */
  ask: string;
  how: string;
}

export function renderTimeline(root: HTMLElement, deck: Deck, eras: Era[], text: TimelineText) {
  let era = eras[0];
  let round: Item[] = [];
  let index = 0;
  let guess: number | null = null;
  let locked = false;
  let total = 0;
  const results: { item: Item; guess: number; points: number }[] = [];
  // Events have one year; people have a lifetime (from, to).
  const fromOf = (i: Item) => (i.data!.from ?? i.data!.year) as number;
  const toOf = (i: Item) => (i.data!.to ?? i.data!.year) as number;
  const yearOf = (i: Item) => Math.round((fromOf(i) + toOf(i)) / 2);
  const span = (i: Item) => (fromOf(i) === toOf(i) ? yearText(fromOf(i)) : `${yearText(fromOf(i))} – ${yearText(toOf(i))}`);

  const title = h("h1", { class: "play-title" }, deck.title);
  const setup = h("div", { class: "setup" });
  const game = h("div", { class: "tl-game" });
  game.hidden = true;
  const results$ = h("div", { class: "results" });
  results$.hidden = true;

  root.replaceChildren(
    h(
      "main",
      { class: "play" },
      h("div", { class: "play-top" }, h("a", { class: "back", href: "#" }, "◂ Arcade"), title),
      setup,
      game,
      results$,
    ),
  );

  function renderSetup() {
    const pool = deck.items.filter((i) => i.tags.includes(era.id) || era.id === "all");
    const best = bestFor(deck.id, era.id);
    setup.replaceChildren(
      h(
        "div",
        { class: "chips", role: "group", "aria-label": "Choose an era" },
        ...eras.map((e) =>
          h(
            "button",
            {
              type: "button",
              class: e.id === era.id ? "chip on" : "chip",
              "aria-pressed": String(e.id === era.id),
              onclick: () => {
                era = e;
                renderSetup();
              },
            },
            e.starter ? `★ ${e.label}` : e.label,
          ),
        ),
      ),
      h(
        "div",
        { class: "setup-row" },
        h("p", { class: "muted tl-how" }, `${text.how} ${ROUND} at a time from ${pool.length}, up to 100 points each for being close.`),
        h("span", { class: "best" }, best ? `Best: ${best.score}/${best.total}` : ""),
        h("button", { type: "button", class: "btn primary", onclick: start }, "Start ▸"),
      ),
    );
  }

  function start() {
    const pool = deck.items.filter((i) => era.id === "all" || i.tags.includes(era.id));
    round = shuffle(pool).slice(0, ROUND);
    index = 0;
    total = 0;
    results.length = 0;
    setup.hidden = true;
    results$.hidden = true;
    game.hidden = false;
    renderGame();
  }

  // ---------- the timeline ----------
  const s = () => scale(era);

  function renderGame() {
    const item = round[index];
    guess = null;
    locked = false;
    const sc = s();

    const track = h("div", {
      class: "tl-track",
      tabindex: "0",
      role: "slider",
      "aria-label": "Year",
      "aria-valuemin": String(era.breaks[0]),
      "aria-valuemax": String(era.breaks[era.breaks.length - 1]),
    });
    const bar = h("div", { class: "tl-bar" });
    track.append(bar);
    for (const t of era.ticks) {
      track.append(h("span", { class: "tl-tick", style: `left:${sc.toPct(t)}%` }, h("span", {}, yearText(t))));
    }
    // Earlier events this round stay on the line, so the order builds up as you play.
    for (const r of results) {
      track.append(h("span", { class: "tl-pin", style: `left:${sc.toPct(yearOf(r.item))}%`, title: `${span(r.item)}: ${r.item.name}` }));
    }
    const marker = h("span", { class: "tl-guess" });
    marker.hidden = true;
    const actual = h("span", { class: "tl-actual" });
    actual.hidden = true;
    const gap = h("span", { class: "tl-gap" });
    gap.hidden = true;
    track.append(gap, marker, actual);

    const readout = h("p", { class: "tl-readout" }, "Tap or drag on the line to place your guess.");
    const lockBtn = h("button", { type: "button", class: "btn primary", disabled: true }, "Lock in");
    const feedback = h("p", { class: "tl-feedback", "aria-live": "polite" });

    const place = (year: number) => {
      if (locked) return;
      const b = era.breaks;
      guess = Math.min(b[b.length - 1], Math.max(b[0], year));
      if (guess === 0) guess = 1;
      marker.hidden = false;
      marker.style.left = `${sc.toPct(guess)}%`;
      marker.dataset.year = yearText(guess);
      track.setAttribute("aria-valuenow", String(guess));
      readout.textContent = `Your guess: ${yearText(guess)}`;
      lockBtn.disabled = false;
    };
    const fromPointer = (e: PointerEvent) => {
      const r = bar.getBoundingClientRect();
      place(sc.toYear(((e.clientX - r.left) / r.width) * 100));
    };
    let dragging = false;
    track.addEventListener("pointerdown", (e) => {
      if (locked) return;
      dragging = true;
      track.setPointerCapture(e.pointerId);
      fromPointer(e);
    });
    track.addEventListener("pointermove", (e) => dragging && fromPointer(e));
    track.addEventListener("pointerup", () => (dragging = false));
    track.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 10 : 1;
      const start = guess ?? Math.round((era.breaks[0] + era.breaks[era.breaks.length - 1]) / 2);
      if (e.key === "ArrowRight" || e.key === "ArrowUp") place(start + step);
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") place(start - step);
      else if (e.key === "Enter") locked ? next() : lock();
      else return;
      e.preventDefault();
    });

    function lock() {
      if (guess === null || locked) return;
      locked = true;
      const from = fromOf(item);
      const to = toOf(item);
      const points = score(guess, from, to);
      total += points;
      results.push({ item, guess, points });
      const isSpan = from !== to;
      actual.hidden = false;
      actual.style.left = `${sc.toPct(isSpan ? from : from)}%`;
      if (isSpan) {
        actual.classList.add("span");
        actual.style.width = `${sc.toPct(to) - sc.toPct(from)}%`;
      }
      actual.dataset.year = span(item);
      const nearest = guess < from ? from : guess > to ? to : guess;
      const [a, b] = [sc.toPct(guess), sc.toPct(nearest)].sort((x, y) => x - y);
      gap.hidden = false;
      gap.style.left = `${a}%`;
      gap.style.width = `${b - a}%`;
      const off = Math.abs(guess - nearest);
      const about = item.data!.approx ? "about " : "";
      feedback.className = `tl-feedback ${points >= 80 ? "good" : points >= 40 ? "ok" : "bad"}`;
      feedback.textContent = isSpan
        ? off === 0
          ? `Yes: ${about}${span(item)}. +${points}`
          : `They lived ${about}${span(item)}. You were ${off} ${off === 1 ? "year" : "years"} ${guess < from ? "before they were born" : "after they died"}. +${points}`
        : off === 0
          ? `Spot on: ${yearText(from)}. +${points}`
          : `It was ${about}${yearText(from)}. You were ${off} ${off === 1 ? "year" : "years"} off. +${points}`;
      lockBtn.textContent = index + 1 < round.length ? "Next ▸" : "See results ▸";
      lockBtn.onclick = next;
      scoreLine.textContent = `Score: ${total}`;
      lockBtn.focus();
    }
    lockBtn.onclick = lock;

    const scoreLine = h("span", { class: "tl-score" }, `Score: ${total}`);
    game.replaceChildren(
      h(
        "div",
        { class: "tl-card" },
        h("span", { class: "tl-count" }, `${text.ask} · ${index + 1} of ${round.length}`),
        h("p", { class: "tl-event" }, item.name),
        item.data!.note ? h("span", { class: "muted" }, item.data!.note as string) : null,
        item.data!.approx ? h("span", { class: "muted tl-approx" }, "The exact year is debated, so close counts.") : null,
      ),
      h("div", { class: "tl-wrap" }, track),
      h("div", { class: "tl-actions" }, readout, scoreLine, lockBtn),
      feedback,
    );
    track.focus();
  }

  function next() {
    index++;
    if (index < round.length) renderGame();
    else finish();
  }

  function finish() {
    game.hidden = true;
    const max = round.length * 100;
    const prev = bestFor(deck.id, era.id);
    recordGame(
      { deck: deck.id, variant: era.id, score: total, total: max, seconds: 0, date: Date.now() },
      results.filter((r) => r.points >= 60).map((r) => r.item.id),
      results.filter((r) => r.points < 60).map((r) => r.item.id),
    );
    const sorted = [...results].sort((a, b) => fromOf(a.item) - fromOf(b.item));
    results$.replaceChildren(
      h(
        "div",
        { class: "results-head" },
        h("div", { class: "big" }, `${total}`, h("small", {}, `/${max}`)),
        h(
          "div",
          {},
          h("p", { class: "verdict" }, total >= max * 0.8 ? "A proper historian." : total >= max * 0.5 ? "Not bad at all." : "History is long. Go again."),
          h("p", { class: "muted" }, !prev || total > prev.score ? "That's your best for this era." : `Your best is ${prev.score}/${prev.total}.`),
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
                results$.hidden = true;
                setup.hidden = false;
                renderSetup();
              },
            },
            "Change era",
          ),
        ),
      ),
      h("h3", { class: "tl-order-title" }, "In order"),
      h(
        "ol",
        { class: "tl-order" },
        ...sorted.map((r) =>
          h(
            "li",
            { class: r.points >= 80 ? "good" : r.points >= 40 ? "ok" : "bad" },
            h("span", { class: "tl-y" }, span(r.item)),
            h("span", { class: "tl-e" }, r.item.name),
            h("span", { class: "tl-g" }, `you said ${yearText(r.guess)} · +${r.points}`),
          ),
        ),
      ),
    );
    results$.hidden = false;
  }

  renderSetup();
  return () => {};
}
