import { playNote } from "../music/audio";

// THE ARCADE KIT: the small parts that every arcade game needs, kept in one place.
// Planet Pong, The Labyrinth and Flyover all began by copying the same few helpers (the game
// loop, drawing a picture from letters, saving a best time...). Here they live once, so a fix
// or an improvement helps every game. The Labyrinth uses this file today; Pong and Flyover
// still carry their own copies and will move over later. Nothing here is specific to one game.

// ---------- the game loop ----------
// FIXED TIMESTEP. Screens refresh at different speeds (60, 120, 144 times a second). If we moved
// things once per screen refresh, the game would run faster on a fast screen. So instead we chop
// time into equal 1/120 second slices and run the game's update once per slice, however many it
// takes to catch up. The game then runs at the same speed on every screen.
export const STEP = 1 / 120;

export interface LoopParts {
  /** Is the game being played right now? When false (menu, pause, cards) the clock stands still. */
  playing: () => boolean;
  /** Move the world forward by `dt` seconds. It is always exactly STEP long. */
  update: (dt: number) => void;
  /** Called every screen refresh while NOT playing, with the real seconds that passed. Good for card timers. */
  idle?: (dt: number) => void;
  /** Paint the picture. `seconds` is a steadily rising clock, handy for animation. */
  draw: (seconds: number) => void;
  /** How long each update slice is, in seconds. Leave it out for the usual 1/120. The Brawl asks for 1/60. */
  step?: number;
}

/** Start the loop. It returns a function that stops it again (call that when leaving the screen). */
export function startLoop(parts: LoopParts): () => void {
  let raf = 0;
  let last = performance.now();
  const step = parts.step ?? STEP;
  let owed = 0; // time we owe the game, in seconds: it is "paid" in STEP-sized slices
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    // How long since the last frame ("delta time"), capped so a busy or hidden tab can't make
    // the game try to catch up on ages of missed time all at once.
    const dt = clamp((now - last) / 1000, 0, 0.25);
    last = now;
    if (parts.playing()) {
      owed += dt;
      // Re-check `playing` each slice: the game may pause itself part way through (a level ends).
      while (parts.playing() && owed >= step) {
        parts.update(step);
        owed -= step;
      }
    } else {
      owed = 0; // paused: forget any owed time so there is no lurch when play resumes
      parts.idle?.(dt);
    }
    parts.draw(now / 1000);
  }
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

// ---------- small maths ----------
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * A small repeatable "random" number for a spot, so scenery looks uneven but never flickers:
 * the same x, y and seed always give the same number. (Math.random would change every frame.)
 */
export function noise(x: number, y: number, seed: number) {
  let n = (x * 374761393 + y * 668265263 + seed * 144665) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

// ---------- pixel art, drawn from letters ----------
// Every picture is a little grid of letters. Each letter is a colour from a palette, and
// "." means "see-through". We draw them onto a hidden canvas once, then stamp that onto the screen.
export function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Turn rows of letters into a picture. The picture is as wide and tall as the rows. With
 * `mirror` you write only the LEFT half of each row and the right half is added like a mirror
 * (nearly every creature is the same on both sides, so this halves the typing).
 */
export function paint(rows: string[], palette: Record<string, string>, mirror = false) {
  const full = rows.map((row) => (mirror ? row + [...row].reverse().join("") : row));
  const c = makeCanvas(full[0].length, full.length);
  const g = c.getContext("2d")!;
  full.forEach((line, y) => {
    if (import.meta.env.DEV && line.length !== full[0].length) console.error(`Arcade art: row ${y} "${line}" is not ${full[0].length} wide`);
    [...line].forEach((letter, x) => {
      const colour = palette[letter];
      if (!colour) return;
      g.fillStyle = colour;
      g.fillRect(x, y, 1, 1);
    });
  });
  return c;
}

// ---------- best time, saved in the browser ----------
// `key` is the name the browser files the number under, for example "learning-arcade:labyrinth".
// Keep a game's key the same forever, or players lose the best times they have already set.
export function loadBest(key: string): number | null {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    return typeof saved?.best === "number" ? saved.best : null;
  } catch {
    return null;
  }
}

export function saveBest(key: string, seconds: number) {
  try {
    localStorage.setItem(key, JSON.stringify({ best: seconds }));
  } catch {
    // Saving is a bonus. If the browser says no, the game carries on.
  }
}

// ---------- sounds ----------
/** One blip: [note, how long it rings in seconds, how long to wait before it starts]. Higher note number = higher pitch. */
export type Blip = [note: number, length: number, delay: number];

/**
 * Make a `beep("name")` function from a table of named sounds. Each sound is a few blips played
 * with the same piano as the quiz games. Browsers only allow sound after the player has pressed
 * something, so `soundOn` is asked every time and nothing plays until it says yes.
 */
export function makeBeeper<N extends string>(sounds: Record<N, Blip[]>, soundOn: () => boolean) {
  return (name: N) => {
    if (!soundOn()) return;
    for (const [note, length, delay] of sounds[name]) playNote(note, length, delay);
  };
}
