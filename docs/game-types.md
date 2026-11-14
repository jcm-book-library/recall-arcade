# Game types (14 Nov 2026)

The ways to play, as shared engines. Any quiz with the right kind of data can use a game type, so a fix or
improvement lands everywhere at once. (The full catalogue, mapping every quiz to the types it uses and could
use, is still to be written.)

## The game types we have
| Game type | Examples now | Notes |
|---|---|---|
| Name them all (fill a board, any order) | Countries, Periodic Table | src/ui/play.ts, mode "any" |
| One at a time (type the answer) | Flags, Capitals, Airports, Leaders | play.ts, mode "prompt" |
| Click on the picture | Seas, Lakes & Rivers; Human Body (click) | play.ts, mode "click" |
| Multiple choice | Classifying Life, Who's Who, Which Made More? | src/ui/choice.ts (and some custom copies) |
| Match pairs | Famous For, Greek & Roman Pairs | src/ui/pairs.ts |
| Put in order | Scale of Things, Eras, Sport, Afterlife | **four separate versions: to merge into one** |
| Place on a timeline | Big Moments, Who Lived When?, When Did It Come Out?, Born When?, Eras (place the span) | **several versions: to merge into one** |
| Clues | Three Clues, Emoji, Baby Animals (hangman) | |

## New: Fill the List (wave 3, decided 14 Nov 2026; wave 3a built 14 Nov 2026)
The owner learns best putting **names into dates**, so: the whole list is shown with the answers blank.
- **Two versions:**
  1. **Any order:** type a name and every row it belongs to fills in. For example, "Hamilton" fills all
     six of his F1 years. (Today's "Decade Blocks", grown to cover the full list.)
  2. **In order:** fill each row in turn, top to bottom, with the list growing as you go.
- **Newest first** (2026 at the top).
- **Skipping is allowed:** Tab skips a row, and you can come back to it.
- **Extra detail shows as each answer fills in:** the team, the film, the author, the time and so on.
- **Pilot:** F1 world champions. Then every list-shaped quiz:
  - **Sport:** NRL, AFL, Football (English champions, Champions League, World Cup), Bathurst, Olympic hosts
  - **Entertainment:** the Oscars, Gold Logies, Hottest 100, Miles Franklin, Box Office (type a film and it
    drops into its rank)
  - **History:** Leaders & Changemakers, Eras & Dynasties, Big Moments, Who Lived When? (as asked in the
    feedback sheet)
- It's built once, as a shared engine, on the shared quiz page, with Easy, Medium and Hard following the standard:
  - **Easy:** the first letter is shown.
  - **Medium:** hints on request.
  - **Hard:** no hints.

## Fill the List: what is built (wave 3a)
**Done for every Sport-engine list:** F1, Bathurst, NRL, AFL, English champions, Champions League, World Cup,
Olympic hosts, 100 m records, the four Oscars lists, Gold Logies, Hottest 100 (number ones and the special
countdowns) and Miles Franklin. They are two new rows on the Sport screen under a "Fill the List" heading:
**Fill the List: Any Order** and **Fill the List: In Order**.

**Files**
- `src/ui/fill-list.ts` and `fill-list.css`: the engine. It knows nothing about sport.
- `src/ui/sport-fill.ts`: turns a Sport list into rows (key, answer, detail) and picks the default time limit.
- `src/engine/names.ts`: name matching (case, accents, punctuation, one slip in a long name), shared with Sport.
- `src/ui/sport.ts`: the two rows, the Easy / Medium / Hard picker on them, the time limit, saving scores.
- `src/decks/sport-config.ts`, `entertainment-config.ts`: `"listany", "listorder"` in each list's `modes`.

**How the engine is used:** `runFillList(host, options)` (options are described at the top of fill-list.ts).
A row is `{ id, key, sub?, who: [champion ids], shown, detail?, note?, alt?, hint?, off? }` and a champion is
`{ id, name, accept: [...], loose?: [...] }`. It returns a function that stops the round. The caller saves the
score in `save(result)`, so the caller chooses the storage key.

**Adding it to another list on the Sport screen:** put `"listany", "listorder"` in that list's `modes`, and
if its results need a different detail line, add a case in `sport-fill.ts` (`buildFillData`). Nothing else.

**Decisions**
- Saved scores use new ids, `<list>-listany-<range>` and `<list>-listorder-<range>`, with `+easy` / `+hard` on the
  end for those levels (Medium keeps the plain key). They are not `-fill-`, because "Fill in their years" already
  saves under `<list>-fill-<range>`.
- Easy shows the first letter of every blank. Medium has a Hint button that costs no points; the results say how
  many hints were used. Hard has none.
- A name two champions share (a `loose` name, like "Greene") is refused in Any Order and accepted in In Order, where
  the row is already known. This is the Sport engine's existing rule.
- Hottest 100 accepts the song or the artist (the artist shows beside the song once filled). Miles Franklin
  accepts the book only, with the author as the detail.
- Details: the film (Oscars), the show (Logies), the artist or author, the time and place (100 m records), and for
  the rest the running count ("3rd title", "2nd time hosting"). The 100 m rows are keyed by date.
- The time limit (⏱) shows while a Fill the List row is picked. The default comes from the list's size: about 14 s
  per distinct name in Any Order and 9 s per row in In Order, rounded up to the next choice.
- In Order shows only the rows reached so far; Tab and Shift+Tab move between the skipped rows and the next new
  one, wrapping round, and a click returns to a skipped row.

**What wave 3b needs** (Box Office, Leaders, Eras, Big Moments, Who Lived When): write a function like
`buildFillData` for each, returning `rows` and `champs`. The engine needs nothing new for lists where one name
answers one row or many rows. Two things it does not do yet: Box Office's "a film drops into its rank" (rows are
ranks with the film as the answer, so it should work as plain rows, with `key` the rank), and rows that are spans
of time (Eras), which would use `key` for the span. Hide the Sport-only parts by building a different screen, and
call `runFillList` from it with its own `save`.

## Later (wave 4)
Merge the duplicate "Put in order" and "Place on a timeline" versions into one shared engine each, then
write the full catalogue.
