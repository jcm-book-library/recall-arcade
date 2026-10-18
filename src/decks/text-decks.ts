// Quizzes that are lists of clues and answers, shown on a board of cards.
import type { Deck, Item, ProgressGroup, Variant } from "../engine/types";
import { createTileBoard } from "../boards/tileBoard";

/** Turn "answer|clue|aliases;more|tags" lines into items. */
function parse(table: string, idPrefix: string): Item[] {
  return table
    .trim()
    .split("\n")
    .map((line, i) => {
      const [name, clue, aliases, tags] = line.split("|");
      return {
        id: `${idPrefix}${i}`,
        name: name.trim(),
        aliases: aliases ? aliases.split(";").map((a) => a.trim()).filter(Boolean) : [],
        tags: tags ? tags.split(",").map((t) => t.trim()) : [],
        data: { clue: clue.trim() },
      };
    });
}

const clueOf = (i: Item) => i.data!.clue as string;

function promptText(text: string, strong?: string) {
  const p = document.createElement("p");
  p.className = "prompt-text";
  if (strong) {
    p.append(text, " ");
    const s = document.createElement("strong");
    s.textContent = strong;
    p.append(s);
  } else p.textContent = text;
  return p;
}

interface TextDeckSpec {
  id: string;
  title: string;
  subject: string;
  blurb: string;
  noun: string;
  items: Item[];
  variants: Variant[];
  mode: "any" | "prompt";
  ask?: (item: Item) => Node;
  placeholder?: string;
  groups?: ProgressGroup[];
  wide?: boolean;
  describe?: (item: Item) => string;
}

function textDeck(s: TextDeckSpec): Deck {
  return {
    id: s.id,
    title: s.title,
    subject: s.subject,
    blurb: s.blurb,
    noun: s.noun,
    items: s.items,
    variants: s.variants,
    options: [],
    mode: s.mode,
    placeholder: s.placeholder,
    progressGroups: s.groups,
    describe: s.describe ?? ((i) => `${clueOf(i)}: ${i.name}`),
    renderPrompt: s.ask,
    createBoard: ({ container, items }) =>
      createTileBoard(container, items, { clue: clueOf, groups: s.groups, wide: s.wide }),
  };
}

const all = (minutes: number, label = "All"): Variant => ({ id: "all", label, minutes, filter: () => true });
const tagged = (id: string, label: string, minutes: number, starter = false): Variant => ({
  id, label, minutes, starter, filter: (i) => i.tags.includes(id),
});

// ---------------------------------------------------------------- NATO alphabet
export const natoDeck = textDeck({
  id: "nato",
  title: "NATO Phonetic Alphabet",
  subject: "Travel & Transport",
  blurb: "Alfa, Bravo, Charlie… Type all 26 code words. Handy for spelling out booking references.",
  noun: "letters",
  mode: "any",
  items: parse(
    `Alfa|A|Alpha
Bravo|B
Charlie|C
Delta|D
Echo|E
Foxtrot|F|Fox trot
Golf|G
Hotel|H
India|I
Juliett|J|Juliet
Kilo|K
Lima|L
Mike|M
November|N
Oscar|O
Papa|P
Quebec|Q
Romeo|R
Sierra|S
Tango|T
Uniform|U
Victor|V
Whiskey|W|Whisky
X-ray|X|Xray;X ray
Yankee|Y
Zulu|Z`,
    "n",
  ),
  variants: [all(3, "All 26 letters")],
  describe: (i) => `${clueOf(i)}: ${i.name}`,
});

