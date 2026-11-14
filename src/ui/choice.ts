import type { Deck, Item } from "../engine/types";
import { bestFor, recordGame } from "../engine/storage";
import { h } from "./dom";
import { quizHeader, chips, roundRows, subjectClass } from "./quiz-shell";
import { levelNotesFor } from "../engine/levels";

export interface ChoiceRound {
  id: string;
  label: string;
  starter?: boolean;
  filter: (item: Item) => boolean;
  /** How many questions per round; defaults to all of them. */
  count?: number;
  /** Rounds can ask their own kind of question with their own answers (Classifying Life). */
  question?: (item: Item) => string;
  options?: (item: Item) => string[];
  note?: string;
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
  /** Sound for the question (Ear Training). Plays when it appears, with a button to hear it again. */
  play?: (item: Item) => void;
  /** Where the back link goes (default: the arcade). */
  back?: { href: string; label: string };
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
  // A link like #mythwho/greek opens straight at that round.
  const wanted = location.hash.replace(/^#/, "").split("/")[1];
  let round = spec.rounds.find((r) => r.id === wanted) ?? spec.rounds[0];
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
      { class: `play quiz ${subjectClass(deck.subject)}` },
      quizHeader({
        deck,
        howItWorks: "Click an answer, or press its number key.",
        rules: [...(deck.tip ? [deck.tip] : []), h("div", { class: "qpop-levels" }, ...levelNotesFor(["medium"]).map((t) => h("p", {}, t)))],
        back: spec.back,
      }),
      setup,
      game,
      results,
    ),
  );

  function renderSetup() {
    setup.replaceChildren(
      roundRows({
        deckId: deck.id,
        rounds: spec.rounds.map((r) => {
          const pool = deck.items.filter(r.filter);
          const best = bestFor(deck.id, r.id);
          const text = `${r.note ? `${r.note} ` : ""}${Math.min(r.count ?? pool.length, pool.length)} questions from ${pool.length}.`;
          return { id: r.id, label: r.label, starter: r.starter, desc: best ? `${text} Best: ${best.score}/${best.total}.` : text };
        }),
        current: round.id,
        levelOf: () => "medium",
        onLevel: (id) => pick(id),
        onPick: (id) => pick(id),
        onStart: (id) => {
          pick(id, false);
          start();
        },
      }),
      ...(deck.related ? [chips([{ label: deck.related.label, href: deck.related.href }])!] : []),
    );
  }
  function pick(id: string, redraw = true) {
    round = spec.rounds.find((r) => r.id === id) ?? round;
    if (redraw) renderSetup();
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
    const raw = (round.options ?? spec.options)(item);
    const opts = spec.shuffleOptions === false ? raw : shuffle(raw);
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
    if (spec.play) window.setTimeout(() => spec.play!(item), 150);
    const replay = spec.play
      ? h("button", { type: "button", class: "btn ghost mc-play", onclick: () => spec.play!(item) }, "▶ Play again")
      : null;
    game.replaceChildren(
      h(
        "div",
        { class: "tl-card" },
        h("span", { class: "tl-count" }, `Question ${index + 1} of ${questions.length}`),
        h("p", { class: "tl-event" }, (round.question ?? spec.question)(item)),
        replay,
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
              ...wrong.map((l) => h("li", {}, h("span", {}, (round.question ?? spec.question)(l.item)), h("strong", {}, ` ${l.item.name}`), h("span", { class: "muted" }, ` (you said ${l.picked})`))),
            ),
          )
        : h("span", {}),
    );
    results.hidden = false;
  }

  renderSetup();
  return () => document.removeEventListener("keydown", onKey);
}
