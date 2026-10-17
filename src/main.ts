import "./style.css";
import type { Deck } from "./engine/types";
import { countriesDeck } from "./decks/countries";
import { elementsDeck } from "./decks/elements";
import { flagsDeck } from "./decks/flags";
import { capitalsDeck } from "./decks/capitals";
import { renderHome } from "./ui/home";
import { renderPlay } from "./ui/play";

// Every game in the arcade. Adding a new deck here adds it to the home screen.
const DECKS: Deck[] = [countriesDeck, flagsDeck, capitalsDeck, elementsDeck];

const root = document.getElementById("app")!;
let cleanup: (() => void) | void;

function route() {
  cleanup?.();
  cleanup = undefined;
  const id = location.hash.replace(/^#/, "");
  const deck = DECKS.find((d) => d.id === id);
  if (deck) cleanup = renderPlay(root, deck);
  else renderHome(root, DECKS);
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
route();
