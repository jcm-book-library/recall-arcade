# Recall Arcade: the plan so far

Live site: https://jcm-book-library.github.io/recall-arcade/
Arcade level ideas and progression details: [action-game-ideas.md](action-game-ideas.md)

## The two halves
1. **Learning games:** short, timed quizzes you replay until the answers stick.
   Five subjects, six quizzes each.
2. **The arcade:** five short retro levels (Labyrinth, Dogfight, Brawl, Boss, Chase),
   one per subject, unlocked by doing well in that subject's quizzes.

## Subjects and quizzes (all 30 built ✅)

| Geography | Science | History | Travel & Transport | Nature & Animals |
|---|---|---|---|---|
| Countries of the World | Zoom Out (space) | Big Moments (timeline) | Airport Codes | Australian Animals (photos) |
| Flags | Periodic Table | Who Lived When? (timeline) | Airline Codes | Animal Groups (multiple choice) |
| Capitals | Cells & Life (diagram) | Australian Prime Ministers | NATO Alphabet | Dog Breeds (photos) |
| Seas, Lakes & Rivers (click) | The Human Body: bones, organs (diagram) | Europe in 1914 (map) | Currencies | Where Animals Live (multiple choice) |
| Territories | Units & Forces | The Ancient World (map) | Time Zones | Baby Animals & Group Names |
| Neighbours | Famous Scientists | Trivia Round (multiple choice) | Landmarks & Wonders (photos) | Dinosaurs (multiple choice) |

### Next ideas for existing games
- **The Human Body:** add muscles and body systems as further rounds.
- **Who Lived When?:** more people, especially pre-1900.
- **Big Moments:** an Inventions era.
- **More accurate visuals:** see "Visual accuracy" below.

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
  NASA images (public domain). **Wanted:** a real star chart in Zoom Out's Night Sky
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
