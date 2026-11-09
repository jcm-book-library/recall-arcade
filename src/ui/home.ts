import type { Deck } from "../engine/types";
import { gamesFor } from "../engine/storage";
import { h } from "./dom";
import { GAME_BLURB, GAME_NAME, GAME_ROUTE } from "../arcade/brawl/names";
import { ARCADE_OPENS_AT, CHALLENGES, SUBJECT_NAMES, challengeDone, clearedSubjects, rememberTrack, trackFor } from "../engine/progress";

// The subjects, about six quizzes each. Planned ones would show as "coming".
const SUBJECTS: { name: string; planned: string[] }[] = [
  { name: "Geography", planned: [] },
  { name: "Science", planned: [] },
  { name: "History", planned: [] },
  { name: "Travel & Transport", planned: [] },
  { name: "Nature & Animals", planned: [] },
  { name: "Music", planned: [] },
  { name: "Sport", planned: [] },
  { name: "Entertainment", planned: [] },
];

/** The quiz's Easy challenge, ticked once it's done. */
function challengeLine(deck: Deck) {
  const c = CHALLENGES[deck.id];
  if (!c) return null;
  const done = challengeDone(deck.id);
  return h(
    "span",
    { class: `card-challenge${done ? " done" : ""}` },
    done ? `✓ Challenge done: ${c.label}` : `Challenge: ${c.label}`,
  );
}

function card(deck: Deck) {
  const games = gamesFor(deck.id);
  const best = games.reduce<number>((m, g) => Math.max(m, g.score / g.total), 0);
  return h(
    "a",
    { class: "card", href: `#${deck.id}` },
    h("span", { class: "card-kicker" }, `${deck.items.length} ${deck.noun}`),
    h("h2", {}, deck.title),
    h("p", {}, deck.blurb),
    challengeLine(deck),
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

// Arcade games are real-time games rather than quizzes, so they have no progress or best score here.
// To add one: write its screen, add a route in main.ts, and add a line to this list.
// Which games are open depends on quiz challenges (ARCADE_OPENS_AT in engine/progress.ts).
export const ARCADE_GAMES: { id: string; title: string; blurb: string; kicker?: string }[] = [
  { id: "pong", title: "Planet Pong", blurb: "Where video games began. Knock the planets past the computer, mind the asteroids." },
  { id: "labyrinth", title: "The Labyrinth", blurb: "Keys, locked doors, bats, and something big that lives in the middle. Find the stairs." },
  { id: "flyover", title: "Flyover", blurb: "Fly a Cessna, then a jet, then a jumbo across the continents. Pick the right airport code at every stop, and dodge the storms." },
  { id: GAME_ROUTE, title: GAME_NAME, blurb: GAME_BLURB },
  { id: "hero", title: "Hero Workshop", kicker: "Make your own", blurb: "Draw your own pixel hero for the arcade. Start from the built-in hero, recolour it, and watch it walk." },
];

/** A locked game still opens (as a Preview): never locked behind skill alone. */
function arcadeCard(game: (typeof ARCADE_GAMES)[number], cleared: number) {
  const need = ARCADE_OPENS_AT[game.id] ?? 0;
  const open = cleared >= need;
  const left = need - cleared;
  return h(
    "a",
    { class: `card${open ? "" : " locked-card"}`, href: `#${game.id}` },
    h("span", { class: "card-kicker" }, open ? game.kicker ?? "Arcade game" : `🔒 Opens after challenges in ${need} subjects`),
    h("h2", {}, game.title),
    h("p", {}, game.blurb),
    open ? null : h("span", { class: "card-challenge" }, `${left} more ${left === 1 ? "subject" : "subjects"} to go. You can still have a go.`),
    h("span", { class: "card-foot card-foot-end" }, h("span", { class: "card-go" }, open ? "Play ▸" : "Preview ▸")),
  );
}

export function renderHome(root: HTMLElement, decks: Deck[]) {
  const cleared = clearedSubjects(Object.fromEntries(decks.map((d) => [d.id, d.subject ?? ""])));
  const track = trackFor(cleared.size);
  rememberTrack(track); // so the arcade games know how hard to be
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
        h(
          "span",
          { class: "subject-count" },
          cleared.has(s.name) ? "✓ Challenge done · " : "",
          `${built.length} of ${Math.max(6, built.length)}`,
        ),
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
      h(
        "a",
        { class: "island-banner", href: "#" },
        h("span", { class: "island-banner-art", "aria-hidden": "true" }, "🏝️"),
        h(
          "span",
          { class: "island-banner-text" },
          h("span", { class: "island-banner-title" }, "◂ Back to the island"),
          h("span", { class: "island-banner-blurb" }, "Walk the route round the island. Every subject is a building, and the arcade games are stops along the path."),
        ),
        h("span", { class: "island-banner-go" }, "Walk in ▸"),
      ),
      ...sections,
      h(
        "section",
        { class: "subject", "aria-label": "The Arcade" },
        h(
          "div",
          { class: "subject-head" },
          h("h2", {}, "The Arcade"),
          h("span", { class: "subject-count" }, `Challenges done in ${cleared.size} of ${SUBJECT_NAMES.length} subjects · ${track === "easy" ? "Easy" : track === "intermediate" ? "Intermediate" : "Hard"} track`),
        ),
        h(
          "p",
          { class: "arcade-how" },
          "Do the challenge on any one quiz in a subject to count that subject. More subjects open more arcade games. Every subject done moves you up to the Intermediate track.",
        ),
        h("div", { class: "cards" }, ...ARCADE_GAMES.map((g) => arcadeCard(g, cleared.size))),
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
