# Handover: Recall Arcade

Read this first in a new session. Then `CLAUDE.md` (it points at the house rules), `README.md` (what each game is), and `docs/roadmap.md` (plans and the review notes). The home page of the live site is the truth for what exists; the tables in the roadmap can lag behind.

Live site: https://jcm-book-library.github.io/recall-arcade/ · Repo: github.com/jcm-book-library/recall-arcade

## The owner, and how to work with them
- Not a coder. Wants things explained and wants options with a recommendation, not a pile of questions.
- Plays and tests each change, then reports back with notes. They merge pull requests themselves.
- Australian English. Rating G/PG, for kids and adults. Anatomy is shown as textbook diagrams.
- Usage limits matter to them. Cheaper models can build from a written brief; the lead session reviews and tests everything before a PR is opened.

## Rules of the road
- **Never push to `main`.** Work on a branch (`claude/<topic>`), push it, and open a pull request. The owner merges. Deploy to GitHub Pages runs on every push to `main`.
- `gh pr create` doesn't work from the cloud machine (GraphQL is blocked). Use the REST API: `gh api repos/jcm-book-library/recall-arcade/pulls -f title=... -f head=... -f base=main -F body=@file.md`.
- **No model names** in commits, code, docs or PRs. Commit trailer: `Co-Authored-By: Claude <noreply@anthropic.com>`, plus the session line the system gives.
- A PR description says in plain words what changes on the live site, and what was checked.
- **Keep ids stable.** Deck ids, round (variant) ids and item ids are the keys for saved scores in the browser (`learning-arcade:v1`). Rename the title, never the id.
- Several PRs append to the end of `src/style.css` and edit the import lists in `src/main.ts`, so conflicts are common and trivial: keep both sides.

## How the code is organised
- **A game = a Deck** (`src/engine/types.ts`): items (id, name, accepted aliases, tags), rounds called "variants" (a filter plus a time limit), options, a **board** that draws it, and optionally its own `screen`.
- `src/main.ts` registers every deck in `DECKS` (grouped by subject, which drives the home page) and routes `#deck-id`. The arcade games have their own routes (`#pong`, `#labyrinth`, `#flyover`).
- `src/engine/matcher.ts`: turns typed text into answers. Handles accents, "&", "Saint/St", aliases, near-miss spelling hints, and "wait" when a typed answer is also the start of another (Niger / Nigeria, UK / Ukraine). `src/engine/storage.ts`: best scores, weak spots, preferences, all in `localStorage`.
- Dev builds log an error if two items in one deck share an id (see the top of `main.ts`).

## Game types: where to look
| Type | Main files | Games |
|---|---|---|
| Type answers in any order onto a board | `ui/play.ts`, boards in `src/boards/` | Countries, Neighbours, Periodic Table, NATO, Prime Ministers & Presidents, Empires |
| One at a time, typed | `ui/play.ts`, `decks/text-decks.ts` | Flags, Capitals, Airports, Airlines, Currencies, Units, Mythology |
| Click the answer on the board | `ui/play.ts` (`mode: "click"`, `judgeClick`) | Seas, Lakes & Rivers; Mountains; Pet Breeds; piano keyboard |
| Map board | `boards/mapBoard.ts`, `decks/countries.ts` (shared map), data builders `scripts/build-water.mjs`, `scripts/build-ranges.mjs` | Countries, Capitals, Neighbours, Water, Mountains, Empires |
| Labelled diagrams | `boards/diagramBoard.ts` (drawn in code), `boards/skeletonBoard.ts` + `boards/pictureBoard.ts` (real SVGs) | Cells & Life, Human Body |
| Real anatomy SVGs | `scripts/build-skeleton.mjs`, `scripts/build-organs.mjs` + `scripts/organ-systems.mjs` (the source SVGs are downloaded and are not in the repo); cleaned output in `src/assets/` | Human Body |
| Photo walls | `data/pictures.ts` (Wikipedia, free licences, credits), `data/picture-titles.json`, `decks/picture-decks.ts`, `boards/flagBoard.ts` | Animals, Landmarks, Pet Breeds, Dinosaurs |
| City outlines (prompt + tile wall; "Pick from six" click mode via `Board.showChoices`) | `decks/city-shapes.ts`, `boards/flagBoard.ts`, data builder `scripts/build-cities.py` (Python; reads OpenStreetMap data from the Overture Maps bucket on S3, which the cloud machine can reach), output `src/data/city-water.json` and `src/data/city-streets.json` (each loaded only when a round needs it) | City Shapes |
| Own photos from the repo | `decks/tail-fins.ts`, photos in `public/arcade/spotter/` | Tail Fins |
| Timelines | `ui/timeline.ts`, `decks/history*.ts`, `decks/people*.ts` | Big Moments, Who Lived When? |
| Multiple choice | `ui/choice.ts`, `decks/choice-decks.ts` | Classifying Life; Ear Training |
| Pairs (memory and two-column match) | `ui/pairs.ts`, `decks/pairs-decks.ts` | Greek & Roman Pairs, Famous For |
| Hangman | `ui/hangman.ts`, `babyDeck` in `decks/text-decks.ts` | Baby Animals & Group Names |
| Space | `boards/zoomBoard.ts`, `decks/zoomout.ts`, `decks/zoomout-data.ts` | Infinity & Beyond (has a two-level Hint) |
| Music | `src/music/` (note names, a Web Audio piano, the stave), `boards/pianoBoard.ts`, `decks/music.ts` | Keyboard, Treble, Bass, Rhythm, Keys & Symbols, Ear Training |
| Arcade (real time) | `src/arcade/kit.ts` (shared loop, pixel art, saving), `pong.ts`, `labyrinth.ts` + `labyrinth-maps.ts` (check with `node scripts/check-labyrinth.mjs`), `flyover.ts` + `flyover-data.ts`, `docs/action-game-ideas.md`, `docs/arcade-art.md`, `public/arcade/` | Planet Pong, The Labyrinth, Flyover |

