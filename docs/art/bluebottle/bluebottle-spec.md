# Bluebottle: character spec

The starter hero of Recall Arcade. An original character: a small deep-sea-green alien with one huge eye.
Sources: `src/arcade/hero-art.ts`, `src/arcade/hero-side-art.ts`, `docs/story-design.md`.

## Who he is
- **Name:** Bluebottle. He took it off a damaged Australian beach warning sign (the bluebottle / marine stinger kind) without knowing what it means. He isn't blue. That's the joke: his human friend says *"But you ain't blue?"*
- **Personality:** curious. He asks who, what, when, where and how, and each quiz subject answers one of his questions.
- **Pronouns:** he / him.

## Body plan
- **Proportions:** a big round head about two-thirds of his height, a small body, and short stumpy arms and legs with rounded ends (no fingers or toes).
- **Eye:** one huge round eye.
  - It is open at the top, with no lid.
  - The navy pupil sits calmly in the middle, slightly low.
  - There is a big white shine at the top left.
- **Face:** pink blush cheeks either side of the eye and a small "w" smile. It's cute, not creepy: the eye is huge and round, the shine is big, and the blush is there.
- **Ears:** two long ears swept back from the head like long hair, with lighter tips.
  - **Animation:** they are his "secondary motion". They sway on a walk, bounce on a run, stream down and back on a jump, float up on a fall and fly up when he's hurt.
- **Belly:** a pale aqua belly patch.
- **Shading:** light from the top left. Highlights go on the upper-left edges and shade on the lower right, with a dark teal outline all round.

## Palette
| Part | Hex |
|---|---|
| Outline | `#084845` |
| Body | `#00856b` |
| Body shade | `#006351` |
| Body highlight | `#2fe2bf` |
| Belly | `#7fffe1` |
| Ear tips | `#41e8c6` |
| Ear tip shade | `#27ad93` |
| Eye white | `#ffffff` |
| Pupil | `#0e1238` |
| Eye shine | `#ffffff` |
| Blush | `#ff8fb0` |

## Existing sprites
- **Top-down (island, Labyrinth):** 16 × 16 frames, in a 32 × 64 sheet.
  - Rows, top to bottom: facing down, left, right, up.
  - Columns: walk frame 1 and walk frame 2.
- **Side-on (The Brawl):** 32 × 32 frames, in a 320 × 32 sheet. The ten frames, in order:
  1. Stand (breathing in)
  2. Stand (breathing out)
  3. Run stride
  4. Run dip
  5. Run stride, legs swapped
  6. Run dip, legs swapped
  7. Jump
  8. Fall
  9. Land (squashed)
  10. Hurt

## Keep him his own (for a higher-resolution version)
- **Stay deep sea green.** He was moved off cobalt blue on purpose (13 Nov 2026), because side-on the blue version looked too much like a famous animated blue alien. A redraw should keep the green.
- **Keep the features that are his:**
  - the single eye
  - the long swept-back ears with light tips
  - the stumpy, fingerless limbs
  - the pale belly
  - the blush cheeks
- **Avoid:** a wide toothy mouth, extra arms, big upright ears and fur. Those push him toward other well-known characters.