// ---------------------------------------------------------------- Australian Prime Ministers
export const pmDeck = textDeck({
  id: "pms",
  title: "Australian Prime Ministers",
  subject: "History",
  blurb: "All 31 prime ministers since Federation. The years are your clue. Type them in any order.",
  noun: "prime ministers",
  mode: "any",
  wide: true,
  items: parse(
    `Edmund Barton|1st · 1901–1903|Barton
Alfred Deakin|2nd · 1903–1910, three terms|Deakin
Chris Watson|3rd · 1904|Watson
George Reid|4th · 1904–1905|Reid
Andrew Fisher|5th · 1908–1915, three terms|Fisher
Joseph Cook|6th · 1913–1914|Cook
Billy Hughes|7th · 1915–1923|Hughes;William Hughes
Stanley Bruce|8th · 1923–1929|Bruce
James Scullin|9th · 1929–1932|Scullin
Joseph Lyons|10th · 1932–1939|Lyons
Earle Page|11th · 1939, 19 days|Page
Robert Menzies|12th · 1939–1941, 1949–1966|Menzies;Bob Menzies|recent
Arthur Fadden|13th · 1941|Fadden
John Curtin|14th · 1941–1945|Curtin
Frank Forde|15th · 1945, 8 days|Forde
Ben Chifley|16th · 1945–1949|Chifley
Harold Holt|17th · 1966–1967, vanished at sea|Holt|recent
John McEwen|18th · 1967–1968|McEwen|recent
John Gorton|19th · 1968–1971|Gorton|recent
William McMahon|20th · 1971–1972|McMahon;Billy McMahon|recent
Gough Whitlam|21st · 1972–1975|Whitlam|recent
Malcolm Fraser|22nd · 1975–1983|Fraser|recent
Bob Hawke|23rd · 1983–1991|Hawke|recent
Paul Keating|24th · 1991–1996|Keating|recent
John Howard|25th · 1996–2007|Howard|recent
Kevin Rudd|26th · 2007–2010, 2013|Rudd|recent
Julia Gillard|27th · 2010–2013|Gillard|recent
Tony Abbott|28th · 2013–2015|Abbott|recent
Malcolm Turnbull|29th · 2015–2018|Turnbull|recent
Scott Morrison|30th · 2018–2022|Morrison|recent
Anthony Albanese|31st · 2022–|Albanese|recent`,
    "pm",
  ),
  variants: [tagged("recent", "Since Menzies", 4, true), all(8, "All 31")],
});

// ---------------------------------------------------------------- Units & Forces
export const unitsDeck = textDeck({
  id: "units",
  title: "Physics: Units & Forces",
  subject: "Science",
  blurb: "What do scientists measure things in? A quantity appears: name its unit.",
  noun: "units",
  mode: "prompt",
  placeholder: "Unit…",
  ask: (i) => promptText("What's the unit of", `${clueOf(i).toLowerCase()}?`),
  items: parse(
    `Metre|Length|Meter;m|base,starter
Kilogram|Mass|kg|base,starter
Second|Time|s;sec|base,starter
Ampere|Electric current|Amp;Amps;A|base
Kelvin|Temperature (SI unit)|K|base
Mole|Amount of substance|mol|base
Candela|Brightness of a light source|cd|base
Newton|Force|N|derived,starter
Joule|Energy|J|derived,starter
Watt|Power|W|derived,starter
Volt|Voltage|V|derived,starter
Ohm|Electrical resistance|Ω|derived
Hertz|Frequency|Hz|derived,starter
Pascal|Pressure|Pa|derived
Coulomb|Electric charge|C|derived
Farad|Capacitance|F|derived
Tesla|Magnetic field strength|T|derived
Becquerel|Radioactivity|Bq|derived
Light year|Distance light travels in a year (astronomy)|Lightyear;ly|other
Decibel|Loudness of sound|dB|other
Knot|Speed at sea and in the air (nautical miles per hour)|Knots;kn|other
Calorie|Energy in food (old unit)|Calories;kcal|other`,
    "u",
  ),
  variants: [tagged("starter", "Everyday Units", 2, true), tagged("base", "The 7 Base Units", 2), all(5)],
  groups: [
    { tag: "base", label: "The seven base units" },
    { tag: "derived", label: "Built from the base units" },
    { tag: "other", label: "Other units you'll meet" },
  ],
  describe: (i) => `${clueOf(i)}: ${i.name}`,
});

