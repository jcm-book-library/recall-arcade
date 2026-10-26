// Pairs games: things that belong together. Two styles share one setup and results screen.
//   "memory": flip two cards at a time to find each pair (cards can have pictures).
//   "match":  two columns, click one on the left and its partner on the right.
import type { Deck, Item } from "../engine/types";
import { bestFor, recordGame } from "../engine/storage";
import { loadPictures, type Picture } from "../data/pictures";
import { formatTime, h } from "./dom";

type PictureSet = Parameters<typeof loadPictures>[0];

/** What one half of a pair looks like. */
export interface PairSide {
  text: string;
  /** A small label under the text, e.g. "Greek". */
  tag?: string;
  /** Memory only: the key of this half's picture in picture-titles.json. */
  picture?: string;
}

export interface PairsRound {
  id: string;
  label: string;
  starter?: boolean;
  filter: (item: Item) => boolean;
  /** Pairs per board for this round (memory); defaults to the spec's. */
  pairs?: number;
  note?: string;
}

export interface PairsSpec {
  style: "memory" | "match";
  rounds: PairsRound[];
  /** The two halves of an item (for "match": left column and right column). */
  left: (item: Item) => PairSide;
  right: (item: Item) => PairSide;
  /** One line of instructions on the setup screen. */
  how: string;
  /** Pairs per board: 8 for memory and 6 for match unless set. */
  pairs?: number;
  /** Match only: how many boards make a game (default 4). */
  boards?: number;
  /** Match only: titles over the two columns. */
  heads?: [string, string];
  /** Memory only: which set of Wikipedia pictures to use. */
  pictureSet?: PictureSet;
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const FLIP_BACK_MS = 900;

/** Returns a deck `screen` for a pairs game. */
export function renderPairs(spec: PairsSpec) {
  return (root: HTMLElement, deck: Deck) => {
    const memory = spec.style === "memory";
    let round = spec.rounds[0];
    let alive = true;
    // Every timer goes through `later`, so leaving the page stops them all.
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    // ---------- clock ----------
    let startedAt = 0;
    let endedAt = 0;
    let tick = 0;
    let refresh = () => {};
    const seconds = () => (startedAt ? ((endedAt || Date.now()) - startedAt) / 1000 : 0);
    const startClock = () => {
      if (startedAt) return;
      startedAt = Date.now();
      tick = window.setInterval(refresh, 500);
    };
    const stopClock = () => {
      endedAt = Date.now();
      clearInterval(tick);
    };
    const resetClock = () => {
      clearInterval(tick);
      startedAt = endedAt = 0;
    };

    // ---------- pictures (memory) ----------
    let pics = new Map<string, Picture>();
    let picsDone = !spec.pictureSet;
    const picsLoading: Promise<void> = spec.pictureSet
      ? loadPictures(spec.pictureSet)
          .then((m) => {
            pics = m;
          })
          .catch(() => {
            /* no pictures: the cards stay text */
          })
          .finally(() => {
            picsDone = true;
          })
      : Promise.resolve();

    // ---------- layout ----------
    const setup = h("div", { class: "setup" });
    const game = h("div", { class: memory ? "pair-game" : "match-game" });
    game.hidden = true;
    const results = h("div", { class: "results" });
    results.hidden = true;
    const credits = h("div", { class: "pair-credits" });
    root.replaceChildren(
      h(
        "main",
        { class: "play" },
        h("div", { class: "play-top" }, h("a", { class: "back", href: "#" }, "◂ Arcade"), h("h1", { class: "play-title" }, deck.title)),
        setup,
        game,
        results,
        credits,
      ),
    );

    // ---------- setup ----------
    const poolOf = () => deck.items.filter(round.filter);
    const pairsPerBoard = () => Math.min(round.pairs ?? spec.pairs ?? (memory ? 8 : 6), poolOf().length);
    // A small pool gets fewer boards, so nobody comes up twice in one game.
    const boardCount = () => Math.max(1, Math.min(spec.boards ?? 4, Math.floor(poolOf().length / pairsPerBoard())));

    function renderSetup() {
      const pool = poolOf();
      const best = bestFor(deck.id, round.id);
      const size = memory
        ? `${pairsPerBoard()} pairs${pool.length > pairsPerBoard() ? ` from ${pool.length}` : ""}.`
        : `${boardCount()} rounds of ${pairsPerBoard()} pairs, picked from ${pool.length}.`;
      const startBtn = h("button", { type: "button", class: "btn primary" }, "Start ▸");
      startBtn.addEventListener("click", () => begin(startBtn));
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
          h("p", { class: "muted tl-how" }, `${spec.how} ${size}${round.note ? ` ${round.note}` : ""}`),
          h("span", { class: "best" }, best ? `Best: ${best.score}/${best.total} in ${formatTime(best.seconds)}` : ""),
          startBtn,
        ),
      );
    }

