import type { Deck, Item } from "../engine/types";
import { bestFor, recordGame } from "../engine/storage";
import { h } from "./dom";

export interface ChoiceRound {
  id: string;
  label: string;
  starter?: boolean;
  filter: (item: Item) => boolean;
  /** How many questions per round; defaults to all of them. */
  count?: number;
}

export interface ChoiceSpec {
  rounds: ChoiceRound[];
  /** The question for an item. */
  question: (item: Item) => string;
  /** The answer buttons for an item (the right answer is item.name). */
  options: (item: Item) => string[];
  /** A short line shown after answering, e.g. a fun fact. */
  explain?: (item: Item) => string | undefined;
  /** Shuffle the answer buttons (off for fixed lists like Triassic/Jurassic/Cretaceous). */
  shuffleOptions?: boolean;
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A multiple-choice game: one question at a time, click (or press 1–9) to answer. */
export function renderChoice(root: HTMLElement, deck: Deck, spec: ChoiceSpec) {
  let round = spec.rounds[0];
  let questions: Item[] = [];
  let index = 0;
  let right = 0;
  let answered = false;
  const log: { item: Item; picked: string; ok: boolean }[] = [];

  const setup = h("div", { class: "setup" });
  const game = h("div", { class: "mc-game" });
  game.hidden = true;
  const results = h("div", { class: "results" });
  results.hidden = true;
  root.replaceChildren(
    h(
      "main",
      { class: "play" },
      h("div", { class: "play-top" }, h("a", { class: "back", href: "#" }, "◂ Arcade"), h("h1", { class: "play-title" }, deck.title)),
      setup,
      game,
      results,
    ),
  );

  function renderSetup() {
    const pool = deck.items.filter(round.filter);
    const best = bestFor(deck.id, round.id);
    setup.replaceChildren(
      h(
        "div",
        { class: "chips", role: "group", "aria-label": "Choose a round" },
        ...spec.rounds.map((r) =>
          h(
            "button",
            {
              type: "button",
              class: r.id === round.id ? "chip on" : "chip",
              "aria-pressed": String(r.id === round.id),
              onclick: () => {
                round = r;
                renderSetup();
              },
            },
            r.starter ? `★ ${r.label}` : r.label,
          ),
        ),
      ),
      h(
        "div",
        { class: "setup-row" },
        h("p", { class: "muted tl-how" }, `${Math.min(round.count ?? pool.length, pool.length)} questions from ${pool.length}. Click an answer, or press its number key.`),
        h("span", { class: "best" }, best ? `Best: ${best.score}/${best.total}` : ""),
        h("button", { type: "button", class: "btn primary", onclick: start }, "Start ▸"),
      ),
    );
  }

  function start() {
    const pool = deck.items.filter(round.filter);
    questions = shuffle(pool).slice(0, round.count ?? pool.length);
    index = 0;
    right = 0;
    log.length = 0;
    setup.hidden = true;
    results.hidden = true;
    game.hidden = false;
    show();
  }

  function show() {
    const item = questions[index];
    answered = false;
    const opts = spec.shuffleOptions === false ? spec.options(item) : shuffle(spec.options(item));
    const feedback = h("p", { class: "mc-feedback", "aria-live": "polite" });
    const next = h("button", { type: "button", class: "btn primary" }, index + 1 < questions.length ? "Next ▸" : "See results ▸");
    next.hidden = true;
    next.addEventListener("click", advance);
    const buttons = opts.map((o, n) =>
      h("button", { type: "button", class: "mc-option", "data-answer": o }, h("span", { class: "mc-key" }, String(n + 1)), o),
    );
    const pick = (b: HTMLButtonElement) => {
      if (answered) return;
      answered = true;
      const picked = b.dataset.answer!;
      const ok = picked === item.name;
      if (ok) right++;
      log.push({ item, picked, ok });
      for (const btn of buttons) {
        btn.disabled = true;
        if (btn.dataset.answer === item.name) btn.classList.add("right");
      }
      if (!ok) b.classList.add("wrong");
      const extra = spec.explain?.(item);
      feedback.className = `mc-feedback ${ok ? "good" : "bad"}`;
      feedback.textContent = `${ok ? "Correct." : `Not quite: it's ${item.name}.`}${extra ? ` ${extra}` : ""}`;
      score.textContent = `${right}/${index + 1}`;
      next.hidden = false;
      next.focus();
    };
    for (const b of buttons) b.addEventListener("click", () => pick(b));
    keyHandler = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!answered && n >= 1 && n <= buttons.length) pick(buttons[n - 1]);
    };
    const score = h("span", { class: "tl-score" }, `${right}/${index}`);
    game.replaceChildren(
      h(
        "div",
        { class: "tl-card" },
        h("span", { class: "tl-count" }, `Question ${index + 1} of ${questions.length}`),
        h("p", { class: "tl-event" }, spec.question(item)),
      ),
      h("div", { class: buttons.length > 4 ? "mc-options many" : "mc-options" }, ...buttons),
      h("div", { class: "tl-actions" }, feedback, score, next),
    );
  }

  let keyHandler: ((e: KeyboardEvent) => void) | null = null;
  const onKey = (e: KeyboardEvent) => keyHandler?.(e);
  document.addEventListener("keydown", onKey);

  function advance() {
    index++;
    if (index < questions.length) show();
    else finish();
  }

  function finish() {
    keyHandler = null;
    game.hidden = true;
    const prev = bestFor(deck.id, round.id);
    recordGame(
      { deck: deck.id, variant: round.id, score: right, total: questions.length, seconds: 0, date: Date.now() },
      log.filter((l) => l.ok).map((l) => l.item.id),
      log.filter((l) => !l.ok).map((l) => l.item.id),
    );
    const wrong = log.filter((l) => !l.ok);
    results.replaceChildren(
      h(
        "div",
        { class: "results-head" },
        h("div", { class: "big" }, `${right}`, h("small", {}, `/${questions.length}`)),
        h(
          "div",
          {},
          h("p", { class: "verdict" }, right === questions.length ? "Perfect round." : `${right} right out of ${questions.length}.`),
          h("p", { class: "muted" }, !prev || right / questions.length > prev.score / prev.total ? "That's your best for this round." : `Your best is ${prev.score}/${prev.total}.`),
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
              },
            },
            "Change round",
          ),
        ),
      ),
      wrong.length
        ? h(
            "div",
            { class: "weak" },
            h("h3", {}, "To remember"),
            h(
              "ul",
              { class: "mc-review" },
              ...wrong.map((l) => h("li", {}, h("span", {}, spec.question(l.item)), h("strong", {}, ` ${l.item.name}`), h("span", { class: "muted" }, ` (you said ${l.picked})`))),
            ),
          )
        : h("span", {}),
    );
    results.hidden = false;
  }

  renderSetup();
  return () => document.removeEventListener("keydown", onKey);
}
