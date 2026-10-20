import "./style.css";
import type { Deck } from "./engine/types";
import { countriesDeck } from "./decks/countries";
import { flagsDeck } from "./decks/flags";
import { capitalsDeck } from "./decks/capitals";
import { waterDeck } from "./decks/water";
import { territoriesDeck, neighboursDeck } from "./decks/geo-extra";
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
import { ausAnimalsDeck, petsDeck, landmarksDeck, habitatsDeck, dinosaursDeck } from "./decks/picture-decks";
import { keyboardDeck, trebleDeck, bassDeck, rhythmDeck, symbolsDeck, earDeck } from "./decks/music";
import { renderHome } from "./ui/home";
import { renderPlay } from "./ui/play";

// Every game in the arcade, grouped by subject on the home page (six each).
const DECKS: Deck[] = [
  // Geography
  countriesDeck, flagsDeck, capitalsDeck, waterDeck, territoriesDeck, neighboursDeck,
  // Science
  zoomOutDeck, elementsDeck, cellsDeck, bodyDeck, unitsDeck, scientistsDeck,
  // History
  historyDeck, peopleDeck, pmDeck, empiresDeck, mythDeck, triviaDeck,
  // Travel & Transport
  airportsDeck, airlinesDeck, natoDeck, currenciesDeck, timezonesDeck, landmarksDeck,
  // Nature & Animals
  ausAnimalsDeck, lifeDeck, petsDeck, habitatsDeck, babyDeck, dinosaursDeck,
  // Music
  keyboardDeck, trebleDeck, bassDeck, rhythmDeck, symbolsDeck, earDeck,
];

const root = document.getElementById("app")!;
let cleanup: (() => void) | void;

function route() {
  cleanup?.();
  cleanup = undefined;
  const id = location.hash.replace(/^#/, "");
  const deck = DECKS.find((d) => d.id === id);
  if (deck) cleanup = deck.screen ? deck.screen(root, deck) : renderPlay(root, deck);
  else renderHome(root, DECKS);
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
route();