// ---------------------------------------------------------------- Famous Scientists
export const scientistsDeck = textDeck({
  id: "scientists",
  title: "Famous Scientists",
  subject: "Science",
  blurb: "A discovery appears. Who made it? Surnames are enough.",
  noun: "scientists",
  mode: "prompt",
  wide: true,
  placeholder: "Scientist…",
  ask: (i) => promptText(`Who ${clueOf(i).charAt(0).toLowerCase()}${clueOf(i).slice(1)}?`),
  items: parse(
    `Isaac Newton|Described gravity and the three laws of motion|Newton|starter
Albert Einstein|Came up with the theory of relativity (E = mc²)|Einstein|starter
Charles Darwin|Explained evolution by natural selection|Darwin|starter
Marie Curie|Discovered polonium and radium, and coined "radioactivity"|Curie|starter
Alexander Fleming|Discovered penicillin in 1928|Fleming|starter
Galileo Galilei|Discovered the four big moons of Jupiter with a telescope|Galileo|starter
Nicolaus Copernicus|Proposed that the Earth orbits the Sun|Copernicus|starter
Gregor Mendel|Worked out how traits are inherited, using pea plants|Mendel
Louis Pasteur|Showed germs cause disease, and gave us pasteurisation|Pasteur|starter
Dmitri Mendeleev|Arranged the first periodic table of the elements|Mendeleev
Michael Faraday|Discovered electromagnetic induction (how generators work)|Faraday
Edwin Hubble|Showed the universe is expanding|Hubble
Edward Jenner|Created the first vaccine, against smallpox|Jenner
Archimedes|Explained why things float (and shouted "Eureka!")|
Ada Lovelace|Wrote the first computer program, in the 1840s|Lovelace
Alan Turing|Founded computer science and helped break Enigma|Turing
Ernest Rutherford|Discovered the nucleus of the atom (a New Zealander)|Rutherford
Howard Florey|Turned penicillin into a usable medicine (an Australian)|Florey
Rosalind Franklin|Took the X-ray photo that revealed DNA's double helix|Franklin
Stephen Hawking|Showed black holes give off radiation|Hawking
Nikola Tesla|Developed the alternating current (AC) motor|Tesla
Johannes Kepler|Worked out that planets move in ellipses|Kepler
Antoine Lavoisier|Named oxygen and hydrogen; father of modern chemistry|Lavoisier
Max Planck|Started quantum theory|Planck`,
    "sc",
  ),
  variants: [tagged("starter", "The Big Names", 3, true), all(6)],
  describe: (i) => `${i.name}: ${clueOf(i)}`,
});

// ---------------------------------------------------------------- Airline codes
const airlineItems = parse(
  `QF|Qantas|Qantas Airways|AP,starter
VA|Virgin Australia||AP,starter
JQ|Jetstar|Jetstar Airways|AP,starter
NZ|Air New Zealand||AP,starter
FJ|Fiji Airways||AP
SQ|Singapore Airlines|Singapore|AS,starter
TR|Scoot||AS
CX|Cathay Pacific|Cathay|AS,starter
JL|Japan Airlines|JAL|AS
NH|All Nippon Airways|ANA|AS
KE|Korean Air||AS
OZ|Asiana Airlines|Asiana|AS
CI|China Airlines||AS
BR|EVA Air|EVA|AS
CA|Air China||AS
MU|China Eastern|China Eastern Airlines|AS
CZ|China Southern|China Southern Airlines|AS
TG|Thai Airways|Thai|AS
MH|Malaysia Airlines|Malaysia|AS
AK|AirAsia|Air Asia|AS
GA|Garuda Indonesia|Garuda|AS
PR|Philippine Airlines||AS
VN|Vietnam Airlines||AS
AI|Air India||AS
EK|Emirates||ME,starter
QR|Qatar Airways|Qatar|ME,starter
EY|Etihad|Etihad Airways|ME
TK|Turkish Airlines|Turkish|ME
ET|Ethiopian Airlines|Ethiopian|ME
SA|South African Airways|SAA|ME
BA|British Airways||EU,starter
VS|Virgin Atlantic||EU
AF|Air France||EU,starter
LH|Lufthansa||EU,starter
KL|KLM|KLM Royal Dutch Airlines|EU
IB|Iberia||EU
AZ|ITA Airways|ITA|EU
LX|Swiss|Swiss International Air Lines|EU
OS|Austrian Airlines|Austrian|EU
SK|SAS|Scandinavian Airlines|EU
AY|Finnair||EU
EI|Aer Lingus||EU
FR|Ryanair||EU
U2|easyJet|Easy Jet|EU
AA|American Airlines|American|AM,starter
DL|Delta|Delta Air Lines|AM,starter
UA|United|United Airlines|AM,starter
AC|Air Canada||AM
WN|Southwest|Southwest Airlines|AM
B6|JetBlue|Jet Blue|AM
HA|Hawaiian Airlines|Hawaiian|AM
LA|LATAM|LATAM Airlines|AM`,
  "al",
).map((i) => ({ ...i, data: { clue: i.data!.clue as string, airline: i.data!.clue as string, alt: i.aliases }, aliases: [] }));

const AIRLINE_GROUPS: ProgressGroup[] = [
  { tag: "AP", label: "Australia & Pacific" },
  { tag: "AS", label: "Asia" },
  { tag: "ME", label: "Middle East & Africa" },
  { tag: "EU", label: "Europe" },
  { tag: "AM", label: "Americas" },
];

