import { h } from "../ui/dom";
import {
  SIDE_FRAME, SIDE_FRAMES, SIDE_POSES, drawnFrames, loadSavedSideHero, makeSideHeroSheet, makeSideTemplate,
  resolveFrames, saveSideHero, sideSheetSize,
} from "./hero-side-art";

// THE SIDE-ON PART OF THE HERO WORKSHOP: the same steps as the top-down hero, for the platformer's
// hero. Download the starter (or a blank template), recolour it in Piskel, then try it here: it runs,
// jumps and lands in a little preview, and one click puts it into the game on this device.
//
// The picture is one row of 10 frames, all facing right. See docs/arcade-art.md, "The side-on hero".

/** A hero picture ready to show: the image, the size of one frame, and which frame each pose uses. */
interface Shown {
  image: CanvasImageSource;
  fw: number;
  fh: number;
  map: number[];
  label: string;
}

function crisp(c: HTMLCanvasElement) {
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  return g;
}

/** The sheet drawn big: every frame boxed, with its number, pose name and a note. */
function labelledSheet(hero: Shown) {
  const sc = Math.max(1, Math.min(4, Math.floor(160 / hero.fh)));
  const bw = hero.fw * sc;
  const bh = hero.fh * sc;
  const top = 58;
  const pad = 8;
  const c = h("canvas", {
    class: "hws-sheet", width: String(pad * 2 + bw * SIDE_FRAMES + 1), height: String(top + bh + 12),
    role: "img", "aria-label": `The side-on hero sheet: ${SIDE_FRAMES} boxes in a row, ${SIDE_POSES.map((p, i) => `${i + 1} ${p.name} (${p.note})`).join(", ")}`,
  }) as HTMLCanvasElement;
  const g = crisp(c);
  g.fillStyle = "#fbfcfc";
  g.fillRect(0, 0, c.width, c.height);
  // a checkerboard behind, the usual way to show "see-through"
  for (let y = 0; y < bh; y += 8) for (let x = 0; x < bw * SIDE_FRAMES; x += 8) {
    g.fillStyle = (x + y) % 16 ? "#e6e9ee" : "#f7f8fa";
    g.fillRect(pad + x, top + y, Math.min(8, bw * SIDE_FRAMES - x), Math.min(8, bh - y));
  }
  g.drawImage(hero.image, 0, 0, hero.fw * SIDE_FRAMES, hero.fh, pad, top, bw * SIDE_FRAMES, bh);
  // the ground line: feet sit on the bottom row of every box
  g.fillStyle = "#e0527a";
  for (let f = 0; f < SIDE_FRAMES; f++) for (let x = 0; x < bw; x += 8) g.fillRect(pad + f * bw + x, top + bh - 2, 4, 2);
  g.strokeStyle = "#f0a31a";
  g.lineWidth = 2;
  for (let f = 0; f <= SIDE_FRAMES; f++) { g.beginPath(); g.moveTo(pad + f * bw + 1, top - 4); g.lineTo(pad + f * bw + 1, top + bh + 1); g.stroke(); }
  for (const y of [top, top + bh + 1]) { g.beginPath(); g.moveTo(pad, y); g.lineTo(pad + bw * SIDE_FRAMES + 2, y); g.stroke(); }
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  SIDE_POSES.forEach((p, f) => {
    const cx = pad + f * bw + bw / 2;
    g.fillStyle = "#1f2a33";
    g.font = "bold 16px system-ui, sans-serif";
    g.fillText(`${f + 1}  ${p.name}`, cx, 22);
    g.fillStyle = "#586874";
    g.font = "12px system-ui, sans-serif";
    g.fillText(p.note, cx, 40, bw - 10);
  });
  return c;
}

/**
 * The live preview: the hero runs along a strip of ground, jumps in the middle, lands, runs to the
 * end, pauses, then runs back (flipped like a mirror). Or it shows one pose, standing still.
 */
