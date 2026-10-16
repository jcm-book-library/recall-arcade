# Recall Arcade: the plan so far

Live site: https://jcm-book-library.github.io/recall-arcade/
Arcade level ideas and progression details: [action-game-ideas.md](action-game-ideas.md)

## The two halves
1. **Learning games:** short, timed quizzes you replay until the answers stick.
   Five subjects, six quizzes each.
2. **The arcade:** five short retro levels (Labyrinth, Dogfight, Brawl, Boss, Chase),
   one per subject, unlocked by doing well in that subject's quizzes.

## Subjects and quizzes
Each subject has six quizzes that don't overlap, each with a different style of play,
and one small **starter** quiz (★) so the Easy track stays easy.

| Geography | Science | History | Travel & Transport | Nature & Animals |
|---|---|---|---|---|
| Countries of the World (map) ✅ built | Periodic Table ✅ built | ★ Big Moments: drag events onto a timeline | ★ NATO Phonetic Alphabet | ★ Australian Animals (pictures) |
| ★ Capitals (match) | ★ The Solar System (diagram, order) | Australian Prime Ministers (in order) | Airport Codes (MEL, SIN, LHR...) | Animal Groups (sort: mammal, bird, reptile...) |
| Flags (pictures) | Bones of the Body (click the skeleton) | Europe in 1914 (map) | Airlines (tail fins / logos) | Dog Breeds (pictures) |
| Seas, Lakes & Rivers (click the map) | Organs & Body Systems (match) | The Ancient World (map) | Currencies (match) | Where Animals Live (map) |
| Territories: who owns what (match) | Physics: units & forces (match) | Inventions: when? (points for how close) | Time Zones (map) | Baby Animals & Group Names (match) |
| Neighbours (name every bordering country) | Constellations (star map) | Trivia Round (the one multiple-choice quiz) | Landmarks & Wonders (pictures) | Dinosaurs (sort by era) |

### Idea: "Zoom Out" (space)
One space quiz that starts close and zooms out a step each time you clear a stage,
like the film *Powers of Ten*:
1. The planets
2. The rest of the solar system: dwarf planets (Ceres, Pluto, Eris...), big moons,
   the asteroid belt, Kuiper belt, Oort cloud
3. The nearest stars: Proxima Centauri, Alpha Centauri, Barnard's Star, Sirius...
4. The night sky: constellations, including the 12 of the zodiac (13 with Ophiuchus)
5. The Milky Way: its arms (we live in the Orion Arm) and its centre
6. Our galactic neighbours: Andromeda, Triangulum, the Magellanic Clouds

The stages could match the tracks: Easy stops at the planets, Hard goes to Andromeda.
It could replace both Solar System and Constellations in Science, freeing a slot
(biology, e.g. cells or famous scientists). Undecided.
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
