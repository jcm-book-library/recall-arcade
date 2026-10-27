import type { Deck } from "../engine/types";
import { gamesFor } from "../engine/storage";
import { h } from "./dom";

// The subjects, six quizzes each. Planned ones would show as "coming".
const SUBJECTS: { name: string; planned: string[] }[] = [
  { name: "Geography", planned: [] },
  { name: "Science", planned: [] },
  { name: "History", planned: [] },
  { name: "Travel & Transport", planned: [] },
  { name: "Nature & Animals", planned: [] },
  { name: "Music", planned: [] },
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

// Arcade games are real-time games rather than quizzes, so they have no progress or best score yet.
// To add one: write its screen, add a route in main.ts, and add a line to this list.
const ARCADE_GAMES: { id: string; title: string; blurb: string }[] = [
  { id: "pong", title: "Planet Pong", blurb: "Where video games began. Knock the planets past the computer, mind the asteroids." },
  { id: "labyrinth", title: "The Labyrinth", blurb: "Keys, locked doors, bats, and something big that lives in the middle. Find the stairs." },
  { id: "flyover", title: "Flyover", blurb: "Fly a Cessna, then a jet, then a jumbo across the continents. Pick the right airport code at every stop, and dodge the storms." },
];

function arcadeCard(game: (typeof ARCADE_GAMES)[number]) {
  return h(
    "a",
    { class: "card", href: `#${game.id}` },
    h("span", { class: "card-kicker" }, "Arcade game"),
    h("h2", {}, game.title),
    h("p", {}, game.blurb),
    h("span", { class: "card-foot card-foot-end" }, h("span", { class: "card-go" }, "Play ▸")),
  );
}

export function renderHome(root: HTMLElement, decks: Deck[]) {
  const sections = SUBJECTS.map((s) => {
    const built = decks.filter((d) => d.subject === s.name && !d.hidden);
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
        { class: "subject", "aria-label": "The Arcade (preview)" },
        h("div", { class: "subject-head" }, h("h2", {}, "The Arcade (preview)")),
        h("div", { class: "cards" }, ...ARCADE_GAMES.map(arcadeCard)),
      ),
      h(
        "section",
        { class: "soon", "aria-label": "Coming later" },
        h("h3", {}, "On the drawing board"),
        h("ul", {}, h("li", {}, h("strong", {}, "The Overworld"), h("span", {}, "Walk a pixel hero between games"))),
      ),
    ),
  );
}