function previewer(getHero: () => Shown) {
  const canvas = h("canvas", {
    class: "hws-preview", width: "192", height: "80", role: "img",
    "aria-label": "The side-on hero running along the ground, jumping and landing",
  }) as HTMLCanvasElement;
  const g = crisp(canvas);
  canvas.style.width = "min(100%, 768px)";
  let still: number | null = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : null;
  const s = { x: 24, dir: 1, lift: 0, vy: 0, mode: "run" as "run" | "air" | "land" | "idle", t: 0, jumped: false, clock: 0 };
  let last = 0;
  let raf = 0;
  const buttons: HTMLButtonElement[] = [];
  const playBtn = h("button", { type: "button", class: "btn ghost hws-pose", "aria-pressed": "true" }, "▶ Play") as HTMLButtonElement;

  const showStill = (n: number | null) => {
    still = n;
    playBtn.setAttribute("aria-pressed", String(n === null));
    buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === n)));
  };
  playBtn.addEventListener("click", () => showStill(null));
  SIDE_POSES.forEach((p, i) => {
    const b = h("button", { type: "button", class: "btn ghost hws-pose", "aria-pressed": "false", "aria-label": `Show pose ${i + 1}, ${p.name}, ${p.note}` }, `${i + 1} ${p.name}`) as HTMLButtonElement;
    b.addEventListener("click", () => showStill(i));
    buttons.push(b);
  });
  showStill(still);

  const frame = (hero: Shown, pose: number, x: number, lift: number, flip: boolean, groundY: number) => {
    const f = hero.map[pose] ?? pose;
    const dx = Math.round(x - hero.fw / 2);
    const dy = Math.round(groundY - hero.fh - lift);
    // a soft shadow on the ground, smaller the higher the hero is
    g.fillStyle = "rgba(0,0,0,0.22)";
    const sw = (hero.fw * 0.4) * Math.max(0.4, 1 - lift / (hero.fh * 2));
    g.fillRect(Math.round(x - sw / 2), groundY, Math.round(sw), 2);
    g.save();
    if (flip) {
      g.translate(dx + hero.fw, dy);
      g.scale(-1, 1);
      g.drawImage(hero.image, f * hero.fw, 0, hero.fw, hero.fh, 0, 0, hero.fw, hero.fh);
    } else {
      g.drawImage(hero.image, f * hero.fw, 0, hero.fw, hero.fh, dx, dy, hero.fw, hero.fh);
    }
    g.restore();
  };

  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const hero = getHero();
    const W = Math.max(192, hero.fw * 6);
    const H = hero.fh + 48;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
      crisp(canvas);
      canvas.style.width = `min(100%, ${W * 4}px)`;
    }
    const kx = hero.fw / SIDE_FRAME;
    const ky = hero.fh / SIDE_FRAME;
    const groundY = H - 12;

    // move the hero (only when playing)
    let pose = still ?? 0;
    if (still === null) {
      s.clock += dt;
      if (s.mode === "run") {
        s.x += s.dir * 60 * kx * dt;
        pose = 2 + (Math.floor(s.clock * 10) % 4);
        if (!s.jumped && (s.dir > 0 ? s.x > W * 0.5 : s.x < W * 0.5)) {
          s.mode = "air";
          s.vy = -210 * ky;
          s.jumped = true;
        } else if (s.dir > 0 ? s.x > W - 24 * kx - 8 : s.x < 24 * kx + 8) {
          s.mode = "idle";
          s.t = 0;
        }
      } else if (s.mode === "air") {
        s.x += s.dir * 60 * kx * dt;
        s.vy += 700 * ky * dt;
        s.lift -= s.vy * dt;
        pose = s.vy < 0 ? 6 : 7;
        if (s.lift <= 0) { s.lift = 0; s.mode = "land"; s.t = 0; }
      } else if (s.mode === "land") {
        s.t += dt;
        s.x += s.dir * 18 * kx * dt;
        pose = 8;
        if (s.t > 0.16) s.mode = "run";
      } else {
        s.t += dt;
        pose = Math.floor(s.clock * 2) % 2;
        if (s.t > 1.2) { s.dir = -s.dir; s.jumped = false; s.mode = "run"; }
      }
    }

    // the scene: sky, then ground
    g.fillStyle = "#bfe3f5";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#d8eef9";
    for (const [cx, cy] of [[0.18, 0.2], [0.62, 0.12], [0.88, 0.3]]) { g.fillRect(Math.round(W * cx), Math.round(H * cy), 22, 4); g.fillRect(Math.round(W * cx) + 5, Math.round(H * cy) - 3, 12, 3); }
    g.fillStyle = "#a97c50";
    g.fillRect(0, groundY, W, H - groundY);
    g.fillStyle = "#8d6540";
    for (let x = 3; x < W; x += 13) g.fillRect(x, groundY + 4 + ((x * 7) % 5), 3, 2);
    g.fillStyle = "#6dbf6a";
    g.fillRect(0, groundY, W, 3);
    g.fillStyle = "#4b9a4d";
    g.fillRect(0, groundY + 3, W, 1);

    if (still === null) frame(hero, pose, s.x, s.lift, s.dir < 0, groundY);
    else frame(hero, pose, W / 2, still === 6 || still === 7 ? 10 * ky : 0, false, groundY);

    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    canvas,
    buttons: h("div", { class: "hws-poses", role: "group", "aria-label": "Show one pose, standing still" }, playBtn, ...buttons),
    stop: () => cancelAnimationFrame(raf),
  };
}

