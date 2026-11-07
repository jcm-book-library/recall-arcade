// MYTHOLOGY SPECIAL GAMES: the screens.
//
//   The Journey to the Afterlife (Egyptian): put the seven steps in order. Easy keeps the first and
//     last steps fixed and you order the middle five; Full shuffles all seven. 1 point per card in the right place.
//   The Nine Realms (Norse): label Yggdrasil. "Label the tree" is click a spot then a name (or drag a name
//     onto a spot); "Who lives here?" highlights a spot and you pick who lives there. 1 point per realm right first time.
//
// Both save a score with recordGame, and both end by showing the true answers so the round teaches.
import type { Deck, Item } from "../engine/types";
import { bestFor, recordGame } from "../engine/storage";
import { h } from "./dom";
import "./myth-specials.css";

const SVG = "http://www.w3.org/2000/svg";

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Make an SVG element: s("rect", { x: "1" }). */
function s(tag: string, attrs: Record<string, string> = {}, ...kids: (Node | string)[]): SVGElement {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const k of kids) el.append(k);
  return el;
}

/** The page frame shared by both games: back link, title, and three panels. */
function frame(root: HTMLElement, deck: Deck) {
  const setup = h("div", { class: "setup" });
  const game = h("div", { class: "ms-game" });
  game.hidden = true;
  const results = h("div", { class: "results ms-results" });
  results.hidden = true;
  root.replaceChildren(
    h(
      "main",
      { class: "play ms-play" },
      h(
        "div",
        { class: "play-top" },
        h("a", { class: "back", href: "#myths" }, "◂ Mythology"),
        h("h1", { class: "play-title" }, deck.title),
      ),
      setup,
      game,
      results,
    ),
  );
  return { setup, game, results };
}

interface Round {
  id: string;
  label: string;
  note: string;
}

/** The setup screen: intro, round buttons, best score, Start. */
function setupScreen(
  el: HTMLElement,
  deck: Deck,
  intro: Node[],
  rounds: Round[],
  current: () => string,
  choose: (id: string) => void,
  start: () => void,
) {
  const round = rounds.find((r) => r.id === current())!;
  const best = bestFor(deck.id, round.id);
  el.replaceChildren(
    ...intro,
    h(
      "div",
      { class: "chips", role: "group", "aria-label": "Choose a round" },
      ...rounds.map((r, i) =>
        h(
          "button",
          {
            type: "button",
            class: r.id === current() ? "chip on" : "chip",
            "aria-pressed": String(r.id === current()),
            onclick: () => choose(r.id),
          },
          i === 0 ? `★ ${r.label}` : r.label,
        ),
      ),
    ),
    h(
      "div",
      { class: "setup-row" },
      h("p", { class: "muted tl-how" }, round.note),
      h("span", { class: "best" }, best ? `Best: ${best.score}/${best.total}` : ""),
      h("button", { type: "button", class: "btn primary", onclick: start }, "Start ▸"),
    ),
  );
}

/** The results panel: score, a line from the verdict, and the two buttons. */
function resultsScreen(
  el: HTMLElement,
  deck: Deck,
  roundId: string,
  score: number,
  max: number,
  verdict: [string, string, string],
  again: () => void,
  change: () => void,
) {
  const prev = bestFor(deck.id, roundId); // recordGame has already run, so this includes the game just played
  el.replaceChildren(
    h(
      "div",
      { class: "results-head" },
      h("div", { class: "big" }, `${score}`, h("small", {}, `/${max}`)),
      h(
        "div",
        {},
        h("p", { class: "verdict" }, score >= max * 0.8 ? verdict[0] : score >= max * 0.5 ? verdict[1] : verdict[2]),
        h("p", { class: "muted" }, prev ? `Your best for this round is ${prev.score}/${prev.total}.` : ""),
      ),
      h(
        "div",
        { class: "results-actions" },
        h("button", { type: "button", class: "btn primary", onclick: again }, "Play again"),
        h("button", { type: "button", class: "btn ghost", onclick: change }, "Change round"),
      ),
    ),
  );
  el.hidden = false;
}

