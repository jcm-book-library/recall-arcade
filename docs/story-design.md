# The story: an alien learning about worlds (owner's idea, 11 Nov 2026)

Written down so it doesn't get lost. Nothing here is decided beyond the core idea.

## The core idea
- **The hero is an alien**, or maybe a team of them. The look is to be decided.
- **They're here to learn about different worlds.** That is why there are quizzes: every quiz is the
  alien studying a part of our world.
- **Every quiz gives a token** when it's completed. **Tokens open the gates** along the island route.
  (This is today's challenge tick and gate, given a story.)
- **The arcade games are what happens when the alien gets into trouble.** Planet Pong, The Labyrinth,
  Flyover and The Brawl become mishaps along the way.
- **The final challenge:** once every token is collected, they're all **stolen, ripped away**, and a
  **puzzle game** has to be beaten to get them back.
- **Room for a sequel:** the story leaves space for another game after this one.

## Why it works
- **The pixel character gets easier.** An alien doesn't need to look human, so odd proportions, extra
  eyes or a glowing antenna are features, not mistakes.
- **The graphics can change on purpose.** As the alien learns more, the world can look better: simple
  pixel art early on, richer graphics later. That fits building the game up over time, and maybe one
  day a 3D version.
- **It gives every existing piece a reason** without throwing anything away.

## How it maps onto what's built
| Built now | In the story |
|---|---|
| Quiz challenge done (the tick) | the alien earns that quiz's token |
| Subject gates on the island | open when the subject's tokens are collected |
| The island | where the alien has landed (the "Start" could become a landing site or crashed ship) |
| Arcade stops and stamps | trouble the alien got into, and proof they got out of it |
| Free roam and the arcade hall | the alien has the run of the place after the first lap |
| Hero Workshop | the owner designs the alien (top-down and side-on sheets) |
| The Brawl (working title) | the alien blunders into an athletics meet, onto a road, and onto a film set |

## Questions for later
1. **The alien:** one alien, or a team (players pick one, or the team changes per game)? Name? Where from?
2. **What does a token look like?** One per quiz (around 50) or one per subject? Different colours per subject?
3. **Who steals the tokens,** and what is the final puzzle like (a sliding puzzle, a logic grid, a mix of
   every arcade game, a "prove what you learned" quiz)?
4. **Does each arcade game start with a short "how did I get into this?" scene?** (A few lines of text
   and a picture is enough.)
5. **How does the alien's knowledge show?** Better graphics on the island as tokens come in, the alien's
   ship being repaired, a journal filling up?
6. **Names:** does "Recall Arcade" stay as the title, with the alien story inside it?
7. **Tone:** still dry humour, taking itself completely seriously while being quite stupid (the alien
   misunderstanding everything is a gift for this).

## Effect on current plans
- **The side-on hero sheet** (Hero Workshop) still works: 10 poses, any shape. An alien can be wider or taller.
- **Animals, the platformer levels and the island stages** are unchanged; they just get story framing.
- **Nothing needs rebuilding.** Tokens can be shown wherever challenges show today (cards, island,
  stamp book) once the token look is decided.

## More ideas (owner, 13 Nov 2026)

### The final game: the black hole (refines "the puzzle game")
- **One token per quiz house** (subject building). Once all are collected they're **stolen** and threatened
  to be taken for good.
- The rescue is a **match-and-move puzzle**, in the family of Bejeweled and Candy Crush, with a twist:
  a **black hole** pulls the tiles **towards the centre** of the board instead of downwards, and it may
  **move around** as the game goes on.
- **Token tiles** sit on the board. Link or match tiles to free them, and keep the board in **balance**
  so the black hole doesn't swallow everything.
- Ideas to explore when we get there:
  - Gravity that points at the black hole: tiles slide inward along rings or spokes, so "falling" works
    differently in every corner of the board.
  - When the black hole moves, everything slides a new way.
  - Each subject's token could have its own power (Geography shifts a row, Science freezes the black hole
    for a turn...).
  - The "balance" could be a meter: matches on one side push the black hole the other way.
  - It works in the browser as a 2D canvas game, no different from what we have.

### A zen sand garden on the beach (not a game)
- Inspired by a sand clock (a small ball moved by a magnet under the sand, drawing ripples through
  half the day and smoothing them away through the other half):
  https://www.yankodesign.com/2019/07/30/this-clock-creates-ripples-in-sand-for-the-first-half-of-the-day-and-then-erases-them/
- On the island's beach: a calm spot where a ball, or the alien's finger, draws patterns in the sand.
  Ripples, spirals, flowers, maybe the time of day. Then the sand slowly smooths over.
- How it could work in the browser: the sand is a height map. A rolling ball pushes sand aside and leaves
  a groove with raised edges, and soft lighting makes the grooves look real. It's very doable in a 2D canvas.
- Possible extras: draw your own pattern with a finger or the mouse, a "clock" mode, gentle sound,
  and the alien's tokens shown as stones in the sand.

