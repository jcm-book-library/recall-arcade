# Drawing your own hero for The Labyrinth

**Easiest way: the Hero Workshop** on the live site (the "Hero Workshop" card in the arcade, or
`#hero`). It shows the sheet with every box labelled, lets you download the starter hero to
recolour in Piskel, shows your hero walking, and can put it straight into The Labyrinth on your
device. The steps below are the same, written out.

The game has a built-in placeholder hero. When you put a picture called `hero.png` in the right
folder, the game uses yours instead. No code changes needed.

## What the picture must look like

One image, **32 pixels wide and 64 pixels tall**, made of eight 16 x 16 boxes:

| | Column 1 | Column 2 |
|---|---|---|
| **Row 1** | facing down, walking frame 1 | facing down, walking frame 2 |
| **Row 2** | facing left, frame 1 | facing left, frame 2 |
| **Row 3** | facing right, frame 1 | facing right, frame 2 |
| **Row 4** | facing up, frame 1 | facing up, frame 2 |

"Walking frame 1 and 2" are two poses with the feet in different places. The game swaps between
them as the hero walks. Frame 1 is also how the hero looks standing still.

## Drawing it in Piskel (free, in your browser)

1. Open **piskelapp.com** and click **Create Sprite**.
2. Click the **Resize** tool in the left toolbar. Type **32** for width and **64** for height, then
   confirm. (Draw on ONE frame only. Don't add animation frames.)
3. Find the boxes: as you move the mouse over the canvas, Piskel shows its position (x, y) at the
   bottom right. The boxes start every 16 pixels: x 0–15 and 16–31 across; y 0–15, 16–31, 32–47
   and 48–63 down. Tip: draw a faint guide line at x 16 and at y 16, 32 and 48, then erase it at
   the end.
4. Draw the hero in each box. Leave the background empty, because empty means see-through.
   Tip: draw one box well, then copy it into the others and change the feet.
5. When you're happy, click **Export** (the download arrow on the right).
6. Pick the **PNG** tab and click **Download PNG**.
7. Rename the file to exactly **`hero.png`** (all lower case).

## Where to put it

8. Put `hero.png` in the folder **`public/arcade/`** of this project, next to the README there.
   On GitHub you can do this in the browser: open `public/arcade`, click **Add file**, then
   **Upload files**.
9. Reload the game. Your hero walks out.

## If it doesn't show up

- Check the name is exactly `hero.png`.
- Check the size is 32 x 64 (Piskel shows it at the top of the Resize tool).
- A bigger sheet in the same shape works too (for example 64 x 128). The game shrinks it to fit.
- If anything is wrong, the game just carries on with the placeholder hero.

If you'd rather use Aseprite, set the canvas to 32 x 64 and export with **File, Export As** to a PNG.

# The side-on hero

The next arcade game is a side-on platformer, so the hero needs drawing from the side. The
**Hero Workshop** (`#hero`, the "Side-on hero (for the platformer)" section) has the starter hero,
a blank template, a live preview and "Try your own". The built-in placeholder is drawn in code in
`src/arcade/hero-side-art.ts`, in the same colours as the top-down hero. Your own picture replaces
it with no code changes.

## What the picture must look like

One PNG called **`hero-side.png`**, in `public/arcade/`. It is **one row of 10 frames**, and the hero
**faces right** in every frame (the game flips it for left).

| Frame | Pose |
|---|---|
| 1, 2 | Stand (idle, breathing) |
| 3, 4, 5, 6 | Run (the four frames loop) |
| 7 | Jump (going up) |
| 8 | Fall |
| 9 | Land (squashed) |
| 10 | Hurt |

- **Default frame size is 32 x 32**, so the sheet is **320 x 32**.
- **Taller heroes work too.** The game takes frame width = picture width / 10, and frame height =
  picture height. So 320 x 48 (frames of 32 x 48) works, and so does 640 x 64 (frames of 64 x 64).
  The width must divide evenly by 10.
- **Feet sit on the bottom row** of every frame, with the hero roughly in the middle left to right.
- **Empty pixels are see-through.**

## The minimum to get going

Draw the **run (frames 3 to 6) and the jump (frame 7)**. Frames you leave empty borrow the nearest
pose that is drawn, so a half-finished sheet still plays:

- no stand frames: uses run frame 3
- no fall: uses the jump
- no land: uses a stand frame
- no hurt: uses the fall (or the jump)

## Drawing it in Piskel

1. Open **piskelapp.com** and click **Create Sprite**.
2. **Resize** to 320 x 32 (or 320 x 48 for a taller hero). Draw on ONE Piskel frame only.
3. **Import** the starter (download it from the workshop) as a single image.
4. Recolour with the bucket tool "Paint all pixels of the same color", then change shapes.
   Keep the feet on the bottom row.
5. **Export**, PNG tab, download. Name it exactly `hero-side.png`.
6. Either try it in the workshop ("Try your own", then "Use this hero on this device"), or put it in
   `public/arcade/` on GitHub (**Add file**, **Upload files**, on a new branch with a pull request).

The blank template (also in the workshop) has faint guide lines: a blue box edge, a pink ground line,
a dotted middle and the frame number. Rub them out with the eraser before you export.

## How the game finds the hero

`loadSideHero()` in `src/arcade/hero-side-art.ts` returns `{ image, frameW, frameH, frameMap, source }`.
It uses, in order: a hero saved on this device by the workshop (`localStorage`, key
`learning-arcade:hero-side`), then `public/arcade/hero-side.png`, then the built-in placeholder.
A picture whose width doesn't divide by 10 is skipped. `frameMap[pose]` says which frame to draw for
each of the 10 poses (its own, or the nearest drawn one if it's empty).
