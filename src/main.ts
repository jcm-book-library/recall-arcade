import "./style.css";
import type { Deck } from "./engine/types";
import { countriesDeck } from "./decks/countries";
import { elementsDeck } from "./decks/elements";
import { flagsDeck } from "./decks/flags";
import { capitalsDeck } from "./decks/capitals";
import { waterDeck } from "./decks/water";
import { airportsDeck } from "./decks/airports";
import { zoomOutDeck } from "./decks/zoomout";
import { cellsDeck } from "./decks/cells";
import { bonesDeck } from "./decks/bones";
import { historyDeck } from "./decks/history";
import { renderHome } from "./ui/home";
import { renderPlay } from "./ui/play";

// Every game in the arcade. Adding a new deck here adds it to the home screen.
const DECKS: Deck[] = [
  countriesDeck, flagsDeck, capitalsDeck, waterDeck,
  zoomOutDeck, elementsDeck, cellsDeck, bonesDeck,
  historyDeck,
  airportsDeck,
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