### A driving or racing game
- An arcade game for the list. Options to choose between later:
  - **Top-down racing** (like Micro Machines) on the island's own roads: simplest, and it reuses the island.
  - **Into-the-screen racing** with fake 3D (like OutRun). It shares its tricks with the planned Chase
    finale, so the two could be built together.
  - Story fit: the alien borrows a car (or their ship's buggy) and things go wrong.

## Owner's answers (13 Nov 2026)

### The racing game: a chase view, not a race
- **Inspiration:** the owner's first ever F1 game on MS-DOS. The track comes from the horizon and moves
  under you, with trackside signs and a start gantry (a reference screenshot was shared in chat).
- **View:** a **follow angle** behind the vehicle. Not top-down, not side-on, and it doesn't have to be the
  in-the-cockpit view.
- **No opponents needed.** It's about getting round **obstacles** on the road.
- **How:** fake 3D in the classic style. The road is drawn as horizontal strips that get narrower towards
  the horizon, curves and hills bend the strips, and objects scale up as they come closer. It's the same
  trick as the planned Chase finale, so the two can share an engine. Plain 2D canvas, no 3D library needed.

### The zen sand garden is the first easter egg
- A **sundial-like object on the beach** is **visible from the route** while doing the quizzes, but behind the fence.
- Once the first lap is done and the player can **get through the fence** (see the island stages plan in
  island-design.md), they can walk over and **play with the sand as the alien**, and just be zen for a bit.
- Its first appearance is part of the softer border idea: the hedge gap that leads to it.

### The black hole match game: to explore further
- The owner's first thought: tokens carry a **marking for each of the 8 quiz houses**, and those are what you match.
- Also worth exploring: a **random piece with a power** (the subject's token power idea above).
- The owner will think more before we come back to this.

## The characters (owner, 13 Nov 2026)
**The goal:** kid-friendly, and cute in the way a kitten or a puppy is cute for adults. All original,
with no copying from existing characters. The "cute" recipe is a big head, big eyes, round shapes,
short stumpy limbs and long floppy ears.

**The alien (the hero):**
- **Cobalt blue** (the owner's favourite colour).
- **One big eye.**
- **Short stumpy arms and legs with rounded ends**, no fingers or toes.
- **Long ears or antennae** that sit out to the side or flop backwards, like long hair.

**A companion:** pink or purple. Still deciding whether this is a clear girl and boy choice, or just
two companions with no label.

**The names come from a damaged beach sign.** They crash-land, or wake up, on the beach next to an old
Australian-style warning sign. It's been damaged, only a couple of words can be read, and they adopt them
as names. Inspired by the real signs warning about **bluebottles** and **marine stingers**:
- the blue one is **Bluebottle** (bluebottles really are blue)
- the pink or purple one could be **Marine** (or Stinger)

The damaged sign can stand at the island's Start as the landing site: drawn by us, in the classic yellow
diamond style, not copied from a photo.

**Design notes for pixel art:**
- One big eye reads very well at tiny sizes (16 × 16 on the island, 32 × 32 side-on). A single eye
  stays cute rather than creepy when it's huge and round, sits low on the face, has a big shine dot,
  and comes with a small mouth and blush cheeks.
- The floppy ears give free "secondary motion": they bounce when running and stream back when jumping
  or falling. That's the kind of detail that made the Aladdin and Lion King animation feel alive.
- Rounded limb ends with no fingers make every pose quicker to draw.
- The companion can share the same body plan with a different colour and ear shape, so one sprite sheet
  layout serves both.

**Built (13 Nov 2026):** the starter hero is now **Bluebottle**, a cobalt one-eyed alien, in both the
island/Labyrinth sheet (`src/arcade/hero-art.ts`, 16 × 16, two walking frames per direction) and the
side-on Brawl sheet (`src/arcade/hero-side-art.ts`, 32 × 32, ten frames). The owner chose the "swept
back" ears. The big round eye is open at the top (no dark lid) with the pupil sitting low and a big shine
at the top left, plus pink blush cheeks and a small "w" smile. A pale belly and light ear tips lift the
cobalt body. The ears sway as he walks, bounce on the run, stream down and back on a jump, float up on a
fall and fly up when he is hurt. The Hero Workshop's recolour ideas and colour list describe Bluebottle.
Still to do: the companion (Marine), and the damaged beach sign.

## The Brawl in the story (owner, 13 Nov 2026)
- **The tokens get stolen, taken or misplaced, and that's what starts The Brawl.** The platformer is the
  alien chasing after them, from the stadium to the road to the movie studio.
- **The quiz houses may be rearranged** around this, for example to change which houses come before The
  Brawl, or where its stop sits on the island route.
- To settle later: is this the same theft as the finale (the black hole puzzle), with The Brawl as the
  chase that leads to it? Or an earlier mishap, with the black hole as the final, bigger theft?

## Bluebottle's questions: a purpose for each part (owner, 13 Nov 2026)
Bluebottle is asking who, what, when, where and how. Each quiz house answers one of his questions,
which anchors a purpose for every part of the game. A rough order, with storylines to grow out of it:
1. **Where am I?** He works out where he has landed through the **space** quiz (Infinity & Beyond:
   the night sky, then zooming out) and the **geography** quizzes.
2. **Who are you?** He runs into a **human**: the original starter hero, kept as **the first human
   Bluebottle meets**. Wanting to know more leads to the **science of the human body**.
3. **What else lives here?** He wants to know about **animals**.
4. **What's that sound?** He's made curious by **music**.
5. **What do humans do for fun?** He's fascinated by **sport** and **movies** and the like (Sport and
   Entertainment). This is also where things go wrong: losing the tokens starts **The Brawl**, through the
   stadium and on to the movie studio.

Still to place: **History** ("when?", how humans got here) and **Travel & Transport** ("how do they get
around?"), maybe what he needs to know to get home.

Ideas this opens up:
- The island route order could follow these questions, so the gates open in story order.
- Each house could start with a one-line question from Bluebottle on its sign ("Where am I?").
- The human can turn up again at different houses as a guide, a friend, or the one who gets him into trouble.
