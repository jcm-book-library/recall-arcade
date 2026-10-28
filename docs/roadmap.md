# Recall Arcade: the plan so far

Live site: https://jcm-book-library.github.io/recall-arcade/
Arcade level ideas and progression details: [action-game-ideas.md](action-game-ideas.md)

## The two halves
1. **Learning games:** short, timed quizzes you replay until the answers stick.
   Six subjects, six quizzes each.
2. **The arcade:** five short retro levels (Labyrinth, Dogfight, Brawl, Boss, Chase),
   one per subject, unlocked by doing well in that subject's quizzes.

## Subjects and quizzes (35 built ✅)

| Geography | Science | History | Travel & Transport | Nature & Animals |
|---|---|---|---|---|
| Countries of the World | Infinity & Beyond (space) | Big Moments (timeline) | Airport Codes | Australian Animals (photos) |
| Flags | Periodic Table | Who Lived When? (timeline) | Airline Codes | Classifying Life (4 zoom-in levels) |
| Capitals | Cells & Life (diagram) | Australian Prime Ministers | NATO Alphabet | Pet Breeds (click the photo; dogs and cats) |
| Seas, Lakes & Rivers (click) | The Human Body: bones, organs (diagram) | Empires Through Time (6 maps, 323 BC–1914) | Currencies | *(Where Animals Live removed: too many look-alike trick questions)* |
| Mountains (peaks + ranges; territories are a tickbox in Countries) | Units & Forces + Conversions | Mythology (+ Greek & Roman Pairs memory game, linked from its setup screen) | *(Time Zones removed 28 Oct 26; idea kept: odd time zones and time differences)* | Baby Animals & Group Names (name the animal) |
| Neighbours | *(Famous Scientists moved to History as Famous For)* | Famous For (match people to what they did; scientists + Who Lived When? people) | Landmarks & Wonders (photos) | Dinosaurs (photo + fossil site) |

### Music (skill learning: reading music, on piano)
| Quiz | Rounds |
|---|---|
| The Piano Keyboard | White keys ★, all 12 notes, two octaves; name the lit key or click it |
| Treble Clef | Lines ★, spaces, both, plus ledger lines; type or answer on the piano |
| Bass Clef | Same rounds as treble |
| Rhythm & Note Lengths | Main notes ★, all notes, rests, how many beats? (British names, American accepted) |
| Keys & Symbols | How loud ★, how fast, other signs, first key signatures, all key signatures |
| Ear Training | Higher or lower ★, major or minor, intervals (with song cues) |

Music ideas for later: sight-reading runs (several notes in a row), note values in a bar,
minor key signatures, chords on the stave, a rhythm tap-along level for the arcade.
Arts & Culture is a candidate seventh subject.

### Review notes (26 Oct 26): where each subject stands
**Geography:** happy with all six; refinements only. Neighbours may later merge into
Countries of the World, freeing a slot.

**Science**
- Infinity & Beyond: a favourite (renamed from Zoom Out).
- Cells & Life: needs teaching built in. Going in with no reference makes it near impossible.
  Idea for every hard game: a short "learn it first" card or walkthrough before round 1.
- Human Body: great; more realistic model later.
- Units & Forces (physics): needs more depth.
- Famous Scientists: **move to History**, replacing Trivia Round, as a broader
  "What are they famous for?" matching game across famous people.
  **Done (26 Oct 26):** now Famous For, a two-column matching game (4 rounds of 6 pairs) built
  from the scientists plus the Who Lived When? people. Trivia Round is gone.

**History**
- Mythology: a **memory (pairs) game**, Greek god ↔ Roman god with pictures, as a round
  inside Mythology for now. May become its own subject.
  **Done (26 Oct 26):** Greek & Roman Pairs, a memory game with optional Wikipedia pictures.
  It isn't a home-page card; it's linked from the Mythology setup screen (and lives at `#mythpairs`).
- Big Moments and Who Lived When?: really good; grow to ~200 events and ~200 people.
- Australian PMs: widen to world leaders (British PMs, US presidents, others).
- Empires Through Time: could become a variation of Big Moments.

**Travel & Transport**
- Airport + Airline Codes: could merge into one game; add **airline logos**
  (images kept in Google Drive, as in other projects).
- NATO Alphabet: great but small.
- Currencies: widen to more currency and economics questions.
- Time Zones: removed from the game for now. Rework around odd time zones (Nepal +5:45, India +5:30,
  Chatham Islands) and "time difference between two places".
- Landmarks & Wonders: needs more.

**Nature & Animals:** the subject that misses the mark most.
- Australian Animals → **Animals of the World**: ~200 (50 common, 100 less common, 50 rare).
- Classifying Life: right idea (zooming, like space) but needs to be more visual.
- Pet Breeds: needs more.
- Where Animals Live: removed. A new topic can take the slot.
- Baby Animals & Group Names: love the idea, wrong format. Try **hangman style** with
  1–3 hints, and drop the very obscure names.
- Dinosaurs: keep a dino round; format undecided. Idea: a written description ↔ photo
  match, both ways.

**Music:** closest to the goal; Dad was impressed with the sound and how accessible the levels are.
More challenges next, e.g. public-domain tunes to read and play as practice.

