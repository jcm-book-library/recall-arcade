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

// ---------------------------------------------------------------- Animal groups
const CLASSES = ["Mammal", "Bird", "Reptile", "Amphibian", "Fish", "Insect", "Arachnid"];
export const animalGroupsDeck = choiceDeck(
  {
    id: "animalgroups",
    title: "Animal Groups",
    subject: "Nature & Animals",
    blurb: "Mammal, bird, reptile, amphibian, fish, insect or arachnid? Some are trickier than they look.",
    noun: "animals",
    items: parse(
      `Mammal|Dolphin|Breathes air and feeds its young milk, like all mammals.|starter
Fish|Whale shark|The biggest fish in the world, not a whale.|
Mammal|Bat|The only mammal that can truly fly.|starter
Bird|Penguin|A bird that swims instead of flies.|starter
Mammal|Platypus|One of the few mammals that lays eggs.|starter
Mammal|Echidna|Another egg-laying mammal, found in Australia.|
Amphibian|Axolotl|A salamander that keeps its gills as an adult.|
Reptile|Crocodile||starter
Reptile|Turtle||
Reptile|Snake||starter
Amphibian|Frog||starter
Fish|Seahorse|Yes, a fish. The males carry the eggs.|
Fish|Shark|Sharks are fish with skeletons made of cartilage.|starter
Fish|Eel||
Arachnid|Spider|Eight legs: arachnids, not insects.|starter
Arachnid|Scorpion||
Arachnid|Tick|Ticks have eight legs, like spiders.|
Insect|Butterfly||starter
Insect|Ant||
Insect|Dragonfly||
Insect|Ladybird||
Bird|Ostrich||
Bird|Kiwi||
Bird|Emu||starter
Bird|Kookaburra||
Reptile|Gecko||
Reptile|Komodo dragon|The largest living lizard.|
Reptile|Tuatara|Looks like a lizard but is the last of an ancient reptile group.|
Amphibian|Newt||
Amphibian|Toad||
Amphibian|Caecilian|A legless amphibian that looks like a worm.|
Fish|Manta ray||
Fish|Stingray||
Mammal|Koala||starter
Mammal|Seal||
Mammal|Flying fox|A large fruit bat.|`,
      "g",
    ),
  },
  {
    rounds: [
      { id: "starter", label: "The Basics", starter: true, filter: (i) => i.tags.includes("starter") },
      { id: "all", label: "All 36", filter: () => true },
    ],
    question: (i) => `A ${clue(i).toLowerCase()} is a…`,
    options: () => CLASSES,
    shuffleOptions: false,
    explain: extra,
  },
);

// ---------------------------------------------------------------- Where animals live
const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica"];
export const habitatsDeck = choiceDeck(
  {
    id: "habitats",
    title: "Where Animals Live",
    subject: "Nature & Animals",
    blurb: "Which continent is each animal from in the wild?",
    noun: "animals",
    items: parse(
      `Africa|Lion||starter
Africa|Giraffe||starter
Africa|Zebra||
Africa|Hippopotamus||starter
Africa|Gorilla||
Africa|Ring-tailed lemur|Only found on Madagascar.|
Africa|Meerkat||
Asia|Giant panda||starter
Asia|Bengal tiger||starter
Asia|Orangutan|Only on Borneo and Sumatra.|
Asia|Komodo dragon|Only on a few Indonesian islands.|
Asia|Red panda||
Asia|Snow leopard||
North America|American bison||starter
North America|Bald eagle||
North America|Grizzly bear||
North America|Raccoon||
South America|Sloth||starter
South America|Jaguar||
South America|Llama||
South America|Capybara|The world's biggest rodent.|
South America|Toucan||
Oceania|Kangaroo||starter
Oceania|Koala||
Oceania|Kiwi|New Zealand's national bird.|starter
Oceania|Cassowary||
Antarctica|Emperor penguin|Breeds on the Antarctic sea ice in winter.|starter
Antarctica|Weddell seal||
Europe|Iberian lynx|Spain and Portugal only.|
Europe|Chamois|A mountain goat-antelope of the Alps.|
Europe|European hedgehog||starter
Europe|Alpine ibex||`,
      "w",
    ),
  },
  {
    rounds: [
      { id: "starter", label: "Famous Animals", starter: true, filter: (i) => i.tags.includes("starter") },
      { id: "all", label: "All 32", filter: () => true },
    ],
    question: (i) => `Where does the ${clue(i).toLowerCase()} live in the wild?`,
    options: () => CONTINENTS,
    shuffleOptions: false,
    explain: extra,
  },
);

// ---------------------------------------------------------------- Dinosaurs
export const dinosaursDeck = choiceDeck(
  {
    id: "dinosaurs",
    title: "Dinosaurs",
    subject: "Nature & Animals",
    blurb: "Triassic, Jurassic or Cretaceous? Put each dinosaur in its period.",
    noun: "dinosaurs",
    items: parse(
      `Cretaceous|Tyrannosaurus rex|T. rex lived closer in time to us than to Stegosaurus.|starter
Cretaceous|Triceratops||starter
Cretaceous|Velociraptor|Real ones were about the size of a turkey, with feathers.|starter
Cretaceous|Spinosaurus||
Cretaceous|Ankylosaurus||starter
Cretaceous|Parasaurolophus||
Cretaceous|Pachycephalosaurus||
Cretaceous|Iguanodon|One of the first dinosaurs ever named, in 1825.|
Cretaceous|Muttaburrasaurus|Found in Queensland.|
Cretaceous|Australovenator|An Australian meat-eater nicknamed "Banjo".|
Jurassic|Stegosaurus||starter
Jurassic|Brachiosaurus||starter
Jurassic|Diplodocus||starter
Jurassic|Allosaurus||
Jurassic|Archaeopteryx|A feathered link between dinosaurs and birds.|
Jurassic|Brontosaurus||
Jurassic|Dilophosaurus||
Jurassic|Megalosaurus|The first dinosaur ever named, in 1824.|
Triassic|Coelophysis||starter
Triassic|Plateosaurus||
Triassic|Herrerasaurus|One of the earliest known dinosaurs.|
Triassic|Eoraptor||`,
      "d",
    ),
  },
  {
    rounds: [
      { id: "starter", label: "The Famous Ones", starter: true, filter: (i) => i.tags.includes("starter") },
      { id: "all", label: "All 22", filter: () => true },
    ],
    question: (i) => `When did ${clue(i)} live?`,
    options: () => ["Triassic", "Jurassic", "Cretaceous"],
    shuffleOptions: false,
    explain: (i) => {
      const range: Record<string, string> = { Triassic: "252–201", Jurassic: "201–145", Cretaceous: "145–66" };
      return `${i.name}: ${range[i.name]} million years ago.${extra(i) ? ` ${extra(i)}` : ""}`;
    },
  },
);
