// Geography: City Shapes. A city's water and coastline (or its street plan) is shown on its
// own, with no labels. Name the city. With "Pick from six" ticked it's the other way round:
// the name is shown, and you pick its shape from six on the board, with three tries.
//
// The drawings are built by scripts/build-cities.py from OpenStreetMap data
// (© OpenStreetMap contributors, ODbL, via the Overture Maps release). The water file is
// about 0.5 MB and the streets file about 1.5 MB, so each loads only when a round needs it.
import type { Deck, Item, ProgressGroup } from "../engine/types";
import { createFlagBoard } from "../boards/flagBoard";

type View = "water" | "streets";
interface Shapes {
  /** city id -> filled SVG path of the water, in a 400 × 400 box */
  water: Record<string, string>;
  /** city id -> { stroke width: SVG path of the roads that width, "water": any water in the frame } */
  streets: Record<string, Record<string, string>>;
}

// [id, name, region tag, other accepted answers]
const CITIES: [string, string, string, string[]?][] = [
  ["melbourne", "Melbourne", "anz", ["Port Phillip"]],
  ["sydney", "Sydney", "anz"],
  ["hobart", "Hobart", "anz"],
  ["perth", "Perth", "anz", ["Fremantle"]],
  ["brisbane", "Brisbane", "anz"],
  ["auckland", "Auckland", "anz"],
  ["wellington", "Wellington", "anz"],
  ["london", "London", "europe"],
  ["paris", "Paris", "europe"],
  ["prague", "Prague", "europe", ["Praha"]],
  ["budapest", "Budapest", "europe"],
  ["venice", "Venice", "europe", ["Venezia"]],
  ["amsterdam", "Amsterdam", "europe"],
  ["stockholm", "Stockholm", "europe"],
  ["copenhagen", "Copenhagen", "europe", ["København", "Kobenhavn"]],
  ["istanbul", "Istanbul", "europe", ["Constantinople"]],
  ["stpetersburg", "St Petersburg", "europe", ["Saint Petersburg", "Leningrad", "Petersburg"]],
  ["lisbon", "Lisbon", "europe", ["Lisboa"]],
  ["oslo", "Oslo", "europe"],
  ["helsinki", "Helsinki", "europe"],
  ["newyork", "New York", "world", ["New York City", "NYC", "Manhattan"]],
  ["sanfrancisco", "San Francisco", "world", ["SF", "San Fran"]],
  ["seattle", "Seattle", "world"],
  ["vancouver", "Vancouver", "world"],
  ["chicago", "Chicago", "world"],
  ["montreal", "Montreal", "world", ["Montréal"]],
  ["rio", "Rio de Janeiro", "world", ["Rio"]],
  ["capetown", "Cape Town", "world"],
  ["cairo", "Cairo", "world"],
  ["dubai", "Dubai", "world"],
  ["hongkong", "Hong Kong", "world"],
  ["singapore", "Singapore", "world"],
];

// Street plans: [city id, name, other accepted answers]. Item ids are "streets-<city id>".
const STREETS: [string, string, string[]?][] = [
  ["barcelona", "Barcelona", ["Eixample"]],
  ["paris", "Paris"],
  ["canberra", "Canberra"],
  ["newyork", "New York", ["New York City", "NYC", "Manhattan"]],
  ["washington", "Washington, D.C.", ["Washington", "Washington DC", "DC"]],
  ["adelaide", "Adelaide"],
  ["melbourne", "Melbourne"],
  ["amsterdam", "Amsterdam"],
  ["moscow", "Moscow", ["Moskva"]],
  ["kyoto", "Kyoto"],
];

// Added Nov 26: street plans where the water (harbour, river, lake, moat) is half the clue.
// Same shape as STREETS; kept apart so the first round's items and scores stay as they were.
const STREETS_WATER: [string, string, string[]?][] = [
  ["sydney", "Sydney"],
  ["brisbane", "Brisbane"],
  ["christchurch", "Christchurch"],
  ["chicago", "Chicago"],
  ["sanfrancisco", "San Francisco", ["SF", "San Fran"]],
  ["venice", "Venice", ["Venezia"]],
  ["vienna", "Vienna", ["Wien"]],
  ["london", "London"],
  ["berlin", "Berlin"],
  ["stockholm", "Stockholm"],
  ["copenhagen", "Copenhagen", ["København", "Kobenhavn"]],
  ["budapest", "Budapest"],
  ["istanbul", "Istanbul", ["Constantinople"]],
  ["buenosaires", "Buenos Aires"],
  ["tokyo", "Tokyo"],
  ["hongkong", "Hong Kong"],
  ["brasilia", "Brasília", ["Brasilia"]],
  ["beijing", "Beijing", ["Peking"]],
];

