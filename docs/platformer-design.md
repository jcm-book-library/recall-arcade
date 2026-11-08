# The side-on platformer: decisions to make (8 Nov 2026)

The next arcade game, "The Brawl" in `docs/action-game-ideas.md`: a side-on platformer, Mario-style.
This page lists what needs deciding before building. Each question has a **suggested answer**
to react to. Change anything. Write your answers under each one (or tell Claude) and we build from that.

## 1. The world
- **Setting and name.** The notes say "a street scene". Suggestion: a city at night, rooftops
  to street level, keeping the dry humour. Name: "The Brawl" for now, or something better.
- **Which subject does it belong to?** Every arcade stop sits by a building on the island.
  Suggestion: put it next to Sport (running, jumping) or Entertainment (a film-set level). Or
  shrug: "We looked for a connection. We couldn't find one."
- **One long level or several short ones?** Suggestion: 3 short levels (about 2 minutes each)
  that get harder, like the Labyrinth's worlds, then a boss later as its own game.

## 2. The hero
- **Same character as the island?** Suggestion: yes, the same person, drawn side-on and bigger.
- **What can they do?** Suggestion: run, jump (hold for higher), and stomp enemies. Maybe later:
  double jump, crouch, wall jump. Fewer moves keeps it fair on a phone.
- **How does it feel?** Floaty and forgiving (Mario) or tight and exact (Celeste)? Suggestion:
  forgiving, with a moment after running off a ledge where you can still jump.

## 3. Danger and lives
- **Enemies.** Suggestion: 3 kinds to start (one that walks back and forth, one that hops, one
  that throws something). Cartoon only: they go "poof".
- **Hazards.** Gaps, spikes, moving platforms, falling things. Pick the ones you like.
- **Lives and checkpoints by track.** Suggestion: Easy has unlimited lives and lots of
  checkpoints; Intermediate has 5 lives; Hard has 3 lives and fewer checkpoints.

## 4. The quiz link
How do the quizzes come into it? Options:
- **A. Answer doors:** a few doors show answers, and you go through the right one (like Flyover's gates).
- **B. Collect letters** that spell an answer, for a bonus.
- **C. None:** a pure break from the quizzes.
Suggestion: A, with questions from the subject it sits beside, and it's skippable like the other stops.

## 5. Controls and screens
- **Keys:** arrows or WASD to move, Space or Up to jump. **Phone:** on-screen left, right and jump buttons.
- **Camera:** scrolls left to right only, or back and forth? Suggestion: both ways, with a little
  up and down for tall bits.

## 6. Art and level design
- **Tiles:** 16 px squares, drawn in code first (like the island). Your own art can replace them later.
- **Hero sheet:** see "The pixel character" below.
- **Levels as letters:** the levels written as rows of letters you can edit (like the island map),
  with a checker script that makes sure every jump is possible. Suggestion: yes.
- **Background:** 2–3 layers moving at different speeds (parallax), like Flyover.

## 7. Extras (later or never)
Sound effects, a timer and best times, hidden secrets, a stamp in the stamp book for finishing.

## The pixel character (the job before the platformer)
The island and Labyrinth hero is a **top-down** sheet: 32 × 64 pixels, 4 directions × 2 walking
frames, each 16 × 16 (see `docs/arcade-art.md` and the Hero Workshop, `#hero`).
The platformer needs the same person **side-on**, bigger and with more poses. Suggested sheet:
- **Frame size 32 × 32**, facing right only (the game flips it for left).
- **Poses:** stand (1–2 frames), run (4 frames), jump up (1), fall (1), land (1), hurt (1).
  That's 9–10 frames, in one row or a 4 × 3 grid.
- Claude can add a labelled side-on template and a code-drawn placeholder to the Hero Workshop,
  so you can recolour and redraw instead of starting from a blank canvas, plus a live preview
  of your character running and jumping.

Decisions for the character:
1. Is the same 32 × 32 side-on hero fine, or do you want a different size?
2. Which poses do you want to draw first (run and jump are the minimum)?
3. Do you want the Workshop template before you start drawing? (Suggested: yes.)
