// THE TUNING: every number that decides how the hero FEELS, in one place.
// No drawing and no imports here, so the checker script (scripts/check-brawl.mjs) can read it too.
//
// THE PHYSICS IDEAS (read these once, then the numbers make sense):
//
//  * POSITION, VELOCITY, ACCELERATION. A thing has a position (where it is). Each tick we add its
//    VELOCITY (how fast it moves, in pixels per second) times the tick length. Pushing a key changes
//    the velocity by an ACCELERATION (pixels per second, every second). That is why the hero speeds
//    up smoothly instead of snapping to full speed.
//  * FRICTION. With no key held, we pull the velocity back towards zero. Big friction = stops
//    quickly. Small friction = slides. In the air we use a much smaller number, so a jump keeps
//    its momentum.
//  * GRAVITY. Every tick it adds to the downward velocity. Going UP, gravity slows the hero.
//    Coming DOWN, it speeds the hero up, until a cap (the TERMINAL SPEED) stops it going crazy fast.
//  * JUMP HEIGHT FROM SPEED. A jump is only "set the upward velocity to jumpSpeed". Gravity does
//    the rest. The height is jumpSpeed squared divided by twice the gravity.
//  * VARIABLE JUMP HEIGHT. If you let go of the jump key while still rising, gravity is
//    multiplied (jumpCutMul), so the hero stops climbing early. Tap = small hop. Hold = full jump.
//  * FALL GRAVITY. Gravity is stronger on the way down than up. It makes jumps feel snappy and
//    weighty (it is a big part of why the old Aladdin and Lion King games felt so good).
//  * HANG TIME. Near the top of the jump, gravity is eased off for a moment, so the hero floats a
//    little at the peak. That gives you a beat to aim your landing.
//  * COYOTE TIME. Named after the cartoon coyote who runs off a cliff and only falls when he looks
//    down. For a moment after leaving a ledge, a jump still works. It makes the game feel fair.
//  * JUMP BUFFER. The opposite: if you press jump a hair BEFORE landing, the game remembers and
//    jumps the moment you touch down. Players feel like they pressed it "on time".
//  * HITBOX. The thing that touches walls is a small rectangle, smaller than the picture.
//    The picture is a bit wider and taller, so near misses feel like near misses.
export const TUNING = {
  // ---- running (pixels per second, and pixels per second every second) ----
  maxRun: 118,         // top speed on the ground
  runAccel: 640,       // how quickly you speed up on the ground (top speed in about 0.2 s)
  runFriction: 860,    // how quickly you stop when you let go
  turnBrake: 1500,     // EXTRA braking when you push the other way: turning round feels grippy
  airAccel: 500,       // steering in the air
  airFriction: 110,    // in the air, letting go barely slows you down

  // ---- jumping ----
  jumpSpeed: 335,      // upward speed at take-off (full jump is about 62 px high, nearly 4 tiles)
  gravityRise: 900,    // gravity while going up
  gravityFall: 1350,   // gravity while coming down (stronger, so jumps feel snappy)
  jumpCutMul: 2.6,     // gravity multiplier when you let go of jump while still rising
  apexSpeed: 70,       // "near the top" means the up/down speed is below this
  apexGravityMul: 0.6, // gravity is this much while near the top (a little float)
  maxFall: 430,        // terminal speed: you never fall faster than this
  coyoteTime: 0.1,     // seconds after leaving a ledge that a jump still works
  jumpBuffer: 0.1,     // seconds a too-early jump press is remembered
  dropTime: 0.2,       // how long a one-way platform is ignored after you press Down on it

  // ---- the hitbox (pixels). The picture is 32 x 32; this is the part that touches things ----
  bodyW: 10,
  bodyH: 22,

  // ---- special ground ----
  sandSlow: 0.55,      // running on sand is this fraction of normal speed
  bounceSpeed: 430,    // landing on the high-jump mat throws you up at this speed (about 100 px)
  bounceHeld: 500,     // ... and a bit more if you are holding jump (about 140 px)

  // ---- animation ----
  landMinFall: 170,    // fall speed needed to show the landing squash
  landTime: 0.12,      // how long the squash shows
  runFps: 11,          // run frames per second at top speed (slower when slower)

  // ---- getting bonked (all cartoon: stars, no injuries) ----
  stunTime: 0.35,      // seconds you cannot steer after a bonk
  hurtTime: 0.6,       // seconds the "ouch" pose shows
  knockX: 150,         // sideways knock-back speed
  knockY: 210,         // upward knock-back speed
  invulnTime: 1.6,     // seconds nothing can bonk you again (the hero flashes)
  respawnInvuln: 1.5,  // the same, after coming back from a checkpoint
  fallDeadZone: 40,    // how far below the level you fall before it counts as a pit
} as const;

// ---- the camera ----
export const CAMERA = {
  lookAhead: 38,       // how far ahead of the hero the camera leans, in the direction of travel
  deadZone: 20,        // the hero can wander this far (each side) before the camera moves
  followSpeed: 6.0,    // how eagerly the camera catches up sideways (bigger = tighter)
  leanSpeed: 2.2,      // how quickly the lean swings round when you turn
  vertSpeed: 3.2,      // how eagerly it follows up and down (gentle)
  vertDead: 34,        // the hero can climb/fall this far in the air before the camera follows
  heroScreenY: 0.64,   // where the hero's feet sit on the screen (0 = top, 1 = bottom)
} as const;

// ---- lives and hearts, by track (the track is set on the home page by the quizzes) ----
// `lives`: how many tries. Infinity = no game over. `hearts`: hits you can take before a life is lost.
// `fewerFlags`: Hard has fewer checkpoints (the small "c" flags in the level are skipped).
// `stampedeSlack`: pixels added to the stampede's head start (Easy gets a bigger lead, Hard a smaller one).
export const TRACK_RULES = {
  easy: { lives: Infinity, hearts: 5, fewerFlags: false, stampedeSlack: 90 },
  intermediate: { lives: 5, hearts: 3, fewerFlags: false, stampedeSlack: 0 },
  hard: { lives: 3, hearts: 2, fewerFlags: true, stampedeSlack: -30 },
} as const;
export type TrackName = keyof typeof TRACK_RULES;

// ---- the screen ----
export const VIEW_W = 384; // the internal picture size. The browser scales it up with crisp pixels.
export const VIEW_H = 216;
export const TILE = 16;
export const STEP_SECONDS = 1 / 60; // the game moves forward in 60ths of a second, always