function download(canvas: HTMLCanvasElement, name: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = h("a", { href: URL.createObjectURL(blob), download: name }) as HTMLAnchorElement;
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }, "image/png");
}

function readImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Turn a loaded picture into something to show, or say what's wrong with it in plain words. */
function inspect(img: HTMLImageElement): { shown: Shown | null; kind: "ok" | "warn"; text: string } {
  const w = img.naturalWidth;
  const hgt = img.naturalHeight;
  const size = sideSheetSize(w, hgt);
  if (!size) {
    const why = w % SIDE_FRAMES
      ? `The width has to divide evenly by 10, because there are 10 frames side by side.`
      : `Each frame would be tiny (${w / SIDE_FRAMES} pixels wide).`;
    return { shown: null, kind: "warn", text: `Your picture is ${w} x ${hgt}. ${why} Try 320 x 32, or 320 x 48 for a taller hero.` };
  }
  const { frameW, frameH } = size;
  if (frameW < 16 || frameH < 16 || frameW > 256 || frameH > 256) {
    return { shown: null, kind: "warn", text: `Your picture is ${w} x ${hgt}, so each frame is ${frameW} x ${frameH}. That's an odd size. Try 32 x 32 frames (320 x 32), or 32 x 48 (320 x 48).` };
  }
  const drawn = drawnFrames(img, frameW, frameH);
  const map = resolveFrames(drawn);
  const tips: string[] = [];
  const fine: string[] = []; // notes that aren't problems, so the message stays green
  if (frameH > frameW * 2.5 || frameH < frameW * 0.75) tips.push(`Each frame is ${frameW} x ${frameH}, which is a very ${frameH > frameW ? "tall" : "wide"} box. Is that what you meant?`);
  const empty = drawn.map((ok, i) => (ok ? 0 : i + 1)).filter(Boolean);
  if (empty.length === SIDE_FRAMES) {
    tips.push("Every frame is empty (see-through), so there's nothing to show yet.");
  } else if (empty.length) {
    fine.push(`Frame${empty.length > 1 ? "s" : ""} ${empty.join(", ")} ${empty.length > 1 ? "are" : "is"} empty, so the game borrows the nearest pose you did draw. That's fine while you work.`);
    if (!drawn.slice(2, 6).some(Boolean) || !drawn[6]) fine.push("To get going, draw at least a run (frames 3 to 6) and a jump (frame 7).");
  }
  // is the background see-through? look at the top-left pixel of the sheet
  try {
    const probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    const pg = probe.getContext("2d", { willReadFrequently: true })!;
    pg.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
    if (pg.getImageData(0, 0, 1, 1).data[3] > 0) tips.push("The corner isn't see-through, so the hero may run around inside a coloured box. If you used the blank template, rub out its guide lines. In Piskel, erase the background.");
  } catch { /* can't read pixels: say nothing */ }
  const shown: Shown = { image: img, fw: frameW, fh: frameH, map, label: "your picture" };
  return {
    shown,
    kind: tips.length ? "warn" : "ok",
    text: tips.length || fine.length ? `${w} x ${hgt}, ${SIDE_FRAMES} frames of ${frameW} x ${frameH}. ${[...tips, ...fine].join(" ")}` : `Looks great: ${SIDE_FRAMES} frames of ${frameW} x ${frameH}, with a see-through background. Watch it above.`,
  };
}

