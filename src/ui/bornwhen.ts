import type { Deck, Item } from "../engine/types";
import { bestFor, recordGame } from "../engine/storage";
import { loadPicturesFor } from "../data/pictures";
import { h } from "./dom";
import { quizHeader, quizRow, quizRows, levelStatesFor, subjectClass } from "./quiz-shell";
import { levelNotesFor } from "../engine/levels";
import { scale } from "./timeline";
import "./eras.css";
import "./bornwhen.css";

// "Born When?": a living person appears, and you drag the marker to the year they were born.
// It reuses the timeline's line, ticks and marker styles (tl-*), but has its own screen
// because the card has a portrait and the reveal shows a date of birth and an age.

const ROUND = 8;
const FIRST_YEAR = 1920;
/** Years off before a guess scores nothing. Within a year is full marks. */
const TOLERANCE = 25;

export interface BornRound {
  id: string;
  label: string;
  starter?: boolean;
  filter: (item: Item) => boolean;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
};
export const dateText = (iso: string) => {
  const { y, m, d } = parse(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
/** Age in whole years on `today`, worked out from the date so it stays right. */
export function ageOn(iso: string, today = new Date()) {
  const { y, m, d } = parse(iso);
  let age = today.getFullYear() - y;
  const month = today.getMonth() + 1;
  if (month < m || (month === m && today.getDate() < d)) age--;
  return age;
}

export const bornScore = (guess: number, year: number) => {
  const off = Math.abs(guess - year);
  return off <= 1 ? 100 : Math.round(100 * Math.max(0, 1 - off / TOLERANCE));
};

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function renderBornWhen(root: HTMLElement, deck: Deck, rounds: BornRound[]) {
  let current = rounds[0];
  let round: Item[] = [];
  let index = 0;
  let guess: number | null = null;
  let locked = false;
  let total = 0;
  let alive = true;
  let pics: ReturnType<typeof loadPicturesFor> = Promise.resolve(new Map());
  const results: { item: Item; guess: number; points: number }[] = [];
  const lastYear = new Date().getFullYear();
  const sc = scale({ breaks: [FIRST_YEAR, lastYear] });
  const ticks = [1920, 1940, 1960, 1980, 2000];
  const bornYear = (i: Item) => parse(i.data!.born as string).y;

  const setup = h("div", { class: "setup" });
  const game = h("div", { class: "tl-game" });
  game.hidden = true;
  const results$ = h("div", { class: "results" });
  results$.hidden = true;
  root.replaceChildren(
    h(
      "main",
      { class: `play quiz ${subjectClass(deck.subject)}` },
      quizHeader({
        deck,
        howItWorks: "You see a name and what they are known for. Drag the marker to the year they were born.",
        rules: [
          "Up to 100 points each. Within a year is full marks.",
          h("div", { class: "qpop-levels" }, ...levelNotesFor(["medium"]).map((t) => h("p", {}, t))),
        ],
      }),
      setup,
      game,
      results$,
    ),
  );

  const poolOf = (r: BornRound) => deck.items.filter(r.filter);

  function renderSetup() {
    setup.replaceChildren(
      quizRows(
        ...rounds.map((r, i) => {
          const pool = poolOf(r);
          const best = bestFor(deck.id, r.id);
          const states = levelStatesFor(deck.id, r.id);
          const desc = `${Math.min(ROUND, pool.length)} at a time from ${pool.length}.`;
          return quizRow({
            badge: states.medium === "done" ? "done" : r.starter ? "star" : i + 1,
            name: r.label,
            desc: best ? `${desc} Best: ${best.score}/${best.total}.` : desc,
            levels: states,
            selected: "medium",
            current: r.id === current.id,
            onPick: () => {
              current = r;
              renderSetup();
            },
            onLevel: () => {
              current = r;
              renderSetup();
            },
            onStart: () => {
              current = r;
              start();
            },
          });
        }),
      ),
    );
  }

  function start() {
    round = shuffle(poolOf(current)).slice(0, ROUND);
    index = 0;
    total = 0;
    results.length = 0;
    setup.hidden = true;
    results$.hidden = true;
    game.hidden = false;
    // Portraits arrive after the first card is drawn. No picture is fine.
    const titles: Record<string, string> = {};
    for (const it of round) titles[it.id] = it.data!.title as string;
    pics = loadPicturesFor(`bornwhen:${round.map((i) => i.id).join(",")}`, titles);
    pics.catch(() => {});
    renderGame();
  }

  function renderGame() {
    const item = round[index];
    guess = null;
    locked = false;

    const track = h("div", {
      class: "tl-track",
      tabindex: "0",
      role: "slider",
      "aria-label": "Year of birth",
      "aria-valuemin": String(FIRST_YEAR),
      "aria-valuemax": String(lastYear),
    });
    const bar = h("div", { class: "tl-bar" });
    track.append(bar);
    for (const t of [...ticks, lastYear]) {
      const tick = h("span", { class: "tl-tick", style: `left:${sc.toPct(t)}%` }, h("span", {}, String(t)));
      if (t === lastYear) tick.classList.add("tl-end");
      track.append(tick);
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
    const reveal = h("div", { class: "bw-reveal", "aria-live": "polite" });
    reveal.hidden = true;
    const scoreLine = h("span", { class: "tl-score" }, `Score: ${total}`);

    const place = (year: number) => {
      if (locked) return;
      guess = Math.min(lastYear, Math.max(FIRST_YEAR, Math.round(year)));
      marker.hidden = false;
      marker.style.left = `${sc.toPct(guess)}%`;
      marker.dataset.year = String(guess);
      track.setAttribute("aria-valuenow", String(guess));
      readout.textContent = `Your guess: ${guess}`;
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
      const from = guess ?? 1980;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") place(from + step);
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") place(from - step);
      else if (e.key === "Enter") locked ? next() : lock();
      else return;
      e.preventDefault();
    });

    function lock() {
      if (guess === null || locked) return;
      locked = true;
      const born = item.data!.born as string;
      const year = bornYear(item);
      const points = bornScore(guess, year);
      total += points;
      results.push({ item, guess, points });
      actual.hidden = false;
      actual.style.left = `${sc.toPct(year)}%`;
      actual.dataset.year = String(year);
      const [a, b] = [sc.toPct(guess), sc.toPct(year)].sort((x, y) => x - y);
      gap.hidden = false;
      gap.style.left = `${a}%`;
      gap.style.width = `${b - a}%`;
      const off = Math.abs(guess - year);
      feedback.className = `tl-feedback ${points >= 80 ? "good" : points >= 40 ? "ok" : "bad"}`;
      feedback.textContent = off === 0 ? `Spot on! +${points}` : `You were ${off} ${off === 1 ? "year" : "years"} ${guess < year ? "too early" : "too late"}. +${points}`;
      reveal.hidden = false;
      reveal.replaceChildren(
        h("p", { class: "muted" }, `${item.name} was born on ${dateText(born)}. They are ${ageOn(born)} today.`),
        ...(item.data!.note ? [h("p", { class: "bw-note" }, item.data!.note as string)] : []),
      );
      lockBtn.textContent = index + 1 < round.length ? "Next ▸" : "See results ▸";
      lockBtn.onclick = next;
      scoreLine.textContent = `Score: ${total}`;
      lockBtn.focus();
    }
    lockBtn.onclick = lock;

    const pic = h("span", { class: "bw-pic pending" });
    const credit = h("a", { class: "credit bw-credit", target: "_blank", rel: "noopener" });
    credit.hidden = true;
    const noPic = () => pic.remove();
    pics
      .then((map) => {
        if (!alive || round[index] !== item) return;
        const p = map.get(item.id);
        if (!p) return noPic();
        const img = document.createElement("img");
        img.alt = "";
        img.src = p.src;
        img.onerror = noPic;
        pic.classList.remove("pending");
        pic.append(img);
        credit.href = p.page;
        credit.textContent = `Photo: ${p.artist} · ${p.license}`;
        credit.hidden = false;
      })
      .catch(noPic);

    game.replaceChildren(
      h(
        "div",
        { class: "tl-card bw-card" },
        h("span", { class: "tl-count" }, `Born when? · ${index + 1} of ${round.length}`),
        h(
          "div",
          { class: "bw-person" },
          pic,
          h("div", { class: "bw-text" }, h("p", { class: "tl-event" }, item.name), h("p", { class: "bw-known" }, item.data!.known as string), credit),
        ),
      ),
      h("div", { class: "tl-wrap" }, track),
      h("div", { class: "tl-actions" }, readout, scoreLine, lockBtn),
      feedback,
      reveal,
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
    const prev = bestFor(deck.id, current.id);
    recordGame(
      { deck: deck.id, variant: current.id, score: total, total: max, seconds: 0, date: Date.now() },
      results.filter((r) => r.points >= 60).map((r) => r.item.id),
      results.filter((r) => r.points < 60).map((r) => r.item.id),
    );
    const sorted = [...results].sort((a, b) => bornYear(a.item) - bornYear(b.item));
    results$.replaceChildren(
      h(
        "div",
        { class: "results-head" },
        h("div", { class: "big" }, `${total}`, h("small", {}, `/${max}`)),
        h(
          "div",
          {},
          h("p", { class: "verdict" }, total >= max * 0.8 ? "You know your famous faces." : total >= max * 0.5 ? "Not bad at all." : "Ages are tricky. Go again."),
          h("p", { class: "muted" }, !prev || total > prev.score ? "That's your best for this round." : `Your best is ${prev.score}/${prev.total}.`),
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
            "Change round",
          ),
        ),
      ),
      h("h3", { class: "tl-order-title" }, "Oldest first"),
      h(
        "ol",
        { class: "tl-order" },
        ...sorted.map((r) =>
          h(
            "li",
            { class: r.points >= 80 ? "good" : r.points >= 40 ? "ok" : "bad" },
            h("span", { class: "tl-y" }, dateText(r.item.data!.born as string)),
            h("span", { class: "tl-e" }, r.item.name),
            h("span", { class: "tl-g" }, `you said ${r.guess} · +${r.points}`),
          ),
        ),
      ),
    );
    results$.hidden = false;
  }

  renderSetup();
  return () => {
    alive = false;
  };
}
