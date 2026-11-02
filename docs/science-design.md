# Science design note (2 Nov 2026)

The plan for the Science subject, and for "learn it first" cards across every hard game. Start here
in the next Science session. Labels: **Decided** (the owner said so), **Proposed** (Claude's
recommendation, not yet confirmed), **Open**.

## The six Science quizzes (Decided)
| Keep | New |
|---|---|
| Infinity & Beyond (zoom out) | **Inner Space** (zoom in), replaces Cells & Life |
| Periodic Table | **The Scale of Things**, replaces Units & Forces |
| The Human Body | **Earth & Sky**, the free sixth slot |

Keep the old ids (`cells`, `units`) in the saved scores. **Decided while building:** Inner Space is a
new quiz (`innerspace`). Cells & Life (`cells`) leaves the home page but stays as "zoom in further",
linked both ways from Inner Space, so its detailed cell diagrams and saved scores are kept. Units &
Forces stays on the home page until The Scale of Things is built.

The three quizzes then link up: Infinity & Beyond zooms out from Earth, Inner Space zooms in to the
atom, and the atom hands over to the Periodic Table.

## Inner Space
**Does it overlap The Human Body? Decided: keep them separate, with a clear split.**
- **The Human Body** answers "where is it?": a labelled map of bones and organs.
- **Inner Space** answers "what is it made of?": a journey down in size, one stage per zoom. It
  starts where the Human Body stops, at one organ, so it repeats nothing.

Stages (a draft, like Infinity & Beyond's):
1. **An organ up close:** a slice of skin, a leaf, or a muscle. Name the layers. This stage is the
   bridge from The Human Body.
2. **Tissues:** muscle, nerve, bone, blood under the microscope.
3. **The cell:** today's Cells & Life rounds (plant and animal cells) live here.
4. **Inside the cell:** the nucleus, chromosomes, genes.
5. **Molecules:** DNA, water, proteins, sugar.
6. **Atoms:** the nucleus, protons, neutrons, electrons, then a link to the Periodic Table.

It reuses the zoom board from Infinity & Beyond, with a Hint and More help. Stage 1 starts with a
learn-it-first card (below), which fixes the review note that Cells & Life is impossible without a
reference.

## The Scale of Things
Put things in order by size, speed and so on. It builds the feel for numbers that physics needs first.
- **Rounds by quantity (Decided: more than speed):**
  - speed (snail, cheetah, sound, a bullet, light)
  - mass (a feather, a car, a blue whale, the Moon)
  - length and size (a virus to a galaxy)
  - temperature (absolute zero, the surface of the Sun)
  - time (a blink, a lifetime, the age of the universe)
  - loudness in decibels
  - energy
- **Mass and weight:** a short round that teaches the difference. Mass is the stuff and stays the
  same everywhere. Weight is the pull of gravity, so it changes from planet to planet ("How much
  would you weigh on Mars?"). This links to Infinity & Beyond.
- **Difficulty from the gaps (Decided):** Easy uses things far apart (a snail and a jet). Hard uses
  close ones (a cheetah and a racehorse, a bus and an elephant).
- **Two ways to play (Decided: both):**
  - **Drag to order:** sort 5 or 6 cards from smallest to biggest. Simple, and good on a phone.
    **Proposed for Easy.**
  - **Place on the scale:** the Timeline screen used as a number line, with points for how close you
    get. Real values span huge ranges, so the scale jumps ×10 at each mark (a "log scale"), which the
    learn card explains. **Proposed for Intermediate and Hard.**
- Drag to order is a new screen, but a small one. It suits other quizzes too (planets by size,
  Prime Ministers in order, rivers by length).

## Earth & Sky (Decided, with refinement to come)
A draft. The owner chose the water cycle and climate zones for the open slot:
1. **Inside the Earth:** crust, mantle, outer and inner core (labelled diagram).
2. **Plates and volcanoes:** the main tectonic plates and famous volcanoes on the world map (map board).
3. **Rocks:** igneous, sedimentary and metamorphic, from photos (photo wall).
4. **Clouds:** cumulus, stratus, cirrus and the rest, from photos.
5. **Weather:** the symbols on a weather map, and wind and storm names.
6. **The water cycle** (labelled diagram: evaporation, condensation, precipitation, collection and so on)
   and **climate zones** (on the world map: tropical, dry, temperate, continental, polar).

## Learn it first cards (Decided, all hard games)
For a player who starts knowing nothing, the card is a resource to get going, used together with
the existing Hints. **Proposed design:**
- **On the Easy track** a card shows before the first round of a quiz, with "Got it, let's play" and
  "Don't show again". On other tracks it sits behind a "Learn it first" button on the setup screen.
- **Two kinds:**
  1. **Study the board** (automatic, every quiz): the board shown fully labelled, to look over at your
     own pace, then the labels go and the round starts. Almost free to build, because the boards
     already know every name.
  2. **A hand-written card** (only where it's needed): a few short panels with pictures, for example
     "what a cell is", "how a log scale works", or "lines and spaces on the stave". First for Inner
     Space, The Scale of Things and Earth & Sky, then Cells and anything else play-testing shows is
     hard to start cold.
- **Hints stay** for during the round. The card is for before the round.

## Build order (agreed)
1. **Study the board** for every quiz. **Built 2 Nov 2026.** On the Easy track it opens by itself
   the first time you start a quiz, with "Don't show this again". It is always a button on the
   setup screen. Later improvement: the world map shows names only on hover or tap, so map quizzes
   could print labels for small regions. It's small, it helps everywhere at once, and it is the frame
   for the hand-written cards.
2. **Inner Space**: the zoom board, opened up so both zoom quizzes can use it, with a hand-written
   learn-it-first card.
3. **The Scale of Things:** the drag-to-order screen first, then the number line on Hard. **Built 2 Nov 2026** (`#scale`): 8 quantities, Easy/Medium/Hard by gap size, "Put in order" and
   "Place on the scale", and a learn-it-first card. Units & Forces is now hidden, linked from it.
   Loudness Hard can't have close calls (no two sounds are under 10 dB apart).
4. **Earth & Sky**, after the owner's refinement.

## City Shapes (Geography, linked here for the data)
See the roadmap. It needs OpenStreetMap, whose servers are blocked from the cloud machine until the
owner allows `overpass-api.de` in the environment's network settings. The build script then cuts
each city to a small black-and-white SVG, with "© OpenStreetMap contributors" credited on the page
and in the README.
