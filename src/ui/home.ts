import type { Deck } from "../engine/types";
import { gamesFor } from "../engine/storage";
import { h } from "./dom";

// The five subjects, each aiming for six quizzes. Planned ones show as "coming".
const SUBJECTS: { name: string; planned: string[] }[] = [
  { name: "Geography", planned: ["Territories", "Neighbours"] },
  { name: "Science", planned: ["Physics: Units & Forces", "Organs & Body Systems"] },
  { name: "History", planned: ["Australian Prime Ministers", "Europe in 1914", "The Ancient World", "Inventions", "Trivia Round"] },
  { name: "Travel & Transport", planned: ["NATO Alphabet", "Airlines", "Currencies", "Time Zones", "Landmarks"] },
  { name: "Nature & Animals", planned: ["Australian Animals", "Animal Groups", "Dog Breeds", "Where Animals Live", "Baby Animals", "Dinosaurs"] },
];

function card(deck: Deck) {
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
}

export function renderHome(root: HTMLElement, decks: Deck[]) {
  const sections = SUBJECTS.map((s) => {
    const built = decks.filter((d) => d.subject === s.name);
    return h(
      "section",
      { class: "subject", "aria-label": s.name },
      h(
        "div",
        { class: "subject-head" },
        // The pixel font's "&" looks like a "$", so spell it out in headings.
        h("h2", {}, s.name.replace(" & ", " and ")),
        h("span", { class: "subject-count" }, `${built.length} of 6`),
      ),
      h(
        "div",
        { class: "cards" },
        ...built.map(card),
        s.planned.length
          ? h(
              "div",
              { class: "card soon-card" },
              h("span", { class: "card-kicker" }, "Coming"),
              h("ul", {}, ...s.planned.map((p) => h("li", {}, p))),
            )
          : null,
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
        h("p", { class: "lede" }, "Short timed rounds you play again and again until it sticks. ★ marks the easy starter round in each game."),
      ),
      ...sections,
      h(
        "section",
        { class: "soon", "aria-label": "Coming later" },
        h("h3", {}, "On the drawing board"),
        h("ul", {}, h("li", {}, h("strong", {}, "The Overworld"), h("span", {}, "Walk a pixel hero between games"))),
      ),
    ),
  );
}
