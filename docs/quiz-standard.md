# The quiz page standard (agreed 14 Nov 2026)

Every quiz page follows these rules, so the quizzes look and work the same wherever you go. The look is
shown in `docs/quiz-standard-mockup.html` (open it in a browser; it has a subject colour picker and a dark
mode switch). New quizzes must use the shared quiz page (`src/ui/quiz-shell.ts`) rather than drawing
their own setup screen.

## The rules
1. **The same header on every quiz.**
   - Left: **◂ Back** (to wherever you came from: the island or the list) and **⌂ Island**.
   - Middle: the subject (small) and the quiz title, exactly centred.
   - Right: **ⓘ Rules** and **⏱ time limit**.
   - Underneath, centred: one line on how the quiz works.
   - There's no Start button in the header; each row has its own.
2. **Subject colour.** The header (and selected tabs and options) use the subject's colour: a pale tint
   with deep-coloured text in light mode, and the reverse in dark mode.

   | Subject | Colour |
   |---|---|
   | Geography | brown |
   | Science | blue |
   | History | orange |
   | Travel & Transport | red |
   | Animals (Nature & Animals) | green |
   | Music | pink |
   | Sport | yellow |
   | Entertainment | teal |
   | The Arcade | purple |
3. **Title Case for every title** (Countries of the World, Who's Who, Symbols and Sacred Animals). Small
   words stay lower case unless they come first: a, an, the, and, but, or, of, in, on, at, to, by, for,
   with, from.
4. **Topics.** If a quiz has more than one topic, they're a row of equal-width tabs, with one line about
   the chosen topic underneath.
5. **Every playable thing is a row:** a number or ★, the name and description, then **Easy / Medium /
   Hard**, then **Start**.
   - The ★ marks the recommended place to start (the "most popular" round).
   - "Learn it first" or "Study the board" is always the first row, with a dashed border.
6. **What Easy, Medium and Hard mean:**
   - **Easy:** Learn it first, with the board shown.
   - **Medium:** hints available.
   - **Hard:** no hints.

   A quiz can add its own details (for example, Hard Countries adds territories, and Hard Seas, Lakes &
   Rivers gives one guess). A level that isn't built yet shows dashed and can't be picked.
7. **Special challenges** are two cards side by side. Extras (like "More cultures") are centred chips at
   the bottom.
8. **Type or click** is a clear switch near the top, only on quizzes that have both.
9. **Symmetry.** Equal-width buttons, centred titles and groups, and even rows (two or four across, never
   a lonely odd one where it can be helped).
10. **Ticks.** A ✓ on each level you've done, and a green ✓ badge on a row when it's finished. These feed
    the passport.

## Saved scores
Medium plays exactly as the quizzes did before the standard, so it keeps the existing best-score keys.
Easy and Hard save under their own keys. Nothing earned before the standard is lost.

## The arcade games (to follow)
- An ⓘ "How to play" pop-up next to the title, instead of key hints on the game screen.
- Only Pause shows on screen, and Esc pauses every game.
- Easy, Medium and Hard can always be picked, with no "Preview" label.
