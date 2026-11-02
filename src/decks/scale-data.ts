// THE SCALE OF THINGS: the facts. This file is only data, so values can be checked and changed
// without touching the game. Every value is in ONE unit per quantity (below), and `show` is how
// it reads on the card once revealed.
//
// Values are rounded, well-known figures. Where sources differ a little (animal speeds,
// loudness), the items are kept far enough apart that the order is never in doubt, and they say
// "about". If you add an item, keep it at least the `minGap` of its quantity away from its
// neighbours in `spread` units, or Hard puzzles could ask an unfair question.

export interface ScaleThing {
  id: string;
  name: string;
  value: number;
  show: string;
}

export interface Quantity {
  id: string; // also the round id, so it is the key for saved scores: never change it
  label: string;
  question: string; // shown above the cards: "smallest" goes on the left
  low: string; // the words at each end of the row
  high: string;
  unit: string; // shown under the number line
  /**
   * Turns a value into a position where equal steps FEEL equal. For most things that is the
   * logarithm (each step is ×10). For temperature we use kelvin first, so absolute zero is the
   * bottom. Decibels are already a log scale, so they're just divided by 10.
   */
  spread: (v: number) => number;
  /** Smallest allowed difference in `spread` units between any two things in one puzzle. */
  minGap: number;
  items: ScaleThing[];
}

const log = (v: number) => Math.log10(v);