export const airlinesDeck: Deck = {
  ...textDeck({
    id: "airlines",
    title: "Airline Codes",
    subject: "Travel & Transport",
    blurb: "An airline appears. Type its two-character code: QF, SQ, EK… Or flip it and name the airline.",
    noun: "airlines",
    mode: "prompt",
    placeholder: "Two-character code…",
    items: airlineItems,
    variants: [
      tagged("starter", "The Big Carriers", 4, true),
      ...AIRLINE_GROUPS.map((g) => tagged(g.tag, g.label, 3)),
      all(8, "All 52"),
    ],
    groups: AIRLINE_GROUPS,
    ask: (i) => promptText(i.data!.reverse ? "Which airline is" : "What's the code for", `${i.data!.reverse ? i.id : clueOf(i)}?`),
    describe: (i) => `${i.data!.code ?? i.name}: ${i.data!.airline}`,
  }),
  options: [{ id: "nameFirst", label: "Show the code, name the airline", hint: "Flip it: see QF, type Qantas", default: false }],
  placeholder: (o) => (o.nameFirst ? "Airline…" : "Two-character code…"),
  // The table's "name" is the code. In flipped mode the airline name becomes the answer.
  applyOptions: (list, o) =>
    list.map((i) =>
      o.nameFirst
        ? { ...i, name: i.data!.airline as string, aliases: i.data!.alt as string[], data: { ...i.data, code: i.name, reverse: true, clue: i.name } }
        : { ...i, data: { ...i.data, code: i.name } },
    ),
  renderPrompt: (i) =>
    i.data!.reverse
      ? (() => {
          const d = document.createElement("div");
          d.className = "prompt-code";
          d.innerHTML = `<span class="code"></span>`;
          d.querySelector(".code")!.textContent = i.data!.code as string;
          return d;
        })()
      : promptText("What's the code for", `${i.data!.airline}?`),
};

// ---------------------------------------------------------------- Baby animals & group names
export const babyDeck = textDeck({
  id: "babies",
  title: "Baby Animals & Group Names",
  subject: "Nature & Animals",
  blurb: "A baby kangaroo is a joey. A group of crows is a murder. Name the baby, or the group.",
  noun: "names",
  mode: "prompt",
  wide: true,
  placeholder: "Your answer…",
  ask: (i) => promptText(clueOf(i)),
  items: parse(
    `Joey|A baby kangaroo is a…||baby,starter
Kitten|A baby cat is a…|Kit|baby,starter
Puppy|A baby dog is a…|Pup|baby,starter
Foal|A baby horse is a…|Colt;Filly|baby,starter
Calf|A baby cow is a…||baby,starter
Lamb|A baby sheep is a…||baby,starter
Kid|A baby goat is a…||baby
Piglet|A baby pig is a…||baby
Cygnet|A baby swan is a…||baby
Gosling|A baby goose is a…||baby
Duckling|A baby duck is a…||baby,starter
Owlet|A baby owl is an…||baby
Tadpole|A baby frog is a…|Froglet;Polliwog|baby,starter
Fawn|A baby deer is a…||baby
Cub|A baby bear is a…||baby,starter
Leveret|A baby hare is a…||baby
Eaglet|A baby eagle is an…||baby
Puggle|A baby echidna (or platypus) is a…||baby
Caterpillar|A baby butterfly is a…|Larva|baby
Pride|A group of lions is a…||group
School|A group of fish is a…|Shoal|group
Pack|A group of wolves is a…||group
Gaggle|A group of geese (on the ground) is a…||group
Murder|A group of crows is a…||group
Parliament|A group of owls is a…||group
Flamboyance|A group of flamingos is a…||group
Pod|A group of whales (or dolphins) is a…||group
Mob|A group of kangaroos is a…||group
Swarm|A group of bees is a…|Hive;Colony|group
Colony|A group of ants is a…||group
Herd|A group of cows is a…||group
Smack|A group of jellyfish is a…|Bloom|group
Crash|A group of rhinos is a…||group
Bloat|A group of hippos is a…||group
Dazzle|A group of zebras is a…||group
Tower|A group of giraffes is a…||group
Business|A group of ferrets is a…||group
Shiver|A group of sharks is a…||group
Prickle|A group of porcupines is a…||group`,
    "b",
  ),
  variants: [tagged("starter", "Baby Basics", 2, true), tagged("baby", "All Baby Animals", 4), tagged("group", "Group Names", 4), all(7)],
  groups: [
    { tag: "baby", label: "Baby animals" },
    { tag: "group", label: "Group names" },
  ],
  describe: (i) => `${clueOf(i).replace(/…$/, "")} ${i.name.toLowerCase()}`,
});
