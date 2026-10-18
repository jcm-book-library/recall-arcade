// Multiple-choice games: a question and a handful of answers to pick from.
import type { Deck, Item } from "../engine/types";
import { renderChoice, type ChoiceSpec } from "../ui/choice";

function choiceDeck(d: Omit<Deck, "variants" | "options" | "createBoard" | "screen">, spec: ChoiceSpec): Deck {
  return {
    ...d,
    variants: [],
    options: [],
    createBoard: () => {
      throw new Error(`${d.title} uses its own screen`);
    },
    screen: (root, deck) => renderChoice(root, deck, spec),
  };
}

/** "answer|question or subject|wrong;wrong;wrong (or a note)|tags" lines. */
function parse(table: string, prefix: string): Item[] {
  return table
    .trim()
    .split("\n")
    .map((line, i) => {
      const [name, clue, extra, tags] = line.split("|");
      return { id: `${prefix}${i}`, name, tags: tags ? tags.split(",") : [], data: { clue, extra } };
    });
}
const clue = (i: Item) => i.data!.clue as string;
const extra = (i: Item) => (i.data!.extra as string) || undefined;

// ---------------------------------------------------------------- History trivia
export const triviaDeck = choiceDeck(
  {
    id: "trivia",
    title: "Trivia Round",
    subject: "History",
    blurb: "Classic history questions with four answers to choose from. Ten at a time.",
    noun: "questions",
    items: parse(
      `Inca|Which empire built Machu Picchu?|Aztec;Maya;Olmec
Augustus|Who was the first Roman emperor?|Julius Caesar;Nero;Caligula
Mayflower|Which ship carried the Pilgrims to America in 1620?|Endeavour;Santa María;Beagle
Endeavour|What was James Cook's ship on his first voyage to Australia?|Bounty;Victory;Discovery
The Berlin Wall|Which wall split a European city from 1961 to 1989?|Hadrian's Wall;The Great Wall;The Iron Wall
Amelia Earhart|Who was the first woman to fly solo across the Atlantic?|Amy Johnson;Bessie Coleman;Nancy Bird Walton
Britain|In which country did the Industrial Revolution begin?|France;Germany;United States
Egyptian hieroglyphs|The Rosetta Stone helped decode which writing?|Cuneiform;Linear B;Mayan glyphs
Pompeii|Which city was buried by Mount Vesuvius in AD 79?|Rome;Athens;Carthage
Karl Marx|Who wrote The Communist Manifesto with Friedrich Engels?|Vladimir Lenin;Leon Trotsky;Joseph Stalin
Sputnik 1|What was the first artificial satellite called?|Explorer 1;Vostok 1;Apollo 1
France|Which country gave the Statue of Liberty to the United States?|Britain;Spain;Italy
Queen Victoria|Which queen ruled Britain for most of the 1800s?|Queen Anne;Elizabeth I;Mary I
William the Conqueror|Who won the Battle of Hastings in 1066?|Harold Godwinson;Alfred the Great;Richard the Lionheart
Ferdinand Magellan|Whose expedition first sailed all the way around the world?|Christopher Columbus;Vasco da Gama;James Cook
Gallipoli|Where did Australian and New Zealand troops land on 25 April 1915?|Normandy;Kokoda;Tobruk
The Lighthouse of Alexandria|Which ancient wonder stood in Alexandria?|The Hanging Gardens;The Colossus of Rhodes;The Temple of Artemis
Yuri Gagarin|Who was the first person in space?|Neil Armstrong;Alan Shepard;John Glenn
The American Civil War|Which war was fought between the northern and southern United States?|The War of 1812;The Revolutionary War;The Spanish–American War
The Byzantine Empire|Which empire ruled from Constantinople after Rome fell in the west?|The Ottoman Empire;The Persian Empire;The Holy Roman Empire
Genghis Khan|Who founded the Mongol Empire?|Kublai Khan;Attila;Tamerlane
Magna Carta|Which document did King John seal in 1215?|The Bill of Rights;The Domesday Book;The Treaty of Paris
Italy|In which country did the Renaissance begin?|France;Greece;Spain
Gold miners at Ballarat|Who rebelled at the Eureka Stockade in 1854?|Convicts in Sydney;Farmers in Tasmania;Soldiers in Melbourne
The Sumerians|Which people built the first ziggurats?|The Egyptians;The Romans;The Greeks
Michelangelo|Who painted the Sistine Chapel ceiling?|Leonardo da Vinci;Raphael;Botticelli
New Zealand|Which country was the first to give all women the vote?|Australia;United Kingdom;United States
The Black Death|Which disease killed about a third of Europe in the 1300s?|Smallpox;Cholera;Spanish flu
Winston Churchill|Who was Britain's prime minister for most of World War II?|Neville Chamberlain;Clement Attlee;David Lloyd George
Qin Shi Huang|The Terracotta Army guards the tomb of which emperor?|Kublai Khan;Confucius;Emperor Wu
The Treaty of Versailles|Which treaty ended World War I?|The Treaty of Paris;The Peace of Westphalia;The Treaty of Ghent
South Africa|In which country was apartheid the law until the early 1990s?|Kenya;Brazil;India
Counting Aboriginal people in the census|What did Australia's 1967 referendum change?|Becoming a republic;Votes for women;Federation of the states
The Ottoman Empire|Which empire did Suleiman the Magnificent rule?|The Persian Empire;The Mughal Empire;The Byzantine Empire
China|Where was paper invented?|Egypt;Greece;India
Vasco da Gama|Who first sailed from Europe to India around Africa?|Bartolomeu Dias;Christopher Columbus;Ferdinand Magellan
Nicholas II|Who was the last tsar of Russia?|Peter the Great;Alexander III;Ivan the Terrible`,
      "t",
    ),
  },
  {
    rounds: [
      { id: "ten", label: "Quick Ten", starter: true, filter: () => true, count: 10 },
      { id: "twenty", label: "Twenty", filter: () => true, count: 20 },
      { id: "all", label: "Everything", filter: () => true },
    ],
    question: clue,
    options: (i) => [i.name, ...(extra(i) ?? "").split(";")],
  },
);

