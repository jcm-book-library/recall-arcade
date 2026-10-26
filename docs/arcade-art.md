# Drawing your own hero for The Labyrinth

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
them as the hero walks. Frame 1 is also what he looks like standing still.

## Drawing it in Piskel (free, in your browser)

1. Open **piskelapp.com** and click **Create Sprite**.
2. Click the **Resize** tool in the left toolbar. Type **32** for width and **64** for height, then
   confirm. (Draw on ONE frame only. Don't add animation frames.)
3. Turn on the grid so you can see the boxes: open **Preferences** (the cog) and set the grid
   to **16** pixels. You should now see 2 boxes across and 4 down.
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