// ---------------------------------------------------------------------------------------------
// THE JOURNEY TO THE AFTERLIFE
// ---------------------------------------------------------------------------------------------

/** A small pixel drawing of the scales: a heart on one pan, Ma'at's feather on the other. */
function scalesPicture(): SVGElement {
  const svg = s("svg", {
    viewBox: "0 0 120 90",
    class: "ms-pic",
    role: "img",
    "aria-label": "Scales with a heart on one side and a feather on the other",
    "shape-rendering": "crispEdges",
  });
  svg.append(
    s("rect", { x: "58", y: "10", width: "4", height: "64", class: "ms-wood" }),
    s("rect", { x: "44", y: "74", width: "32", height: "6", class: "ms-wood" }),
    s("rect", { x: "18", y: "16", width: "84", height: "4", class: "ms-wood" }),
    // left pan with the heart
    s("rect", { x: "20", y: "20", width: "2", height: "30", class: "ms-chain" }),
    s("rect", { x: "34", y: "20", width: "2", height: "30", class: "ms-chain" }),
    s("rect", { x: "14", y: "50", width: "28", height: "4", class: "ms-wood" }),
    s("path", { d: "M22 38h4v-4h4v4h4v4h-4v4h-4v4h-4v-4h-4v-4z", class: "ms-heart" }),
    // right pan with the feather
    s("rect", { x: "84", y: "20", width: "2", height: "22", class: "ms-chain" }),
    s("rect", { x: "98", y: "20", width: "2", height: "22", class: "ms-chain" }),
    s("rect", { x: "78", y: "42", width: "28", height: "4", class: "ms-wood" }),
    s("rect", { x: "84", y: "34", width: "12", height: "3", class: "ms-feather" }),
    s("rect", { x: "88", y: "31", width: "8", height: "3", class: "ms-feather" }),
    s("rect", { x: "92", y: "28", width: "4", height: "3", class: "ms-feather" }),
  );
  return svg;
}