// ---------------------------------------------------------------- Classifying life
// Four levels that zoom in, from the kingdoms of life down to the orders of mammals.
const LEVELS: { tag: string; label: string; options: string[]; question: (name: string) => string; note: string }[] = [
  {
    tag: "kingdom",
    label: "1 · Kingdoms",
    options: ["Animal", "Plant", "Fungus", "Bacterium"],
    question: (n) => `Is ${n} an animal, plant, fungus or bacterium?`,
    note: "Start wide: the big kingdoms of life.",
  },
  {
    tag: "backbone",
    label: "2 · Backbone?",
    options: ["Vertebrate", "Invertebrate"],
    question: (n) => `Does ${n} have a backbone?`,
    note: "Zoom in on animals: backbone (vertebrate) or not (invertebrate)?",
  },
  {
    tag: "class",
    label: "3 · Classes",
    options: ["Mammal", "Bird", "Reptile", "Amphibian", "Fish", "Insect", "Arachnid"],
    question: (n) => `${n.charAt(0).toUpperCase()}${n.slice(1)} is a…`,
    note: "Zoom in again: which class?",
  },
  {
    tag: "order",
    label: "4 · Mammal Orders",
    options: ["Primate", "Carnivore", "Rodent", "Rabbits & hares", "Marsupial", "Monotreme", "Bat", "Whales & dolphins", "Even-toed hoofed", "Odd-toed hoofed"],
    question: (n) => `Which group of mammals is ${n} in?`,
    note: "Zoom right in on mammals: which order?",
  },
];

