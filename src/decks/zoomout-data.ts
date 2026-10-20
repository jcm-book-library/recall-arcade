// The six stages of Zoom Out: the night sky, then from the planets to the galaxies next door.
// Each item has a marker drawn on its stage's diagram (1000 x 560 units).
// Shapes: "body" = a circle, "band" = a thick curved strip, "ring" = a dashed loop,
// "arm" = a spiral arm of the galaxy, "stars" = a small star cluster.

export interface ZoomItem {
  id: string;
  name: string;
  aliases?: string[];
  stage: number;
  shape: "body" | "band" | "ring" | "arm" | "stars";
  x: number;
  y: number;
  r?: number;
  /** Extra drawing data: path for bands/arms, colour for bodies. */
  d?: string;
  color?: string;
  /** Where the label goes, relative to the marker. */
  label?: "above" | "below" | "left" | "right";
}

export interface ZoomStage {
  n: number;
  title: string;
  scale: string;
  fact: string;
}

export const STAGES: ZoomStage[] = [
  { n: 1, title: "The Planets", scale: "Across this view: about 9 billion km, the Sun to Neptune.", fact: "Sizes are exaggerated and gaps squashed. To scale, the planets would be invisible specks." },
  { n: 2, title: "The Solar System", scale: "Across this view: about 1.5 light years, out to the edge of the Oort Cloud.", fact: "Light from the Sun reaches Neptune in about 4 hours, and the outer Oort Cloud in over a year." },
  { n: 3, title: "The Nearest Stars", scale: "Across this view: about 25 light years. Each ring is 5 light years.", fact: "The nearest star, Proxima Centauri, is about 40 trillion km away." },
  { n: 4, title: "The Night Sky", scale: "Constellations are patterns seen from Earth, not places.", fact: "The Sun passes through 13 constellations a year. Astrology counts 12 and leaves out Ophiuchus." },
  { n: 5, title: "The Milky Way", scale: "Across this view: about 100,000 light years.", fact: "The Sun takes about 230 million years to go once around the centre of the galaxy." },
  { n: 6, title: "Our Galactic Neighbours", scale: "Across this view: about 100 million light years.", fact: "Andromeda is 2.5 million light years away and heading our way. Collision due in about 4.5 billion years." },
];

/** The order stages are played in: the night sky we can see first, then out from the Sun. */
export const STAGE_ORDER = [4, 1, 2, 3, 5, 6];
export const rankOf = (stage: number) => STAGE_ORDER.indexOf(stage) + 1;

const SUN_X = -70;
const orbit = (x: number) => x - SUN_X;

