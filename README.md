# Recall Arcade

Short, timed learning games you replay until the answers stick.
Started with a Sporcle-style "name every country" map quiz.

## Games
Thirty games across five subjects, six each. ★ marks the starter round in each.

- **Geography:** Countries of the World (territories optional), Flags, Capitals, Seas Lakes & Rivers, Neighbours, Mountains
- **Science:** Zoom Out, Periodic Table, Cells & Life, The Human Body, Units & Forces, Famous Scientists
- **History:** Big Moments, Who Lived When?, Australian Prime Ministers, Empires Through Time, Mythology, Trivia Round
- **Travel & Transport:** Airport Codes, Airline Codes, NATO Alphabet, Currencies, Time Zones, Landmarks & Wonders
- **Nature & Animals:** Australian Animals, Classifying Life, Pet Breeds, Where Animals Live, Baby Animals & Group Names, Dinosaurs
- **Music:** The Piano Keyboard, Treble Clef, Bass Clef, Rhythm & Note Lengths, Keys & Symbols, Ear Training

### Ways to play
| Style | Where |
|---|---|
| Type in any order | Countries, Periodic Table, Zoom Out, NATO, Prime Ministers, Neighbours, Empires Through Time |
| One at a time, typed | Flags, Capitals, Airports, Airlines, Currencies, Time Zones, Units, Scientists, Mythology, Baby Animals, Australian Animals, Landmarks, Dinosaurs |
| One at a time, clicked | Seas Lakes & Rivers, Mountains, Pet Breeds, Where Animals Live (and Cells / Human Body with "click instead") |
| Labelled diagram | Cells & Life, The Human Body |
| Timeline | Big Moments, Who Lived When? |
| Multiple choice | Trivia Round, Classifying Life, Ear Training (listen, then choose) |
| Piano keyboard | The Piano Keyboard, Treble and Bass Clef (name the note, or "answer on the piano") |

## How it's built
- `src/engine/`: the shared parts every game uses: answer matching, progress saving.
- `src/decks/`: one file per topic. A deck is a list of items (name + accepted spellings + tags)
  plus the "board" that draws them. Adding a topic means adding a deck.
- `src/boards/`: ways of drawing a deck (world map, periodic table, flag/photo wall, tiles, diagrams, Zoom Out).
- `src/ui/timeline.ts`, `src/ui/choice.ts`: the timeline and multiple-choice game screens.
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
Photos (animals, pets, landmarks, dinosaurs): each Wikipedia article's main image, freely licensed only, loaded at play time and shown with its photographer and licence.

Plans and ideas live in [docs/](docs/).
