import type { Deck, Item } from "../engine/types";
import { renderSport } from "../ui/sport";
import { SPORT_LISTS } from "./sport-data";
import { DECK_LISTS } from "./sport-config";

// Six Sport games, one shared screen (ui/sport.ts). Each game is one sport and one or more lists
// (see sport-config.ts). The item ids are the result ids from the sheet ("nrl-2005", "wr-20090816-bolt").
function itemsFor(deckId: string): Item[] {
  return DECK_LISTS[deckId].flatMap((lid) =>
    SPORT_LISTS[lid].wins
      .filter((w) => !w.stripped && !w.cancelled)
      .map((w) => ({ id: w.id, name: `${w.label}: ${w.shown}`, tags: [lid] })),
  );
}

function sportDeck(id: string, title: string, noun: string, blurb: string): Deck {
  return {
    id,
    title,
    subject: "Sport",
    blurb,
    noun,
    items: itemsFor(id),
    variants: [],
    options: [],
    createBoard: () => {
      throw new Error(`${title} uses its own screen`);
    },
    screen: (root, deck) => renderSport(root, deck),
  };
}

export const nrlDeck = sportDeck(
  "nrl",
  "Rugby League",
  "premiers",
  "Name every NRL premier, fill in a club's flags, and put the Broncos, Storm and Roosters in order.",
);
export const aflDeck = sportDeck(
  "afl",
  "Australian Rules",
  "premiers",
  "Who won the flag? Name each AFL premier, fill in a club's years, and see who won more.",
);
export const footballDeck = sportDeck(
  "football",
  "Football",
  "winners",
  "English champions, the Champions League and the World Cup. Name the winner, fill in the years, put clubs in order.",
);
export const motorsportDeck = sportDeck(
  "motorsport",
  "Motorsport",
  "winners",
  "Formula 1 world champions and the Bathurst 1000. Name the champion, and either driver wins you the point at Bathurst.",
);
export const olympicsDeck = sportDeck(
  "olympics",
  "Olympic Games",
  "Games",
  "Which city hosted which year? Name the host, fill in a decade, and put the host cities in order.",
);
export const sprintDeck = sportDeck(
  "sprint",
  "General Sports",
  "records",
  "The fastest man alive. Every 100 m world record, from 1912 to Usain Bolt's 9.58.",
);