/** "answer|subject (with a/an/the)|note|level,starter" */
const lifeItems = parse(
  `Fungus|a mushroom||kingdom,starter
Fungus|yeast|Yeast is a single-celled fungus that makes bread rise.|kingdom,starter
Fungus|mould on bread||kingdom
Fungus|a truffle||kingdom
Plant|an oak tree||kingdom,starter
Plant|a fern||kingdom
Plant|moss||kingdom
Plant|a Venus flytrap|It eats insects, but it's still a plant.|kingdom,starter
Animal|coral|Coral is made of tiny animals called polyps.|kingdom,starter
Animal|a sponge|Sea sponges are some of the simplest animals.|kingdom,starter
Animal|a jellyfish||kingdom
Animal|a sea anemone||kingdom
Bacterium|E. coli||kingdom,starter
Bacterium|Salmonella||kingdom
Bacterium|the bacteria in yoghurt||kingdom
Invertebrate|an octopus||backbone,starter
Invertebrate|a snail||backbone
Invertebrate|a crab||backbone,starter
Invertebrate|a starfish||backbone
Invertebrate|an earthworm||backbone
Invertebrate|a squid||backbone
Invertebrate|a butterfly||backbone
Invertebrate|a spider||backbone
Vertebrate|a shark|Sharks' skeletons are cartilage, but they still have a backbone.|backbone,starter
Vertebrate|a frog||backbone,starter
Vertebrate|a snake|A snake is mostly backbone: hundreds of vertebrae.|backbone
Vertebrate|a bat||backbone
Vertebrate|a seahorse||backbone
Vertebrate|a penguin||backbone
Mammal|a dolphin|Breathes air and feeds its young milk, like all mammals.|class,starter
Fish|a whale shark|The biggest fish in the world, not a whale.|class
Mammal|a bat|The only mammal that can truly fly.|class,starter
Bird|a penguin|A bird that swims instead of flies.|class,starter
Mammal|a platypus|One of the few mammals that lays eggs.|class,starter
Amphibian|an axolotl|A salamander that keeps its gills as an adult.|class
Reptile|a crocodile||class,starter
Reptile|a turtle||class
Amphibian|a frog||class,starter
Fish|a seahorse|Yes, a fish. The males carry the eggs.|class
Fish|a shark||class,starter
Arachnid|a spider|Eight legs: arachnids, not insects.|class,starter
Arachnid|a scorpion||class
Arachnid|a tick|Ticks have eight legs, like spiders.|class
Insect|a butterfly||class,starter
Insect|a dragonfly||class
Insect|a ladybird||class
Bird|a kiwi||class
Bird|an emu||class
Reptile|a gecko||class
Reptile|a tuatara|Looks like a lizard but is the last of an ancient reptile group.|class
Amphibian|a caecilian|A legless amphibian that looks like a worm.|class
Fish|a stingray||class
Mammal|a seal||class
Primate|a chimpanzee||order,starter
Primate|a lemur||order
Primate|a human|Yes, we're primates.|order,starter
Carnivore|a lion||order,starter
Carnivore|a seal|Seals are in the same order as cats, dogs and bears.|order
Carnivore|a bear||order
Rodent|a mouse||order,starter
Rodent|a capybara||order
Rodent|a beaver||order
Rabbits & hares|a rabbit|Not a rodent: rabbits have their own order, the lagomorphs.|order,starter
Marsupial|a kangaroo||order,starter
Marsupial|a wombat||order
Marsupial|a Tasmanian devil||order
Monotreme|a platypus|Monotremes lay eggs. Only the platypus and echidnas are left.|order,starter
Monotreme|an echidna||order
Bat|a flying fox||order
Whales & dolphins|a blue whale||order,starter
Whales & dolphins|a dolphin||order
Even-toed hoofed|a hippopotamus|Hippos' closest living relatives are whales.|order
Even-toed hoofed|a cow||order
Even-toed hoofed|a giraffe||order
Odd-toed hoofed|a horse||order,starter
Odd-toed hoofed|a rhinoceros||order
Odd-toed hoofed|a tapir||order`,
  "cl",
);

export const lifeDeck = choiceDeck(
  {
    id: "life",
    title: "Classifying Life",
    subject: "Nature & Animals",
    blurb: "Start with the kingdoms of life, then zoom in: backbone or not, which class, which order of mammal.",
    noun: "living things",
    items: lifeItems,
  },
  {
    rounds: LEVELS.map((l, i) => ({
      id: l.tag,
      label: l.label,
      starter: i === 0,
      filter: (it: Item) => it.tags.includes(l.tag),
      question: (it: Item) => l.question(clue(it)),
      options: () => l.options,
      note: l.note,
    })),
    question: clue,
    options: () => [],
    shuffleOptions: false,
    explain: extra,
  },
);