export function renderAfterlife(root: HTMLElement, deck: Deck) {
  const ROUNDS: Round[] = [
    {
      id: "easy",
      label: "Easy: order the middle 5",
      note: "The first and last steps are fixed. Put the five in the middle in order. 1 point for each step in the right place.",
    },
    {
      id: "full",
      label: "Full: all 7 steps",
      note: "All seven steps are shuffled. Put them in order. 1 point for each step in the right place.",
    },
  ];
  let roundId = "easy";
  const truth = deck.items; // already in the true order
  const { setup, game, results } = frame(root, deck);

  function renderSetup() {
    setupScreen(
      setup,
      deck,
      [
        h(
          "div",
          { class: "ms-intro" },
          scalesPicture(),
          h(
            "div",
            {},
            h(
              "p",
              {},
              "The ancient Egyptians believed that life went on after death. But first the dead had to make a long journey.",
            ),
            h("p", { class: "muted" }, "Put the steps in order, from the first to the last."),
          ),
        ),
      ],
      ROUNDS,
      () => roundId,
      (id) => {
        roundId = id;
        renderSetup();
      },
      start,
    );
  }

  function start() {
    setup.hidden = true;
    results.hidden = true;
    game.hidden = false;
    play();
  }

  function play() {
    const easy = roundId === "easy";
    const head = easy ? [truth[0]] : [];
    const tail = easy ? [truth[truth.length - 1]] : [];
    const want = truth.slice(head.length, truth.length - tail.length);
    let mid = shuffle(want);
    for (let tries = 0; tries < 20 && mid.every((t, i) => t === want[i]); tries++) mid = shuffle(want);
    let sel: number | null = null;
    let checked = false;
    const lo = head.length;

    const row = h("div", {
      class: "sc-row ms-row",
      role: "group",
      "aria-label": "The steps. First on the left, last on the right",
    });
    const live = h("p", { class: "sc-sr", "aria-live": "polite" });
    const leftBtn = h("button", { type: "button", class: "btn ghost", onclick: () => nudge(-1) }, "◂ Move earlier");
    const rightBtn = h("button", { type: "button", class: "btn ghost", onclick: () => nudge(1) }, "Move later ▸");
    const checkBtn = h("button", { type: "button", class: "btn primary", onclick: check }, "Check ▸");
    const feedback = h("p", { class: "tl-feedback", "aria-live": "polite" });
    const reveal = h("div", { class: "sc-reveal" });
    reveal.hidden = true;
    const how = h(
      "p",
      { class: "muted sc-how" },
      "Drag a card to move it. Or tap one to pick it up, then tap the card to swap with. Keyboard: Enter picks up, arrows move.",
    );

    const swap = (a: number, b: number) => ([mid[a], mid[b]] = [mid[b], mid[a]]);
    const move = (from: number, to: number) => {
      const [t] = mid.splice(from, 1);
      mid.splice(to, 0, t);
    };
    function nudge(d: number) {
      if (sel === null || checked) return;
      const to = sel + d;
      if (to < 0 || to >= mid.length) return;
      swap(sel, to);
      sel = to;
      draw(sel);
      live.textContent = `${mid[sel].name} is now number ${sel + lo + 1} of ${truth.length}.`;
    }
    function tap(i: number) {
      if (checked) return;
      if (sel === null) sel = i;
      else if (sel === i) sel = null;
      else {
        swap(sel, i);
        live.textContent = `${mid[i].name} is now number ${i + lo + 1} of ${truth.length}.`;
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

    function fixedCard(t: Item, pos: number) {
      return h(
        "div",
        { class: `sc-card ms-fixed${checked ? " right" : ""}`, role: "group", "aria-label": `${t.name}, number ${pos} of ${truth.length}, fixed in place` },
        h("span", { class: "sc-pos" }, String(pos)),
        h("span", { class: "sc-name" }, t.name),
        h("span", { class: "sc-val" }, pos === 1 ? "Fixed: the start" : "Fixed: the end"),
      );
    }

    function card(t: Item, i: number) {
      const right = checked && t === want[i];
      const pos = i + lo + 1;
      const b = h(
        "button",
        {
          type: "button",
          class: `sc-card${sel === i ? " picked" : ""}${checked ? (right ? " right" : " wrong") : ""}`,
          "aria-pressed": checked ? "false" : String(sel === i),
          "aria-label": `${t.name}, number ${pos} of ${truth.length}${checked ? `. ${right ? "Right place" : "Wrong place"}` : sel === i ? ", picked up" : ""}`,
          disabled: checked,
        },
        h("span", { class: "sc-pos" }, String(pos)),
        h("span", { class: "sc-name" }, t.name),
      );
      let from: { x: number; y: number } | null = null;
      let dragging = false;
      let target: { index: number } | null = null;
      const others = () => [...row.querySelectorAll<HTMLElement>("button.sc-card")].filter((c) => c !== b);
      const clearMarks = () =>
        row.querySelectorAll(".drop-before, .drop-after").forEach((c) => c.classList.remove("drop-before", "drop-after"));
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
            move(i, target.index > i ? target.index - 1 : target.index);
            live.textContent = `${t.name} moved to number ${mid.indexOf(t) + lo + 1} of ${truth.length}.`;
            sel = null;
          }
          draw();
        } else if (!cancelled) tap(i);
      };
      b.addEventListener("pointerup", (e) => end(e, false));
      b.addEventListener("pointercancel", (e) => end(e, true));
      // Enter or Space gives a click with detail 0: that picks the card up.
      b.addEventListener("click", (e) => {
        if (e.detail === 0) tap(i);
      });
      b.addEventListener("keydown", (e) => {
        if (checked) return;
        if (["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(e.key)) {
          const d = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
          e.preventDefault();
          if (sel === i) nudge(d);
          else row.querySelectorAll<HTMLElement>("button.sc-card")[Math.min(mid.length - 1, Math.max(0, i + d))]?.focus();
        } else if (e.key === "Escape" && sel !== null) {
          sel = null;
          draw(i);
        }
      });
      return b;
    }

    function draw(focus?: number) {
      row.replaceChildren(
        ...head.map((t) => fixedCard(t, 1)),
        ...mid.map(card),
        ...tail.map((t) => fixedCard(t, truth.length)),
      );
      leftBtn.disabled = checked || sel === null || sel === 0;
      rightBtn.disabled = checked || sel === null || sel === mid.length - 1;
      if (focus !== undefined) row.querySelectorAll<HTMLElement>("button.sc-card")[focus]?.focus();
    }

    function check() {
      checked = true;
      sel = null;
      const good = mid.filter((t, i) => t === want[i]);
      const n = good.length;
      const max = mid.length;
      draw();
      checkBtn.hidden = leftBtn.hidden = rightBtn.hidden = how.hidden = true;
      feedback.className = `tl-feedback ${n === max ? "good" : n >= max / 2 ? "ok" : "bad"}`;
      feedback.textContent = n === max ? `All ${n} in the right place. +${n}` : `${n} of ${max} in the right place. +${n}`;
      reveal.replaceChildren(
        h("p", { class: "sc-label" }, "The true order of the journey"),
        h(
          "ol",
          { class: "ms-order" },
          ...truth.map((t, i) => {
            const mi = i - lo;
            const ok = mi < 0 || mi >= max || mid[mi] === t;
            return h(
              "li",
              { class: ok ? "good" : "bad" },
              h("span", { class: "sc-num" }, String(i + 1)),
              h(
                "span",
                {},
                h("strong", { class: "sc-o-name" }, t.name),
                h("span", { class: "sc-o-val" }, t.data!.detail as string),
                mi >= 0 && mi < max && !ok ? h("span", { class: "ms-yours" }, `You put "${mid[mi].name}" here.`) : null,
              ),
            );
          }),
        ),
      );
      reveal.hidden = false;
      recordGame(
        { deck: deck.id, variant: roundId, score: n, total: max, seconds: 0, date: Date.now() },
        good.map((t) => t.id),
        mid.filter((t, i) => t !== want[i]).map((t) => t.id),
      );
      resultsScreen(
        results,
        deck,
        roundId,
        n,
        max,
        ["You know the journey.", "Not bad. Read the order again.", "A long journey. Go again."],
        () => start(),
        () => {
          results.hidden = true;
          game.hidden = true;
          setup.hidden = false;
          renderSetup();
        },
      );
      results.querySelector<HTMLElement>(".btn.primary")?.focus();
    }

    game.replaceChildren(
      h(
        "div",
        { class: "tl-card" },
        h("span", { class: "tl-count" }, easy ? "Easy · middle 5" : "Full · all 7"),
        h("p", { class: "tl-event" }, "Which step comes first? Put them in order."),
        h("span", { class: "muted" }, easy ? "The first and last are fixed in place." : "First step on the left."),
      ),
      row,
      live,
      how,
      h("div", { class: "tl-actions" }, leftBtn, rightBtn, checkBtn),
      feedback,
      reveal,
    );
    draw(0);
  }

  renderSetup();
  return () => {};
}

