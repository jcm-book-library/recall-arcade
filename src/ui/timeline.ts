import type { Deck, Item } from "../engine/types";
import { bestFor, recordGame } from "../engine/storage";
import { h } from "./dom";
import { quizHeader, quizRow, quizRows, sectionLabel, chips, levelStatesFor, subjectClass } from "./quiz-shell";
import { levelNotesFor } from "../engine/levels";
import { createFillSection, fillRules, type FillSource } from "./fill-quiz";
import type { Period } from "../decks/periods";
import { periodYears } from "../decks/periods";
import "./eras.css";

const ROUND = 10;

export interface Era {
  id: string;
  label: string;
  starter?: boolean;
  /** Years where the axis bends. Each gap gets an equal share of the width. */
  breaks: number[];
  ticks: number[];
  /** A small heading shown above this chip (and the ones after it) on the setup screen. */
  heading?: string;
  /** Picks the items for this round, when "has the era tag" isn't the rule ("Inside World War II"). */
  filter?: (item: Item) => boolean;
  /** A round that zooms in on one period: the same period never repeats, so allow it here. */
  inside?: Period;
}

export const yearText = (y: number) => (y < 0 ? `${-y} BC` : y < 1000 ? `AD ${y}` : `${y}`);

/** How far off you can be before scoring nothing. Recent history is judged more tightly. */
const tolerance = (year: number) => (year >= 1900 ? 30 : year >= 1500 ? 60 : year >= 500 ? 200 : 500);

/** Distance from a guess to a year, or to a span of years (a lifetime). */
const distance = (guess: number, from: number, to: number) => (guess < from ? from - guess : guess > to ? guess - to : 0);

export function score(guess: number, from: number, to = from, tolOverride?: number) {
  const tol = tolOverride ?? tolerance((from + to) / 2);
  const off = distance(guess, from, to);
  if (off <= Math.max(1, tol / 30)) return 100;
  return Math.round(100 * Math.max(0, 1 - off / tol));
}

/**
 * The score for one guess. Closeness first (see score above). Then, if the event belongs to a
 * period and the guess lands anywhere inside that period, it is worth at least 70: you knew
 * the right part of history even if the year is off. The higher of the two counts.
 */
export function scoreFor(guess: number, item: Item): number {
  const from = (item.data!.from ?? item.data!.year) as number;
  const to = (item.data!.to ?? item.data!.year) as number;
  const base = score(guess, from, to, item.data!.tol as number | undefined);
  const period = item.data!.period as Period | undefined;
  if (period && guess >= period.start && guess <= period.end) return Math.max(base, 70);
  return base;
}

