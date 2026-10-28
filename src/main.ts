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
import { currenciesDeck } from "./decks/travel-maps";
import { natoDeck, pmDeck, unitsDeck, airlinesDeck, babyDeck, mythDeck } from "./decks/text-decks";
import { lifeDeck } from "./decks/choice-decks";
import { famousForDeck, mythPairsDeck } from "./decks/pairs-decks";
import { ausAnimalsDeck, petsDeck, landmarksDeck, dinosaursDeck } from "./decks/picture-decks";
import { keyboardDeck, trebleDeck, bassDeck, rhythmDeck, symbolsDeck, earDeck } from "./decks/music";
import { tailFinsDeck } from "./decks/tail-fins";
import { renderHome } from "./ui/home";
import { renderPlay } from "./ui/play";
import { renderPong } from "./arcade/pong";
import { renderLabyrinth } from "./arcade/labyrinth";
import { renderFlyover } from "./arcade/flyover";

// Every game in the arcade, grouped by subject on the home page (up to six each).
const DECKS: Deck[] = [
  // Geography
  countriesDeck, flagsDeck, capitalsDeck, waterDeck, neighboursDeck, mountainsDeck,
  // Science
  zoomOutDeck, elementsDeck, cellsDeck, bodyDeck, unitsDeck,
  // History
  historyDeck, peopleDeck, pmDeck, empiresDeck, mythDeck, famousForDeck,
  // Travel & Transport
  airportsDeck, airlinesDeck, tailFinsDeck, natoDeck, currenciesDeck, landmarksDeck,
  // Nature & Animals
  ausAnimalsDeck, lifeDeck, petsDeck, babyDeck, dinosaursDeck,
  // Music
  keyboardDeck, trebleDeck, bassDeck, rhythmDeck, symbolsDeck, earDeck,
  // Not on the home page: reached from Mythology, or at #mythpairs
  mythPairsDeck,
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
  else if (id === "flyover") cleanup = renderFlyover(root);
  else if (deck) cleanup = deck.screen ? deck.screen(root, deck) : renderPlay(root, deck);
  else renderHome(root, DECKS);
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
route();
