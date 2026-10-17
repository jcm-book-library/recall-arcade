# Recall Arcade

Short, timed learning games you replay until the answers stick.
Started with a Sporcle-style "name every country" map quiz.

## Games
- **Countries of the World**: type every country before time runs out; the map fills in.
  World or one continent at a time, with optional territories (Greenland, New Caledonia...).
- **Flags of the World**: a flag appears, you name the country. Skip and come back.
- **Capital Cities**: a country is ringed on the map, you name its capital.
- **Seas, Lakes & Rivers**: a name appears, you click it on the map. Three wrong clicks and it's shown.
- **Zoom Out**: name the planets, then zoom out stage by stage to the galaxies next door.
- **Airport Codes**: name the city for each code (or the reverse), by region or 50 at random.
- **Periodic Table**: name the elements, with optional symbol hints.

## How it's built
- `src/engine/`: the shared parts every game uses: answer matching, progress saving.
- `src/decks/`: one file per topic. A deck is a list of items (name + accepted spellings + tags)
  plus the "board" that draws them. Adding a topic means adding a deck.
- `src/boards/`: ways of drawing a deck (world map, periodic table grid).
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

Plans and ideas live in [docs/](docs/).
