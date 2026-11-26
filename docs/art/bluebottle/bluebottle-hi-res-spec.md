# Bluebottle: hi-res vector spec

A smooth vector version of Bluebottle (BB), redrawn from the original pixel-art spec (`bluebottle-spec.md`) for the Claude status widget on the owner's work PC. Everything about who he is (name, personality, pronouns, the "but you ain't blue?" joke) carries over from the original spec unchanged. This file only covers how the hi-res version is drawn and animated.

**Files in this folder:**
- `bluebottle.svg`: the master drawing. It animates in a browser (bob, ear sway, arm wave and eye glance), and all the numbers below come from it.
- `bluebottle.png`: a static render at about 600 px tall (not kept in the repo; render the SVG to get one).

## At a glance
- **View:** front-facing, standing, one arm raised in a wave.
- **Style:** flat cel shading with no gradients. Each part has a base colour, a hard-edged shade crescent on the lower right and a highlight crescent on the upper left, all under a dark teal outline. It's the pixel version's lighting, made smooth.
- **Grid:** 100 × 108 units, with the origin at the top left. In the widget he's shown at 48 × 52 px, about 0.48 scale. He scales to any size without losing detail.
- **Outline:** `#084845`, 2.5 units on everything except the head, which is 3 units. Joins and line ends are rounded.

## Proportions
- **Head:** 70 × 64 units, about two-thirds of his height.
- **Body:** small, 38 × 28.
- **Limbs:** short and stumpy. Legs are 13 × 15, arms 11 × 20 (waving) and 11 × 16 (resting). The ends are rounded, with no fingers or toes.
- **Ears:** about 17 units wide and 60 long. They hang from the upper sides of the head down past the body, like long hair.

## Parts
Listed back to front, which is also the drawing order.

| Part | Shape and position (grid units) | Colours |
|---|---|---|
| Ears | Two mirrored teardrop locks. Each attaches at the upper side of the head (left ear root at about x 30–38, y 22–28) and hangs out and down to a rounded tip at about y 82. The lighter tip is the part below y 62. | Base `#00856b`, tip `#41e8c6`. Tip shade `#27ad93` on each tip's lower-right side (inner edge of the left ear, outer edge of the right). |
| Legs | Two rounded rectangles 13 × 15 (corner radius 6) at x 36 and x 51, y 88. Only the bottom 7 units show below the body. | `#006351` (in shadow under the body) |
| Body | Ellipse centred at (50, 82), radius 19 × 14. | Base `#00856b`; shade crescent `#006351` |
| Belly patch | Ellipse centred at (50, 84), radius 9 × 4. | `#7fffe1` |
| Head | Ellipse centred at (50, 40), radius 35 × 32. | Base `#00856b`, shade `#006351`, highlight `#2fe2bf` |
| Blush | Two ellipses, radius 6 × 3.5, centred at (22, 53.5) and (78, 53.5), either side of the eye. | `#ff8fb0` |
| Smile | A small "w": two shallow curves from (43, 63) to (57, 63), dipping to y 67.5. | Stroke `#084845`, 2.4 units |
| Eye | Circle centred at (50, 38), radius 21. It's open at the top: no lid. | White `#ffffff`, outline `#084845` |
| Pupil | Circle centred at (50, 42), radius 9.5. It sits calmly in the middle, slightly low (4 units below the eye's centre). | `#0e1238` |
| Shine | Circle centred at (46.5, 38.5), radius 4, at the top left of the pupil. | `#ffffff` |
| Waving arm | Rounded rectangle 11 × 20 at (25, 60), pivoting at the shoulder (30.5, 80). Resting angle −35°. | `#00856b` |
| Resting arm | Rounded rectangle 11 × 16 at (64, 76), pivoting at the shoulder (69.5, 76), angled −30° so it hangs out to the right. | `#006351` |

## How the shading is built
- **Shade crescent:** the part's shape minus a copy of itself moved 4 units up and left. What's left is a thin crescent on the lower right.
- **Highlight crescent:** the part's shape minus a copy moved 3 units down and right. What's left is a thin crescent on the upper left. Only the head has one.
- **Outline:** drawn last, on top of the fills.

## Palette
Same as the original spec. This shows where each colour is used.

| Hex | Used for |
|---|---|
| `#084845` | Outline, smile |
| `#00856b` | Body, head, ears, waving arm (base) |
| `#006351` | Shade crescents, legs, resting arm |
| `#2fe2bf` | Head highlight |
| `#7fffe1` | Belly patch |
| `#41e8c6` | Ear tips |
| `#27ad93` | Ear tip shade |
| `#ffffff` | Eye white, shine |
| `#0e1238` | Pupil |
| `#ff8fb0` | Blush |

## Animation
| Motion | What moves | Timing |
|---|---|---|
| Bob | Whole body, 0 to −3 units and back | 0.8 s each way, eased |
| Ear sway (secondary motion) | Left ear rotates −2° to +5° around (32, 24); right ear mirrors it, +2° to −5° around (68, 24). Both tips swing out together. | 1.3 s each way, eased |
| Wave | Waving arm rotates −55° to −15° around the shoulder | 0.32 s each way |
| Glance | Pupil and shine slide 3.5 units sideways (towards his speech bubble), hold, and slide back | 6 s loop: starts at 2.8 s, back by 4.9 s |
| Hop (good news) | Whole body: up 12 units at 0.18 s, down at 0.36 s, a 2-unit squash at 0.44 s, settled at 0.52 s, then a pause | 1.6 s loop |
| Walk in | He slides in from the screen edge while his legs step 4 units up in turn (right leg 0.15 s after the left), three steps each | 0.9 s |

**No blink:** he has no eyelid, so he glances instead.

**In the widget:**
- He **waves** when a session needs you, when he's offering a handover and when he's confirming something you clicked.
- He **hops** for good news: a finished session, or the Friday recap.

## Decisions made in the redraw
- **Front view.** It reads best at 50 px beside a speech bubble, and keeps the eye, blush and belly all visible.
- **Ears attach to the upper sides of the head**, not the very top. A first try started them at the top and they framed the head like a hood. Lower down, they read as long ears hanging like hair.
- **Glance instead of blink**, to stay true to his lidless eye.
- **Flat colours, no gradients**, to keep the hard-edged lighting of the pixel version.

## Keep him his own
These carry over from the original spec.
- **Stay deep-sea green**, never cobalt blue.
- **Keep:** the single eye, the long swept-back ears with light tips, the stumpy fingerless limbs, the pale belly and the blush cheeks.
- **Avoid:** a wide toothy mouth, extra arms, big upright ears and fur.

## Not drawn yet
- **Working:** eye looking up, ears drooped.
- **Hurt:** ears fly up.
- **Side-on:** a version of the run cycle.

All three would use the same grid, palette and shading method.
