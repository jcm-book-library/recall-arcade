# Handover: Recall Arcade (updated 17 Nov 2026)

Read this first in a new session. Then `CLAUDE.md` (it points at the house rules), and the design docs
listed below. The live site is the truth for what exists.

Live site: https://jcm-book-library.github.io/recall-arcade/ · Repo: github.com/jcm-book-library/recall-arcade

## Where we are
- **47 quizzes in 8 subjects:** Geography, Science, History, Travel & Transport, Nature & Animals (becoming
  "Animals"), Music, Sport, Entertainment. Plus **5 arcade games** (Planet Pong, The Labyrinth, Flyover,
  The Brawl level 1, Hero Workshop) and **the island** (`#island`, the home page) that links everything.
- **Every quiz uses one shared quiz page** (`src/ui/quiz-shell.ts`), following the agreed standard in
  `docs/quiz-standard.md`. The sweep confirms 47 of 47.
- **Fill the List** (names into dates) runs on 18 list-shaped quizzes.
- **The hero is Bluebottle,** a deep-sea-green one-eyed alien. The story is in `docs/story-design.md`.
- **The owner is about to restart a full playthrough,** logging notes in the sheet's **Feedback** tab. The
  first 26 rows are already answered there; the next session works through new rows.

## The owner, and how to work with them
- Not a coder; a visual learner with ADHD. Lead with what they need to do, then options with a
  recommendation. Short sentences, Australian English. Screenshots help a lot.
- Plays and tests each change, then merges the PR themselves. Their **Feedback tab** in the sheet is the to-do list.
- **Symmetry and consistency matter a lot.** Every screen follows `docs/quiz-standard.md`.
- **Game information goes inside the game screen.** The owner's eyes stay on the play area (see the HUD
  rule in the quiz standard).
- Wants usage spread across cheaper models: Sonnet helpers build from a written brief; the lead reviews,
  tests, fixes and commits. Say which parts were delegated.
- Rating G/PG. Anatomy as textbook diagrams. Dry, silly house humour on signs.

## Rules of the road
- **Never push to `main`.** Work on `claude/lucid-mccarthy-c425ho` (or the branch the session gives), open
  a PR into `main`; the owner merges and GitHub Pages deploys.
- **Before adding commits, check the last PR's state with the GitHub tool** (`pull_request_read`), not git.
  If it's merged, reset the branch to `origin/main` first and open a NEW PR. (In this session a merged
  PR kept getting commits, which then never reached the site; see Gotchas.)
- PRs: the GitHub MCP tools (`create_pull_request`), not `gh`. The body says in plain words what changes
  on the live site and what was checked, and ends with the attribution lines the system gives.
- **No model names** in commits, code, docs or PRs. Use the commit trailer the system gives.
- **Keep ids stable.** Deck, round (variant) and item ids are the saved-score keys (`learning-arcade:v1`).
  New modes and levels save under NEW keys; Medium keeps the old keys.
- **Sheet safety** (house rules): only the lead session writes to the owner's sheet; make dated backup tabs
  before changing existing data; read back after writing; mark filled cells "Filled by Claude, please check".
  Don't put the sheet link in the repo.

## What changed in this session (Nov 2026)
**Content**
- History: Big Moments with periods, Eras & Dynasties, Leaders & Changemakers (rounds and portraits),
  more people in Who Lived When, and Born When?.
- Mythology rebuilt around four cultures, with a learning ladder and special challenges (Afterlife, Nine Realms).
- **Sport** (7th subject): NRL, AFL, Football, Motorsport, Olympics, General Sports.
- **Entertainment** (8th subject): Oscars, Box Office, Who Played Who, Three Clues (with emoji and
  picture-reveal modes), When Did It Come Out?, Aussie Awards. Three Clues has 271 films and shows.
- Infinity & Beyond: real star patterns (d3-celestial, BSD), plus a "View from Australia" switch.

**Arcade and island**
- The Brawl level 1 (the stadium): a hand-written platformer engine. See `docs/platformer-design.md`.
- Hero Workshop: a side-on hero sheet. Bluebottle replaced the human, who is kept in `src/arcade/human-art.ts`.
- Island: a stadium, a theatre, building flags, a stamp book, and free roam after the first lap.

**Format**
- The quiz page standard (waves 1 and 2): shared header, subject colours, Title Case, rows with
  Easy/Medium/Hard, Type/Click switch, symmetry.
- Fill the List (waves 3a and 3b).