    /** Start, waiting a moment for the pictures if they haven't arrived. */
    async function begin(btn: HTMLButtonElement) {
      if (!picsDone) {
        btn.disabled = true;
        btn.textContent = "Loading pictures…";
        await Promise.race([picsLoading, new Promise((r) => later(() => r(null), 5000))]);
        if (!alive) return;
      }
      start();
    }

    function start() {
      timers.forEach(clearTimeout);
      timers.clear();
      resetClock();
      setup.hidden = true;
      results.hidden = true;
      credits.replaceChildren();
      game.hidden = false;
      if (memory) startMemory();
      else startMatch();
    }

    function backToSetup() {
      timers.forEach(clearTimeout);
      timers.clear();
      resetClock();
      results.hidden = true;
      game.hidden = true;
      credits.replaceChildren();
      setup.hidden = false;
      renderSetup();
    }

    // ---------- results ----------
    function finish(score: number, total: number, found: string[], missed: string[], verdict: string, extra: HTMLElement | null) {
      stopClock();
      const secs = Math.round(seconds());
      const prev = bestFor(deck.id, round.id);
      recordGame({ deck: deck.id, variant: round.id, score, total, seconds: secs, date: Date.now() }, found, missed);
      const ratio = score / total;
      const isBest = !prev || ratio > prev.score / prev.total || (ratio === prev.score / prev.total && secs < prev.seconds);
      game.hidden = true;
      results.replaceChildren(
        h(
          "div",
          { class: "results-head" },
          h("div", { class: "big" }, `${score}`, h("small", {}, `/${total}`)),
          h(
            "div",
            {},
            h("p", { class: "verdict" }, `${verdict} Time ${formatTime(secs)}.`),
            h("p", { class: "muted" }, isBest ? "That's your best for this round." : `Your best is ${prev!.score}/${prev!.total} in ${formatTime(prev!.seconds)}.`),
          ),
          h(
            "div",
            { class: "results-actions" },
            h("button", { type: "button", class: "btn primary", onclick: start }, "Play again"),
            h("button", { type: "button", class: "btn ghost", onclick: backToSetup }, "Change round"),
            h("a", { class: "btn ghost", href: "#" }, "◂ Arcade"),
          ),
        ),
        ...(extra ? [extra] : []),
      );
      results.hidden = false;
    }

    // ---------- memory ----------
    interface Card {
      el: HTMLButtonElement;
      item: Item;
      side: PairSide;
      state: "down" | "up" | "matched";
    }

    function cardFace(side: PairSide, pic: Picture | undefined) {
      const face = h("span", { class: pic ? "pc-face pc-front" : "pc-face pc-front text" });
      if (pic) {
        const img = h("img", { src: pic.src, alt: "", loading: "eager" });
        // A picture that won't load falls back to a text card.
        img.addEventListener("error", () => {
          img.remove();
          face.classList.add("text");
        });
        face.append(img);
      }
      face.append(h("span", { class: "pc-name" }, side.text));
      if (side.tag) face.append(h("span", { class: "pc-tag" }, side.tag));
      return face;
    }

