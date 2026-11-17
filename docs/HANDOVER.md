# Handover: Recall Arcade

Read this first in a new session. Then `CLAUDE.md` (it points at the house rules), `README.md` (what each game is) and the design note for whatever you're about to touch (list below). The live site is the truth for what exists; the tables in `docs/roadmap.md` lag behind.

Live site: https://jcm-book-library.github.io/recall-arcade/ · Repo: github.com/jcm-book-library/recall-arcade
Last rewritten: 17 Nov 2026.

## Where we are (17 Nov 2026)
- **Eight subjects, 47 quizzes on the home page**, plus linked extras (below). Geography, Science, History, Travel & Transport, Nature & Animals, Music, Sport, Entertainment.
- **The home page is the island** (`#island`, also the empty route): a top-down pixel map where your hero, Bluebottle, walks a route past one building per subject, with gates, flags, a stamp book and arcade stops. The old card list is at `#list`.
- **The arcade:** Planet Pong, The Labyrinth, Flyover, The Brawl (level 1, the stadium), plus the Hero Workshop (`#hero`).
- **Every quiz is on the shared quiz page** (`src/ui/quiz-shell.ts`, rules in `docs/quiz-standard.md`): the same header, subject colours, and rows of rounds, each with Easy / Medium / Hard and its own Start.
- **Progress** (`src/engine/progress.ts`): each quiz has one Easy challenge. Clearing challenges clears subjects, which opens the arcade and sets the track. Nothing is locked behind skill. Everything is saved in the browser (`learning-arcade:v1`). There's no backend.
- All open PRs from the last sessions are merged. `main` builds and passes every check (see "Checks" below).