export const QUANTITIES: Quantity[] = [
  {
    id: "speed",
    label: "Speed",
    question: "Slowest to fastest",
    low: "Slowest",
    high: "Fastest",
    unit: "metres per second",
    spread: log,
    minGap: 0.04,
    items: [
      { id: "snail", name: "A garden snail", value: 0.013, show: "about 0.05 km/h" },
      { id: "sloth", name: "A sloth", value: 0.07, show: "about 0.25 km/h" },
      { id: "walk", name: "A person walking", value: 1.4, show: "about 5 km/h" },
      { id: "bolt", name: "Usain Bolt at top speed", value: 12.4, show: "about 45 km/h" },
      { id: "horse", name: "A racehorse", value: 19.4, show: "about 70 km/h" },
      { id: "cheetah", name: "A cheetah", value: 30, show: "about 110 km/h" },
      { id: "cyclone", name: "Wind in a category 5 cyclone", value: 70, show: "over 250 km/h" },
      { id: "bullettrain", name: "A bullet train", value: 89, show: "about 320 km/h" },
      { id: "falcon", name: "A peregrine falcon diving", value: 108, show: "about 390 km/h" },
      { id: "jumbo", name: "A jumbo jet cruising", value: 250, show: "about 900 km/h" },
      { id: "sound", name: "Sound in air", value: 343, show: "about 1,235 km/h" },
      { id: "bullet", name: "A rifle bullet", value: 900, show: "about 3,200 km/h" },
      { id: "iss", name: "The Space Station in orbit", value: 7660, show: "about 27,600 km/h" },
      { id: "earthorbit", name: "Earth going round the Sun", value: 29780, show: "about 107,000 km/h" },
      { id: "light", name: "Light", value: 299792458, show: "about 1,080 million km/h" },
    ],
  },
  {
    id: "mass",
    label: "Mass",
    question: "Lightest to heaviest",
    low: "Lightest",
    high: "Heaviest",
    unit: "kilograms",
    spread: log,
    minGap: 0.1,
    items: [
      { id: "bee", name: "A honeybee", value: 0.0001, show: "about 0.1 g" },
      { id: "paperclip", name: "A paperclip", value: 0.001, show: "about 1 g" },
      { id: "coin", name: "A $1 coin", value: 0.009, show: "9 g" },
      { id: "mouse", name: "A mouse", value: 0.02, show: "about 20 g" },
      { id: "tennisball", name: "A tennis ball", value: 0.058, show: "about 58 g" },
      { id: "apple", name: "An apple", value: 0.15, show: "about 150 g" },
      { id: "baby", name: "A newborn baby", value: 3.4, show: "about 3.4 kg" },
      { id: "adult", name: "An adult person", value: 70, show: "about 70 kg" },
      { id: "horse", name: "A horse", value: 500, show: "about 500 kg" },
      { id: "car", name: "A family car", value: 1500, show: "about 1.5 tonnes" },
      { id: "elephant", name: "An African elephant", value: 6000, show: "about 6 tonnes" },
      { id: "whale", name: "A blue whale", value: 150000, show: "about 150 tonnes" },
      { id: "jumbo", name: "A jumbo jet, fully loaded", value: 400000, show: "about 400 tonnes" },
      { id: "eiffel", name: "The Eiffel Tower", value: 10100000, show: "about 10,000 tonnes" },
      { id: "moon", name: "The Moon", value: 7.35e22, show: "73 billion trillion tonnes" },
      { id: "earth", name: "The Earth", value: 5.97e24, show: "6 million billion billion kg" },
      { id: "sun", name: "The Sun", value: 1.99e30, show: "333,000 Earths" },
    ],
  },
  {
    id: "size",
    label: "Size",
    question: "Smallest to biggest",
    low: "Smallest",
    high: "Biggest",
    unit: "metres",
    spread: log,
    minGap: 0.08,
    items: [
      { id: "atom", name: "An atom", value: 1e-10, show: "about 0.1 nanometres" },
      { id: "virus", name: "A virus", value: 1e-7, show: "about 100 nanometres" },
      { id: "bacterium", name: "A bacterium", value: 2e-6, show: "about 0.002 mm" },
      { id: "hair", name: "The width of a hair", value: 7e-5, show: "about 0.07 mm" },
      { id: "ant", name: "An ant", value: 0.004, show: "about 4 mm" },
      { id: "card", name: "A credit card (long side)", value: 0.086, show: "8.6 cm" },
      { id: "person", name: "An adult person", value: 1.7, show: "about 1.7 m" },
      { id: "giraffe", name: "A giraffe", value: 5.5, show: "about 5.5 m" },
      { id: "whale", name: "A blue whale", value: 30, show: "about 30 m" },
      { id: "eiffel", name: "The Eiffel Tower", value: 330, show: "330 m tall" },
      { id: "harbourbridge", name: "Sydney Harbour Bridge (end to end)", value: 1149, show: "about 1.1 km" },
      { id: "everest", name: "Mount Everest (height)", value: 8849, show: "8.8 km" },
      { id: "reef", name: "The Great Barrier Reef", value: 2300000, show: "about 2,300 km long" },
      { id: "australia", name: "Australia, west to east", value: 4000000, show: "about 4,000 km" },
      { id: "earth", name: "The Earth (across)", value: 12742000, show: "12,742 km" },
      { id: "moondist", name: "From the Earth to the Moon", value: 384400000, show: "384,400 km" },
      { id: "sun", name: "The Sun (across)", value: 1.39e9, show: "1.4 million km" },
      { id: "sundist", name: "From the Earth to the Sun", value: 1.496e11, show: "150 million km" },
      { id: "lightyear", name: "One light year", value: 9.46e15, show: "9.5 million million km" },
      { id: "milkyway", name: "The Milky Way (across)", value: 1e21, show: "about 100,000 light years" },
    ],
  },
  {
    id: "temperature",
    label: "Temperature",
    question: "Coldest to hottest",
    low: "Coldest",
    high: "Hottest",
    unit: "degrees Celsius",
    spread: (c) => log(c + 273.15 + 1), // kelvin, plus 1 so absolute zero doesn't break the logarithm
    minGap: 0.012,
    items: [
      { id: "abszero", name: "Absolute zero, the coldest possible", value: -273.15, show: "−273 °C" },
      { id: "nitrogen", name: "Liquid nitrogen", value: -196, show: "−196 °C" },
      { id: "vostok", name: "The coldest air ever measured on Earth (Antarctica)", value: -89.2, show: "−89 °C" },
      { id: "dryice", name: "Dry ice", value: -78.5, show: "−78 °C" },
      { id: "freezer", name: "A home freezer", value: -18, show: "−18 °C" },
      { id: "ice", name: "Water freezing", value: 0, show: "0 °C" },
      { id: "body", name: "Inside your body", value: 37, show: "37 °C" },
      { id: "deathvalley", name: "The hottest air ever measured on Earth (Death Valley)", value: 56.7, show: "57 °C" },
      { id: "boil", name: "Water boiling", value: 100, show: "100 °C" },
      { id: "oven", name: "An oven baking a cake", value: 180, show: "about 180 °C" },
      { id: "lead", name: "Lead melting", value: 327.5, show: "327 °C" },
      { id: "venus", name: "The surface of Venus", value: 464, show: "about 464 °C" },
      { id: "lava", name: "Lava from a volcano", value: 1150, show: "about 1,150 °C" },
      { id: "iron", name: "Iron melting", value: 1538, show: "1,538 °C" },
      { id: "sunsurface", name: "The surface of the Sun", value: 5500, show: "about 5,500 °C" },
      { id: "lightning", name: "A lightning bolt", value: 30000, show: "about 30,000 °C" },
      { id: "suncore", name: "The middle of the Sun", value: 15000000, show: "about 15 million °C" },
    ],
  },
  {
    id: "time",
    label: "Time",
    question: "Shortest to longest",
    low: "Shortest",
    high: "Longest",
    unit: "seconds",
    spread: log,
    minGap: 0.02,
    items: [
      { id: "wingbeat", name: "One beat of a hummingbird's wings", value: 0.02, show: "about 1/50 of a second" },
      { id: "blink", name: "A blink", value: 0.3, show: "about 0.3 seconds" },
      { id: "heartbeat", name: "One heartbeat, resting", value: 0.85, show: "a bit under 1 second" },
      { id: "moonlight", name: "Light going from the Moon to Earth", value: 1.28, show: "1.3 seconds" },
      { id: "sprint", name: "The 100 m world record", value: 9.58, show: "9.58 seconds" },
      { id: "sunlight", name: "Light going from the Sun to Earth", value: 499, show: "about 8 minutes" },
      { id: "film", name: "A long film", value: 7200, show: "about 2 hours" },
      { id: "london", name: "Flying from Sydney to London", value: 79200, show: "about 22 hours" },
      { id: "day", name: "One day", value: 86400, show: "24 hours" },
      { id: "moonorbit", name: "The Moon going once round the Earth", value: 2360000, show: "about 27 days" },
      { id: "year", name: "One year", value: 31557600, show: "365¼ days" },
      { id: "halley", name: "Halley's Comet going once round the Sun", value: 2.4e9, show: "about 76 years" },
      { id: "life", name: "A long human life", value: 2.6e9, show: "about 83 years" },
      { id: "pyramids", name: "The age of the Great Pyramid", value: 1.42e11, show: "about 4,500 years" },
      { id: "dinos", name: "Since the dinosaurs died out", value: 2.08e15, show: "66 million years" },
      { id: "earthage", name: "The age of the Earth", value: 1.43e17, show: "4.5 billion years" },
      { id: "universe", name: "The age of the universe", value: 4.35e17, show: "13.8 billion years" },
    ],
  },
  {
    id: "loudness",
    label: "Loudness",
    question: "Quietest to loudest",
    low: "Quietest",
    high: "Loudest",
    unit: "decibels (every 10 is ten times the sound energy)",
    spread: (db) => db / 10,
    minGap: 0.9,
    items: [
      { id: "silence", name: "The quietest sound you can hear", value: 0, show: "0 dB" },
      { id: "leaves", name: "Leaves rustling", value: 20, show: "about 20 dB" },
      { id: "whisper", name: "A whisper", value: 30, show: "about 30 dB" },
      { id: "talk", name: "People talking", value: 60, show: "about 60 dB" },
      { id: "vacuum", name: "A vacuum cleaner", value: 75, show: "about 75 dB" },
      { id: "mower", name: "A lawn mower", value: 90, show: "about 90 dB" },
      { id: "concert", name: "A rock concert", value: 110, show: "about 110 dB" },
      { id: "thunder", name: "Thunder right overhead", value: 120, show: "about 120 dB" },
      { id: "jet", name: "A jet taking off, up close", value: 140, show: "about 140 dB" },
      { id: "rocket", name: "A space rocket launching, up close", value: 180, show: "about 180 dB" },
    ],
  },
  {
    id: "energy",
    label: "Energy",
    question: "Least to most energy",
    low: "Least",
    high: "Most",
    unit: "joules",
    spread: log,
    minGap: 0.1,
    items: [
      { id: "apple", name: "Lifting an apple 1 metre", value: 1.5, show: "about 1.5 joules" },
      { id: "serve", name: "A tennis serve", value: 72, show: "about 70 joules" },
      { id: "aa", name: "A full AA battery", value: 9000, show: "about 9,000 joules" },
      { id: "phone", name: "A full phone battery", value: 54000, show: "about 54,000 joules" },
      { id: "banana", name: "Eating a banana", value: 440000, show: "about 440,000 joules (105 Calories)" },
      { id: "car", name: "A car moving at 100 km/h", value: 580000, show: "about 580,000 joules" },
      { id: "food", name: "A day's food for an adult", value: 8.7e6, show: "about 8,700 kilojoules" },
      { id: "petrol", name: "A litre of petrol", value: 3.4e7, show: "about 34 million joules" },
      { id: "lightning", name: "A lightning bolt", value: 1e9, show: "about 1 billion joules" },
      { id: "sunlight", name: "Sunlight reaching Earth in one second", value: 1.7e17, show: "about 170,000 trillion joules" },
      { id: "sunsecond", name: "Everything the Sun gives out in one second", value: 3.8e26, show: "380 trillion trillion joules" },
    ],
  },
  {
    // MASS AND WEIGHT. Your mass (how much of you there is) is the same everywhere. Your
    // weight (how hard gravity pulls you) changes. Shown as what bathroom scales would read for
    // someone who reads 30 kg on Earth: scales really measure the pull, then pretend it's kg.
    id: "weight",
    label: "Mass & Weight",
    question: "Where would you weigh least? Least to most",
    low: "Lightest",
    high: "Heaviest",
    unit: "what the scales say, for someone who is 30 kg on Earth",
    spread: log,
    minGap: 0.02,
    items: [
      { id: "ceres", name: "On Ceres", value: 0.86, show: "under 1 kg" },
      { id: "pluto", name: "On Pluto", value: 1.9, show: "about 2 kg" },
      { id: "moon", name: "On the Moon", value: 5, show: "about 5 kg" },
      { id: "mars", name: "On Mars", value: 11.3, show: "about 11 kg" },
      { id: "venus", name: "On Venus", value: 27.1, show: "about 27 kg" },
      { id: "earth", name: "On Earth", value: 30, show: "30 kg" },
      { id: "saturn", name: "On Saturn (at the cloud tops)", value: 31.9, show: "about 32 kg" },
      { id: "neptune", name: "On Neptune (at the cloud tops)", value: 34.1, show: "about 34 kg" },
      { id: "jupiter", name: "On Jupiter (at the cloud tops)", value: 75.8, show: "about 76 kg" },
      { id: "sun", name: "On the Sun (if you could stand there)", value: 838, show: "about 840 kg" },
    ],
  },
];
