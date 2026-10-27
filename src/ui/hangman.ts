import type { Deck, Item } from "../engine/types";
import { bestFor, recordGame } from "../engine/storage";
import { formatTime, h } from "./dom";

export interface HangmanRound {
  id: string;
  label: string;
  starter?: boolean;
  filter: (item: Item) => boolean;
  note?: string;
}

export interface HangmanSpec {
  rounds: HangmanRound[];
  /** The clue shown above the blanks. The answer is item.name. */
  clue: (item: Item) => string;
  /** Hint 1: what kind of thing the answer is, e.g. "a marsupial". */
  kind: (item: Item) => string | undefined;
  /** Words per game (default 10). */
  count?: number;
}

const LIVES = 6;
const MAX_HINTS = 3;
const FULL_MARKS = 3;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const isLetter = (c: string) => /^[a-z]$/i.test(c);

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Points for a solved word: 3, minus 1 per hint, never below 1. A missed word is 0. */
const pointsFor = (solved: boolean, hints: number) => (solved ? Math.max(1, FULL_MARKS - hints) : 0);

// A hot-air balloon: each lost life drops one sandbag.
const BALLOON = `<svg class="hm-balloon" viewBox="0 0 120 170" role="img" aria-hidden="true" focusable="false">
  <path class="hm-env" d="M60 6C30 6 14 28 14 52c0 22 16 38 30 44h32c14-6 30-22 30-44C106 28 90 6 60 6z"/>
  <path class="hm-stripe" d="M60 6C46 16 40 34 40 52c0 20 6 36 12 44h16c6-8 12-24 12-44 0-18-6-36-20-46z"/>
  <path class="hm-rope" d="M44 96l6 22M76 96l-6 22"/>
  <rect class="hm-basket" x="48" y="118" width="24" height="16" rx="3"/>
  <g class="hm-bags">
    ${[10, 26, 42, 78, 94, 110]
      .map((x, i) => {
        const fromX = x < 60 ? 50 : 70;
        return `<g class="hm-bag" data-bag="${i}"><path class="hm-rope" d="M${fromX} 134L${x} 144"/><rect class="hm-sack" x="${x - 7}" y="144" width="14" height="18" rx="5"/></g>`;
      })
      .join("")}
  </g>
</svg>`;