## What changed recently
- **City Shapes (2–17 Nov, this branch's session).** A new Geography quiz in Neighbours' old slot.
  - 32 cities' water and coastlines in five rounds (Famous ten ★, Australia & NZ, Europe, Americas/Africa/Asia, all).
  - 28 street plans in three rounds (Grids & circles, Streets & water, All street plans), drawn with any water in the frame.
  - A **Pick from six** way to play: the name is shown, you pick its shape from six, three tries. It's on the shared quiz page as "🖱 Pick from six" next to "⌨ Type the name".
  - **Neighbours** is off the home page, linked from Countries, with its id and scores kept.
  - Data: OpenStreetMap via Overture Maps (see Gotchas). Re-checked on 17 Nov after the quiz-page rebuild: every Pick-from-six question shows exactly six shapes, including the right one.
- **Done in other sessions since 2 Nov** (details in their design notes):
  - the island and its route, stadium, theatre, flags and stamp book;
  - The Brawl level 1, the Hero Workshop and Bluebottle the starter hero;
  - Sport (7th subject) and Entertainment (8th) built from the owner's spreadsheet;
  - Mythology rebuilt as a hub with specials;
  - Leaders & Changemakers, Eras & Dynasties, Big Moments periods, Born When?;
  - real star patterns in Infinity & Beyond;
  - The Scale of Things, Inner Space, Earth & Sky;
  - the quiz page standard (waves 1–2);
  - Fill the List (waves 3a–3b).

## Decisions to keep honouring
- **Keep ids stable.** Deck, round (variant) and item ids are the keys for saved scores. Rename titles, never ids. Medium keeps the old score keys; Easy and Hard add `+easy` / `+hard`.
- Retired quizzes stay reachable by link so nothing earned is lost:
  - `#neighbours` (from Countries)
  - `#units` (from The Scale of Things)
  - `#empires` (from Eras & Dynasties)
  - `#cells` (from Inner Space)
  - `#bornwhen` (from Who Lived When?)
  - `#mythpairs` (from Mythology)
- **New quizzes use the shared quiz page**, Title Case titles and the subject colour (`docs/quiz-standard.md`).
- **Arcade games show their info inside the game screen** (a HUD), Esc pauses, and ⓘ explains how to play (`docs/quiz-standard.md`, last section).
- **The owner's spreadsheet is never read by the game.** The lead session imports it into data files with the `scripts/*-from-sheet.py` scripts. The sheet link is private: ask the owner.
- City Shapes: any city with a distinctive footprint (streets, coast, river, lake or a mix) is welcome. The "which way is north?" (rotated) twist is **not** wanted for now; the owner felt it's a big step up.

## The owner, and how to work with them
- Not a coder. Wants things explained, options with a recommendation, action items first, short steps.
- Plays and tests each change, then reports back with notes. They merge pull requests themselves.
- Australian English. Rating G/PG, for kids and adults. Anatomy is shown as textbook diagrams.
- Usage limits matter. Cheaper models can build from a written brief; the lead session reviews and tests everything before a PR is opened.

## Rules of the road
- **Never push to `main`.** Work on a branch (`claude/<topic>`), push it, open a pull request; the owner merges. GitHub Pages deploys on every push to `main`.
- **Open PRs with the GitHub MCP tool** (`create_pull_request`); it works. `gh pr create` doesn't (GraphQL is blocked). The REST fallback is `gh api repos/jcm-book-library/recall-arcade/pulls -f title=... -f head=... -f base=main -F body=@file.md`.
- **If your branch's PR is already merged**, restart the branch from `origin/main` before new work: `git checkout -B <branch> origin/main`.
- **No model names** in commits, code, docs or PRs. Commit trailer: `Co-Authored-By: Claude <noreply@anthropic.com>` plus the session line the system gives. (One City Shapes commit, f11f108, slipped through with a model name. Fixing it needs a force-push on `main` history, which was not approved, so it stays.)
- A PR description says in plain words what changes on the live site, and what was checked.
- Several PRs append to `src/style.css` and edit the import lists in `src/main.ts`, so conflicts are common and trivial: keep both sides.

## How the code is organised
- **A game = a Deck** (`src/engine/types.ts`). A deck has:
  - items (id, name, accepted aliases, tags);
  - rounds called "variants" (a filter plus a time limit);
  - options, and a board that draws it;
  - optionally its own `screen`, `levels`, `learn` card or `clickOption`.
- `src/main.ts` registers every deck in `DECKS` (grouped by subject) and routes `#deck-id`. Arcade routes: `#pong`, `#labyrinth`, `#flyover`, `#brawl`, `#hero`, `#island`; `#list` is the card list.
- **The quiz page:** `src/ui/quiz-shell.ts` (shared header, rows, levels) around `src/ui/play.ts` (the standard play loop) or a deck's own screen. Levels are in `src/engine/levels.ts`, challenges and subjects in `src/engine/progress.ts`, and scores and preferences in `src/engine/storage.ts`.
- `src/engine/matcher.ts` turns typed text into answers. It handles accents, "&", "Saint/St", aliases, near-miss hints, and "wait" when an answer is the start of another (Niger / Nigeria).
- **Board hooks worth knowing:**
  - `setCurrent` highlights the item being asked about (typed games);
  - `showChoices` shows only a few tiles in click games (City Shapes' Pick from six);
  - `hint` gives two levels of help in any-order games.
- **Game types** are listed in `docs/game-types.md`, including which are duplicated and due to merge ("Put in order" and "Place on a timeline": wave 4).

### Where each kind of game lives
| Type | Main files | Games |
|---|---|---|
| Type answers in any order onto a board | `ui/play.ts`, boards in `src/boards/` | Countries, Periodic Table, NATO, Neighbours |
| One at a time, typed or clicked | `ui/play.ts` (`mode: "prompt"` / `"click"`, `clickOption`) | Flags, Capitals, Airports, City Shapes, Human Body, Seas, Mountains, Pet Breeds |
| Map board | `boards/mapBoard.ts`, `decks/countries.ts`; data builders `scripts/build-water.mjs`, `build-ranges.mjs`, `build-plates.mjs` | Countries, Capitals, Water, Mountains, Earth & Sky, Empires on the map |
| City outlines | `decks/city-shapes.ts`, `boards/flagBoard.ts`; data builder `scripts/build-cities.py` (Python) writing `src/data/city-water.json` and `city-streets.json`, each loaded only when a round needs it | City Shapes |
| Labelled diagrams and anatomy | `boards/diagramBoard.ts`, `skeletonBoard.ts`, `pictureBoard.ts`; `scripts/build-skeleton.mjs`, `build-organs.mjs` | Cells & Life, Human Body |
| Photo walls | `data/pictures.ts` (Wikipedia, free licences, credits), `decks/picture-decks.ts`, `boards/flagBoard.ts` | Animals, Landmarks, Pet Breeds, Dinosaurs |
| Zoom (space and inner space) | `boards/zoomBoard.ts`, `decks/zoomout*.ts`, `decks/innerspace*.ts`, `decks/constellation-data.ts` | Infinity & Beyond, Inner Space |
| Timelines and put in order | `ui/timeline.ts`, `ui/scale.ts`, `ui/eras.ts`, `ui/bornwhen.ts` | Big Moments, Who Lived When?, The Scale of Things, Eras & Dynasties, Born When? |
| Fill the List | `ui/fill-list.ts`, `fill-quiz.ts`, `fill-sources.ts`, `sport-fill.ts` | Sport lists, Box Office, Leaders, Eras, Big Moments, Who Lived When? |
| Sport and Entertainment | `decks/sport*.ts`, `decks/entertainment*.ts`, `ui/sport.ts`, `ui/threeclues.ts`, `ui/whoplayed.ts`, `ui/boxoffice.ts` | the Sport and Entertainment subjects |
| Mythology | `decks/mythology.ts`, `myth-data.ts`, `myth-specials.ts`, `ui/mythology.ts` | Mythology hub, Who's Who, Symbols, Afterlife, Nine Realms |
| Multiple choice, pairs, hangman | `ui/choice.ts`, `ui/pairs.ts`, `ui/hangman.ts` | Classifying Life, Ear Training, Famous For, Greek & Roman Pairs, Baby Animals |
| Music | `src/music/`, `boards/pianoBoard.ts`, `decks/music.ts` | the six Music quizzes |
| Island | `src/arcade/island.ts`, `island-map.ts`, `island-art.ts`, `stamps.ts` | home page |
| Arcade | `src/arcade/kit.ts` (shared loop), `pong.ts`, `labyrinth*.ts`, `flyover*.ts`, `brawl/`, `hero-*.ts` | the arcade games |

The arcade files are written to be read: their comments explain the game loop, fixed timestep, collisions and scrolling in plain English.

## Design notes (read the one for your area)
- `docs/quiz-standard.md` (+ `quiz-standard-mockup.html`): the quiz page rules. **Start here for any quiz work.**
- `docs/game-types.md`: the shared game engines and Fill the List.
- `docs/roadmap.md`: the overall plan, review notes per subject, ideas. Its tables lag behind the site.
- `docs/island-design.md`, `docs/story-design.md`: the island, and the story (Bluebottle, tokens, the black-hole finale).
- `docs/arcade-design.md`, `docs/action-game-ideas.md`, `docs/platformer-design.md`, `docs/arcade-art.md`: the arcade.
- `docs/science-design.md`, `docs/history-sport-design.md`, `docs/mythology-design.md`, `docs/animals-design.md`: subject plans.
- `docs/learning/`: pictures and source for the owner's "how our pixel games work" guide.

## Checks (run before every PR)
- `npm install`, then `npm run build` (type-checks and builds).
- `npx vite preview --port 4173`, then `node scripts/sweep-games.mjs http://localhost:4173/ /opt/node-tools/node_modules/playwright/index.mjs $(ls -d /opt/pw-browsers/chromium*/chrome-linux*/chrome | head -1)`. It opens every game at phone width and reports errors and sideways scrolling. The default paths in the script are out of date on the current machine, so pass them.
- Arcade checkers: `node scripts/check-brawl.mjs`, `check-labyrinth.mjs`, `check-island.mjs`, `check-flyover.mjs`.
- Stop the preview with `pkill -f "[v]ite preview"` in a **separate** command (otherwise it kills its own shell: exit 144).
- **17 Nov 2026 result:** build OK, all four checkers OK, sweep OK (47 quiz pages, no problems), and City Shapes Pick from six played through on phone and desktop.

## Gotchas (things that cost time before)
- **OpenStreetMap is blocked** from the cloud machine (`overpass-api.de`, `tile.openstreetmap.org`, Nominatim, Geofabrik).
  - **What works:** the Overture Maps bucket `overturemaps-us-west-2.s3.amazonaws.com`, which has OSM-based water, land and roads. `pip install pyarrow shapely` and read with a bbox filter; one city takes about 3 seconds. `scripts/build-cities.py` is the worked example.
  - Bump `RELEASE` in that script to the newest folder under `release/` when rebuilding.
  - The `@geo-maps` packages on npm are reachable but far too coarse for cities.
- **Wikipedia:** only `en.wikipedia.org/w/api.php` works. `commons` and `thumb.wikimedia.org` are blocked, and HTTP 429 is common.
  - Files can come from `upload.wikimedia.org/wikipedia/commons/<md5[0]>/<md5[0:2]>/<File_name>`.
  - In the owner's browser, photos load at runtime and work fine. Tests mock the API.
- **Free images only;** credit them on the page and in the README (CC BY / BY-SA need the author). Historical maps (GPL) are fetched at runtime, never copied in.
- **Map data credit:** City Shapes shows "© OpenStreetMap contributors (ODbL), via Overture Maps" under the board. Keep it if the board changes.
- **Two boards at once:** if a round is changed while data is still loading, an older board can briefly sit in the same container. Find your own elements from what you created, not with `container.querySelector`. This bit City Shapes once.
- **Time limits** must be one of the page's choices (2, 4, 6, 10, 15, 20 minutes, or none), or the selector shows the wrong time.
- **Big data files** (City Shapes about 2 MB, maps, organs) are imported with `import()` so they don't slow the home page. Keep it that way.
- Screenshots go in the scratchpad, never the repo (`*.png` is ignored, except `docs/learning/img`).
- Helpers (cheaper models) work in their own git worktree under `.claude/worktrees/` (ignored by git).

## Next steps (suggested order; details in the design notes)
1. **Play-test notes from the owner** on the quiz page standard and Fill the List (waves 1–3b, merged 14 Nov).
2. **Wave 4:** merge the duplicate "Put in order" and "Place on a timeline" engines, then write the full game-type catalogue (`docs/game-types.md`).
3. **Animals line-up** (`docs/animals-design.md`): six quizzes. The questions in that note need the owner's answers first.
4. **The Brawl levels 2 and 3** (the road, the movie studio), and the arcade HUD rule applied to the island and every arcade game.
5. **City Shapes, more cities.** Add a line to `CITIES` or `STREETS` in `scripts/build-cities.py`, run it for that city, then add the item in `src/decks/city-shapes.ts`. Check the look with a contact sheet before committing.
6. Older open items: Human Body (male reproductive, blood vessels, glands, muscles); Tail Fins photos; Currencies, Landmarks and Units depth; Time Zones rework; Maths and Arts & Culture subjects; backend and family sharing (the learning path in the roadmap).

## Open questions for the owner
- City Shapes: which cities next? Should Pick from six offer more than six (a 9-shape Hard version)?
- Story: the companion's name, and the black-hole finale's mechanics (`docs/story-design.md`).
- Animals: the shared mechanics and rounds (`docs/animals-design.md`).
- Dinosaurs: what its own stage looks like.
- The island opening up in stages: when to start (`docs/island-design.md`, "Later").
