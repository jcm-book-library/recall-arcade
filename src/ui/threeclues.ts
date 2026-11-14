// THREE CLUES: guess a film or TV show from clues. The fewer clues you need, the more points.
//   clues  "Three clues"     clue 1 is worth 3 points, clue 2 worth 2, clue 3 worth 1.
//   emoji  "Emoji"           an emoji puzzle is worth 2 points; the easy clue is a hint worth 1.
//   scene  "Picture reveal"  the owner's own pixel art, shown blocky and getting sharper in 4 steps: 4, 3, 2, 1 points.
// You can type a guess at any time. Wrong guesses cost nothing; asking for the next clue does.
// Rounds (clues and emoji): Films, TV shows, Australian, Everything. Scores are saved under the variant
// "<way>-<round>", for example "clues-aus" or "scene-all".
//
// The picture reveal reads public/entertainment/scenes/scenes.json (see the README in that folder). With no
// drawings listed, the mode is hidden and the setup says so.
import type { Deck } from "../engine/types";
import { normalize } from "../engine/matcher";
import { bestFor, recordGame } from "../engine/storage";
import { h } from "./dom";
import { MOVIES, type EntMovie } from "../decks/entertainment-data";
import { entFrame, wayRows, matchesAny, resultsPanel, shuffle } from "./ent-common";
import { topicTabs } from "./quiz-shell";
import "./sport.css";
import "./entertainment.css";

type Way = "clues" | "emoji" | "scene";
type Round = "films" | "tv" | "aus" | "all";

const QUESTIONS = 10;
const SCENES_URL = "entertainment/scenes/scenes.json";
const SCENES_DIR = "entertainment/scenes/";
/** How much of the picture's own width is used at each step. Step 4 is the full drawing. */
const STEPS = [0.1, 0.2, 0.5, 1];

interface Scene {
  title: string;
  year?: number;
  file: string;
  also?: string[];
}

const WAYS: { id: Way; label: string; note: string }[] = [
  { id: "clues", label: "Three clues", note: "Clue 1 is worth 3 points. Ask for another clue and it drops to 2, then 1. Type your guess any time." },
  { id: "emoji", label: "Emoji", note: "An emoji puzzle is worth 2 points. Ask for a hint and it drops to 1." },
  { id: "scene", label: "Picture reveal", note: "A drawing starts blocky and gets sharper. Guess early for 4 points. It drops to 3, 2, then 1." },
];
const ROUNDS: { id: Round; label: string }[] = [
  { id: "films", label: "Films" },
  { id: "tv", label: "TV shows" },
  { id: "aus", label: "Australian" },
  { id: "all", label: "Everything" },
];

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** What counts as the right title for a drawing: the film's own accepted names if the title is in the list. */
function sceneAccept(s: Scene): string[] {
  const known = MOVIES.find((m) => normalize(m.title) === normalize(s.title));
  const own = [s.title, s.title.split(":")[0], ...(s.title.includes(":") ? [s.title.split(":").slice(1).join(":")] : [])];
  return [...(known?.accept ?? []), ...own, ...(s.also ?? [])].filter((x) => x.trim());
}

let scenesPromise: Promise<Scene[]> | null = null;
/** The listed drawings, or none if the file is missing or not valid. Asked for once. */
function loadScenes(): Promise<Scene[]> {
  scenesPromise ??= fetch(SCENES_URL)
    .then((r) => (r.ok ? r.json() : []))
    .then((list: unknown) =>
      Array.isArray(list)
        ? (list as Scene[]).filter((s) => s && typeof s.title === "string" && s.title.trim() && typeof s.file === "string" && s.file.trim())
        : [],
    )
    .catch(() => []);
  return scenesPromise;
}