The arcade files are written to be read: their comments explain the game loop, fixed timestep, grid movement, collisions, scrolling and so on in plain English.

## Where the design notes are (and aren't)
- `docs/roadmap.md`: the plan, the subject tables, the 26 Oct 2026 review notes for every subject, new game styles and subject ideas, the visual-accuracy plan.
- `docs/island-design.md`: the island (Overworld), `#island`: decisions, build steps, where the files are.
- `docs/arcade-design.md`: **the latest arcade decisions** (1 Nov 2026): Pong tiers, Labyrinth worlds, Flyover changes, how quizzes unlock the arcade, the island, and the build order. Start here for arcade work.
- `docs/science-design.md`: the Science plan (Inner Space, The Scale of Things, Earth & Sky) and the "learn it first" cards for every hard game.
- `docs/action-game-ideas.md`: the arcade levels, the Easy / Intermediate / Hard progression and badges, the Overworld idea, the build order.
- `docs/arcade-art.md` and the Hero Workshop (`src/arcade/hero-workshop.ts`, `#hero`; the built-in hero is in `src/arcade/hero-art.ts`): how to draw the hero sprite (Piskel, 32×64, put it at `public/arcade/hero.png`).
- **Not written down yet:** a design doc per game type. This file is the map; the details live in the code. Deeper per-type docs are best written in a focused session per type.
- **Not built:** the progression system (tracks, targets, badges, unlocks), the Overworld, accounts or a backend. They are designed in the docs above, nothing more.

## Things that cost time before (read these)
- **OpenStreetMap from the cloud machine.** `overpass-api.de` and the other OSM servers are blocked, but the Overture Maps bucket (`overturemaps-us-west-2.s3.amazonaws.com`, OSM-based water, land and roads) is reachable. `scripts/build-cities.py` shows how to read just one city's area with pyarrow. The `@geo-maps` packages on npm are reachable too but far too coarse for cities.
- **Wikipedia from the cloud machine.** Only `en.wikipedia.org/w/api.php` works. `commons.wikimedia.org` and `thumb.wikimedia.org` are blocked, and the shared address gets HTTP 429 often. Files can be downloaded from `upload.wikimedia.org/wikipedia/commons/<md5[0]>/<md5[0:2]>/<File_name>` (the md5 is of the file name with underscores). Space requests out, and retry after a pause. In the owner's browser, photos load at runtime and work fine. Tests mock the API.
- **Free images only.** `pictures.ts` asks for free licences and shows credits. Check a licence before adding any diagram, and credit it on the page and in the README. CC BY and CC BY-SA need the author's name.
- Historical maps (`aourednik/historical-basemaps`, GPL) are fetched at runtime, never copied into the repo.
- **Testing.** Playwright with Chromium under `/opt/pw-browsers/` (the folder name changes with the version; find it with `ls -d /opt/pw-browsers/chromium*/chrome-linux*/chrome` and pass it to `sweep-games.mjs`), run against `npm run build` then `npx vite preview`. `node scripts/sweep-games.mjs` opens every game at phone width. Stop a preview server with `pkill -f "[v]ite preview"` in a separate command (otherwise it kills its own shell, exit 144).
- Screenshots belong in the scratchpad, never in the repo (`*.png` is in `.gitignore`).
- Helpers (cheaper models) work in their own git worktree under `.claude/worktrees/` (ignored by git). A usage limit can stop one mid-job; its work is saved and it can be resumed.

## What is open (details in the roadmap)
- Human Body: male reproductive round (a CC BY-SA 4.0 diagram exists on Wikimedia, "Male genital system - Front view.svg" and "Sagittal view"; downloads were rate-limited), blood vessels, glands, muscles, maybe one combined figure.
- Tail Fins: more photos (the owner adds them on a branch; see the airline list given in chat). A Special Paint Jobs round once there are about eight.
- Review notes still to do: Cells & Life needs a "learn it first" guide (a general idea for every hard game); Units & Forces needs depth; Classifying Life needs to be more visual; Dinosaurs round format; Airports and Airlines could merge; Currencies widen; Landmarks more; Time Zones removed, idea kept (odd zones, differences); Big Moments and Who Lived When up to about 200 each; more leaders; Music: more challenges, public-domain tunes; Infinity & Beyond: real star charts and the "look up" first stage.
- New subjects: Entertainment (books, film, games, TV, music), Maths for real life (Pythagoras, algebra, economics, statistics, maybe quantum), Arts & Culture.
- Arcade: play-test Pong, Labyrinth and Flyover and iterate; the owner draws the pixel hero; the Overworld that links everything; a snake-style flight game over a map.
- Later: the learning path in the roadmap (backend, domain, family sharing, the book-library project).