// ---------------------------------------------------------------------------------------------
// THE NINE REALMS
// ---------------------------------------------------------------------------------------------

/** Where each realm's spot sits on the tree (in a 400 by 450 drawing). Fixed, so it is a puzzle you can learn. */
const SPOTS: Record<string, { x: number; y: number }> = {
  "re-vanaheim": { x: 70, y: 78 },
  "re-asgard": { x: 200, y: 44 },
  "re-alfheim": { x: 330, y: 78 },
  "re-jotunheim": { x: 66, y: 218 },
  "re-midgard": { x: 200, y: 232 },
  "re-svartalfheim": { x: 334, y: 218 },
  "re-niflheim": { x: 70, y: 392 },
  "re-helheim": { x: 200, y: 408 },
  "re-muspelheim": { x: 330, y: 392 },
};

const LEVEL_WORD: Record<string, string> = { top: "in the branches", middle: "around the trunk", bottom: "in the roots" };

/** Yggdrasil, drawn in blocky shapes. Returns the svg; the spots are added by the caller. */
function treePicture(): SVGElement {
  const svg = s("svg", {
    viewBox: "0 0 400 450",
    class: "ms-tree",
    role: "group",
    "aria-label": "Yggdrasil, the world tree, with nine spots: three in the branches, three around the trunk and three in the roots",
    "shape-rendering": "crispEdges",
  });
  const line = (pts: string, w: number, cls: string) =>
    s("polyline", { points: pts, "stroke-width": String(w), class: cls, fill: "none", "stroke-linecap": "square", "stroke-linejoin": "miter" });
  svg.append(
    s("rect", { x: "0", y: "0", width: "400", height: "300", class: "ms-sky" }),
    s("rect", { x: "0", y: "300", width: "400", height: "150", class: "ms-earth" }),
    s("rect", { x: "0", y: "296", width: "400", height: "8", class: "ms-grass" }),
    // roots
    line("200,300 200,350 200,408", 14, "ms-bark-line"),
    line("196,304 150,340 100,364 70,392", 12, "ms-bark-line"),
    line("204,304 250,340 300,364 330,392", 12, "ms-bark-line"),
    // branches
    line("200,150 150,120 100,100 70,78", 12, "ms-bark-line"),
    line("200,150 250,120 300,100 330,78", 12, "ms-bark-line"),
    line("200,120 200,44", 12, "ms-bark-line"),
    // side limbs round the trunk
    line("190,214 130,214 66,218", 8, "ms-bark-line"),
    line("210,214 270,214 334,218", 8, "ms-bark-line"),
    // trunk
    s("polygon", { points: "176,100 224,100 222,200 232,300 168,300 178,200", class: "ms-bark" }),
  );
  // leaf blocks round the branches
  const leaves: [number, number, number, number][] = [
    [30, 40, 80, 30], [20, 60, 100, 24], [140, 14, 120, 26], [150, 90, 100, 20],
    [290, 40, 80, 30], [280, 60, 100, 24], [48, 100, 60, 16], [292, 100, 60, 16], [110, 60, 40, 14], [250, 60, 40, 14],
  ];
  for (const [x, y, w, hh] of leaves) svg.append(s("rect", { x: String(x), y: String(y), width: String(w), height: String(hh), class: "ms-leaf" }));
  return svg;
}

