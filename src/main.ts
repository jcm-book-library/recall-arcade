import "./style.css";
import type { Deck } from "./engine/types";
import { countriesDeck } from "./decks/countries";
import { flagsDeck } from "./decks/flags";
import { capitalsDeck } from "./decks/capitals";
import { waterDeck } from "./decks/water";
import { neighboursDeck } from "./decks/geo-extra";
import { mountainsDeck } from "./decks/mountains";
import { zoomOutDeck } from "./decks/zoomout";
import { elementsDeck } from "./decks/elements";
import { cellsDeck } from "./decks/cells";
import { bodyDeck } from "./decks/body";
import { historyDeck } from "./decks/history";
import { peopleDeck } from "./decks/people";
import { empiresDeck } from "./decks/history-maps";
import { airportsDeck } from "./decks/airports";
import { timezonesDeck, currenciesDeck } from "./decks/travel-maps";
import { natoDeck, pmDeck, unitsDeck, scientistsDeck, airlinesDeck, babyDeck, mythDeck } from "./decks/text-decks";
import { triviaDeck, lifeDeck } from "./decks/choice-decks";
import { ausAnimalsDeck, petsDeck, landmarksDeck, dinosaursDeck } from "./decks/picture-decks";
import { keyboardDeck, trebleDeck, bassDeck, rhythmDeck, symbolsDeck, earDeck } from "./decks/music";
import { renderHome } from "./ui/home";
import { renderPlay } from "./ui/play";
import { renderPong } from "./arcade/pong";
import { renderLabyrinth } from "./arcade/labyrinth";

// Every game in the arcade, grouped by subject on the home page (six each).
const DECKS: Deck[] = [
  // Geography
  countriesDeck, flagsDeck, capitalsDeck, waterDeck, neighboursDeck, mountainsDeck,
  // Science
  zoomOutDeck, elementsDeck, cellsDeck, bodyDeck, unitsDeck, scientistsDeck,
  // History
  historyDeck, peopleDeck, pmDeck, empiresDeck, mythDeck, triviaDeck,
  // Travel & Transport
  airportsDeck, airlinesDeck, natoDeck, currenciesDeck, timezonesDeck, landmarksDeck,
  // Nature & Animals
  ausAnimalsDeck, lifeDeck, petsDeck, babyDeck, dinosaursDeck,
  // Music
  keyboardDeck, trebleDeck, bassDeck, rhythmDeck, symbolsDeck, earDeck,
];

// While developing, catch two items in one game sharing an id (they'd count as one).
if (import.meta.env.DEV) {
  for (const d of DECKS) {
    const seen = new Set<string>();
    for (const i of d.items) {
      if (seen.has(i.id)) console.error(`${d.id}: duplicate item id "${i.id}"`);
      seen.add(i.id);
    }
  }
}

const root = document.getElementById("app")!;
let cleanup: (() => void) | void;

function route() {
  cleanup?.();
  cleanup = undefined;
  const id = location.hash.replace(/^#/, "");
  const deck = DECKS.find((d) => d.id === id);
  if (id === "pong") cleanup = renderPong(root);
  else if (id === "labyrinth") cleanup = renderLabyrinth(root);
  else if (deck) cleanup = deck.screen ? deck.screen(root, deck) : renderPlay(root, deck);
  else renderHome(root, DECKS);
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
route();
