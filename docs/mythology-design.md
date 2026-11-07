# Mythology design (3 Nov 2026)

**Decided:** keep Mythology and rebuild it around four cultures: **Greek, Roman, Egyptian, Norse**.
The owner liked all of the ideas below. Dreamtime and other cultures can come later, once they can
be done justice (Dreamtime stories need care and proper sources).

## Structure
Mythology becomes its own screen with **four culture tabs**. Each has a ladder that goes from
"no memory needed" to full recall:
1. **Meet the gods:** cards with a picture, name, what they rule and their symbol (study mode).
2. **Who's who:** multiple choice. "God of the sea?" Pick one of four. You recognise before you recall.
3. **Symbols and sacred animals:** owl → Athena, raven → Odin, cat → Bastet, thunderbolt → Zeus.
4. **Type the name:** the current style, last.

## Special challenges for each culture
- **Greek and Roman:** Greek & Roman Pairs (memory) and a two-column match, both already built,
  plus **"Same job, two names"**: see the Greek god, name the Roman one.
- **Egyptian:**
  - **Animal heads:** jackal Anubis, falcon Horus, ibis Thoth, crocodile Sobek, cat Bastet.
  - **The journey to the afterlife:** put the steps in order, from mummification to the weighing of
    the heart against Ma'at's feather (Thoth records, Ammit waits) to the Field of Reeds. This reuses
    the drag-to-order screen from The Scale of Things.
- **Norse:**
  - **The Nine Realms:** label Yggdrasil, the world tree (Asgard, Midgard, Jotunheim, Helheim and so on).
  - **Days of the week:** Tuesday is Tyr, Wednesday is Odin (Woden), Thursday is Thor, Friday is
    Frigg. It links back to Rome too: Saturday is Saturn.

## Keep
The existing item ids, and the `myths` and `mythpairs` deck ids, so saved scores survive.
Wikipedia pictures (free licences, with credits) as now.

## Later
- Famous For grows from the owner's new History lists.
- More cultures.

## Built (7 Nov 2026)
- **The hub** (`#myths`, `src/ui/mythology.ts`): four culture tabs, each with the ladder (Meet the gods → Who's who → Symbols and sacred animals → Type the name) and a "Special challenges" row. Celtic, Inca and Aboriginal Dreaming stay as typed rounds in a "More cultures" strip.
- **Data:** `src/decks/myth-data.ts` (gods, days, afterlife steps, the Nine Realms). Ids are explicit; don't change them.
- **New hidden games:** `mythwho` (Who's who), `mythsymbols` (symbols, animals, Egyptian animal heads, days of the week), `afterlife` (put the journey in order), `realms` (label Yggdrasil). Each has its own challenge.
- **Kept:** the `myths` typed game, its items m0–m51 and its round ids, so saved scores still count. `#myths/type/<round>` opens it at a round.
- **Notes:** Tyr has no symbol question (no reliable one). The Nine Realms layout follows the version most often drawn, and the game says sources vary.
