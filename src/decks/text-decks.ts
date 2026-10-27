// Quizzes that are lists of clues and answers, shown on a board of cards.
import type { Deck, Item, ProgressGroup, Variant } from "../engine/types";
import { createTileBoard } from "../boards/tileBoard";
import { normalize } from "../engine/matcher";

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

/**
 * Compare numbers as numbers ("1,000", "1000" and "one thousand" listed as aliases all work;
 * "1.6" and "1.60" match) and everything else as words.
 */
function numberOrWords(text: string): string {
  const t = text.toLowerCase().replace(/[,\s]/g, "").replace(/(°?[fck]|degrees|km\/s|m\/s2)$/, "");
  if (/^[-+]?\d*\.?\d+(e\d+)?$/.test(t)) return `n${Number(t)}`;
  return normalize(text);
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
  answerKey?: (text: string) => string;
  tip?: string;
  related?: Deck["related"];
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
    answerKey: s.answerKey,
    tip: s.tip,
    related: s.related,
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

// ---------------------------------------------------------------- Prime Ministers & Presidents
// Three lists in one deck, split by tag: au (Australia), uk (United Kingdom), us (United States).
// No two leaders may share an alias (the matcher gives a spelling to the first leader who owns it).
// So a surname shared by several leaders (Johnson, Wilson, Roosevelt, Bush, Harrison...) is left off
// as a bare alias, and each of them is reached by a longer form such as "Lyndon Johnson" or "FDR".
// Only Adams (John Adams) and Harrison (William Henry) keep the bare surname: the more famous one.
// UK numbers count every appointment from Robert Walpole (Starmer is the 58th), so Baldwin,
// MacDonald, Churchill and Wilson show each number they held. US numbers are the usual count:
// Cleveland (22nd and 24th) and Trump (45th and 47th) are one person each.
export const pmDeck = textDeck({
  id: "pms",
  title: "Prime Ministers & Presidents",
  subject: "History",
  blurb:
    "Australia's 31 prime ministers since Federation, the UK's prime ministers from Salisbury (in office in 1900) to today, and all 45 people who have been US president. The numbers and years are your clue. Type them in any order.",
  noun: "leaders",
  mode: "any",
  wide: true,
  items: parse(
    `Edmund Barton|1st · 1901–1903|Barton|au
Alfred Deakin|2nd · 1903–1910, three terms|Deakin|au
Chris Watson|3rd · 1904|Watson|au
George Reid|4th · 1904–1905|Reid|au
Andrew Fisher|5th · 1908–1915, three terms|Fisher|au
Joseph Cook|6th · 1913–1914|Cook|au
Billy Hughes|7th · 1915–1923|Hughes;William Hughes|au
Stanley Bruce|8th · 1923–1929|Bruce|au
James Scullin|9th · 1929–1932|Scullin|au
Joseph Lyons|10th · 1932–1939|Lyons|au
Earle Page|11th · 1939, 19 days|Page|au
Robert Menzies|12th · 1939–1941, 1949–1966|Menzies;Bob Menzies|au
Arthur Fadden|13th · 1941|Fadden|au
John Curtin|14th · 1941–1945|Curtin|au
Frank Forde|15th · 1945, 8 days|Forde|au
Ben Chifley|16th · 1945–1949|Chifley|au
Harold Holt|17th · 1966–1967, vanished at sea|Holt|au
John McEwen|18th · 1967–1968|McEwen|au
John Gorton|19th · 1968–1971|Gorton|au
William McMahon|20th · 1971–1972|McMahon;Billy McMahon|au
Gough Whitlam|21st · 1972–1975|Whitlam|au
Malcolm Fraser|22nd · 1975–1983|Fraser|au
Bob Hawke|23rd · 1983–1991|Hawke|au
Paul Keating|24th · 1991–1996|Keating|au
John Howard|25th · 1996–2007|Howard|au
Kevin Rudd|26th · 2007–2010, 2013|Rudd|au
Julia Gillard|27th · 2010–2013|Gillard|au
Tony Abbott|28th · 2013–2015|Abbott|au
Malcolm Turnbull|29th · 2015–2018|Turnbull|au
Scott Morrison|30th · 2018–2022|Morrison|au
Anthony Albanese|31st · 2022–|Albanese|au
Lord Salisbury|1895–1902|Salisbury|uk
Arthur Balfour|1902–1905|Balfour|uk
Henry Campbell-Bannerman|1905–1908|Campbell-Bannerman;CB|uk
H. H. Asquith|1908–1916|Asquith;Herbert Asquith|uk
David Lloyd George|1916–1922|Lloyd George|uk
Bonar Law|1922–1923|Andrew Bonar Law|uk
Stanley Baldwin|1923–1924, 1924–1929, 1935–1937|Baldwin|uk
Ramsay MacDonald|1924, 1929–1935|MacDonald|uk
Neville Chamberlain|1937–1940|Chamberlain|uk
Winston Churchill|1940–1945, 1951–1955|Churchill|uk
Clement Attlee|1945–1951|Attlee|uk
Anthony Eden|1955–1957|Eden|uk
Harold Macmillan|1957–1963|Macmillan|uk
Alec Douglas-Home|1963–1964|Douglas-Home;Lord Home|uk
Harold Wilson|1964–1970, 1974–1976||uk
Edward Heath|1970–1974|Heath;Ted Heath|uk
James Callaghan|1976–1979|Callaghan;Jim Callaghan|uk
Margaret Thatcher|1979–1990|Thatcher|uk
John Major|1990–1997|Major|uk
Tony Blair|1997–2007|Blair|uk
Gordon Brown|2007–2010|Brown|uk
David Cameron|2010–2016|Cameron|uk
Theresa May|2016–2019|May|uk
Boris Johnson|2019–2022||uk
Liz Truss|2022, 49 days|Truss|uk
Rishi Sunak|2022–2024|Sunak|uk
Keir Starmer|2024–2026|Starmer|uk
Andy Burnham|2026–|Burnham|uk
George Washington|1st · 1789–1797|Washington|us
John Adams|2nd · 1797–1801|Adams|us
Thomas Jefferson|3rd · 1801–1809|Jefferson|us
James Madison|4th · 1809–1817|Madison|us
James Monroe|5th · 1817–1825|Monroe|us
John Quincy Adams|6th · 1825–1829|JQ Adams;JQA|us
Andrew Jackson|7th · 1829–1837|Jackson|us
Martin Van Buren|8th · 1837–1841|Van Buren|us
William Henry Harrison|9th · 1841, 31 days|Harrison;William Harrison|us
John Tyler|10th · 1841–1845|Tyler|us
James K. Polk|11th · 1845–1849|Polk;James Polk|us
Zachary Taylor|12th · 1849–1850|Taylor|us
Millard Fillmore|13th · 1850–1853|Fillmore|us
Franklin Pierce|14th · 1853–1857|Pierce|us
James Buchanan|15th · 1857–1861|Buchanan|us
Abraham Lincoln|16th · 1861–1865|Lincoln;Abe Lincoln|us
Andrew Johnson|17th · 1865–1869||us
Ulysses S. Grant|18th · 1869–1877|Grant;Ulysses Grant|us
Rutherford B. Hayes|19th · 1877–1881|Hayes;Rutherford Hayes|us
James A. Garfield|20th · 1881, shot after 200 days|Garfield;James Garfield|us
Chester A. Arthur|21st · 1881–1885|Chester Arthur|us
Grover Cleveland|22nd and 24th · 1885–1889, 1893–1897|Cleveland|us
Benjamin Harrison|23rd · 1889–1893|Ben Harrison|us
William McKinley|25th · 1897–1901|McKinley|us
Theodore Roosevelt|26th · 1901–1909|Teddy Roosevelt;Teddy|us
William Howard Taft|27th · 1909–1913|Taft;William Taft|us
Woodrow Wilson|28th · 1913–1921|Woodrow|us
Warren G. Harding|29th · 1921–1923|Harding;Warren Harding|us
Calvin Coolidge|30th · 1923–1929|Coolidge|us
Herbert Hoover|31st · 1929–1933|Hoover|us
Franklin D. Roosevelt|32nd · 1933–1945|FDR;Franklin Roosevelt|us
Harry S. Truman|33rd · 1945–1953|Truman;Harry Truman|us
Dwight D. Eisenhower|34th · 1953–1961|Eisenhower;Ike;Dwight Eisenhower|us
John F. Kennedy|35th · 1961–1963|Kennedy;JFK;John Kennedy|us
Lyndon B. Johnson|36th · 1963–1969|Lyndon Johnson;LBJ|us
Richard Nixon|37th · 1969–1974|Nixon|us
Gerald Ford|38th · 1974–1977|Gerald R. Ford|us
Jimmy Carter|39th · 1977–1981|Carter|us
Ronald Reagan|40th · 1981–1989|Reagan|us
George H. W. Bush|41st · 1989–1993|George HW Bush;Bush Sr;Bush Senior|us
Bill Clinton|42nd · 1993–2001|Clinton;William Clinton|us
George W. Bush|43rd · 2001–2009|George W Bush;Bush Jr;Bush Junior|us
Barack Obama|44th · 2009–2017|Obama|us
Donald Trump|45th and 47th · 2017–2021, 2025–|Trump|us
Joe Biden|46th · 2021–2025|Biden;Joseph Biden|us`,
    "pm",
  ),
  variants: [
    tagged("au", "Australia", 6, true),
    tagged("uk", "United Kingdom: since 1900", 6),
    tagged("us", "United States: all presidents", 10),
    all(20, "All three"),
  ],
  groups: [
    { tag: "au", label: "Australia" },
    { tag: "uk", label: "UK" },
    { tag: "us", label: "US" },
  ],
});

// ---------------------------------------------------------------- Units & Forces
export const unitsDeck = textDeck({
  id: "units",
  title: "Physics: Units & Forces",
  subject: "Science",
  blurb: "What do scientists measure things in? Name the unit. Then the conversions: miles to km, °F, nautical miles.",
  noun: "units",
  mode: "prompt",
  placeholder: "Your answer…",
  ask: (i) => (i.tags.includes("conv") ? promptText(clueOf(i)) : promptText("What's the unit of", `${clueOf(i).toLowerCase()}?`)),
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
Calorie|Energy in food (old unit)|Calories;kcal|other
1000|How many metres in a kilometre?|1,000;one thousand;a thousand|conv,convstarter
100|How many centimetres in a metre?|one hundred;a hundred|conv,convstarter
1000|How many grams in a kilogram?|1,000;a thousand|conv,convstarter
1000|How many millilitres in a litre?|1,000;a thousand|conv,convstarter
3600|How many seconds in an hour?|3,600|conv,convstarter
1.6|Roughly how many kilometres in a mile?|1.61;1.609;1.6093|conv,convstarter
1.852|How many kilometres in a nautical mile (used in aviation)?|1.85;1.9|conv
2.54|How many centimetres in an inch?|2.5|conv
30|Roughly how many centimetres in a foot?|30.48;30.5|conv
0.45|Roughly how many kilograms in a pound (lb)?|0.454;0.4536;.45;.454|conv
28|Roughly how many grams in an ounce?|28.35;28.3|conv
3.8|Roughly how many litres in a US gallon?|3.785;3.79;3.78|conv
4.5|Roughly how many litres in an imperial (UK) gallon?|4.546;4.55;4.54|conv
32|Water freezes at what temperature in °F?|32F;32 degrees|conv
212|Water boils at what temperature in °F?|212F;212 degrees|conv
273|0 °C is how many kelvin?|273.15;273K|conv
300000|Roughly how fast is light, in km per second?|299792;299,792;300,000;3e5|conv
9.8|Gravity on Earth makes things accelerate at roughly how many metres per second every second?|9.81;9.8m/s2;10|conv`,
    "u",
  ),
  variants: [
    tagged("starter", "Everyday Units", 2, true),
    tagged("base", "The 7 Base Units", 2),
    { id: "units", label: "All Units", minutes: 5, filter: (i) => !i.tags.includes("conv") },
    tagged("convstarter", "Everyday Conversions", 2, true),
    tagged("conv", "All Conversions", 5),
  ],
  groups: [
    { tag: "base", label: "The seven base units" },
    { tag: "derived", label: "Built from the base units" },
    { tag: "other", label: "Other units you'll meet" },
    { tag: "conv", label: "Conversions" },
  ],
  answerKey: numberOrWords,
  describe: (i) => `${clueOf(i)}: ${i.name}`,
});

// ---------------------------------------------------------------- Famous Scientists
export const scientistsDeck = textDeck({
  id: "scientists",
  title: "Famous Scientists",
  subject: "Science",
  blurb: "A discovery appears. Who made it? Surnames are enough. Over 50 discoveries, including some Australian ones.",
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
Max Planck|Started quantum theory|Planck
Isaac Newton|Built the first practical reflecting telescope|Newton|more
Isaac Newton|Showed white light is made of a rainbow of colours, with a prism|Newton|more
Albert Einstein|Explained the photoelectric effect (which won him the Nobel Prize)|Einstein|more
Charles Darwin|Sailed around the world on HMS Beagle as its naturalist|Darwin|more
Marie Curie|Was the first person to win Nobel Prizes in two different sciences|Curie|more
Alexander Fleming|Discovered lysozyme, an antibacterial enzyme in tears|Fleming|more
Galileo Galilei|Saw that Venus has phases like the Moon|Galileo|more
Louis Pasteur|Developed a vaccine against rabies|Pasteur|more
Robert Hooke|Looked at cork under a microscope and named the "cell"|Hooke
Antonie van Leeuwenhoek|Was the first to see bacteria, with his own microscopes|Leeuwenhoek;van Leeuwenhoek
Carl Linnaeus|Invented the two-part naming system for species (Homo sapiens)|Linnaeus
Alfred Wegener|Proposed that the continents drift|Wegener
Niels Bohr|Pictured electrons orbiting the nucleus in shells|Bohr
James Clerk Maxwell|Wrote the equations linking electricity, magnetism and light|Maxwell
Jonas Salk|Developed the first polio vaccine|Salk
Dorothy Hodgkin|Worked out the structures of penicillin and vitamin B12 with X-rays|Hodgkin
Hippocrates|Is called the father of medicine (doctors still take his oath)|
Pythagoras|Gave his name to the rule a² + b² = c² for right-angled triangles|
Euclid|Wrote Elements, the geometry textbook used for 2,000 years|
Charles Babbage|Designed the Analytical Engine, a mechanical computer|Babbage
Tim Berners-Lee|Invented the World Wide Web|Berners-Lee;Berners Lee
Werner Heisenberg|Showed you can't know a particle's position and speed exactly|Heisenberg
Erwin Schrödinger|Imagined a cat that is both alive and dead in a box|Schrodinger;Schroedinger
Rachel Carson|Warned about pesticides in Silent Spring|Carson
Barry Marshall|Showed bacteria cause stomach ulcers, by drinking them (an Australian)|Marshall
Fiona Wood|Invented spray-on skin for burns victims (an Australian)|Wood
Graeme Clark|Invented the cochlear implant, the "bionic ear" (an Australian)|Clark
Ian Frazer|Co-developed the HPV vaccine against cervical cancer (in Australia)|Frazer`,
    "sc",
  ),
  variants: [
    tagged("starter", "The Big Names", 3, true),
    tagged("more", "More From the Big Names", 3),
    all(12),
  ],
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
// Flipped: the word is the clue ("A joey is a baby…") and the animal is the answer.
export const babyDeck = textDeck({
  id: "babies",
  title: "Baby Animals & Group Names",
  subject: "Nature & Animals",
  blurb: "A joey is a baby… kangaroo. A murder is a group of… crows. Name the animal.",
  noun: "names",
  mode: "prompt",
  wide: true,
  placeholder: "Which animal?",
  ask: (i) => promptText(clueOf(i)),
  items: parse(
    `Kangaroo|A joey is a baby…|Wallaby;Koala;Wombat;Possum;Roo|baby,starter
Cat|A kitten is a baby…|Kitty|baby,starter
Dog|A puppy is a baby…||baby,starter
Horse|A foal is a baby…|Pony;Donkey;Zebra|baby,starter
Cow|A calf is a baby…|Whale;Elephant;Giraffe;Hippo;Camel;Buffalo|baby,starter
Sheep|A lamb is a baby…||baby,starter
Goat|A kid is a baby…||baby
Pig|A piglet is a baby…||baby
Swan|A cygnet is a baby…||baby
Goose|A gosling is a baby…||baby
Duck|A duckling is a baby…||baby,starter
Owl|An owlet is a baby…||baby
Frog|A tadpole is a baby…|Toad|baby,starter
Deer|A fawn is a baby…||baby
Bear|A cub is a baby…|Lion;Tiger;Fox;Wolf;Leopard|baby,starter
Hare|A leveret is a baby…||baby
Eagle|An eaglet is a baby…||baby
Echidna|A puggle is a baby…|Platypus|baby
Butterfly|A caterpillar is a baby…|Moth|baby
Lions|A pride is a group of…|Lion|group
Fish|A school is a group of…|Fishes|group
Wolves|A pack is a group of…|Wolf;Dogs;Dog|group
Geese|A gaggle is a group of…|Goose|group
Crows|A murder is a group of…|Crow|group
Owls|A parliament is a group of…|Owl|group
Flamingos|A flamboyance is a group of…|Flamingo|group
Whales|A pod is a group of…|Whale;Dolphins;Dolphin|group
Kangaroos|A mob is a group of…|Kangaroo|group
Bees|A swarm is a group of…|Bee;Insects|group
Ants|A colony is a group of…|Ant;Bees;Bee|group
Cows|A herd is a group of…|Cow;Cattle;Elephants;Deer;Horses|group
Jellyfish|A smack is a group of…||group
Rhinos|A crash is a group of…|Rhino;Rhinoceros;Rhinoceroses|group
Hippos|A bloat is a group of…|Hippo;Hippopotamus;Hippopotamuses|group
Zebras|A dazzle is a group of…|Zebra|group
Giraffes|A tower is a group of…|Giraffe|group
Ferrets|A business is a group of…|Ferret|group
Sharks|A shiver is a group of…|Shark|group
Porcupines|A prickle is a group of…|Porcupine|group`,
    "b",
  ),
  variants: [tagged("starter", "Baby Basics", 2, true), tagged("baby", "All Baby Animals", 4), tagged("group", "Group Names", 4), all(7)],
  groups: [
    { tag: "baby", label: "Baby animals" },
    { tag: "group", label: "Group names" },
  ],
  describe: (i) => `${clueOf(i).replace(/…$/, "")} ${i.name.toLowerCase()}`,
});

// ---------------------------------------------------------------- Mythology
export const mythDeck = textDeck({
  id: "myths",
  title: "Mythology",
  subject: "History",
  blurb: "Gods, spirits and heroes from the stories that shaped cultures: Greek and Roman, Norse, Egyptian, Celtic, Inca and Aboriginal Dreaming.",
  noun: "figures",
  mode: "prompt",
  wide: true,
  placeholder: "Name…",
  ask: (i) => promptText(clueOf(i)),
  items: parse(
    `Jupiter|Zeus is Greek. What's his Roman name?|Jove|pairs,pairstarter
Juno|Hera is Greek. What's her Roman name?||pairs,pairstarter
Neptune|Poseidon is Greek. What's his Roman name?||pairs,pairstarter
Pluto|Hades is Greek. What's his Roman name?|Dis|pairs,pairstarter
Mars|Ares is Greek. What's his Roman name?||pairs,pairstarter
Venus|Aphrodite is Greek. What's her Roman name?||pairs,pairstarter
Minerva|Athena is Greek. What's her Roman name?||pairs
Mercury|Hermes is Greek. What's his Roman name?||pairs,pairstarter
Diana|Artemis is Greek. What's her Roman name?||pairs
Apollo|Apollo is Greek. What's his Roman name?||pairs
Vulcan|Hephaestus is Greek. What's his Roman name?||pairs
Ceres|Demeter is Greek. What's her Roman name?||pairs
Bacchus|Dionysus is Greek. What's his Roman name?|Liber|pairs
Cupid|Eros is Greek. What's his Roman name?|Amor|pairs
Saturn|Cronus is Greek. What's his Roman name?||pairs
Vesta|Hestia is Greek. What's her Roman name?||pairs
Zeus|Greek king of the gods, who throws thunderbolts||greek
Poseidon|Greek god of the sea, with a trident||greek
Hades|Greek god of the underworld||greek
Athena|Greek goddess of wisdom, born from Zeus's head|Athene|greek
Medusa|Gorgon whose gaze turned people to stone||greek
Heracles|Greek hero who completed twelve labours|Hercules|greek
Prometheus|Titan who stole fire from the gods for humans||greek
Odin|Norse chief of the gods, who gave an eye for wisdom|Woden;Wotan|norse
Thor|Norse god of thunder, with the hammer Mjölnir||norse
Loki|Norse trickster god||norse
Freya|Norse goddess of love and war, who rides a chariot pulled by cats|Freyja|norse
Valhalla|Odin's hall, where warriors who die in battle go||norse
Yggdrasil|The giant tree that connects the nine worlds in Norse myth|World Tree|norse
Ra|Egyptian sun god|Re|egypt
Osiris|Egyptian god of the dead and the afterlife||egypt
Isis|Egyptian goddess of magic, wife of Osiris||egypt
Anubis|Jackal-headed Egyptian god of mummification||egypt
Horus|Falcon-headed Egyptian god of the sky and kingship||egypt
Thoth|Ibis-headed Egyptian god of writing and wisdom||egypt
The Dagda|Irish father god, with a huge club and a never-empty cauldron|Dagda|celtic
Brigid|Irish goddess of poetry, healing and smithcraft|Brigit;Brighid|celtic
Lugh|Irish god of skills and crafts, master of all arts|Lug|celtic
The Morrígan|Irish goddess of war and fate, who can become a crow|Morrigan;Morrígan|celtic
Cernunnos|Antlered Celtic god of animals and the wild||celtic
Inti|Inca sun god||inca
Viracocha|Inca creator god||inca
Pachamama|Andean earth mother||inca
Mama Quilla|Inca moon goddess|Mama Killa|inca
Bunjil|Creator spirit of the Kulin nations (around Melbourne), seen as a wedge-tailed eagle||dreaming
Waa|The crow, Bunjil's counterpart in Kulin stories|Crow|dreaming
The Rainbow Serpent|A creator being in stories across many nations, shaping rivers and waterholes|Rainbow Serpent;Wagyl;Waugal|dreaming
Baiame|Sky father and creator in Wiradjuri, Kamilaroi and other nations' stories|Biame;Baayami|dreaming
Tiddalik|The frog who drank all the water, in a Gunaikurnai story from Gippsland||dreaming
Wandjina|Cloud and rain spirits painted on rock in the Kimberley|Wondjina|dreaming
Mimi|Thin, tall spirits of the rocks in Arnhem Land stories|Mimih|dreaming`,
    "m",
  ),
  variants: [
    tagged("pairstarter", "Greek ↔ Roman Basics", 2, true),
    tagged("pairs", "All Greek ↔ Roman Pairs", 3),
    tagged("greek", "Greek Myths", 2),
    tagged("norse", "Norse", 2),
    tagged("egypt", "Egyptian", 2),
    tagged("celtic", "Celtic", 2),
    tagged("inca", "Inca", 2),
    tagged("dreaming", "Aboriginal Dreaming", 2),
    all(10),
  ],
  related: { href: "#mythpairs", label: "Play the Greek & Roman memory game ▸" },
  tip: "Dreaming stories belong to particular Aboriginal nations, and names and meanings vary between them. These are a small, respectful starting point.",
  groups: [
    { tag: "pairs", label: "Greek and Roman" },
    { tag: "greek", label: "Greek" },
    { tag: "norse", label: "Norse" },
    { tag: "egypt", label: "Egyptian" },
    { tag: "celtic", label: "Celtic" },
    { tag: "inca", label: "Inca" },
    { tag: "dreaming", label: "Aboriginal Dreaming" },
  ],
  describe: (i) => `${i.name}: ${clueOf(i)}`,
});
