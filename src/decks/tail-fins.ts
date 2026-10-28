import type { Deck, Item } from "../engine/types";
import { createFlagBoard } from "../boards/flagBoard";

// Tail fin photos, kept in public/arcade/spotter/. The file name is the key below.
// "file | answer | other accepted answers | note shown after the round | tags"
const TAILS = `aer-lingus.jpg|Aer Lingus|||
air-asia-junior.jpg|AirAsia|Air Asia|Special livery: anime characters|special
air-canada.jpg|Air Canada|||starter
air-china.jpg|Air China|||
air-france.jpg|Air France|||starter
Air-Malta.jpg|Air Malta|||
air-maroc.jpg|Royal Air Maroc|Air Maroc;Royal Air Maroc||
air-new-zealand.jpg|Air New Zealand|Air NZ||starter
alaskan-airlines.jpg|Alaska Airlines|Alaska;Alaskan Airlines|The tail shows an Alaskan Native man|starter
alitalia.jpg|Alitalia|ITA Airways;ITA|Italy's flag carrier, now ITA Airways|
all-nippon-pokemon.jpg|All Nippon Airways|ANA;All Nippon|Special livery: Pikachu|special
Bangladesh-Airlines.jpg|Biman Bangladesh Airlines|Biman;Bangladesh Airlines;Biman Bangladesh||
bhutan.jpg|Drukair|Druk Air;Royal Bhutan Airlines;Bhutan Airlines;Bhutan|The tail shows the Thunder Dragon|
brazil.jpg|Azul|Azul Brazilian Airlines;Azul Linhas Aereas;Azul Airlines|A Brazilian airline||
british-airways.jpg|British Airways|BA||starter
cathay-pacific.jpg|Cathay Pacific|Cathay||starter
china-eastern.jpg|China Eastern|China Eastern Airlines||
cyprus-airways.jpg|Cyprus Airways|||
Delta.jpg|Delta Air Lines|Delta;Delta Airlines||starter
dolomiti.jpg|Air Dolomiti|Dolomiti||
dragonair.jpg|Dragonair|Cathay Dragon|Hong Kong, now part of Cathay Pacific|
edelweiss.jpg|Edelweiss Air|Edelweiss|The tail shows an edelweiss flower|
egypt-air.jpg|EgyptAir|Egypt Air|The tail shows the god Horus' eye|
frontier-red-panda.jpg|Frontier Airlines|Frontier|Special livery: a red panda|special
hawaiian-airlines.jpg|Hawaiian Airlines|Hawaiian|The tail shows a woman with a hibiscus (Pualani)|starter
jal.jpg|Japan Airlines|JAL|The red crane|starter
korean-airlines.jpg|Korean Air|Korean Airlines;Korean Air Lines|The taegeuk, from the Korean flag|starter
lufthansa.jpg|Lufthansa|||starter
maldivian.jpg|Maldivian|Maldivian Airlines||
MEA.JPG|Middle East Airlines|MEA|The tail shows Lebanon's cedar tree|
nok.jpg|Nok Air|Nok||
norwegian.jpg|Norwegian|Norwegian Air Shuttle;Norwegian Air|Special livery: the poet Robert Burns|special
qantas.jpg|Qantas|Qantas Airways|The flying kangaroo|starter
saudie-air.jpg|Saudia|Saudi Arabian Airlines;Saudi Airlines;Saudi||
singapore.jpg|Singapore Airlines|SIA|The stylised bird|starter
south-african.jpg|South African Airways|SAA||
spice.jpg|SpiceJet|Spice Jet;Spice||
swiss-air.jpg|Swiss|Swiss International Air Lines;Swiss Air;Swissair||starter
thai.jpg|Thai Airways|Thai;Thai Airways International|The purple orchid|starter
tiger-air.jpg|Tigerair|Tiger Air;Tiger Airways||
tui.jpg|TUI|TUI fly;TUI Airways|The smile|
turkish-airlines.jpg|Turkish Airlines|Turkish||starter
ukraine.jpg|Ukraine International Airlines|UIA;Ukraine International;Ukraine Airlines||
united-airlines.jpg|United Airlines|United||starter
vietnam.jpg|Vietnam Airlines|||`;

const items: Item[] = TAILS.split("\n").map((line) => {
  const [file, name, aliases, note, tags] = line.split("|");
  return {
    id: file.replace(/\.[a-z]+$/i, "").toLowerCase(),
    name,
    aliases: aliases ? aliases.split(";") : [],
    tags: tags ? tags.split(",") : [],
    data: { file, note },
  };
});

const photoUrl = (i: Item) => `${import.meta.env.BASE_URL}arcade/spotter/${i.data!.file}`;

export const tailFinsDeck: Deck = {
  id: "tailfins",
  subject: "Travel & Transport",
  title: "Tail Fins",
  blurb: "Whose tail is this? The colours and the logo on the tail are the clue. Some have special paint jobs.",
  noun: "tails",
  mode: "prompt",
  placeholder: "Which airline?",
  items,
  variants: [
    { id: "starter", label: "Well-Known Tails", minutes: 3, starter: true, filter: (i) => i.tags.includes("starter") },
    { id: "all", label: `All ${items.length}`, minutes: 8, filter: () => true },
  ],
  options: [],
  tip: "Airlines often change their tail design. Some paint a special design on one plane, like a Pikachu or a red panda.",
  describe: (i) => (i.data!.note ? `${i.name} (${i.data!.note})` : i.name),
  renderPrompt: (item) => {
    const fig = document.createElement("figure");
    fig.className = "prompt-photo";
    const img = document.createElement("img");
    img.src = photoUrl(item);
    img.alt = "An airline's tail fin";
    const q = document.createElement("figcaption");
    q.className = "prompt-text";
    q.textContent = "Whose tail fin is this?";
    fig.append(img, q);
    return fig;
  },
  createBoard: ({ container, items: playing }) => createFlagBoard(container, playing, photoUrl, [], "photos", () => ""),
};