export function renderRealms(root: HTMLElement, deck: Deck) {
  const ROUNDS: Round[] = [
    {
      id: "label",
      label: "Label the tree",
      note: "Click a spot on the tree, then click its name. Or drag a name onto a spot. 1 point for each realm right first time.",
    },
    {
      id: "who",
      label: "Who lives here?",
      note: "A spot lights up. Pick who lives there. 1 point for each realm right first time.",
    },
  ];
  let roundId = "label";
  const realms = deck.items;
  const byId = new Map(realms.map((r) => [r.id, r]));
  const who = (r: Item) => r.data!.who as string;
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const { setup, game, results } = frame(root, deck);
  const NOTE = "The layout of the tree varies between old sources; this is the version most often drawn.";

  function renderSetup() {
    setupScreen(
      setup,
      deck,
      [
        h(
          "details",
          { class: "er-learn ms-learn", open: true },
          h("summary", {}, "Learn it first"),
          h(
            "p",
            {},
            "In Norse myth, nine worlds sit on Yggdrasil, a giant ash tree. Three are in the branches, three are around the trunk and three are in the roots.",
          ),
          h("ul", { class: "ms-learn-list" }, ...realms.map((r) => h("li", {}, h("strong", {}, r.name), `: ${who(r)}`))),
          h("p", { class: "muted" }, NOTE),
        ),
      ],
      ROUNDS,
      () => roundId,
      (id) => {
        roundId = id;
        renderSetup();
      },
      start,
    );
  }

  function start() {
    setup.hidden = true;
    results.hidden = true;
    game.hidden = false;
    play();
  }

  function play() {
    const label = roundId === "label";
    const done = new Set<string>(); // realms whose spot is filled
    const missed = new Set<string>(); // realms that took more than one go
    let selSpot: string | null = null;
    let selName: string | null = null;
    let current: string | null = null; // "who" round: the lit spot
    let finished = false;
    const order = shuffle(realms.map((r) => r.id));
    let step = 0;

    // ---- the tree ----
    const svg = treePicture();
    const spotEls = new Map<string, SVGElement>();
    for (const r of realms) {
      const p = SPOTS[r.id];
      const g = s("g", {
        class: "ms-spot",
        transform: `translate(${p.x} ${p.y})`,
        role: label ? "button" : "img",
        tabindex: "0",
        "data-spot": r.id,
      });
      g.append(
        s("circle", { r: "21", class: "ms-spot-bg" }),
        s("text", { class: "ms-q", "text-anchor": "middle", y: "7" }, "?"),
        s("rect", { x: "-56", y: "-15", width: "112", height: "30", rx: "0", class: "ms-pill" }),
        s("text", { class: "ms-pill-text", "text-anchor": "middle", y: "5" }, r.name),
      );
      g.addEventListener("click", () => onSpot(r.id));
      g.addEventListener("keydown", (e) => {
        const k = (e as KeyboardEvent).key;
        if (k === "Enter" || k === " ") {
          e.preventDefault();
          onSpot(r.id);
        }
      });
      spotEls.set(r.id, g);
      svg.append(g);
    }

    const feedback = h("p", { class: "tl-feedback ms-feedback", "aria-live": "polite" });
    const live = h("p", { class: "sc-sr", "aria-live": "polite" });
    const side = h("div", { class: "ms-side" });
    const chipEls = new Map<string, HTMLButtonElement>();

    // ---- state -> look ----
    function spotLabel(id: string) {
      const r = byId.get(id)!;
      const place = LEVEL_WORD[r.data!.level as string];
      if (done.has(id)) return `${r.name}, ${place}. ${cap(who(r))}.`;
      return `Spot ${place}${current === id ? ", lit up" : ""}${selSpot === id ? ", picked" : ""}. Empty.`;
    }
    function paint() {
      for (const [id, g] of spotEls) {
        g.classList.toggle("filled", done.has(id));
        g.classList.toggle("picked", selSpot === id);
        g.classList.toggle("lit", current === id);
        g.setAttribute("aria-label", spotLabel(id));
        // Spots stay in the tab order only while they can be used.
        const usable = label && !finished && !done.has(id);
        if (label) g.setAttribute("aria-pressed", String(selSpot === id));
        g.setAttribute("tabindex", usable ? "0" : "-1");
        g.classList.toggle("off", !usable);
      }
      for (const [id, b] of chipEls) {
        b.disabled = done.has(id) || finished;
        b.classList.toggle("picked", selName === id);
        b.setAttribute("aria-pressed", String(selName === id));
      }
    }
    const shake = (el: Element | undefined) => {
      if (!el) return;
      el.classList.remove("shake");
      void (el as HTMLElement).getBoundingClientRect();
      el.classList.add("shake");
      setTimeout(() => el.classList.remove("shake"), 400);
    };

    // ---- label round ----
    function judge(spotId: string, nameId: string) {
      if (finished || done.has(spotId)) return;
      selSpot = selName = null;
      if (spotId === nameId) {
        done.add(spotId);
        const r = byId.get(spotId)!;
        feedback.className = "tl-feedback ms-feedback good";
        feedback.textContent = `Yes. ${r.name}: ${who(r)}.`;
        live.textContent = feedback.textContent;
        if (done.size === realms.length) return finish();
        paint();
        // Move on to a spot that still needs a name.
        const next = realms.find((x) => !done.has(x.id));
        if (next) (spotEls.get(next.id) as unknown as HTMLElement).focus();
      } else {
        missed.add(spotId);
        feedback.className = "tl-feedback ms-feedback bad";
        feedback.textContent = "Not that one. Try again.";
        live.textContent = "Not that one. Try again.";
        selSpot = spotId;
        paint();
        shake(spotEls.get(spotId));
        shake(chipEls.get(nameId));
      }
    }
    function onSpot(id: string) {
      if (finished || done.has(id)) return;
      if (!label) return; // in "who", the lit spot is not clickable
      if (selName) return judge(id, selName);
      selSpot = selSpot === id ? null : id;
      feedback.className = "tl-feedback ms-feedback";
      feedback.textContent = selSpot ? `Picked a spot ${LEVEL_WORD[byId.get(id)!.data!.level as string]}. Now pick its name.` : "";
      paint();
    }
    function onName(id: string) {
      if (finished || done.has(id)) return;
      if (selSpot) return judge(selSpot, id);
      selName = selName === id ? null : id;
      feedback.className = "tl-feedback ms-feedback";
      feedback.textContent = selName ? `Holding ${byId.get(id)!.name}. Now pick its spot on the tree.` : "";
      paint();
    }

    // ---- name list, with drag onto the tree ----
    function nameChip(r: Item) {
      const b = h("button", { type: "button", class: "ms-chip", "aria-pressed": "false" }, r.name);
      let from: { x: number; y: number } | null = null;
      let dragging = false;
      let ghost: HTMLElement | null = null;
      let hover: Element | null = null;
      let wasDrag = false;
      const spotAt = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<SVGElement>("[data-spot]") ?? null;
      b.addEventListener("pointerdown", (e) => {
        if (b.disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
        from = { x: e.clientX, y: e.clientY };
        dragging = false;
        wasDrag = false;
        b.setPointerCapture(e.pointerId);
      });
      b.addEventListener("pointermove", (e) => {
        if (!from) return;
        if (!dragging && Math.hypot(e.clientX - from.x, e.clientY - from.y) > 8) {
          dragging = true;
          ghost = h("div", { class: "ms-ghost" }, r.name);
          document.body.append(ghost);
        }
        if (!dragging || !ghost) return;
        ghost.style.left = `${e.clientX}px`;
        ghost.style.top = `${e.clientY}px`;
        const sp = spotAt(e.clientX, e.clientY);
        if (hover !== sp) {
          hover?.classList.remove("hover");
          sp?.classList.add("hover");
          hover = sp;
        }
      });
      const end = (e: PointerEvent, cancelled: boolean) => {
        if (!from) return;
        from = null;
        if (b.hasPointerCapture(e.pointerId)) b.releasePointerCapture(e.pointerId);
        if (dragging) {
          dragging = false;
          wasDrag = true;
          ghost?.remove();
          ghost = null;
          hover?.classList.remove("hover");
          hover = null;
          const sp = cancelled ? null : spotAt(e.clientX, e.clientY);
          if (sp) judge(sp.getAttribute("data-spot")!, r.id);
        }
      };
      b.addEventListener("pointerup", (e) => end(e, false));
      b.addEventListener("pointercancel", (e) => end(e, true));
      b.addEventListener("click", () => {
        if (wasDrag) {
          wasDrag = false;
          return;
        }
        onName(r.id);
      });
      chipEls.set(r.id, b);
      return b;
    }

    // ---- who round ----
    const optionsBox = h("div", { class: "ms-options", role: "group", "aria-label": "Who lives here?" });
    const nextBtn = h("button", { type: "button", class: "btn primary", onclick: () => nextWho() }, "Next ▸");
    nextBtn.hidden = true;
    let optEls: HTMLButtonElement[] = [];
    function askWho() {
      current = order[step];
      selSpot = null;
      nextBtn.hidden = true;
      const right = byId.get(current)!;
      const others = shuffle(realms.filter((r) => r !== right && who(r) !== who(right))).slice(0, 3);
      optEls = shuffle([right, ...others]).map((r) =>
        h(
          "button",
          {
            type: "button",
            class: "ms-opt",
            onclick: () => pickWho(r, right),
          },
          cap(who(r)),
        ),
      );
      optionsBox.replaceChildren(...optEls);
      feedback.className = "tl-feedback ms-feedback";
      feedback.textContent = `Who lives in the lit spot ${LEVEL_WORD[right.data!.level as string]}? (${step + 1} of ${realms.length})`;
      live.textContent = feedback.textContent;
      paint();
    }
    function pickWho(chosen: Item, right: Item) {
      if (chosen === right) {
        done.add(right.id);
        current = null;
        optEls.forEach((b) => (b.disabled = true));
        optEls.find((b) => b.textContent === cap(who(right)))?.classList.add("right");
        feedback.className = "tl-feedback ms-feedback good";
        feedback.textContent = `Yes. That is ${right.name}.`;
        live.textContent = feedback.textContent;
        paint();
        if (step + 1 >= realms.length) {
          nextBtn.textContent = "See results ▸";
        }
        nextBtn.hidden = false;
        nextBtn.focus();
      } else {
        missed.add(right.id);
        const b = optEls.find((x) => x.textContent === cap(who(chosen)))!;
        b.disabled = true;
        b.classList.add("wrong");
        shake(b);
        feedback.className = "tl-feedback ms-feedback bad";
        feedback.textContent = "Not quite. Try another.";
        live.textContent = "Not quite. Try another.";
      }
    }
    function nextWho() {
      if (step + 1 >= realms.length) return finish();
      step++;
      askWho();
      optEls[0]?.focus();
    }

    // ---- the end ----
    function finish() {
      finished = true;
      current = selSpot = selName = null;
      paint();
      optionsBox.replaceChildren();
      nextBtn.hidden = true;
      const n = realms.length - missed.size;
      feedback.className = `tl-feedback ms-feedback ${n === realms.length ? "good" : "ok"}`;
      feedback.textContent = `${n} of ${realms.length} right first time.`;
      live.textContent = feedback.textContent;
      side.replaceChildren(
        h("p", { class: "sc-label" }, "Who lives where"),
        h(
          "ul",
          { class: "ms-who" },
          ...realms.map((r) =>
            h(
              "li",
              { class: missed.has(r.id) ? "bad" : "good" },
              h("strong", {}, r.name),
              h("span", {}, ` ${LEVEL_WORD[r.data!.level as string]}: ${who(r)}.`),
            ),
          ),
        ),
        h("p", { class: "muted ms-note" }, NOTE),
      );
      recordGame(
        { deck: deck.id, variant: roundId, score: n, total: realms.length, seconds: 0, date: Date.now() },
        realms.filter((r) => !missed.has(r.id)).map((r) => r.id),
        realms.filter((r) => missed.has(r.id)).map((r) => r.id),
      );
      resultsScreen(
        results,
        deck,
        roundId,
        n,
        realms.length,
        ["You know the nine realms.", "Not bad. Read the list and go again.", "Nine worlds is a lot. Go again."],
        () => start(),
        () => {
          results.hidden = true;
          game.hidden = true;
          setup.hidden = false;
          renderSetup();
        },
      );
      results.querySelector<HTMLElement>(".btn.primary")?.focus();
    }

    // ---- put it together ----
    if (label) {
      side.append(
        h("p", { class: "sc-label" }, "The nine realms"),
        h("div", { class: "ms-chips", role: "group", "aria-label": "Realm names" }, ...shuffle(realms).map(nameChip)),
        h("p", { class: "muted sc-how" }, "Click a spot, then a name. Or drag a name onto a spot. Keyboard: Tab to a spot, Enter, then Tab to a name and Enter."),
      );
      feedback.textContent = "Click a spot on the tree to begin.";
    } else {
      side.append(
        h("p", { class: "sc-label" }, "Who lives in the lit spot?"),
        optionsBox,
        h("div", { class: "tl-actions" }, nextBtn),
      );
    }
    game.replaceChildren(
      h(
        "div",
        { class: "ms-layout" },
        h("div", { class: "ms-tree-wrap" }, svg),
        h("div", { class: "ms-panel" }, feedback, live, side),
      ),
    );
    paint();
    if (!label) askWho();
  }

  renderSetup();
  return () => {};
}
