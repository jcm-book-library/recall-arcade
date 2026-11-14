import "./style.css";
import type { Deck } from "./engine/types";
import { countriesDeck } from "./decks/countries";
import { flagsDeck } from "./decks/flags";
import { capitalsDeck } from "./decks/capitals";
import { waterDeck } from "./decks/water";
import { neighboursDeck } from "./decks/geo-extra";
import { cityShapesDeck } from "./decks/city-shapes";
import { mountainsDeck } from "./decks/mountains";
import { zoomOutDeck } from "./decks/zoomout";
import { elementsDeck } from "./decks/elements";
import { cellsDeck } from "./decks/cells";
import { innerSpaceDeck } from "./decks/innerspace";
import { scaleDeck } from "./decks/scale";
import { earthSkyDeck } from "./decks/earthsky";
import { bodyDeck } from "./decks/body";
import { historyDeck } from "./decks/history";
import { peopleDeck } from "./decks/people";
import { bornWhenDeck } from "./decks/bornwhen";
import { empiresDeck } from "./decks/history-maps";
import { erasDeck } from "./decks/eras";
import { afterlifeDeck, realmsDeck } from "./decks/myth-specials";
import { airportsDeck } from "./decks/airports";
import { currenciesDeck } from "./decks/travel-maps";
import { natoDeck, pmDeck, unitsDeck, airlinesDeck, babyDeck } from "./decks/text-decks";
import { mythWhoDeck, mythSymbolsDeck } from "./decks/mythology";
import { mythHubDeck } from "./ui/mythology";
import { lifeDeck } from "./decks/choice-decks";
import { famousForDeck, mythPairsDeck } from "./decks/pairs-decks";
import { animalsDeck, petsDeck, landmarksDeck, dinosaursDeck } from "./decks/picture-decks";
import { keyboardDeck, trebleDeck, bassDeck, rhythmDeck, symbolsDeck, earDeck } from "./decks/music";
import { nrlDeck, aflDeck, footballDeck, motorsportDeck, olympicsDeck, sprintDeck } from "./decks/sport";
import { tailFinsDeck } from "./decks/tail-fins";
import { oscarsDeck, boxOfficeDeck, whoPlayedDeck, threeCluesDeck, releasedDeck, ausAwardsDeck } from "./decks/entertainment";
import { renderHome } from "./ui/home";
import { renderPlay } from "./ui/play";
import { renderPong } from "./arcade/pong";
import { renderLabyrinth } from "./arcade/labyrinth";
import { renderHeroWorkshop } from "./arcade/hero-workshop";
import { renderFlyover } from "./arcade/flyover";
import { renderBrawl } from "./arcade/brawl/game";
import { GAME_ROUTE } from "./arcade/brawl/names";
import { renderIsland } from "./arcade/island";
import { noteArrival } from "./ui/quiz-shell";

// Every game in the arcade, grouped by subject on the home page (up to six each).
const DECKS: Deck[] = [
  // Geography
  countriesDeck, flagsDeck, capitalsDeck, waterDeck, cityShapesDeck, mountainsDeck,
  // Science
  zoomOutDeck, innerSpaceDeck, elementsDeck, bodyDeck, scaleDeck, earthSkyDeck,
  // History
  historyDeck, peopleDeck, pmDeck, erasDeck, mythHubDeck, famousForDeck,
  // Travel & Transport
  airportsDeck, airlinesDeck, tailFinsDeck, natoDeck, currenciesDeck, landmarksDeck,
  // Nature & Animals
  animalsDeck, lifeDeck, petsDeck, babyDeck, dinosaursDeck,
  // Music
  keyboardDeck, trebleDeck, bassDeck, rhythmDeck, symbolsDeck, earDeck,
  // Sport
  nrlDeck, aflDeck, footballDeck, motorsportDeck, olympicsDeck, sprintDeck,
  // Entertainment
  oscarsDeck, boxOfficeDeck, whoPlayedDeck, threeCluesDeck, releasedDeck, ausAwardsDeck,
  // Not on the home page: reached from Mythology (#mythpairs), Inner Space (#cells), Countries (#neighbours),
  // The Scale of Things (#units, the old quiz, kept so its saved scores still work), Eras & Dynasties (#empires, the map quiz) or Who Lived When (#bornwhen)
  mythPairsDeck, mythWhoDeck, mythSymbolsDeck, cellsDeck, neighboursDeck, unitsDeck, empiresDeck, bornWhenDeck,
  // Hidden Mythology specials, reached from the Mythology page (#afterlife, #realms)
  afterlifeDeck, realmsDeck,
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
// The page we were on, so a quiz's "◂ Back" can go back to the island or to the list (see noteArrival).
let lastId: string | null = null;

function route() {
  cleanup?.();
  cleanup = undefined;
  // The island is the front page ("" or "#"), so every quiz's "◂ Arcade" link lands there. The
  // card list lives at "#list", and "#island" still works as an old way of saying the same thing.
  // "#myths/type/greek" is the address "myths" plus extra detail that the game itself reads.
  const id = location.hash.replace(/^#/, "").split("/")[0];
  const deck = DECKS.find((d) => d.id === id);
  if (lastId !== id) noteArrival(lastId, id);
  lastId = id;
  if (id === "pong") cleanup = renderPong(root);
  else if (id === "labyrinth") cleanup = renderLabyrinth(root);
  else if (id === "hero") cleanup = renderHeroWorkshop(root);
  else if (id === "flyover") cleanup = renderFlyover(root);
  else if (id === GAME_ROUTE) cleanup = renderBrawl(root);
  else if (id === "" || id === "island") cleanup = renderIsland(root, DECKS);
  else if (id === "list") renderHome(root, DECKS);
  else if (deck) cleanup = deck.screen ? deck.screen(root, deck) : renderPlay(root, deck);
  else cleanup = renderIsland(root, DECKS); // an unknown address: back to the island
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
route();