export function scale(era: Pick<Era, "breaks">) {
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
  /** Optional: the top verdict on the results screen (default "A proper historian."). */
  top?: string;
  /** Optional: the label of the "Change era" button on the results screen. */
  again?: string;
  /** Optional: adds the two Fill the List rows to the setup screen (ui/fill-quiz.ts). */
  fill?: FillSource;
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

  const setup = h("div", { class: "setup" });
  const game = h("div", { class: "tl-game" });
  game.hidden = true;
  const results$ = h("div", { class: "results" });
  results$.hidden = true;

  const header = quizHeader({
    deck,
    howItWorks: text.how,
    rules: [
      "Up to 100 points each for being close. Where an event belongs to a period, landing anywhere inside that period always earns at least 70.",
      h("div", { class: "qpop-levels" }, ...levelNotesFor(["medium"]).map((t) => h("p", {}, t))),
      ...(text.fill ? [fillRules()] : []),
    ],
    back: deck.back,
  });
  root.replaceChildren(h("main", { class: `play quiz ${subjectClass(deck.subject)}` }, header, setup, game, results$));
  const fillGame = h("div", { class: "fl-host" });
  fillGame.hidden = true;
  game.after(fillGame);
  const fill = text.fill ? createFillSection({ deck, source: text.fill, setup, game: fillGame, hide: [results$], redraw: () => renderSetup(), header }) : null;

  const poolOf = (e: Era) => deck.items.filter((i) => (e.filter ? e.filter(i) : e.id === "all" || i.tags.includes(e.id)));

  /** Picks a round's items. No two come from the same period, so one war can't fill the round. */
  function draw(e: Era): Item[] {
    const picked: Item[] = [];
    const usedPeriods = new Set<string>();
    for (const item of shuffle(poolOf(e))) {
      const p = item.data!.period as Period | undefined;
      if (p && !e.inside && usedPeriods.has(p.id)) continue;
      if (p) usedPeriods.add(p.id);
      picked.push(item);
      if (picked.length === ROUND) break;
    }
    return picked;
  }

  function renderSetup() {
    // Each era is a row (★ on the starter), with the deck's headings between groups. Medium only: there are no hints to take away.
    setup.replaceChildren(
      quizRows(
        ...eras.flatMap((e, n) => {
          const pool = poolOf(e);
          const best = bestFor(deck.id, e.id);
          const states = levelStatesFor(deck.id, e.id);
          const desc = `${Math.min(ROUND, pool.length)} at a time from ${pool.length}.`;
          return [
            ...(e.heading && e.heading !== eras[n - 1]?.heading ? [sectionLabel(e.heading)] : []),
            quizRow({
              badge: states.medium === "done" ? "done" : e.starter ? "star" : n + 1,
              name: e.label,
              desc: best ? `${desc} Best: ${best.score}/${best.total}.` : desc,
              levels: states,
              selected: "medium",
              current: e.id === era.id && !fill?.picked(),
              onPick: () => {
                fill?.unpick();
                era = e;
                renderSetup();
              },
              onLevel: () => {
                fill?.unpick();
                era = e;
                renderSetup();
              },
              onStart: () => {
                fill?.unpick();
                era = e;
                start();
              },
            }),
          ];
        }),
      ),
      ...(fill ? fill.nodes(eras.length + 1) : []),
      ...(deck.related ? [chips([{ label: deck.related.label, href: deck.related.href }])!] : []),
    );
  }

  function start() {
    round = draw(era);
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
    // On the reveal, a shaded band shows the period the event belongs to.
    const band = h("span", { class: "tl-period" });
    band.hidden = true;
    track.append(band);
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
    // An item can carry one more line to show once it is locked in (the easy clue, for films).
    const revealLine = h("p", { class: "muted tl-reveal" });
    revealLine.hidden = true;
    const bandLabel = h("p", { class: "tl-period-label" });
    bandLabel.hidden = true;

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
      const points = scoreFor(guess, item);
      const period = item.data!.period as Period | undefined;
      if (period) {
        const a = sc.toPct(period.start);
        band.hidden = false;
        band.style.left = `${a}%`;
        band.style.width = `${sc.toPct(period.end) - a}%`;
        bandLabel.hidden = false;
        bandLabel.replaceChildren(h("span", { class: "tl-swatch", "aria-hidden": "true" }), `${period.name}, ${periodYears(period)}`);
      }
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
          : `It was ${about}${yearText(from)}. You were ${off} ${off === 1 ? "year" : "years"} off${period && score(guess, from, to) < 70 && points >= 70 ? `, but inside ${period.name}` : ""}. +${points}`;
      if (item.data!.reveal) {
        revealLine.textContent = item.data!.reveal as string;
        revealLine.hidden = false;
      }
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
      h("div", { class: "tl-wrap" }, track, bandLabel),
      h("div", { class: "tl-actions" }, readout, scoreLine, lockBtn),
      feedback,
      revealLine,
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
          h("p", { class: "verdict" }, total >= max * 0.8 ? (text.top ?? "A proper historian.") : total >= max * 0.5 ? "Not bad at all." : "History is long. Go again."),
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
            text.again ?? "Change era",
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
  return () => fill?.stop();
}