export const ZOOM_ITEMS: ZoomItem[] = [
  // 1. Planets: drawn along a line from the Sun at the left edge.
  { id: "mercury", name: "Mercury", stage: 1, shape: "body", x: 150, y: 290, r: 6, color: "#a7a29a" },
  { id: "venus", name: "Venus", stage: 1, shape: "body", x: 210, y: 290, r: 11, color: "#e3c27d" },
  { id: "earth", name: "Earth", stage: 1, shape: "body", x: 272, y: 290, r: 12, color: "#4f8fd6" },
  { id: "mars", name: "Mars", stage: 1, shape: "body", x: 330, y: 290, r: 8, color: "#c9573a" },
  { id: "jupiter", name: "Jupiter", stage: 1, shape: "body", x: 458, y: 290, r: 44, color: "#d4a77a" },
  { id: "saturn", name: "Saturn", stage: 1, shape: "body", x: 622, y: 290, r: 36, color: "#e6cf96" },
  { id: "uranus", name: "Uranus", stage: 1, shape: "body", x: 770, y: 290, r: 22, color: "#9fd8df" },
  { id: "neptune", name: "Neptune", stage: 1, shape: "body", x: 900, y: 290, r: 21, color: "#4a6fd1" },

  // 2. The rest of the solar system. Top: moons around their planets. Bottom: belts and dwarf planets.
  { id: "moon", name: "The Moon", aliases: ["Moon", "Luna"], stage: 2, shape: "body", x: 128, y: 92, r: 5, color: "#c9c9c9", label: "above" },
  { id: "io", name: "Io", stage: 2, shape: "body", x: 290, y: 66, r: 5, color: "#e8d36a", label: "above" },
  { id: "europa", name: "Europa", stage: 2, shape: "body", x: 340, y: 72, r: 5, color: "#d8c8a8", label: "above" },
  { id: "ganymede", name: "Ganymede", stage: 2, shape: "body", x: 360, y: 128, r: 6, color: "#a59a8a", label: "right" },
  { id: "callisto", name: "Callisto", stage: 2, shape: "body", x: 250, y: 150, r: 6, color: "#7d7268", label: "left" },
  { id: "titan", name: "Titan", stage: 2, shape: "body", x: 575, y: 70, r: 6, color: "#d9a650", label: "above" },
  { id: "triton", name: "Triton", stage: 2, shape: "body", x: 812, y: 140, r: 5, color: "#d6c4c0", label: "below" },
  { id: "asteroids", name: "Asteroid Belt", aliases: ["Main Belt", "Asteroid Belt", "The Asteroid Belt"], stage: 2, shape: "band", x: 150, y: 448, d: "M150 330 Q170 430 150 530", label: "below" },
  { id: "ceres", name: "Ceres", stage: 2, shape: "body", x: 156, y: 400, r: 5, color: "#9a9188", label: "right" },
  { id: "kuiper", name: "Kuiper Belt", aliases: ["Kuiper", "The Kuiper Belt"], stage: 2, shape: "band", x: 430, y: 448, d: "M430 320 Q470 430 430 540", label: "below" },
  { id: "pluto", name: "Pluto", stage: 2, shape: "body", x: 445, y: 380, r: 5, color: "#c7b39b", label: "right" },
  { id: "haumea", name: "Haumea", stage: 2, shape: "body", x: 452, y: 428, r: 4, color: "#ddd", label: "right" },
  { id: "makemake", name: "Makemake", stage: 2, shape: "body", x: 446, y: 478, r: 4, color: "#c98d6b", label: "right" },
  { id: "eris", name: "Eris", stage: 2, shape: "body", x: 580, y: 420, r: 5, color: "#e8e8e8", label: "above" },
  { id: "oort", name: "Oort Cloud", aliases: ["The Oort Cloud"], stage: 2, shape: "band", x: 880, y: 430, d: "M860 290 Q960 430 860 560", label: "left" },

  // 3. Nearest stars: placed by distance from the Sun (22 units per light year).
  { id: "proxima", name: "Proxima Centauri", aliases: ["Proxima"], stage: 3, shape: "body", x: 412, y: 305, r: 4, color: "#ff8a65", label: "left" },
  { id: "alphacen", name: "Alpha Centauri", aliases: ["Rigil Kentaurus", "Alpha Centauri A", "Alpha Cen"], stage: 3, shape: "body", x: 422, y: 342, r: 6, color: "#fff3c4", label: "below" },
  { id: "barnard", name: "Barnard's Star", aliases: ["Barnards Star", "Barnard"], stage: 3, shape: "body", x: 500, y: 149, r: 4, color: "#ff7043", label: "right" },
  { id: "wolf359", name: "Wolf 359", stage: 3, shape: "body", x: 337, y: 220, r: 4, color: "#ff7043", label: "left" },
  { id: "lalande", name: "Lalande 21185", aliases: ["Lalande"], stage: 3, shape: "body", x: 360, y: 162, r: 4, color: "#ff8a65", label: "above" },
  { id: "sirius", name: "Sirius", aliases: ["Dog Star"], stage: 3, shape: "body", x: 533, y: 466, r: 8, color: "#cfe3ff", label: "right" },
  { id: "epseri", name: "Epsilon Eridani", stage: 3, shape: "body", x: 695, y: 405, r: 5, color: "#ffd59a", label: "right" },
  { id: "procyon", name: "Procyon", stage: 3, shape: "body", x: 395, y: 509, r: 7, color: "#fff6dc", label: "left" },
  { id: "tauceti", name: "Tau Ceti", stage: 3, shape: "body", x: 760, y: 240, r: 5, color: "#ffe6a8", label: "right" },
  { id: "61cyg", name: "61 Cygni", stage: 3, shape: "body", x: 680, y: 100, r: 5, color: "#ffb26b", label: "right" },

  // 4. Night sky: the 13 constellations the Sun passes through, in order, plus four famous others.
  ...[
    ["aries", "Aries", []], ["taurus", "Taurus", []], ["gemini", "Gemini", []], ["cancer", "Cancer", []],
    ["leo", "Leo", []], ["virgo", "Virgo", []], ["libra", "Libra", []], ["scorpius", "Scorpius", ["Scorpio"]],
    ["ophiuchus", "Ophiuchus", []], ["sagittarius", "Sagittarius", []], ["capricornus", "Capricornus", ["Capricorn"]],
    ["aquarius", "Aquarius", []], ["pisces", "Pisces", []],
  ].map(([id, name, aliases], i): ZoomItem => {
    const a = (i / 13) * Math.PI * 2 - Math.PI / 2;
    return {
      id: id as string, name: name as string, aliases: aliases as string[], stage: 4, shape: "stars",
      x: Math.round(500 + Math.cos(a) * 225), y: Math.round(280 + Math.sin(a) * 225),
      label: Math.cos(a) > 0.3 ? "right" : Math.cos(a) < -0.3 ? "left" : Math.sin(a) < 0 ? "above" : "below",
    };
  }),
  { id: "orion", name: "Orion", aliases: ["The Hunter"], stage: 4, shape: "stars", x: 430, y: 220, label: "left" },
  { id: "ursamajor", name: "Ursa Major", aliases: ["Great Bear", "The Great Bear", "Big Dipper", "The Plough"], stage: 4, shape: "stars", x: 570, y: 220, label: "right" },
  { id: "crux", name: "Crux", aliases: ["Southern Cross", "The Southern Cross"], stage: 4, shape: "stars", x: 430, y: 345, label: "left" },
  { id: "cassiopeia", name: "Cassiopeia", stage: 4, shape: "stars", x: 570, y: 345, label: "right" },

  // 5. Milky Way: spiral arms drawn by the board; x/y is where each label sits.
  { id: "centre", name: "Galactic Centre", aliases: ["Galactic Center", "Sagittarius A*", "Sagittarius A", "Sgr A*", "The Centre", "Center", "Centre", "Supermassive Black Hole"], stage: 5, shape: "body", x: 500, y: 280, r: 16, color: "#ffe9a8", label: "below" },
  { id: "perseus", name: "Perseus Arm", aliases: ["Perseus"], stage: 5, shape: "arm", x: 0, y: 0, d: "0" },
  { id: "sagarm", name: "Sagittarius Arm", aliases: ["Sagittarius-Carina Arm", "Carina-Sagittarius Arm", "Sagittarius Carina", "Carina Arm"], stage: 5, shape: "arm", x: 0, y: 0, d: "1" },
  { id: "scutum", name: "Scutum-Centaurus Arm", aliases: ["Scutum Centaurus", "Scutum-Crux Arm", "Scutum Arm", "Centaurus Arm"], stage: 5, shape: "arm", x: 0, y: 0, d: "2" },
  { id: "norma", name: "Norma Arm", aliases: ["Norma"], stage: 5, shape: "arm", x: 0, y: 0, d: "3" },
  { id: "orionarm", name: "Orion Arm", aliases: ["Orion Spur", "Orion-Cygnus Arm", "Local Arm", "Local Spur"], stage: 5, shape: "arm", x: 0, y: 0, d: "spur" },

  // 6. Galactic neighbours.
  { id: "milkyway", name: "Milky Way", aliases: ["The Milky Way", "Our Galaxy"], stage: 6, shape: "body", x: 330, y: 300, r: 30, color: "#cfd8ff", label: "below" },
  { id: "lmc", name: "Large Magellanic Cloud", aliases: ["LMC", "Large Magellanic"], stage: 6, shape: "body", x: 268, y: 360, r: 9, color: "#cfd8ff", label: "left" },
  { id: "smc", name: "Small Magellanic Cloud", aliases: ["SMC", "Small Magellanic"], stage: 6, shape: "body", x: 300, y: 395, r: 6, color: "#cfd8ff", label: "below" },
  { id: "andromeda", name: "Andromeda Galaxy", aliases: ["Andromeda", "M31"], stage: 6, shape: "body", x: 560, y: 230, r: 40, color: "#e6dcff", label: "above" },
  { id: "triangulum", name: "Triangulum Galaxy", aliases: ["Triangulum", "M33"], stage: 6, shape: "body", x: 640, y: 320, r: 14, color: "#d6e4ff", label: "right" },
  { id: "localgroup", name: "Local Group", aliases: ["The Local Group"], stage: 6, shape: "ring", x: 470, y: 290, d: "M470 140 C 780 140 780 450 470 450 C 170 450 170 140 470 140 Z", label: "below" },
  { id: "virgo", name: "Virgo Cluster", aliases: ["The Virgo Cluster"], stage: 6, shape: "stars", x: 880, y: 140, label: "below" },
  { id: "laniakea", name: "Laniakea Supercluster", aliases: ["Laniakea"], stage: 6, shape: "ring", x: 500, y: 525, d: "M30 520 C 200 30 800 30 970 520", label: "above" },
];

export { SUN_X, orbit };
