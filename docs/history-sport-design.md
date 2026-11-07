# History and Sport design (6 Nov 2026)

What the owner decided after filling in the quiz-lists spreadsheet. The sheet is private, so its
link isn't kept here; ask the owner. The game never reads the sheet. The lead session imports it
into the data files.

## Decisions
- **Big Moments gets time periods.** The sheet has two kinds of row:
  - **period:** a name with a start and an end (for example WW2, 1939–1945);
  - **event:** a name with a year, plus optionally the period it belongs to.

  Scoring: the exact year gets full marks, inside the right period gets high marks, and outside it
  the score falls away with distance. A round draws events from different periods (no doubling up).
  An "Inside a period" round zooms in on one period.
- **Empires Through Time becomes Eras & Dynasties.** Timelines rather than maps, sharing the
  periods list with Big Moments. The maps stay as one round, "Empires on the map".
  - **Ways to play:** put eras in order; place an era's start and end; match an era to its
    ruler or invention; "which era was this?" for an event.
  - **Era ideas** (owner liked them all):
    - **Ancient:** Bronze Age, Classical Greece, Roman Republic and Empire, Han, Gupta.
    - **Medieval:** Viking Age, Byzantine, Islamic Golden Age, Tang and Song, Mongol, Black Death.
    - **Early modern:** Renaissance, Reformation, Age of Exploration, Ming, Mughal, Tudor, Stuart,
      Edo, the Ottomans at their height, the Enlightenment.
    - **Modern:** Georgian, Industrial Revolution, Victorian, Meiji, the Gold Rush and Federation,
      Interwar, Cold War, Space Race, Digital Age.
- **Prime Ministers & Presidents becomes Leaders & Changemakers.** Keep the deck id `pms` so
  saved scores survive.
  - **Rounds:**
    - Australian PMs: all of them, with portrait photos.
    - US presidents since 1933 (FDR onwards).
    - UK PMs since 1940 (Churchill onwards).
    - Big names before WW2.
    - Movement leaders.
    - Around the world (the owner's new list, which includes dictators. Describe them neutrally and
      factually, for example "led Germany 1933–45").
  - **Photos:** freely licensed Wikipedia portraits, with credits, using the same system as the
    photo walls.
- **Who Lived When** grows. Aim for a balance across eras: roughly a quarter each before AD 500,
  500–1500, 1500–1900 and after 1900, plus more sport, entertainment and people from outside the
  Western story.
- **Sport becomes the 7th subject**, with a stadium on the island route.
  - **Lists:** F1 world champions, AFL premiers, NRL premiers, Premier League / European football,
    FIFA World Cup, Olympic hosts (more to come: Bathurst 1000, the fastest man alive).
  - **Ways to play:**
    1. Name each year's winner (F1 stays like this).
    2. Pick a champion and fill in their years.
    3. Decade blocks.
    4. Who won more?
    5. Champions in order.
- **Entertainment is planned as the 8th subject**, with a movie theatre on the island: Oscar
  winners (film, actor, actress, director), highest-grossing films and franchises, then games, TV
  and books.

## To build (suggested order)
1. Tidy the sheet: add dates to the new rows, mark duplicates, fix spellings. The lead session
   does this, following the house rules' sheet-safety steps.
2. Big Moments with periods, plus Eras & Dynasties (shared periods data).
3. Leaders & Changemakers (rounds, photos).
4. Who Lived When additions.
5. Sport: the subject, the lists, the five ways to play, the island stadium.
6. Entertainment.

## Update (7 Nov 2026): sheet tidied, and more decisions
**The sheet tidy-up is done** (by the lead session, with dated backup tabs of each tab touched, "… backup 2026-11-06"):
- **Big Moments:** 151 rows (ids 1–151), 25 of them periods.
  - New columns: type, start year, end year, period it belongs to.
  - Existing events are linked to their periods (for example Pearl Harbor goes in World War II).
  - Duplicates were deleted, Gettysburg was corrected to 1863, and the Whitechapel murders were left out.
