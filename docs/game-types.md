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

## New: Fill the List (wave 3, decided 14 Nov 2026)
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

## Later (wave 4)
Merge the duplicate "Put in order" and "Place on a timeline" versions into one shared engine each, then
write the full catalogue.