    function startMemory() {
      const chosen = shuffle(poolOf()).slice(0, pairsPerBoard());
      const total = chosen.length;
      let moves = 0;
      let matched = 0;
      let open: Card | null = null;
      let locked = false;

      const movesEl = h("b", { class: "pair-moves" }, "0");
      const timeEl = h("b", { class: "pair-time" }, "0:00");
      const msg = h("p", { class: "pair-msg", "aria-live": "polite" }, "Click a card to flip it, then find its partner.");
      refresh = () => {
        movesEl.textContent = String(moves);
        timeEl.textContent = formatTime(seconds());
      };

      const labelOf = (c: Card) => (c.side.tag ? `${c.side.text}, ${c.side.tag}` : c.side.text);
      const setState = (c: Card, state: Card["state"]) => {
        c.state = state;
        c.el.dataset.state = state;
        c.el.setAttribute("aria-label", state === "down" ? "hidden card" : state === "matched" ? `${labelOf(c)}, matched` : labelOf(c));
      };

      const used: { name: string; pic: Picture }[] = [];
      const cards: Card[] = shuffle(
        chosen.flatMap((item) => [
          { item, side: spec.left(item), name: "left" },
          { item, side: spec.right(item), name: "right" },
        ]),
      ).map(({ item, side, name }) => {
        const pic = side.picture ? pics.get(side.picture) : undefined;
        if (pic) used.push({ name: side.text, pic });
        const el = h(
          "button",
          { type: "button", class: "pair-card", "data-pair": item.id, "data-side": name },
          h("span", { class: "pc-inner", "aria-hidden": "true" }, h("span", { class: "pc-face pc-back" }, "?"), cardFace(side, pic)),
        );
        const card: Card = { el, item, side, state: "down" };
        setState(card, "down");
        el.addEventListener("click", () => flip(card));
        return card;
      });

      function flip(card: Card) {
        if (locked || card.state !== "down") return;
        startClock();
        setState(card, "up");
        if (!open) {
          open = card;
          return;
        }
        const first = open;
        open = null;
        moves++;
        refresh();
        if (first.item === card.item) {
          setState(first, "matched");
          setState(card, "matched");
          matched++;
          msg.className = "pair-msg good";
          msg.textContent = `A pair: ${first.side.text} and ${card.side.text}.`;
          if (matched === total) {
            stopClock();
            refresh();
            later(done, 800);
          }
        } else {
          locked = true;
          msg.className = "pair-msg";
          msg.textContent = `Not a pair: ${first.side.text} and ${card.side.text}.`;
          later(() => {
            setState(first, "down");
            setState(card, "down");
            locked = false;
          }, FLIP_BACK_MS);
        }
      }

      function done() {
        const pairsList = h(
          "div",
          { class: "weak" },
          h("h3", {}, "The pairs"),
          h("ul", {}, ...chosen.map((it) => h("li", {}, `${spec.left(it).text} = ${spec.right(it).text}`))),
        );
        finish(total, total, chosen.map((it) => it.id), [], `All ${total} pairs in ${moves} moves.`, pairsList);
      }

      // More columns on a wide screen: the most that fill the last row neatly.
      const cols = [8, 7, 6].reduce((best, c) => (cards.length % c < cards.length % best ? c : best), 8);

      refresh();
      game.replaceChildren(
        h("p", { class: "pair-bar" }, h("span", { class: "pair-stat" }, "Moves ", movesEl), h("span", { class: "pair-stat" }, "Time ", timeEl)),
        msg,
        h("div", { class: "pair-grid", style: `--cols: ${cols}`, role: "group", "aria-label": "Cards" }, ...cards.map((c) => c.el)),
      );
      if (used.length) {
        credits.replaceChildren(
          h(
            "details",
            {},
            h("summary", {}, "Picture credits"),
            h("p", { class: "muted" }, "Pictures come from Wikipedia and are freely licensed."),
            h(
              "ul",
              {},
              ...used.map((u) => h("li", {}, `${u.name}: `, h("a", { href: u.pic.page, target: "_blank", rel: "noopener" }, `${u.pic.artist} · ${u.pic.license}`))),
            ),
          ),
        );
      }
    }

    // ---------- match ----------
    /** Deal boards from the pool, never putting the same words twice on one board. */
    function deal(pool: Item[], boards: number, size: number): Item[][] {
      const clash = (board: Item[], it: Item) =>
        board.some((o) => o === it || spec.left(o).text === spec.left(it).text || spec.right(o).text === spec.right(it).text);
      let bag: Item[] = [];
      return Array.from({ length: boards }, () => {
        const board: Item[] = [];
        let fresh = false;
        while (board.length < size) {
          if (!bag.length) bag = shuffle(pool);
          const i = bag.findIndex((it) => !clash(board, it));
          if (i < 0) {
            if (fresh) break;
            bag = shuffle(pool);
            fresh = true;
            continue;
          }
          fresh = false;
          board.push(bag.splice(i, 1)[0]);
        }
        return board;
      });
    }