- **Who Lived When:** 146 people (ids 1–146). The 70 newcomers have dates and a "who they were".
  Abraham, Homer and Zoroaster were removed (no reliable dates), along with 3 duplicates.
- **World Leaders:** 152 rows (ids 1–152).
  - Columns `round` and `role` were added.
  - The UK years were moved into the right column.
  - **Rounds:** Australian PMs; UK PMs from WW2 (Chamberlain on); US presidents from WW2 (FDR on);
    Big names before WW2; Changemakers; Rulers through history; World leaders since 1900; spare.
- **Marking:** everything Claude filled is marked "Filled by Claude, please check" in the notes.
  The owner confirmed the 2026 sports results.

**More decisions:**
- **Sport has 6 sub-topics**, one sport each, with a few variants:
  1. Rugby League (NRL premiers)
  2. Australian Rules (AFL premiers)
  3. Football (Premier League, FIFA World Cup, Champions League / European Cup)
  4. Motorsport (F1 world champions, Bathurst 1000)
  5. Olympics (host cities for now)
  6. General Sports (fastest man alive; more to come)
- **Later ideas:**
  - an **"After Dark"** extension for grimmer history (for example Jack the Ripper);
  - **religions** as their own topic, rather than merged into Mythology, so it's handled with care.
  - a **"Born when"** quiz for living people (for example Bill Gates): guess the birth year,
    since a "lived when" bar has no end yet. Bill Gates is held back in the sheet for it.

## Built: Sport (7 Nov 2026)
- **Sport is the 7th subject.** A track once reached is kept, so players already on Intermediate stay there; new players need all 7 subjects (owner's option A).
- **Six quizzes:** Rugby League (`nrl`), Australian Rules (`afl`), Football (`football`: English champions, Champions League, World Cup), Motorsport (`motorsport`: F1, Bathurst 1000), Olympics (`olympics`), Fastest Man Alive (`sprint`, the 100 m world record).
- **Ways to play:** Year by year, Fill in their years, Decade blocks, Who won more?, In order (only where they make sense; the 100 m has Who was faster? instead).
- **Data:** `src/decks/sport-data.ts` is generated by `scripts/sport-from-sheet.py` from the sheet's "Sports" and "Clubs" tabs. To change a name rule, edit the Clubs tab, then regenerate.
- **Clubs rule:** the name in the list always counts. The current name counts only if the Clubs tab says Yes. The note shows after answering.
- **Island:** a stadium after Music, with the last gate before the finish.

## Built: Entertainment and Born When? (8 Nov 2026)
- **Entertainment is the 8th subject**, with a movie theatre on the island after the stadium. The track rule is the same: a track once reached is kept.
- **Six quizzes:** The Oscars (`oscars`), Box Office (`boxoffice`), Who Played Who (`whoplayed`), Three Clues (`threeclues`), When Did It Come Out? (`released`), Aussie Awards (`ausawards`: Gold Logies, Hottest 100, Miles Franklin).
- **Data:** the sheet's Oscars, Box Office, Aussie Awards, Who Played Who and Movies tabs. `scripts/entertainment-from-sheet.py` turns a saved snapshot of them into `src/decks/entertainment-data.ts`. Ids come from titles and years, never row order, so new movies can go anywhere.
- **Three Clues:** clue 1 is worth 3 points, clue 2 is worth 2, clue 3 is worth 1. There is also an emoji mode, and a **Picture reveal** mode for the owner's own drawings (`public/entertainment/scenes/`, see its README). It stays hidden until the first drawing is added. No film stills: copyright.
- **Born When?** (`bornwhen`, History, linked from Who Lived When): guess a living person's birth year. It is built from the sheet's Born When tab by `scripts/bornwhen-from-sheet.py`.
- **Left out on purpose:** Denis Leary's 1993 Hottest 100 number one (language). It's in the generator's `HIDE_H100` list.
