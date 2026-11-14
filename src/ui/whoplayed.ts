// WHO PLAYED WHO: an actor and a film or show, and you type the character. Or the other way round.
//   char    "Name the character"  the actor's portrait, name and the film or show appear. Type the character.
//   actor   "Name the actor"      the character and the film or show appear. Type the actor.
// Rounds: "Australian actors and shows" (the starter) and "Everyone". Scores are saved under the
// variant "<way>-<round>", for example "char-aus". Portraits come from Wikipedia after the question is
// drawn (free licences only); if they do not arrive the question works without a picture.
import type { Deck } from "../engine/types";
import { normalize } from "../engine/matcher";
import { bestFor, recordGame } from "../engine/storage";
import { loadPicturesFor, type Picture } from "../data/pictures";
import { h } from "./dom";
import { WHO_PLAYED, type WhoPlayed } from "../decks/entertainment-data";
import { entFrame, wayRows, matchesAny, resultsPanel, shuffle } from "./ent-common";
import { topicTabs } from "./quiz-shell";
import "./sport.css";
import "./entertainment.css";

type Way = "char" | "actor";
type Round = "aus" | "all";

const QUESTIONS = 10;

const WAYS: { id: Way; label: string; note: string }[] = [
  { id: "char", label: "Name the character", note: "An actor and a film or show appear. Type the character they played." },
  { id: "actor", label: "Name the actor", note: "A character and a film or show appear. Type the actor who played them." },
];
const ROUNDS: { id: Round; label: string }[] = [
  { id: "aus", label: "★ Australian actors and shows" },
  { id: "all", label: "Everyone" },
];

