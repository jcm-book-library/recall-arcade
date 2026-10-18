# Recall Arcade

Short, timed learning games you replay until the answers stick.
Started with a Sporcle-style "name every country" map quiz.

## Games
Thirty games across five subjects, six each. ★ marks the starter round in each.

- **Geography:** Countries of the World, Flags, Capitals, Seas Lakes & Rivers, Territories, Neighbours
- **Science:** Zoom Out, Periodic Table, Cells & Life, The Human Body, Units & Forces, Famous Scientists
- **History:** Big Moments, Who Lived When?, Australian Prime Ministers, Europe in 1914, The Ancient World, Trivia Round
- **Travel & Transport:** Airport Codes, Airline Codes, NATO Alphabet, Currencies, Time Zones, Landmarks & Wonders
- **Nature & Animals:** Australian Animals, Animal Groups, Dog Breeds, Where Animals Live, Baby Animals & Group Names, Dinosaurs

### Ways to play
| Style | Where |
|---|---|
| Type in any order | Countries, Periodic Table, Zoom Out, NATO, Prime Ministers, Neighbours, 1914, Ancient World |
| One at a time, typed | Flags, Capitals, Territories, Airports, Airlines, Currencies, Time Zones, Units, Scientists, Baby Animals, photo games |
| One at a time, clicked | Seas Lakes & Rivers (and Cells / Human Body with "click instead") |
| Labelled diagram | Cells & Life, The Human Body |
| Timeline | Big Moments, Who Lived When? |
| Multiple choice | Trivia Round, Animal Groups, Where Animals Live, Dinosaurs |

## How it's built
- `src/engine/`: the shared parts every game uses: answer matching, progress saving.
- `src/decks/`: one file per topic. A deck is a list of items (name + accepted spellings + tags)
  plus the "board" that draws them. Adding a topic means adding a deck.
- `src/boards/`: ways of drawing a deck (world map, periodic table, flag/photo wall, tiles, diagrams, Zoom Out).
- `src/ui/timeline.ts`, `src/ui/choice.ts`: the timeline and multiple-choice game screens.
- `src/ui/`: the home screen and the play screen.

## Running it locally
```
npm install
npm run dev     # opens a live-reloading local copy
npm run build   # makes the finished site in dist/
```

Map data: Natural Earth via the `world-atlas` package (public domain).
Flags: the `flag-icons` package (MIT licence).
Seas, lakes and rivers: Natural Earth (public domain), cut down by `scripts/build-water.mjs`.
Historical borders (1914, AD 100): [historical-basemaps](https://github.com/aourednik/historical-basemaps) by André Ourednik (GPL-3.0), loaded from GitHub at play time, not copied here.
Photos (animals, dogs, landmarks): each Wikipedia article's main image, freely licensed only, loaded at play time and shown with its photographer and licence.

Plans and ideas live in [docs/](docs/).
