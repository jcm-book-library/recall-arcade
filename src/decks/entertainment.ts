import type { Deck, Item } from "../engine/types";
import { renderSport } from "../ui/sport";
import { renderTimeline, type Era } from "../ui/timeline";
import { renderBoxOffice } from "../ui/boxoffice";
import { renderWhoPlayed } from "../ui/whoplayed";
import { renderThreeClues } from "../ui/threeclues";
import { BOX_FILMS, BOX_FRANCHISES, ENT_LISTS, MOVIES, WHO_PLAYED } from "./entertainment-data";
import { DECK_LISTS } from "./sport-config";

// Six Entertainment games (the 8th subject). The Oscars and Aussie Awards run on the Sport screen
// (ui/sport.ts); the other four have their own screens. The data is entertainment-data.ts, generated
// from the owner's sheet by scripts/entertainment-from-sheet.py.

const usesOwnScreen = (title: string) => () => {
  throw new Error(`${title} uses its own screen`);
};

/** Items for a Sport-screen game: one per result, named like the Sport games do. */
function listItems(deckId: string): Item[] {
  return DECK_LISTS[deckId].flatMap((lid) =>
    ENT_LISTS[lid].wins
      .filter((w) => !w.cancelled && !w.stripped)
      .map((w) => ({ id: w.id, name: `${w.label}: ${w.shown}`, tags: [lid] })),
  );
}

function sportScreenDeck(id: string, title: string, noun: string, blurb: string): Deck {
  return {
    id, title, subject: "Entertainment", blurb, noun,
    items: listItems(id), variants: [], options: [],
    createBoard: usesOwnScreen(title),
    screen: (root, deck) => renderSport(root, deck),
  };
}

export const oscarsDeck = sportScreenDeck(
  "oscars",
  "The Oscars",
  "winners",
  "Best Picture, Best Actor, Best Actress and Best Director. Name each year's winner, fill in a star's years, and see who won more.",
);

export const ausAwardsDeck = sportScreenDeck(
  "ausawards",
  "Aussie Awards",
  "winners",
  "The Gold Logie, the Hottest 100 number ones and the Miles Franklin Award. Name the winner for each year.",
);

export const boxOfficeDeck: Deck = {
  id: "boxoffice",
  title: "Box Office",
  subject: "Entertainment",
  blurb: "Which film made more money? Pick the bigger earner, put films in order, and name the top 10.",
  noun: "films",
  items: [
    ...BOX_FILMS.map((f) => ({ id: f.id, name: f.name, tags: ["films"] })),
    ...BOX_FRANCHISES.map((f) => ({ id: f.id, name: f.name, tags: ["franchises"] })),
  ],
  variants: [], options: [],
  createBoard: usesOwnScreen("Box Office"),
  screen: (root, deck) => renderBoxOffice(root, deck),
};

export const whoPlayedDeck: Deck = {
  id: "whoplayed",
  title: "Who Played Who",
  subject: "Entertainment",
  blurb: "An actor and a film. Who did they play? Or a character, and you name the actor.",
  noun: "roles",
  items: WHO_PLAYED.map((w) => ({ id: w.id, name: `${w.actor}: ${w.character}`, tags: [w.aus ? "aus" : "world"] })),
  variants: [], options: [],
  createBoard: usesOwnScreen("Who Played Who"),
  screen: (root, deck) => renderWhoPlayed(root, deck),
};

export const threeCluesDeck: Deck = {
  id: "threeclues",
  title: "Three Clues",
  subject: "Entertainment",
  blurb: "Guess the film or show from three clues. Fewer clues, more points. There are emoji puzzles too.",
  noun: "titles",
  items: MOVIES.map((m) => ({ id: m.id, name: m.title, tags: [m.kind, ...(m.aus ? ["aus"] : [])] })),
  variants: [], options: [],
  createBoard: usesOwnScreen("Three Clues"),
  screen: (root, deck) => renderThreeClues(root, deck),
};

// When Did It Come Out? Same drag-the-marker screen as Big Moments. Scores are closer-is-better, but
// films are judged more tightly (within 25 years, not 30).
const MOVIE_ITEMS: Item[] = MOVIES.map((m) => ({
  id: m.id,
  name: m.title,
  tags: [m.kind],
  data: { year: m.year, note: m.kind === "tv" ? "A TV show" : "A film", reveal: m.clues[2], tol: 25 },
}));

const RELEASE_ERAS: Era[] = [
  { id: "film", label: "Films", starter: true, breaks: [1920, 1960, 1980, 2000, 2015, 2027], ticks: [1920, 1960, 1980, 2000, 2015] },
  { id: "tv", label: "TV shows", breaks: [1950, 1970, 1990, 2005, 2015, 2027], ticks: [1950, 1970, 1990, 2005, 2015] },
  { id: "all", label: "Everything", breaks: [1920, 1960, 1980, 2000, 2015, 2027], ticks: [1920, 1960, 1980, 2000, 2015] },
];

export const releasedDeck: Deck = {
  id: "released",
  title: "When Did It Come Out?",
  subject: "Entertainment",
  blurb: "A film or TV show appears. Drag the marker to the year it came out. The closer you are, the more points.",
  noun: "titles",
  items: MOVIE_ITEMS,
  variants: [], options: [],
  createBoard: usesOwnScreen("When Did It Come Out?"),
  screen: (root, deck) =>
    renderTimeline(root, deck, RELEASE_ERAS, {
      ask: "When did it come out?",
      how: "Drag the marker to the year each film or show came out (a TV show's first year).",
      top: "A true movie buff.",
      again: "Change round",
    }),
};
