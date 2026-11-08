# Picture reveal drawings

These are your own pixel-art drawings for the "Picture reveal" game in Three Clues.
Only draw your own work. Do not copy film stills, posters or characters from the real thing.

## How to add a drawing
1. Draw it (a small PNG works best, for example 64 x 48 or 128 x 96 pixels, any size is fine).
2. Put the PNG in this folder, for example `crocodile-dundee.png`.
3. Add a line to `scenes.json` in this folder:

```json
[
  { "title": "Crocodile Dundee", "year": 1986, "file": "crocodile-dundee.png" }
]
```

- `title` is the answer. If it matches a title in the Movies list, all that title's short forms count too.
- `year` is optional. It shows after the answer.
- `file` is the picture's file name in this folder.
- Optional `"also": ["Another name that counts"]` adds extra accepted answers.

Separate several drawings with commas. While the list is empty (`[]`), the game hides Picture reveal
and says it is coming soon.

## How it plays
The drawing starts as big blocks and gets sharper in 4 steps. Guess at step 1 for 4 points,
step 2 for 3, step 3 for 2 and step 4 for 1.
