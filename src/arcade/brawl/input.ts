// THE CONTROLS: the keyboard, and the big on-screen buttons for touch screens.
//
// One tricky bit is a very quick TAP of the jump key. It can go down and up between two game ticks
// (a tick is 1/60 of a second), and the game would never notice. So a press is remembered ("queued")
// until a tick has seen it, and the key counts as held until then too.
export interface Controls {
  left: boolean; right: boolean; down: boolean;
  /** Is jump held (key or button)? */
  jumpHeld: () => boolean;
  /** Took the "jump was pressed" note. True once per press. */
  takeJumpPress: () => boolean;
  /** Let go of everything (when the tab loses focus, or on a pause). */
  releaseAll: () => void;
}

interface Wiring {
  on: <T extends EventTarget>(target: T, type: string, fn: (e: any) => void) => void;
  pad: { left: HTMLElement; right: HTMLElement; jump: HTMLElement };
  /** The jump key or button went down. The game uses it to start, resume or restart too. */
  onJumpDown: () => void;
  onPause: () => void;
  onTouch: () => void;
}

export function setupControls(w: Wiring): Controls {
  const c = { left: false, right: false, down: false, keyJump: false, padJump: false, queued: false, keyLeft: false, keyRight: false, padLeft: false, padRight: false };
  const pressJump = () => { c.queued = true; w.onJumpDown(); };

  const dirKey = (k: string) =>
    k === "ArrowLeft" || k === "a" || k === "A" ? "left" :
    k === "ArrowRight" || k === "d" || k === "D" ? "right" :
    k === "ArrowDown" || k === "s" || k === "S" ? "down" : null;
  const jumpKey = (k: string) => k === " " || k === "ArrowUp" || k === "w" || k === "W";

  w.on(window, "keydown", (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === " " || k.startsWith("Arrow")) e.preventDefault(); // no page scrolling while playing
    const d = dirKey(k);
    if (d === "left") c.keyLeft = true;
    else if (d === "right") c.keyRight = true;
    else if (d === "down") c.down = true;
    else if (jumpKey(k)) { if (!e.repeat) { c.keyJump = true; pressJump(); } }
    else if (!e.repeat && (k === "p" || k === "P" || k === "Escape")) w.onPause();
    else if (!e.repeat && k === "Enter") w.onJumpDown();
  });
  w.on(window, "keyup", (e: KeyboardEvent) => {
    const k = e.key;
    const d = dirKey(k);
    if (d === "left") c.keyLeft = false;
    else if (d === "right") c.keyRight = false;
    else if (d === "down") c.down = false;
    else if (jumpKey(k)) c.keyJump = false;
  });

  const hold = (btn: HTMLElement, set: (v: boolean) => void, isJump = false) => {
    const release = () => { set(false); btn.classList.remove("pressed"); };
    w.on(btn, "pointerdown", (e: PointerEvent) => {
      e.preventDefault();
      w.onTouch();
      try { btn.setPointerCapture(e.pointerId); } catch { /* the button still works without capture */ }
      btn.classList.add("pressed");
      set(true);
      if (isJump) pressJump();
    });
    w.on(btn, "pointerup", release);
    w.on(btn, "pointercancel", release);
    w.on(btn, "lostpointercapture", release);
    w.on(btn, "contextmenu", (e: Event) => e.preventDefault()); // no pop-up menu on a long press
  };
  hold(w.pad.left, (v) => { c.padLeft = v; });
  hold(w.pad.right, (v) => { c.padRight = v; });
  hold(w.pad.jump, (v) => { c.padJump = v; }, true);

  return {
    get left() { return c.keyLeft || c.padLeft; },
    get right() { return c.keyRight || c.padRight; },
    get down() { return c.down; },
    jumpHeld: () => c.keyJump || c.padJump || c.queued,
    takeJumpPress: () => { const q = c.queued; c.queued = false; return q; },
    releaseAll: () => {
      c.keyLeft = c.keyRight = c.padLeft = c.padRight = c.down = c.keyJump = c.padJump = c.queued = false;
      for (const b of [w.pad.left, w.pad.right, w.pad.jump]) b.classList.remove("pressed");
    },
  } as Controls;
}
