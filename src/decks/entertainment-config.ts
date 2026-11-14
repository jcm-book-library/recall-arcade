// ENTERTAINMENT: the settings for the Oscars and Aussie Awards lists, which run on the Sport screen
// (ui/sport.ts). sport-config.ts merges these in. The results are in entertainment-data.ts (generated).
import type { ListConfig, SportRange } from "./sport-config";

const r = (id: string, label: string, from: number, to: number, phrase: string): SportRange => ({ id, label, from, to, phrase });
const ALL = r("all", "All years", 0, 2100, "in total");
const since = (y: number) => r(`s${y}`, `Since ${y}`, y, 2100, `since ${y}`);
const between = (a: number, b: number) => r(`${a}-${b}`, `${a}–${b}`, a, b, `from ${a} to ${b}`);
const before = (y: number) => r(`b${y}`, `Before ${y}`, 0, y - 1, `before ${y}`);

const OSCAR_YEARS = [since(2000), between(1970, 1999), before(1970), ALL];
const OSCAR_ABOUT =
  "The year is the year of the ceremony. The film is from the year before. The first six ceremonies covered two years.";

const oscarPeople = (id: string, chip: string, award: string, who: string): ListConfig => ({
  id, chip, modes: ["year", "fill", "decade", "more", "order", "listany", "listorder"], ranges: OSCAR_YEARS,
  period: "Year", who, whoPlural: `${who}s`,
  ask: (y) => `Who won ${award} at the ${y} Oscars?`,
  more: `Who won ${award} more often?`, verb: "won", count: `${award} Oscars`, firstWord: "first win", block: 10,
  about: `${award} winners from 1929. ${OSCAR_ABOUT} When two people share the award, either one counts.`,
  blockAsk: (span) => `Who won ${award} in ${span}?`,
});

export const ENT_LIST_CONFIG: Record<string, ListConfig> = {
  oscar_picture: {
    id: "oscar_picture", chip: "Best Picture", modes: ["year", "decade", "listany", "listorder"], ranges: OSCAR_YEARS,
    period: "Year", who: "film", whoPlural: "films",
    ask: (y) => `Which film won Best Picture at the ${y} Oscars?`,
    more: "", verb: "won", count: "Best Picture Oscars", firstWord: "win", block: 10,
    about: `Best Picture winners from 1929. ${OSCAR_ABOUT}`,
    blockAsk: (span) => `Which films won Best Picture in ${span}?`,
  },
  oscar_actor: oscarPeople("oscar_actor", "Best Actor", "Best Actor", "actor"),
  oscar_actress: oscarPeople("oscar_actress", "Best Actress", "Best Actress", "actress"),
  oscar_director: oscarPeople("oscar_director", "Best Director", "Best Director", "director"),
  logie: {
    id: "logie", chip: "Gold Logies", modes: ["year", "fill", "decade", "more", "order", "listany", "listorder"],
    ranges: [since(2000), between(1980, 1999), before(1980), ALL],
    period: "Year", who: "person", whoPlural: "people",
    ask: (y) => `Who won the Gold Logie in ${y}?`,
    more: "Who won more Gold Logies?", verb: "won", count: "Gold Logies", firstWord: "first win", block: 10,
    about: "The Gold Logie is the top prize in Australian TV. Winners go back to 1960. Some years have no winner.",
    blockAsk: (span) => `Who won the Gold Logie in ${span}?`,
  },
  h100: {
    id: "h100", chip: "Hottest 100 number ones", modes: ["year", "decade", "listany", "listorder"],
    ranges: [since(2010), between(2000, 2009), before(2000), ALL],
    period: "Year", who: "song", whoPlural: "songs",
    ask: (y) => `Which song was number one in the Hottest 100 for ${y}?`,
    more: "", verb: "won", count: "number ones", firstWord: "first win", block: 10,
    about: "Triple J's yearly countdown, voted by listeners. Type the song, not the band. The band shows after you answer.",
    blockAsk: (span) => `Which songs were number one in ${span}?`,
    notes: {
      listany: "Type a song or its artist and every number one it fits fills in. The other one shows beside it.",
      listorder: "Fill each year's number one, newest first. The song or the artist both count.",
    },
  },
  h100x: {
    id: "h100x", chip: "All-time and special countdowns", modes: ["year", "fill", "listany", "listorder"], ranges: [ALL],
    period: "Year", who: "song", whoPlural: "songs",
    ask: (y) => `Which song was number one in the special countdown of ${y}?`,
    more: "", verb: "won", count: "special countdowns", firstWord: "first win", block: 10,
    about: "A small list of all-time, decade and album countdowns. One of them counted albums, and the answer is an album.",
  },
  mf: {
    id: "mf", chip: "Miles Franklin", modes: ["year", "decade", "listany", "listorder"],
    ranges: [since(2000), between(1980, 1999), before(1980), ALL],
    period: "Year", who: "book", whoPlural: "books",
    ask: (y) => `Which book won the Miles Franklin Award in ${y}?`,
    more: "", verb: "won", count: "Miles Franklin Awards", firstWord: "first win", block: 10,
    about: "The top prize for an Australian novel, from 1957. Type the book, not the author. In joint years, either book counts.",
    blockAsk: (span) => `Which books won the Miles Franklin Award in ${span}?`,
  },
};

export const ENT_DECK_LISTS: Record<string, string[]> = {
  oscars: ["oscar_picture", "oscar_actor", "oscar_actress", "oscar_director"],
  ausawards: ["logie", "h100", "h100x", "mf"],
};