// The ten from the first idea: the most famous water shapes, for the starter round.
const FAMOUS = new Set(["melbourne", "sydney", "london", "prague", "venice", "istanbul", "hongkong", "sanfrancisco", "rio", "stockholm"]);

const items: Item[] = [
  ...CITIES.map(([id, name, region, aliases]) => ({
    id, name, aliases, tags: ["water", region, ...(FAMOUS.has(id) ? ["famous"] : [])], data: { view: "water", city: id },
  })),
  ...STREETS.map(([city, name, aliases]) => ({
    id: `streets-${city}`, name, aliases, tags: ["streets", "allstreets"], data: { view: "streets", city },
  })),
  ...STREETS_WATER.map(([city, name, aliases]) => ({
    id: `streets-${city}`, name, aliases, tags: ["mixed", "allstreets"], data: { view: "streets", city },
  })),
];

const GROUPS: ProgressGroup[] = [
  { tag: "anz", label: "Australia & New Zealand" },
  { tag: "europe", label: "Europe" },
  { tag: "world", label: "Americas, Africa & Asia" },
  { tag: "streets", label: "Grids & circles" },
  { tag: "mixed", label: "Streets & water" },
];

/** How many shapes to pick from when "Pick from six" is ticked. */
const CHOICES = 6;

// Fixed colours, because the drawings are images (CSS variables don't reach inside them).
const LAND = "#f3f1ea";
const WATER = "#1d3a52";
const ROAD = "#15212a";
/** Water under the street plans: lighter, so the roads stay the main thing. */
const STREET_WATER = "#8fb4cf";

const viewOf = (item: Item) => item.data!.view as View;
const shapes: Partial<Shapes> = {};
const loads: Partial<Record<View, Promise<void>>> = {};
function loadShapes(view: View): Promise<void> {
  loads[view] ??= (view === "water" ? import("../data/city-water.json") : import("../data/city-streets.json"))
    .then((m) => void (shapes[view] = m.default as never));
  return loads[view];
}