export function renderWhoPlayed(root: HTMLElement, deck: Deck) {
  let way: Way = "char";
  let round: Round = "aus";
  let startedAt = 0;
  let alive = true;

  const { setup, game, results } = entFrame(root, deck, "An actor and a film or show appear: name the character. Or the other way round.");

  const variant = () => `${way}-${round}`;
  const poolOf = () => WHO_PLAYED.filter((w) => round === "all" || w.aus);

  function renderSetup() {
    const size = poolOf().length;
    setup.replaceChildren(
      topicTabs({
        tabs: ROUNDS.map((r) => ({ id: r.id, label: r.label.replace("★ ", "") })),
        active: round,
        note: "Famous roles in films and TV. The portraits come from Wikipedia and may take a moment.",
        onPick: (id) => {
          round = id as Round;
          renderSetup();
          setup.querySelector<HTMLElement>(".qtab.on")?.focus();
        },
      }),
      wayRows({
        deckId: deck.id,
        current: way,
        ways: WAYS.map((w) => ({ id: w.id, name: w.label, key: `${w.id}-${round}`, desc: `${w.note} ${Math.min(QUESTIONS, size)} questions from ${size} roles.` })),
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

  function start() {
    setup.hidden = true;
    results.hidden = true;
    game.hidden = false;
    startedAt = Date.now();
    const qs = shuffle(poolOf()).slice(0, QUESTIONS);
    // Ask Wikipedia for this round's portraits once; each question picks its own up when it arrives.
    const titles: Record<string, string> = {};
    for (const q of qs) titles[q.id] = q.wiki;
    const pics = loadPicturesFor(`whoplayed:${qs.map((q) => q.id).join(",")}`, titles);
    let i = 0;
    let score = 0;
    const found: string[] = [];
    const missed: string[] = [];

    function showPortrait(slot: HTMLElement, credit: HTMLElement, q: WhoPlayed) {
      pics
        .then((map) => {
          const pic: Picture | undefined = map.get(q.id);
          if (!alive || !pic || !slot.isConnected) {
            slot.hidden = true;
            return;
          }
          const img = document.createElement("img");
          img.src = pic.src;
          img.alt = `Portrait of ${q.actor}`;
          img.onerror = () => {
            slot.hidden = true;
            credit.hidden = true;
          };
          slot.classList.remove("pending");
          slot.append(img);
          credit.replaceChildren(h("a", { class: "credit", href: pic.page, target: "_blank", rel: "noopener" }, `Photo: ${pic.artist} · ${pic.license}`));
          credit.hidden = false;
        })
        .catch(() => {
          slot.hidden = true;
        });
    }

    function show() {
      const q = qs[i];
      const charWay = way === "char";
      const input = h("input", {
        class: "answer", type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false",
        "aria-label": charWay ? "Name of the character" : "Name of the actor",
        placeholder: charWay ? "Type the character" : "Type the actor",
      });
      const feedback = h("p", { class: "tl-feedback", "aria-live": "polite" });
      const reveal = h("div", { class: "sc-reveal sp-reveal" });
      reveal.hidden = true;
      const next = h("button", { type: "button", class: "btn primary", onclick: advance }, i + 1 < qs.length ? "Next ▸" : "See results ▸");
      next.hidden = true;
      const pic = h("div", { class: "wp-pic pending", role: "img", "aria-label": "Portrait loading" });
      pic.hidden = !charWay; // in "Name the actor" the portrait would give the answer away
      const credit = h("p", { class: "wp-credit" });
      credit.hidden = true;
      const checkBtn = h("button", { type: "button", class: "btn primary", onclick: () => answer(false) }, "Check");
      const giveUp = h("button", { type: "button", class: "btn ghost", onclick: () => answer(true) }, "Give up");
      const scoreEl = h("span", { class: "tl-score" }, `Score: ${score}`);

      function answer(gaveUp: boolean) {
        const text = input.value;
        if (!gaveUp && !normalize(text)) {
          feedback.className = "tl-feedback ok";
          feedback.textContent = "Type an answer first, or give up.";
          input.focus();
          return;
        }
        const right = !gaveUp && matchesAny(text, charWay ? q.charAccept : q.actorAccept);
        if (right) {
          score++;
          found.push(q.id);
        } else missed.push(q.id);
        input.disabled = checkBtn.disabled = giveUp.disabled = true;
        checkBtn.hidden = giveUp.hidden = true;
        feedback.className = `tl-feedback ${right ? "good" : "bad"}`;
        feedback.textContent = right ? "Right! +1" : gaveUp ? "No worries. Here it is." : "Not this time.";
        reveal.replaceChildren(
          h("p", { class: "sp-answer" }, charWay ? q.character : q.actor),
          h("p", {}, `${q.actor} played ${q.character} in ${q.title} (${q.year}).`),
          ...(q.note ? [h("p", { class: "muted" }, q.note)] : []),
        );
        reveal.hidden = false;
        if (!charWay) {
          pic.hidden = false;
          showPortrait(pic, credit, q);
        }
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

      const voice = /voice/i.test(q.note) ? " (voice)" : "";
      game.replaceChildren(
        h(
          "div",
          { class: "tl-card sp-card wp-card" },
          h("span", { class: "tl-count" }, `Question ${i + 1} of ${qs.length}`),
          charWay ? pic : null,
          charWay ? credit : null,
          h("p", { class: "wp-who" }, charWay ? `${q.actor}${voice}` : q.character),
          h("p", { class: "wp-where" }, `in ${q.title} (${q.year})`),
          h("p", { class: "tl-event sp-ask" }, charWay ? `Who did ${q.actor} play?` : `Who played ${q.character}?`),
          h("div", { class: "sp-input-row" }, input, checkBtn, giveUp),
          feedback,
          reveal,
          charWay ? null : pic,
          charWay ? null : credit,
          h("div", { class: "tl-actions sp-actions" }, scoreEl, next),
        ),
      );
      if (charWay) showPortrait(pic, credit, q);
      input.focus();
    }

    function advance() {
      i++;
      if (i < qs.length) show();
      else finish(score, qs.length, found, missed);
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
        verdicts: ["Top effort. You know your stars.", "Not bad at all.", "Have another go. It sinks in."],
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
  return () => {
    alive = false;
  };
}
