import type { Deck } from "../engine/types";
import { gamesFor } from "../engine/storage";
import { h } from "./dom";

const COMING = [
  ["Flags", "Match every flag to its country"],
  ["Capitals", "From Canberra to Ouagadougou"],
  ["Seas & Lakes", "The water between the countries"],
  ["Airport Codes", "MEL, SIN, LHR and the rest"],
  ["The Overworld", "Walk a pixel hero between games"],
];

export function renderHome(root: HTMLElement, decks: Deck[]) {
  const cards = decks.map((deck) => {
    const games = gamesFor(deck.id);
    const best = games.reduce<number>((m, g) => Math.max(m, g.score / g.total), 0);
    return h(
      "a",
      { class: "card", href: `#${deck.id}` },
      h("span", { class: "card-kicker" }, `${deck.items.length} ${deck.noun}`),
      h("h2", {}, deck.title),
      h("p", {}, deck.blurb),
      h(
        "span",
        { class: "card-foot" },
        games.length
          ? `${games.length} ${games.length === 1 ? "round" : "rounds"} played · best ${Math.round(best * 100)}%`
          : "Not played yet",
        h("span", { class: "card-go" }, "Play ▸"),
      ),
    );
  });

  root.replaceChildren(
    h(
      "main",
      { class: "home" },
      h(
        "header",
        { class: "home-head" },
        h("h1", { class: "logo" }, "Recall", h("span", {}, "Arcade")),
        h("p", { class: "lede" }, "Short timed rounds you play again and again until it sticks."),
      ),
      h("section", { class: "cards", "aria-label": "Games" }, ...cards),
      h(
        "section",
        { class: "soon", "aria-label": "Coming later" },
        h("h3", {}, "On the drawing board"),
        h("ul", {}, ...COMING.map(([t, d]) => h("li", {}, h("strong", {}, t), h("span", {}, d)))),
      ),
    ),
  );
}