function svgFor(item: Item): string {
  const city = item.data!.city as string;
  let inner: string;
  if (viewOf(item) === "streets") {
    const { water, ...roads } = shapes.streets![city] ?? {};
    inner = (water ? `<path d="${water}" fill="${STREET_WATER}" fill-rule="evenodd"/>` : "") +
      Object.entries(roads)
        .map(([w, d]) => `<path d="${d}" fill="none" stroke="${ROAD}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`)
        .join("");
  } else {
    inner = `<path d="${shapes.water![city] ?? ""}" fill="${WATER}" fill-rule="evenodd"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${LAND}"/>${inner}</svg>`;
}

const urls = new Map<string, string>();
function urlFor(item: Item): string {
  if (!shapes[viewOf(item)]) return "";
  let u = urls.get(item.id);
  if (!u) {
    u = URL.createObjectURL(new Blob([svgFor(item)], { type: "image/svg+xml" }));
    urls.set(item.id, u);
  }
  return u;
}

function learnCard(): Node {
  const box = document.createElement("div");
  box.innerHTML = `
    <p><strong>How to read these.</strong> Dark is water, light is land. North is up. Each square is a few kilometres to a few dozen across, so a river can look thin and a bay can fill the frame.</p>
    <p>Look for one big clue: a bay almost closed off (Melbourne), a harbour with fingers (Sydney), a river snaking through (London, Brisbane), a strait splitting two continents (Istanbul), a city built on islands (Venice, Stockholm).</p>
    <p>Street plans: a perfect grid with cut-off corners (Barcelona), roads radiating from roundabouts (Paris, Canberra), long avenues across a grid (Manhattan, Washington), rings around a centre (Moscow, Amsterdam's canals).</p>
    <p>Streets &amp; water: here the water is pale blue. Look at where the river or harbour cuts through: a moat round a square park (Tokyo, Beijing), a river looping twice (Brisbane), the Opera House point (Sydney), a lake shore with a grid (Chicago).</p>`;
  return box;
}

export const cityShapesDeck: Deck = {
  id: "cityshapes",
  subject: "Geography",
  title: "City Shapes",
  blurb: "A city's coastline and rivers, with no names on. Or its streets. Which city is it? Or tick \"Pick from six\" and find the shape that matches the name.",
  noun: "cities",
  mode: "prompt",
  placeholder: "Which city is this?",
  items,
  variants: [
    { id: "famous", label: "Famous ten", minutes: 2, starter: true, filter: (i) => i.tags.includes("famous") },
    { id: "anz", label: "Australia & New Zealand", minutes: 2, heading: "Coasts & rivers", filter: (i) => i.tags.includes("anz") },
    { id: "europe", label: "Europe", minutes: 4, filter: (i) => i.tags.includes("europe") },
    { id: "world", label: "Americas, Africa & Asia", minutes: 4, filter: (i) => i.tags.includes("world") },
    { id: "allwater", label: "All coasts & rivers", minutes: 10, filter: (i) => i.tags.includes("water") },
    { id: "streets", label: "Grids & circles", minutes: 4, heading: "Street plans", filter: (i) => i.tags.includes("streets") },
    { id: "mixed", label: "Streets & water", minutes: 6, filter: (i) => i.tags.includes("mixed") },
    { id: "allstreets", label: "All street plans", minutes: 10, filter: (i) => i.tags.includes("allstreets") },
  ],
  options: [
    { id: "pick", label: "Pick from six", hint: "See the city's name and pick its shape from six. Three tries each.", default: false },
  ],
  clickOption: "pick",
  progressGroups: GROUPS,
  learn: learnCard,
  tip: "Water is blue, land is light, north is up. Map data © OpenStreetMap contributors (ODbL), via Overture Maps.",
  describe: (i) => (i.data!.view === "streets" ? `${i.name} (streets)` : i.name),
  renderPrompt: (item, { click }) => {
    if (click) {
      const p = document.createElement("p");
      p.className = "prompt-text";
      p.append(viewOf(item) === "streets" ? "Which is the street plan of " : "Which one is ");
      const b = document.createElement("strong");
      b.textContent = item.name;
      p.append(b, "?");
      return p;
    }
    const img = document.createElement("img");
    img.className = "prompt-city";
    img.alt = item.data!.view === "streets" ? "A city's street plan" : "A city's water and coastline";
    const src = urlFor(item);
    if (src) img.src = src;
    else void loadShapes(viewOf(item)).then(() => (img.src = urlFor(item)));
    return img;
  },
  createBoard: async ({ container, items: playing, variant, options }) => {
    await Promise.all([...new Set(playing.map(viewOf))].map(loadShapes));
    const groups = variant.id === "famous" ? []
      : variant.id === "allwater" ? GROUPS.filter((g) => ["anz", "europe", "world"].includes(g.tag))
      : variant.id === "allstreets" ? GROUPS.filter((g) => g.tag === "streets" || g.tag === "mixed")
      : GROUPS.filter((g) => g.tag === variant.id);
    const pick = !!options.pick;
    const board = createFlagBoard(container, playing, urlFor, groups, pick ? "cities pick" : "cities");
    // The wall this board just added. (Not querySelector: if the player changes round while the
    // drawings load, an older board can still be in the container for a moment.)
    const wall = container.lastElementChild as HTMLElement;
    // Pick from six: show the answer and five others, in a random order. Shapes still to find
    // make the best decoys; found ones are used only if the round runs short.
    board.showChoices = (id) => {
      const cells = [...wall.querySelectorAll<HTMLElement>(".flag")];
      wall.classList.toggle("choosing", !!id);
      if (!id) {
        for (const c of cells) { c.hidden = false; c.style.order = ""; }
        return;
      }
      const done = (c: HTMLElement) => c.classList.contains("found") || c.classList.contains("missed");
      const others = cells.filter((c) => c.dataset.id !== id);
      const decoys = [...shuffle(others.filter((c) => !done(c))), ...shuffle(others.filter(done))].slice(0, CHOICES - 1);
      const shown = shuffle([cells.find((c) => c.dataset.id === id)!, ...decoys]);
      for (const c of cells) c.hidden = !shown.includes(c);
      shown.forEach((c, n) => (c.style.order = String(n)));
    };
    return board;
  },
};

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