export function renderSideSection(): { el: HTMLElement; stop: () => void } {
  const starterSheet = makeSideHeroSheet();
  const starter: Shown = { image: starterSheet, fw: SIDE_FRAME, fh: SIDE_FRAME, map: Array.from({ length: SIDE_FRAMES }, (_, i) => i), label: "the starter hero" };
  let current: Shown = starter;
  let tried: { shown: Shown; url: string } | null = null;

  const showing = h("p", { class: "hws-showing", "aria-live": "polite" });
  const setShowing = (s: Shown) => {
    current = s;
    showing.textContent = `Showing: ${s.label}.`;
  };
  setShowing(starter);

  const preview = previewer(() => current);

  // ---------- try your own ----------
  const status = h("p", { class: "hw-status", "aria-live": "polite" });
  const yourSheet = h("div", { class: "hws-scroll", tabindex: "0", role: "region", "aria-label": "Your sheet, scrolls sideways" });
  yourSheet.hidden = true;
  const useBtn = h("button", { type: "button", class: "btn primary", disabled: true }, "Use this hero on this device") as HTMLButtonElement;
  const resetBtn = h("button", { type: "button", class: "btn ghost" }, "Go back to the starter hero") as HTMLButtonElement;
  resetBtn.hidden = true;
  const fileInput = h("input", { type: "file", accept: "image/png", class: "hw-file", id: "hws-file" }) as HTMLInputElement;

  const openUrl = async (url: string, fromDevice: boolean) => {
    const img = await readImage(url);
    if (!img) {
      status.textContent = "That file couldn't be opened as a picture. Export it from Piskel as a PNG.";
      status.dataset.kind = "warn";
      return;
    }
    const result = inspect(img);
    status.textContent = result.text;
    status.dataset.kind = result.kind;
    if (!result.shown) { useBtn.disabled = true; return; }
    result.shown.label = fromDevice ? "the hero saved on this device" : "your picture (not saved yet)";
    tried = { shown: result.shown, url };
    setShowing(result.shown);
    yourSheet.replaceChildren(labelledSheet(result.shown));
    yourSheet.hidden = false;
    useBtn.disabled = fromDevice;
  };

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => openUrl(String(reader.result), false);
    reader.onerror = () => {
      status.textContent = "That file couldn't be read. Try choosing it again.";
      status.dataset.kind = "warn";
    };
    reader.readAsDataURL(file);
  });

  useBtn.addEventListener("click", () => {
    if (!tried) return;
    if (saveSideHero(tried.url)) {
      status.textContent = "Done! The platformer will use this hero on this device. (To show it to everyone, see the last step.)";
      status.dataset.kind = "ok";
      resetBtn.hidden = false;
      tried.shown.label = "the hero saved on this device";
      setShowing(tried.shown);
      useBtn.disabled = true;
    } else {
      status.textContent = "This browser wouldn't save it (a private window, perhaps). The last step puts it in the game for everyone.";
      status.dataset.kind = "warn";
    }
  });
  resetBtn.addEventListener("click", () => {
    saveSideHero(null);
    resetBtn.hidden = true;
    tried = null;
    yourSheet.hidden = true;
    useBtn.disabled = true;
    fileInput.value = "";
    setShowing(starter);
    status.textContent = "The platformer is back to the starter hero on this device.";
    status.dataset.kind = "ok";
  });

  // a hero saved earlier on this device shows up straight away
  const savedEarlier = loadSavedSideHero();
  if (savedEarlier) {
    resetBtn.hidden = false;
    openUrl(savedEarlier, true);
  }

  // ---------- downloads ----------
  const dlStarter = h("button", { type: "button", class: "btn primary" }, "Download the starter hero (320 x 32)");
  dlStarter.addEventListener("click", () => download(makeSideHeroSheet(), "hero-side-starter.png"));
  const dlTemplate = h("button", { type: "button", class: "btn ghost" }, "Download a blank template (320 x 32)");
  dlTemplate.addEventListener("click", () => download(makeSideTemplate(), "hero-side-template.png"));

  const step = (n: number, title: string, ...body: (Node | string | null)[]) =>
    h("li", { class: "hw-step" }, h("h3", {}, h("span", { class: "hw-num" }, String(n)), title), ...body);
  const b = (t: string) => h("strong", {}, t);

  const el = h(
    "section",
    { class: "hws", "aria-labelledby": "hws-title" },
    h("h2", { id: "hws-title", class: "hws-title" }, "Side-on hero (for the platformer)"),
    h("p", {}, "The next arcade game is a platformer, so the hero needs drawing from the side. It's one picture with 10 boxes in a row. The hero always faces right: the game flips it for left. Same steps as above: start from the starter, don't start from nothing."),
    h("div", { class: "hws-scroll", tabindex: "0", role: "region", "aria-label": "The starter sheet, scrolls sideways" }, labelledSheet(starter)),
    h("p", { class: "muted hws-note" }, "Feet go on the bottom row of every box (the pink dashes), with the hero roughly in the middle. Empty means see-through. The picture is 320 x 32: ten boxes of 32 x 32. For a taller hero make it 320 x 48 (boxes of 32 x 48), or twice the size, 640 x 64."),
    h("div", { class: "hw-actions" }, dlStarter, dlTemplate),
    h("p", { class: "muted hws-note" }, "The blank template has faint guide lines (a blue box edge, a pink ground line, a dotted middle and the frame number). They are only there to help: rub them out with the eraser before you export."),

    h("h3", { class: "hws-sub" }, "Watch it move"),
    preview.canvas,
    showing,
    preview.buttons,
    h("p", { class: "muted hws-note" }, "Play runs it along the ground, jumps in the middle and runs back flipped. Or tap a pose to see it standing still. Jump and fall float a little so you can see them."),

    h("ol", { class: "hw-steps" },
      step(1, "Open Piskel",
        h("p", {}, "Go to ", h("a", { href: "https://www.piskelapp.com", target: "_blank", rel: "noopener" }, "piskelapp.com"), " (free, in the browser) and click ", b("Create Sprite"), "."),
      ),
      step(2, "Set the size",
        h("p", {}, "Click the ", b("Resize"), " tool. Type ", b("320"), " wide and ", b("32"), " tall (or 320 x 48 for a taller hero), then confirm. Draw on ONE Piskel frame only: the ten hero frames are boxes inside the one picture."),
      ),
      step(3, "Bring in the starter",
        h("p", {}, "Click ", b("Import"), " and pick ", h("em", {}, "hero-side-starter.png"), ". If it asks, bring it in as a ", b("single image"), ", not as frames. Zoom in with the mouse wheel."),
      ),
      step(4, "Recolour it, then make it yours",
        h("p", {}, "Pick a new colour and use the paint bucket tool called ", b("Paint all pixels of the same color"), ". One click on the shirt changes it in all ten boxes. Then change shapes with the pen (a hat, a cape, a ponytail), and do the same change in every box that shows it. Keep the feet on the bottom row."),
        h("p", { class: "muted" }, "In a hurry? Draw only the run (boxes 3 to 6) and the jump (box 7). Boxes you leave empty borrow the nearest pose, so a half-finished sheet still plays."),
      ),
      step(5, "Save it as a picture",
        h("p", {}, "Click ", b("Export"), ", choose the ", b("PNG"), " tab, then ", b("Download"), ". Rename the file to exactly ", b("hero-side.png"), "."),
      ),
      step(6, "Try it here",
        h("p", {}, "Choose your hero-side.png. It runs in the preview above, and this page tells you if anything needs fixing."),
        h("label", { class: "btn ghost hw-pick", for: "hws-file" }, "Choose your hero-side.png", fileInput),
        status,
        yourSheet,
        h("div", { class: "hw-actions" }, useBtn, resetBtn),
      ),
      step(7, "Put it in the game for everyone",
        h("p", {}, "On GitHub, open the project's ", b("public/arcade"), " folder, click ", b("Add file"), " then ", b("Upload files"), ", and drop in hero-side.png. At the bottom, choose ", b("Create a new branch and start a pull request"), " (never straight into main), then merge it like the others."),
      ),
    ),
  );

  return { el, stop: preview.stop };
}