## Decisions to respect
- **Quiz page standard:** `docs/quiz-standard.md` (agreed 14 Nov) and its mock-up `docs/quiz-standard-mockup.html`.
  - **Header:** ◂ Back (to where you came from) and ⌂ Island; centred title and line; ⓘ Rules, ⏱. No header Start.
  - **Subject colours** (light tint, reversed in dark): Geography brown, Science blue, History orange,
    Travel red, Animals green, Music pink, Sport yellow, Entertainment teal, Arcade purple.
  - **Levels:** Easy = learn first and hints; Medium = as before (old score keys); Hard = no hints.
    Hard stays **dashed** where there's nothing real to remove (owner's call).
- **Fill the List:** newest first (Box Office by rank), Tab skips, extra detail on fill, Easy first
  letters, Medium free hint, Hard none. `docs/game-types.md`.
- **Story** (`docs/story-design.md`):
  - **Bluebottle** is deep sea green but keeps the name, taken off a damaged beach sign ("But you ain't
    blue?"). The human is his friend, not the thief.
  - **Tokens** (one per quiz house) open the gates. Losing them starts The Brawl. The black hole match
    puzzle is the finale.
  - **Each house answers one of Bluebottle's questions:** where, who, what, and so on.
- **The Brawl:** three levels built one at a time, stadium → road (animal enemies, stomp) → movie studio
  (Donkey Kong-ish); between the Sport and Entertainment houses. A break from quizzes.
- **Animals:** the subject becomes Animals with six quizzes: Land, Ocean, Birds, Bugs, Pets, and Babies +
  Group Names + Classifying Life. Dinosaurs get their own stage later. `docs/animals-design.md`.
- **Island stages:** first lap fenced; afterwards a softer border with easter eggs (the zen sand garden
  is the first); later a tool opens a bridge. Free roam as it is now feels too loose. `docs/island-design.md`.
- **Engine:** stay in the browser (hand-written TypeScript). Phaser if it gets heavy; Godot only if it
  ever leaves the web.

## Next steps (in order)
1. **Work through the owner's Feedback tab** as the playthrough fills it, a batch at a time, answering each
   row in the Status and notes columns.
2. **Already agreed and queued:**
   - **HUD inside the game screen:** island (stamps, flags, gates, passport icon) and every arcade game.
   - **Arcade games:** an ⓘ "How to play" pop-up, only Pause on screen, Esc pauses everywhere, and
     Easy/Medium/Hard always pickable (no "Preview").
   - **Passport:** the stamp book grows into a passport with Easy/Medium/Hard per quiz and game, reachable
     from home too.
   - **Pong:** Ceres shatters asteroids (do the pieces stay as obstacles?); Eris shrinks the point-loser's
     paddle (for 2 points?).
   - **Zoom directions:** Night Sky zooms into the constellations, then out; Inner Space zooms in.
   - **Human Body:** only Big Bones and Major Organs starred, at the top; tidy categories; more realistic
     organ diagrams; a male reproductive system.
   - **Scale of Things:** new modes (name or point, match the description, conversions).
   - **Earth & Sky levels:** Easy learn first; Medium solid rock or the water/cloud/weather pair; Hard all.
   - **Countries, Capitals, Flags, Seas difficulty details** (in the sheet).
   - **City Shapes:** two top-level buttons (Coasts & Rivers / Street Plans).
3. **Wave 4:** merge the duplicate "Put in order" engines (four copies) and "Place on a timeline" engines
   (about five), then write the full game types catalogue.
4. **Content:** the Animals rebuild; The Brawl levels 2 and 3; Bluebottle's companion; the damaged beach sign.

## Open questions for the owner
- Pong Ceres: do the asteroid pieces stay on the board? Eris: is "2 games" the next 2 points?
- Easy/Medium/Hard vs rounds: confirmed in principle (rounds stay, levels on top). Check it feels right in play.
- Hard on typed quizzes: tighter clock, no skipping, or keep dashed (currently dashed).
- Story: The Brawl as the same theft as the finale (my pick) or a separate one? Where History ("when?")
  and Travel ("how do they get around?") sit in Bluebottle's questions. Who the thief is.
- Companion: colour and a punny name (Marine wasn't loved).
- Medium hints in Fill the List are free; should they cost points? F1 has no team data (add a Team column?).

## How the code is organised
- **A quiz = a Deck** (`src/engine/types.ts`): items (id, name, aliases, tags), rounds ("variants"),
  options, `levels`, a board, optional own `screen`, optional `fillList`. Registered in `src/main.ts` (`DECKS`).
- **Shared quiz page:** `src/ui/quiz-shell.ts` (+ `.css`): `quizPage`, `quizHeader`, `topicTabs`,
  `segmented`, `quizRow(s)`, `levelPicker`, `typeClickSwitch`, `challengeCards`, `chips`, `titleCase`,
  `subjectClass`, `quizBack`. Levels in `src/engine/levels.ts`.
- **Game screens:**
  - `ui/play.ts`: board games, any order, one at a time and click.
  - `ui/choice.ts`, `ui/pairs.ts`, `ui/hangman.ts`.
  - `ui/timeline.ts`: Big Moments, Who Lived When, When Did It Come Out?
  - `ui/sport.ts`: Sport, Oscars, Aussie Awards.
  - `ui/eras.ts`, `ui/scale.ts`, `ui/mythology.ts`, `ui/myth-specials.ts`, `ui/bornwhen.ts`.
  - Entertainment: `ui/threeclues.ts`, `boxoffice.ts`, `whoplayed.ts`, `ent-common.ts`.
- **Fill the List:**
  - `ui/fill-list.ts`: the engine.
  - `ui/sport-fill.ts` and `ui/fill-quiz.ts` + `ui/fill-sources.ts`: wiring.
  - `engine/names.ts`, `engine/event-match.ts`: matching.
  - Aliases: `decks/history-aliases.ts`, `period-aliases.ts`, `name-forms.ts`.
- **Answer matching:** `src/engine/matcher.ts` (accents, &, Saint/St, near misses, prefix "wait").
  Storage: `src/engine/storage.ts`. Progress, challenges and tracks: `src/engine/progress.ts`.
- **Arcade:** `src/arcade/` (`kit.ts`, `pong.ts`, `labyrinth*.ts`, `flyover*.ts`, `brawl/`, `island*.ts`,
  `hero-art.ts`, `hero-side-art.ts`, `hero-workshop.ts`, `hero-side-workshop.ts`, `human-art.ts`).
  The comments teach how games work.
- **Data from the owner's sheet:** generated files, each with a generator script and a header saying how
  to regenerate. The sheet can't be read from a script, so save the tab values as JSON in the scratchpad.
  - `scripts/sport-from-sheet.py` → `src/decks/sport-data.ts`
  - `scripts/entertainment-from-sheet.py` → `entertainment-data.ts` (Movies, Oscars, Box Office, Aussie
    Awards, Who Played Who)
  - `scripts/bornwhen-from-sheet.py` → `bornwhen-data.ts`
  - History, people and leaders data were generated in-session from the sheet.
  - `scripts/constellations-from-celestial.py` (star patterns, from the d3-celestial npm package)

## Testing (run before every PR)
- `npx tsc --noEmit -p .` and `npm run build`.
- `node scripts/check-island.mjs`, `check-labyrinth.mjs`, `check-flyover.mjs`, `check-brawl.mjs`.
- **The sweep:** `npm run build`, then `npx vite preview --port 5240 --strictPort &`, then
  `node scripts/sweep-games.mjs http://localhost:5240/ /opt/node-tools/node_modules/playwright/index.mjs $(ls -d /opt/pw-browsers/chromium-*/chrome-linux*/chrome | head -1)`.
  It should say "47 on the shared quiz page. No problems." Stop the preview with `pkill -f "vite preview"`.
- **Look at screenshots yourself** (Playwright, absolute paths into the scratchpad) before telling the owner it works.

## Gotchas (these cost time)
- **Merged PRs and new commits.** The owner may merge mid-session. If you then push to the same branch,
  those commits sit on a closed PR and never deploy. Always check the PR state with the GitHub tool first.
  `git merge-base` can't tell "open" from "merged with new commits on top".
- **The sheet tool can't write output to a file.** To get sheet data into code, the values pass through
  the conversation (expensive for big tabs), or a helper retypes them (check its work: one helper got two
  Oscar winners wrong). Write big tabs in chunks of about 57 rows, then read back the seams.
- **Helpers and docs.** Tell helpers which files to leave alone. A helper and the lead editing the same doc
  collide (this happened with `docs/story-design.md`). Don't `git add` a file a helper is still writing.
- **Helper reports aren't proof.** Re-check what they say they didn't test, such as old score keys.
- **Usage limits** can stop a Sonnet helper mid-job; resume it with SendMessage after the reset.
- **CSS variables:** derived tokens (like `--s-bg: var(--tint)`) must be defined on the element that has
  the subject class, not on `:root`, or they resolve to nothing.
- **External access from the cloud machine:**
  - Wikipedia: only `en.wikipedia.org/w/api.php` works, often with HTTP 429 (retry slowly). Images can't be
    loaded here; the owner's browser loads them fine.
  - jsDelivr is blocked, but `npm pack` works for package data.
  - OpenStreetMap servers are blocked; the Overture Maps S3 bucket works (`scripts/build-cities.py`).
- **Copyright:** free-licence images only, with credits; no film stills (Picture Reveal uses the owner's
  own drawings in `public/entertainment/scenes/`); no lyrics or long quotes.
- **Stop hooks** ask to commit and push whenever the tree is dirty. While a helper is mid-edit, say so and
  wait rather than committing half-done work.
- Many PRs append to `src/style.css` and `src/main.ts`: conflicts are common and easy (keep both sides).
