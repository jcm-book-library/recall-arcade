# Recall Arcade

Short, timed learning games you replay until the answers stick.
Started with a Sporcle-style "name every country" map quiz.

## Games
Thirty-four quizzes across six subjects, plus a memory game inside Mythology. ★ marks the starter round in each.

- **Geography:** Countries of the World (territories optional), Flags, Capitals, Seas Lakes & Rivers, Neighbours, Mountains
- **Science:** Infinity & Beyond, Periodic Table, Cells & Life, The Human Body, Units & Forces
- **History:** Big Moments, Who Lived When?, Australian Prime Ministers, Empires Through Time, Mythology (with Greek & Roman Pairs, a memory game), Famous For
- **Travel & Transport:** Airport Codes, Airline Codes, Spot the Airline, Tail Fins, NATO Alphabet, Currencies, Time Zones, Landmarks & Wonders
- **Nature & Animals:** Australian Animals, Classifying Life, Pet Breeds, Baby Animals & Group Names, Dinosaurs
- **Music:** The Piano Keyboard, Treble Clef, Bass Clef, Rhythm & Note Lengths, Keys & Symbols, Ear Training

### Ways to play
| Style | Where |
|---|---|
| Type in any order | Countries, Periodic Table, Infinity & Beyond, NATO, Prime Ministers, Neighbours, Empires Through Time |
| One at a time, typed | Flags, Capitals, Airports, Airlines, Currencies, Time Zones, Units, Mythology, Baby Animals, Australian Animals, Landmarks, Dinosaurs |
| One at a time, clicked | Seas Lakes & Rivers, Mountains, Pet Breeds (and Cells / Human Body with "click instead") |
| Labelled diagram | Cells & Life, The Human Body |
| Timeline | Big Moments, Who Lived When? |
| Multiple choice | Classifying Life, Ear Training (listen, then choose) |
| Memory (flip two cards) | Greek & Roman Pairs (from the Mythology screen, or `#mythpairs`) |
| Matching (two columns) | Famous For |
| Piano keyboard | The Piano Keyboard, Treble and Bass Clef (name the note, or "answer on the piano") |

## How it's built
- `src/engine/`: the shared parts every game uses: answer matching, progress saving.
- `src/decks/`: one file per topic. A deck is a list of items (name + accepted spellings + tags)
  plus the "board" that draws them. Adding a topic means adding a deck.
- `src/boards/`: ways of drawing a deck (world map, periodic table, flag/photo wall, tiles, diagrams, Infinity & Beyond).
- `src/ui/timeline.ts`, `src/ui/choice.ts`, `src/ui/pairs.ts`: the timeline, multiple-choice and pairs (memory and matching) game screens.
- `src/ui/`: the home screen and the play screen.
- `src/music/`: note names, the piano sound (Web Audio, no sound files) and the stave drawing.

## Running it locally
```
npm install
npm run dev     # opens a live-reloading local copy
npm run build   # makes the finished site in dist/
```

Map data: Natural Earth via the `world-atlas` package (public domain).
Flags: the `flag-icons` package (MIT licence).
Seas, lakes and rivers: Natural Earth (public domain), cut down by `scripts/build-water.mjs`.
Mountain ranges: Natural Earth geography regions (public domain), cut down by `scripts/build-ranges.mjs`. Peak heights and positions are typed in `src/decks/mountains-data.ts`.
Historical borders (323 BC to 1914): [historical-basemaps](https://github.com/aourednik/historical-basemaps) by André Ourednik (GPL-3.0), loaded from GitHub at play time, not copied here.
Photos (animals, pets, landmarks, dinosaurs, Greek and Roman gods): each Wikipedia article's main image, freely licensed only, loaded at play time and shown with its photographer and licence.

Skeleton drawing (The Human Body): "Human skeleton front en.svg" by LadyofHats (Mariana Ruiz Villarreal), public domain, via Wikimedia Commons, cleaned up by `scripts/build-skeleton.mjs`.

Organ diagrams (The Human Body, the rounds "By body system"), all from Wikimedia Commons, cleaned up and cut into named parts by `scripts/build-organs.mjs` (the downloaded originals are not kept in the repo). Labels, label lines and backgrounds are removed. The CC BY and CC BY-SA diagrams are adapted this way, and carry that note in the credit line shown under each one:
- Digestive system: "Digestive system diagram en.svg" by Mariana Ruiz Villarreal (LadyofHats) and Jmarchn, public domain.
- Respiratory system: "Respiratory system complete en.svg" by LadyofHats and Jmarchn, public domain.
- Heart: "Diagram of the human heart (cropped).svg" by Wapcaplet, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
- Urinary system: "Urinary system.svg" by Jordi March i Nogué, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
- Nervous system: "TE-Nervous system diagram.svg" by The Emirr (Wikimedia Commons), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Adapted: labels removed and parts separated.
- Female reproductive system: "Scheme female reproductive system-en.svg" by the CDC and Mysid, public domain.

Plans and ideas live in [docs/](docs/).