### New game styles to reach for
- **Memory / pairs** (flip two cards to match): mythology pairs ✅ (built, `src/ui/pairs.ts`), flags ↔ countries, logos ↔ airlines.
  The pairs screen also does a two-column "match" style (Famous For ✅), so new pairs games are mostly data.
- **Hangman** with 1–3 hints: group names, tricky spellings.
- **Description ↔ picture match**: dinosaurs, landmarks.

### New subject ideas
- **Entertainment:** books, movies, gaming, TV, music and one more. Narrow down what to learn first.
- **Maths, for real life:**
  - practical: Pythagoras (garden layout, woodwork, 3D printing) and algebra;
  - interest: economics and statistics;
  - stretch: quantum mechanics/theory (ties into the Master's expansion pack).
  Parametric design and 3D modelling could double as visuals elsewhere, e.g. zooming in on planets.
- **Arts & Culture** (from earlier).

### Next ideas for existing games
- **Mountains:** more famous peaks, a typed "name the highlighted peak" option, and the
  Transantarctic Mountains if Antarctica gets its own close-up map (it's too squashed on the world map).
- **Mythology:** deep enough to become its own subject later (more cultures, heroes, monsters).
- **Empires Through Time:** the 1815 map includes Aboriginal nations, a possible future round.
- **The Human Body:** add muscles and body systems as further rounds.
- **Who Lived When?:** more people, especially pre-1900.
- **Big Moments:** an Inventions era.
- **More accurate visuals:** see "Visual accuracy" below.

### Infinity & Beyond (space, was "Zoom Out")
One space quiz that starts with the night sky (what we can see from Earth), then starts
close and zooms out a step each time you clear a stage, like the film *Powers of Ten*.
Stuck? **Hint** shows first letters; **More help** lists the names to place by clicking.
1. The night sky (played first): constellations, including the 12 of the zodiac (13 with Ophiuchus).
   Plan: real star patterns, seen as if looking up from the ground; clearing it swings the view
   from Earth out to the solar system for stage 2.
2. The planets
3. The rest of the solar system: dwarf planets (Ceres, Pluto, Eris...), big moons,
   the asteroid belt, Kuiper belt, Oort cloud
4. The nearest stars: Proxima Centauri, Alpha Centauri, Barnard's Star, Sirius...
5. The Milky Way: its arms (we live in the Orion Arm) and its centre
6. Our galactic neighbours: Andromeda, Triangulum, the Magellanic Clouds

The stages could match the tracks: Easy stops at the planets, Hard goes to Andromeda.
Decided: Zoom Out replaces Solar System and Constellations in Science, and the freed slot
goes to **Cells & Life** (biology).
Real distances are far too big to draw to scale, so each stage is its own zoom level.

### Styles of play the engine will need
- **Type to fill a board** (map, table, skeleton). Already built.
- **Click on the board:** given a name, find it.
- **Picture to name:** flags, animals, landmarks.
- **Match pairs:** country to capital, organ to system.
- **Sort into groups:** animal groups, dinosaur eras.
- **Put in order / on a timeline:** with points for how close you get.
- **Multiple choice:** used sparingly.

Pictures (animals, landmarks, airline tails) need freely licensed images, e.g. from
Wikimedia Commons.

### Later: the Master's expansion pack
Harder material once the basics are done: quantum mechanics, deeper astronomy and so on.

## Visual accuracy (for later)
The diagrams (skeleton, organs, cells, space) are drawn from simple shapes in code.
For more accuracy, swap in real sources:
- **Anatomy and cells:** freely licensed SVG diagrams from Wikimedia Commons, with clickable
  regions laid over them.
- **Space:** real star positions and constellation lines (public star catalogues),
  NASA images (public domain). **Wanted:** a real star chart in Infinity & Beyond's Night Sky
  stage, so the constellation *shapes* are learned, not just their names.
- **3D:** a rotatable skeleton or solar system with three.js and open 3D models.
- **Pixel art for The Overworld:** Josh wants to draw this himself (Piskel or Aseprite).
  Free packs (e.g. Kenney, CC0) can stand in as placeholders while learning.
- **Anatomy, cells, 3D:** agreed as the next step for visuals after testing.

## Progression (summary)
- Three tracks: **Easy** (one quiz per subject, low target), **Intermediate** (three per
  subject, higher target), **Hard** (all of them, high target). Targets are set per quiz.
- The game moves you between tracks if you're clearly doing better or worse than expected.
- One full playthrough unlocks free play, then an optional **Expert** run.
- Badges for every quiz tier, trophies for the arcade. Never locked behind skill.
- G/PG: ridiculous fun for kids, nostalgia and references for adults. Dry, dark humour.

## Your learning path (the plan outside the plan)
1. ✅ GitHub: a repository holding the code, with history of every change.
2. ✅ Hosting: GitHub Pages publishes the site automatically on every change.
3. **Next: a backend, using the book library.** Supabase gives a database plus logins,
   so the family can share one library. Free to start.
4. **Domains:** buy a name (around $15-30 a year) and point it at the sites.
5. **Bring it back here:** use the same Supabase setup so Recall Arcade saves progress
   across devices.