/** Returns a deck `screen` for a hangman-style word game with hints. */
export function renderHangman(spec: HangmanSpec) {
  return (root: HTMLElement, deck: Deck) => {
    const perGame = spec.count ?? 10;
    let round = spec.rounds[0];
    let words: Item[] = [];
    let index = 0;
    let startedAt = 0;
    const log: { item: Item; solved: boolean; hints: number; points: number }[] = [];

    // State for the word on screen
    let item: Item;
    let answer = "";
    let guessed = new Set<string>();
    let wrong = 0;
    let hints = 0;
    let over = false;
    let keyHandler: ((e: KeyboardEvent) => void) | null = null;

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

    const onKey = (e: KeyboardEvent) => keyHandler?.(e);
    document.addEventListener("keydown", onKey);

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
          h(
            "p",
            { class: "muted tl-how" },
            `${round.note ? `${round.note} ` : ""}${Math.min(perGame, pool.length)} words from ${pool.length}. Guess the letters, with up to ${LIVES} wrong guesses. Up to ${MAX_HINTS} hints per word, but each one costs a point.`,
          ),
          h("span", { class: "best" }, best ? `Best: ${best.score}/${best.total}` : ""),
          h("button", { type: "button", class: "btn primary", onclick: start }, "Start ▸"),
        ),
      );
    }

    function start() {
      words = shuffle(deck.items.filter(round.filter)).slice(0, perGame);
      index = 0;
      log.length = 0;
      startedAt = Date.now();
      setup.hidden = true;
      results.hidden = true;
      game.hidden = false;
      show();
    }

    function show() {
      item = words[index];
      answer = item.name.toUpperCase();
      guessed = new Set();
      wrong = 0;
      hints = 0;
      over = false;

      const total = words.length;
      const runningScore = log.reduce((s, l) => s + l.points, 0);
      const wordEl = h("div", { class: "hm-word", "aria-hidden": "true", "data-answer": item.name });
      const kindEl = h("p", { class: "hm-kind muted" });
      const livesEl = h("span", { class: "hm-lives" });
      const feedback = h("p", { class: "mc-feedback", "aria-live": "polite" });
      // Spoken version of the blanks (the visual boxes are hidden from screen readers).
      const spoken = h("p", { class: "hm-sr", "aria-live": "polite", role: "status" });
      const hintBtn = h("button", { type: "button", class: "btn ghost hm-hint", onclick: useHint });
      const next = h("button", { type: "button", class: "btn primary" }, index + 1 < total ? "Next word ▸" : "See results ▸");
      next.hidden = true;
      next.addEventListener("click", advance);

      const keys = new Map<string, HTMLButtonElement>();
      for (const l of ALPHABET) {
        keys.set(l, h("button", { type: "button", class: "hm-key", "aria-label": `Letter ${l}`, onclick: () => guess(l) }, l));
      }

      const balloon = h("div", { class: "hm-art" });
      balloon.innerHTML = BALLOON;

      game.replaceChildren(
        h(
          "div",
          { class: "tl-card hm-card" },
          h("span", { class: "tl-count" }, `Word ${index + 1} of ${total}`),
          h("p", { class: "tl-event" }, spec.clue(item)),
          kindEl,
          balloon,
          livesEl,
          wordEl,
          spoken,
        ),
        h("div", { class: "hm-keys", role: "group", "aria-label": "Letters" }, ...keys.values()),
        h("div", { class: "tl-actions" }, hintBtn, feedback, h("span", { class: "tl-score" }, `${runningScore}/${total * FULL_MARKS}`), next),
      );

      const visible = () => [...answer].map((c) => (!isLetter(c) || guessed.has(c) ? c : null));

      function paint() {
        const shown = visible();
        wordEl.replaceChildren(
          ...[...answer].map((c, i) => {
            if (!isLetter(c)) return h("span", { class: c === " " ? "hm-gap" : "hm-sep" }, c === " " ? "" : c);
            const missed = over && shown[i] === null;
            return h("span", { class: `hm-box${missed ? " missed" : ""}${shown[i] ? " on" : ""}` }, shown[i] ?? (missed ? c : ""));
          }),
        );
        for (const [l, b] of keys) {
          const used = guessed.has(l);
          const ok = used && answer.includes(l);
          b.className = `hm-key${used ? (ok ? " right" : " wrong") : ""}`;
          b.setAttribute("aria-disabled", String(used || over));
          b.setAttribute("aria-label", `Letter ${l}${used ? (ok ? ", in the word" : ", not in the word") : ""}`);
        }
        const left = LIVES - wrong;
        livesEl.textContent = `Lives: ${left}`;
        balloon.querySelectorAll<SVGGElement>(".hm-bag").forEach((bag, i) => bag.classList.toggle("gone", i >= left));
        balloon.querySelector("svg")!.setAttribute("aria-label", `${left} sandbags left`);
        const hintsLeft = MAX_HINTS - hints;
        hintBtn.textContent = `Hint (${hintsLeft})`;
        hintBtn.setAttribute("aria-label", `Hint, ${hintsLeft} left`);
        hintBtn.disabled = over || hintsLeft === 0;
        spoken.textContent = `Word so far: ${shown.map((c) => (c === null ? "blank" : c === " " ? "space" : c)).join(", ")}.`;
      }

      function say(text: string, tone = "") {
        feedback.className = `mc-feedback ${tone}`;
        feedback.textContent = text;
      }

      function solvedNow() {
        return visible().every((c) => c !== null);
      }

      function finishWord() {
        over = true;
        const solved = solvedNow();
        const points = pointsFor(solved, hints);
        log.push({ item, solved, hints, points });
        paint();
        say(
          solved
            ? `Solved! ${item.name}. +${points} ${points === 1 ? "point" : "points"}.`
            : `Out of lives. It was ${item.name}.`,
          solved ? "good" : "bad",
        );
        spoken.textContent = `${solved ? "Solved" : "Out of lives"}. The answer is ${item.name}.`;
        const total2 = log.reduce((s, l) => s + l.points, 0);
        (game.querySelector(".tl-score") as HTMLElement).textContent = `${total2}/${words.length * FULL_MARKS}`;
        next.hidden = false;
        next.focus();
      }

      function guess(letter: string) {
        if (over || guessed.has(letter)) return;
        guessed.add(letter);
        if (answer.includes(letter)) {
          say("");
          if (solvedNow()) return finishWord();
        } else {
          wrong++;
          if (wrong >= LIVES) return finishWord();
          say(`No ${letter}. ${LIVES - wrong} ${LIVES - wrong === 1 ? "life" : "lives"} left.`, "bad");
        }
        paint();
      }

      /** Letters in the word that are not shown yet. */
      const hidden = () => [...new Set([...answer].filter((c) => isLetter(c) && !guessed.has(c)))];

      function reveal(letter: string) {
        guessed.add(letter);
        say(`Hint: revealed ${letter}.`);
      }

      function useHint() {
        if (over || hints >= MAX_HINTS) return;
        hints++;
        const kind = spec.kind(item);
        if (hints === 1 && kind) {
          kindEl.textContent = `Hint: it's ${kind}.`;
          say(`Hint: it's ${kind}.`);
        } else if (hints === 3 && hidden().includes(answer.replace(/[^A-Z]/g, "")[0])) {
          reveal(answer.replace(/[^A-Z]/g, "")[0]);
        } else {
          const left = hidden();
          reveal(left[Math.floor(Math.random() * left.length)]);
        }
        if (solvedNow()) return finishWord();
        paint();
      }

      keyHandler = (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target as HTMLElement | null;
        if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
        if (e.key.length === 1 && isLetter(e.key)) guess(e.key.toUpperCase());
      };

      paint();
    }

    function advance() {
      index++;
      if (index < words.length) show();
      else finish();
    }

    function finish() {
      keyHandler = null;
      game.hidden = true;
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      const score = log.reduce((s, l) => s + l.points, 0);
      const total = words.length * FULL_MARKS;
      const prev = bestFor(deck.id, round.id);
      recordGame(
        { deck: deck.id, variant: round.id, score, total, seconds, date: Date.now() },
        log.filter((l) => l.solved).map((l) => l.item.id),
        log.filter((l) => !l.solved).map((l) => l.item.id),
      );
      const solved = log.filter((l) => l.solved).length;
      results.replaceChildren(
        h(
          "div",
          { class: "results-head" },
          h("div", { class: "big" }, `${score}`, h("small", {}, `/${total}`)),
          h(
            "div",
            {},
            h("p", { class: "verdict" }, score === total ? "Perfect game, no hints." : `${solved} of ${log.length} words solved in ${formatTime(seconds)}.`),
            h("p", { class: "muted" }, !prev || score / total > prev.score / prev.total ? "That's your best for this round." : `Your best is ${prev.score}/${prev.total}.`),
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
        h(
          "div",
          { class: "weak" },
          h("h3", {}, "Your words"),
          h(
            "ul",
            { class: "mc-review hm-review" },
            ...log.map((l) =>
              h(
                "li",
                { class: l.solved ? "ok" : "no" },
                h("span", { class: "hm-mark" }, l.solved ? "✓" : "✗"),
                h("strong", {}, l.item.name),
                h("span", { class: "muted" }, ` ${spec.clue(l.item).replace(/…$/, "")}`),
                h(
                  "span",
                  { class: "hm-pts" },
                  l.solved
                    ? `${l.points} ${l.points === 1 ? "point" : "points"}${l.hints ? `, ${l.hints} ${l.hints === 1 ? "hint" : "hints"}` : ""}`
                    : "missed",
                ),
              ),
            ),
          ),
        ),
      );
      results.hidden = false;
    }

    renderSetup();
    return () => {
      keyHandler = null;
      document.removeEventListener("keydown", onKey);
    };
  };
}