    function startMatch() {
      const boards = deal(poolOf(), boardCount(), pairsPerBoard());
      const total = boards.reduce((n, b) => n + b.length, 0);
      const log: { item: Item; clean: boolean }[] = [];
      let index = 0;
      let mistakes = 0;

      const roundEl = h("b", { class: "pair-round" });
      const mistakesEl = h("b", { class: "pair-mistakes" }, "0");
      const timeEl = h("b", { class: "pair-time" }, "0:00");
      const msg = h("p", { class: "pair-msg", "aria-live": "polite" });
      const cols = h("div", { class: "match-cols" });
      refresh = () => {
        mistakesEl.textContent = String(mistakes);
        timeEl.textContent = formatTime(seconds());
      };
      game.replaceChildren(
        h(
          "p",
          { class: "pair-bar" },
          h("span", { class: "pair-stat" }, "Round ", roundEl),
          h("span", { class: "pair-stat" }, "Mistakes ", mistakesEl),
          h("span", { class: "pair-stat" }, "Time ", timeEl),
        ),
        msg,
        cols,
      );

      function showBoard() {
        const items = boards[index];
        const slipped = new Set<string>();
        let matchedCount = 0;
        let selected: { el: HTMLButtonElement; id: string; side: "left" | "right" } | null = null;
        roundEl.textContent = `${index + 1} of ${boards.length}`;
        msg.className = "pair-msg";
        msg.textContent = "Click one on the left, then its partner on the right.";

        const makeItem = (item: Item, side: "left" | "right") => {
          const el = h(
            "button",
            { type: "button", class: "match-item", "aria-pressed": "false", "data-pair": item.id, "data-side": side },
            (side === "left" ? spec.left(item) : spec.right(item)).text,
          );
          el.addEventListener("click", () => pick(el, item.id, side));
          return el;
        };
        const lefts = items.map((it) => makeItem(it, "left"));
        const rights = shuffle(items).map((it) => makeItem(it, "right"));
        const column = (side: "left" | "right", title: string | undefined, els: HTMLElement[]) =>
          h("div", { class: "match-col", role: "group", "aria-label": title ?? (side === "left" ? "Left column" : "Right column") }, title ? h("p", { class: "match-head" }, title) : null, ...els);
        cols.replaceChildren(column("left", spec.heads?.[0], lefts), column("right", spec.heads?.[1], rights));

        const select = (s: typeof selected) => {
          if (selected) {
            selected.el.setAttribute("aria-pressed", "false");
            selected.el.classList.remove("on");
          }
          selected = s;
          if (s) {
            s.el.setAttribute("aria-pressed", "true");
            s.el.classList.add("on");
          }
        };

        function pick(el: HTMLButtonElement, id: string, side: "left" | "right") {
          if (el.classList.contains("done")) return;
          startClock();
          // First click, or a change of mind within the same column.
          if (!selected || selected.side === side) {
            select(selected && selected.el === el ? null : { el, id, side });
            return;
          }
          const other = selected;
          const leftId = side === "left" ? id : other.id;
          const rightId = side === "right" ? id : other.id;
          select(null);
          if (leftId === rightId) {
            for (const e of [el, other.el]) {
              e.classList.add("done");
              e.setAttribute("aria-disabled", "true");
            }
            const item = items.find((it) => it.id === id)!;
            msg.className = "pair-msg good";
            msg.textContent = `${spec.left(item).text}: ${spec.right(item).text}`;
            if (++matchedCount === items.length) {
              items.forEach((it) => log.push({ item: it, clean: !slipped.has(it.id) }));
              later(next, 900);
            }
          } else {
            // The mistake is counted against the item on the left.
            slipped.add(leftId);
            mistakes++;
            refresh();
            msg.className = "pair-msg bad";
            msg.textContent = "Not a match. Try again.";
            for (const e of [el, other.el]) {
              e.classList.remove("wrong");
              void e.offsetWidth; // restart the shake
              e.classList.add("wrong");
              later(() => e.classList.remove("wrong"), 500);
            }
          }
        }
      }

      function next() {
        index++;
        if (index < boards.length) return showBoard();
        const clean = log.filter((l) => l.clean);
        const slips = log.filter((l) => !l.clean);
        const review = slips.length
          ? h(
              "div",
              { class: "weak" },
              h("h3", {}, "To remember"),
              h("ul", { class: "mc-review" }, ...slips.map((l) => h("li", {}, h("strong", {}, spec.left(l.item).text), `: ${spec.right(l.item).text}`))),
            )
          : null;
        finish(
          clean.length,
          total,
          clean.map((l) => l.item.id),
          slips.map((l) => l.item.id),
          clean.length === total ? "Perfect, no mistakes." : `${clean.length} of ${total} pairs with no mistake.`,
          review,
        );
      }

      refresh();
      showBoard();
    }

    renderSetup();
    return () => {
      alive = false;
      clearInterval(tick);
      timers.forEach(clearTimeout);
      timers.clear();
    };
  };
}