/** One question: what to show at each stage, what is worth how much, and what counts as right. */
interface Q {
  id: string;
  title: string;
  /** "1986 · Film" */
  detail: string;
  accept: string[];
  stages: number;
  worth: (stage: number) => number;
  /** The label of the button that moves on to the next stage. */
  more: string;
  /** Draws the clue area for a stage (1 is the first). */
  draw: (host: HTMLElement, stage: number) => void;
}

export function renderThreeClues(root: HTMLElement, deck: Deck) {
  let way: Way = "clues";
  let round: Round = "films";
  let scenes: Scene[] = [];
  let scenesChecked = false;
  let startedAt = 0;

  const { setup, game, results } = entFrame(root, deck, "Guess the film or show from the clues. The fewer clues you need, the more points.");

  const variant = () => (way === "scene" ? "scene-all" : `${way}-${round}`);
  const inRound = (m: EntMovie) => (round === "all" ? true : round === "aus" ? !!m.aus : round === "tv" ? m.kind === "tv" : m.kind === "film");
  const poolOf = (): EntMovie[] => MOVIES.filter((m) => (way === "emoji" ? !!m.emoji : true) && inRound(m));
  const poolSize = () => (way === "scene" ? scenes.length : poolOf().length);
  const kindWord = (m: EntMovie) => (m.kind === "tv" ? "TV show" : "Film");

  function renderSetup() {
    if (way === "scene" && scenes.length === 0) way = "clues";
    const ways = WAYS.filter((w) => w.id !== "scene" || scenes.length > 0);
    const sizeOf = (w: Way) => (w === "scene" ? scenes.length : MOVIES.filter((m) => (w === "emoji" ? !!m.emoji : true) && inRound(m)).length);
    setup.replaceChildren(
      topicTabs({
        tabs: ROUNDS.map((r) => ({ id: r.id, label: r.label })),
        active: round,
        note: scenes.length ? "Pick a round. Picture reveal always uses all the drawings." : "Pick a round.",
        onPick: (id) => {
          round = id as Round;
          renderSetup();
          setup.querySelector<HTMLElement>(".qtab.on")?.focus();
        },
      }),
      ...(scenesChecked && scenes.length === 0 ? [h("p", { class: "qtabnote tc-soon" }, "Picture reveal: coming once the first drawings are added.")] : []),
      wayRows({
        deckId: deck.id,
        current: way,
        ways: ways.map((w) => {
          const n = sizeOf(w.id);
          return {
            id: w.id,
            name: w.label,
            key: w.id === "scene" ? "scene-all" : `${w.id}-${round}`,
            desc: `${w.note} ${n ? `${Math.min(QUESTIONS, n)} questions from ${n}.` : "Nothing in this round yet."}`,
            disabled: n === 0,
          };
        }),
        onPick: (id) => {
          way = id as Way;
          renderSetup();
        },
        onStart: (id) => {
          way = id as Way;
          start();
        },
      }),
    );
  }

  // ---------- building the questions ----------
  function clueQ(m: EntMovie): Q {
    return {
      id: m.id, title: m.title, detail: `${m.year} · ${kindWord(m)}`, accept: m.accept, stages: 3, worth: (s) => 4 - s, more: "Another clue ▸",
      draw: (host, stage) => {
        host.replaceChildren(
          h("ol", { class: "tc-clues" }, ...m.clues.slice(0, stage).map((c, k) =>
            h("li", { class: `tc-clue${k === stage - 1 ? " new" : ""}` }, h("span", { class: "tc-worth" }, `Clue ${k + 1} · worth ${4 - (k + 1)} ${4 - (k + 1) === 1 ? "point" : "points"}`), c))),
        );
      },
    };
  }
  function emojiQ(m: EntMovie): Q {
    return {
      id: m.id, title: m.title, detail: `${m.year} · ${kindWord(m)}`, accept: m.accept, stages: 2, worth: (s) => 3 - s, more: "Show a hint ▸",
      draw: (host, stage) => {
        host.replaceChildren(
          h("p", { class: "tc-emoji", role: "img", "aria-label": `Emoji puzzle: ${m.emoji}` }, m.emoji),
          h("p", { class: "muted" }, `It is a ${m.kind === "tv" ? "TV show" : "film"}.`),
          ...(stage >= 2 ? [h("ol", { class: "tc-clues" }, h("li", { class: "tc-clue new" }, h("span", { class: "tc-worth" }, "Hint · worth 1 point"), m.clues[2]))] : []),
        );
      },
    };
  }
  function sceneQ(s: Scene): Q {
    const img = new Image();
    img.src = SCENES_DIR + encodeURIComponent(s.file);
    return {
      id: `scene-${slug(s.title)}${s.year ? `-${s.year}` : ""}`, title: s.title, detail: s.year ? String(s.year) : "", accept: sceneAccept(s), stages: 4, worth: (st) => 5 - st, more: "Sharper picture ▸",
      draw: (host, stage) => {
        const canvas = h("canvas", { class: "tc-canvas", role: "img", "aria-label": `A drawing, step ${stage} of 4` });
        host.replaceChildren(canvas, h("p", { class: "muted" }, "A drawing from the owner's own pixel art."));
        const paint = () => {
          const w = 360;
          const ratio = img.naturalHeight / img.naturalWidth || 0.75;
          canvas.width = w;
          canvas.height = Math.round(w * ratio);
          canvas.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
          const ctx = canvas.getContext("2d")!;
          // Draw small, then blow it up without smoothing: that gives big square blocks.
          const sw = Math.max(4, Math.round(img.naturalWidth * STEPS[stage - 1]));
          const sh = Math.max(4, Math.round(sw * ratio));
          const small = document.createElement("canvas");
          small.width = sw;
          small.height = sh;
          const sctx = small.getContext("2d")!;
          sctx.imageSmoothingEnabled = false;
          sctx.drawImage(img, 0, 0, sw, sh);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
        };
        if (img.complete && img.naturalWidth) paint();
        else img.addEventListener("load", paint, { once: true });
      },
    };
  }

  function start() {
    setup.hidden = true;
    results.hidden = true;
    game.hidden = false;
    startedAt = Date.now();
    const qs: Q[] =
      way === "scene" ? shuffle(scenes).slice(0, QUESTIONS).map(sceneQ) : shuffle(poolOf()).slice(0, QUESTIONS).map(way === "emoji" ? emojiQ : clueQ);
    let i = 0;
    let score = 0;
    let total = 0;
    const found: string[] = [];
    const missed: string[] = [];
    const maxOf = (q: Q) => q.worth(1);

    function show() {
      const q = qs[i];
      let stage = 1;
      let over = false;
      const host = h("div", { class: "tc-host" });
      const worthLine = h("p", { class: "tl-event sp-ask", "aria-live": "polite" });
      const input = h("input", {
        class: "answer", type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false",
        "aria-label": "Type the title", placeholder: "Type the title",
      });
      const feedback = h("p", { class: "tl-feedback", "aria-live": "polite" });
      const reveal = h("div", { class: "sc-reveal sp-reveal" });
      reveal.hidden = true;
      const next = h("button", { type: "button", class: "btn primary", onclick: advance }, i + 1 < qs.length ? "Next ▸" : "See results ▸");
      next.hidden = true;
      const scoreEl = h("span", { class: "tl-score" }, `Score: ${score}`);
      const checkBtn = h("button", { type: "button", class: "btn primary", onclick: () => answer(false) }, "Check");
      const moreBtn = h("button", { type: "button", class: "btn ghost", onclick: moreClue }, q.more);
      const giveUp = h("button", { type: "button", class: "btn ghost", onclick: () => answer(true) }, "Give up");

      function paint() {
        const pts = q.worth(stage);
        worthLine.textContent = `Worth ${pts} ${pts === 1 ? "point" : "points"} now`;
        q.draw(host, stage);
        moreBtn.hidden = stage >= q.stages;
      }
      function moreClue() {
        if (over || stage >= q.stages) return;
        stage++;
        paint();
        feedback.textContent = "";
        feedback.className = "tl-feedback";
        input.focus();
      }
      function answer(gaveUp: boolean) {
        if (over) return;
        const text = input.value;
        if (!gaveUp && !normalize(text)) {
          feedback.className = "tl-feedback ok";
          feedback.textContent = "Type a guess first, or ask for more.";
          input.focus();
          return;
        }
        const right = !gaveUp && matchesAny(text, q.accept);
        if (!right && !gaveUp) {
          feedback.className = "tl-feedback bad";
          feedback.textContent = stage < q.stages ? "Not that one. Try again, or ask for more." : "Not that one. Try again, or give up.";
          input.classList.remove("nope");
          void input.offsetWidth;
          input.classList.add("nope");
          input.focus();
          return;
        }
        over = true;
        const pts = right ? q.worth(stage) : 0;
        score += pts;
        total += maxOf(q);
        (right ? found : missed).push(q.id);
        input.disabled = checkBtn.disabled = giveUp.disabled = true;
        checkBtn.hidden = giveUp.hidden = moreBtn.hidden = true;
        feedback.className = `tl-feedback ${right ? "good" : "bad"}`;
        feedback.textContent = right ? `Right! +${pts}` : "No worries. Here it is.";
        reveal.replaceChildren(h("p", { class: "sp-answer" }, q.title), ...(q.detail ? [h("p", { class: "muted" }, q.detail)] : []));
        reveal.hidden = false;
        // Show everything now that the round for this title is over.
        if (way === "clues" && stage < 3) {
          const m = MOVIES.find((x) => x.id === q.id)!;
          host.replaceChildren(h("ol", { class: "tc-clues" }, ...m.clues.map((c, k) => h("li", { class: "tc-clue" }, h("span", { class: "tc-worth" }, `Clue ${k + 1}`), c))));
        }
        if (way === "scene") q.draw(host, q.stages);
        worthLine.textContent = right ? "Got it" : "The answer";
        scoreEl.textContent = `Score: ${score}`;
        next.hidden = false;
        next.focus();
      }
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          answer(false);
        }
      });
      game.replaceChildren(
        h(
          "div",
          { class: "tl-card sp-card" },
          h("span", { class: "tl-count" }, `Question ${i + 1} of ${qs.length}`),
          worthLine,
          host,
          h("div", { class: "sp-input-row" }, input, checkBtn, moreBtn, giveUp),
          feedback,
          reveal,
          h("div", { class: "tl-actions sp-actions" }, scoreEl, next),
        ),
      );
      paint();
      input.focus();
    }

    function advance() {
      i++;
      if (i < qs.length) show();
      else finish(score, total, found, missed);
    }
    show();
  }

  function finish(score: number, total: number, found: string[], missed: string[]) {
    game.hidden = true;
    const prev = bestFor(deck.id, variant());
    recordGame({ deck: deck.id, variant: variant(), score, total, seconds: Math.round((Date.now() - startedAt) / 1000), date: Date.now() }, found, missed);
    results.replaceChildren(
      resultsPanel({
        score, total, prev,
        verdicts: ["Top effort. A true movie buff.", "Not bad at all.", "Have another go. It sinks in."],
        onAgain: start,
        onChange: () => {
          results.hidden = true;
          setup.hidden = false;
          renderSetup();
          setup.querySelector<HTMLElement>(".qrow.current .qgo")?.focus();
        },
      }),
    );
    results.hidden = false;
    results.querySelector<HTMLElement>(".btn.primary")?.focus();
  }

  renderSetup();
  let alive = true;
  loadScenes().then((list) => {
    scenes = list;
    scenesChecked = true;
    if (alive && !setup.hidden) renderSetup();
  });
  return () => {
    alive = false;
  };
}
