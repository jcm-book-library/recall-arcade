import { h } from "../ui/dom";
import { HERO_PALETTE, HERO_PARTS, loadSavedHero, makeHeroSheet, saveHero } from "./hero-art";

// THE HERO WORKSHOP (#hero): a page that helps you draw your own pixel hero without starting from
// a blank page. Download the starter hero, recolour it in Piskel, then try it here: it walks in
// all four directions, and one click puts it into The Labyrinth on this device.
//
// The sheet is 2 columns (walking step 1 and 2) by 4 rows (facing down, left, right, up), and each
// box is 16 x 16 pixels, so the whole picture is 32 x 64.

const FRAME = 16;
const ROWS = ["Facing down", "Facing left", "Facing right", "Facing up"];

/** Copy a small picture onto a bigger canvas with crisp square pixels (no blurring). */
function crisp(c: HTMLCanvasElement) {
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  return g;
}

/** The sheet drawn big, with a grid and a label for every box. */
function labelledSheet(sheet: CanvasImageSource) {
  const S = 7; // each game pixel becomes 7 x 7 screen pixels
  const box = FRAME * S;
  const left = 104;
  const top = 26;
  const c = h("canvas", { class: "hw-sheet", width: String(left + box * 2 + 2), height: String(top + box * 4 + 2), role: "img", "aria-label": "The hero sheet: 2 columns for the two walking steps, 4 rows for facing down, left, right and up" }) as HTMLCanvasElement;
  const g = crisp(c);
  // A checkerboard behind, the usual way to show "see-through".
  for (let y = 0; y < box * 4; y += 8) for (let x = 0; x < box * 2; x += 8) {
    g.fillStyle = (x + y) % 16 ? "#e6e9ee" : "#f7f8fa";
    g.fillRect(left + x, top + y, 8, 8);
  }
  g.drawImage(sheet, 0, 0, FRAME * 2, FRAME * 4, left, top, box * 2, box * 4);
  g.strokeStyle = "#f0a31a";
  g.lineWidth = 2;
  for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(left + i * box + 1, top); g.lineTo(left + i * box + 1, top + box * 4 + 2); g.stroke(); }
  for (let j = 0; j <= 4; j++) { g.beginPath(); g.moveTo(left, top + j * box + 1); g.lineTo(left + box * 2 + 2, top + j * box + 1); g.stroke(); }
  g.fillStyle = "#586874";
  g.font = "13px system-ui, sans-serif";
  g.textBaseline = "middle";
  g.textAlign = "center";
  g.fillText("Step 1", left + box / 2, 12);
  g.fillText("Step 2", left + box * 1.5, 12);
  g.textAlign = "right";
  ROWS.forEach((r, j) => g.fillText(r, left - 8, top + j * box + box / 2));
  return c;
}

/**
 * A little animation: the hero walking in all four directions, swapping between step 1 and
 * step 2 four times a second. `getSheet` is asked every frame, so it can change (your upload).
 */
function walker(getSheet: () => { img: CanvasImageSource; w: number; hgt: number }, scale = 5) {
  const size = FRAME * scale;
  const gap = 14;
  const c = h("canvas", { class: "hw-walk", width: String(size * 4 + gap * 3), height: String(size + 20), role: "img", "aria-label": "The hero walking down, left, right and up" }) as HTMLCanvasElement;
  const g = crisp(c);
  let raf = 0;
  const draw = (t: number) => {
    const { img, w, hgt } = getSheet();
    const fw = w / 2;
    const fh = hgt / 4;
    const step = Math.floor(t / 250) % 2;
    g.clearRect(0, 0, c.width, c.height);
    for (let d = 0; d < 4; d++) {
      const x = d * (size + gap);
      g.fillStyle = "#c9b48a"; // a patch of gravel path to stand on
      g.fillRect(x, size - 6, size, 10);
      g.drawImage(img, step * fw, d * fh, fw, fh, x, 0, size, size);
      g.fillStyle = "#586874";
      g.font = "12px system-ui, sans-serif";
      g.textAlign = "center";
      g.fillText(["Down", "Left", "Right", "Up"][d], x + size / 2, size + 14);
    }
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  return { canvas: c, stop: () => cancelAnimationFrame(raf) };
}

/** One hero, facing you, drawn big: used for the colour ideas. */
function portrait(sheet: HTMLCanvasElement, scale = 5) {
  const c = h("canvas", { width: String(FRAME * scale), height: String(FRAME * scale) }) as HTMLCanvasElement;
  crisp(c).drawImage(sheet, 0, 0, FRAME, FRAME, 0, 0, FRAME * scale, FRAME * scale);
  return c;
}

// Some colour ideas, made by swapping the starter's colours. Only the letters listed change.
const IDEAS: { name: string; swap: Record<string, string> }[] = [
  { name: "Red shirt, blond hair", swap: { t: "#d94a3a", h: "#e8c25a", l: "#2b3a5a" } },
  { name: "Explorer", swap: { t: "#c9a46a", b: "#5a3417", l: "#7a6040", h: "#3a2414" } },
  { name: "Space cadet", swap: { t: "#e8ecf2", b: "#3f7fe0", l: "#c4cbd6", k: "#3f7fe0", h: "#20242c" } },
  { name: "Night ninja", swap: { t: "#2a2d36", b: "#d94a3a", l: "#2a2d36", k: "#15171c", h: "#15171c" } },
];

export function renderHeroWorkshop(root: HTMLElement): () => void {
  const starter = makeHeroSheet();
  let mine: { img: HTMLImageElement; w: number; hgt: number; url: string } | null = null;

  // ---------- try your own ----------
  const status = h("p", { class: "hw-status", "aria-live": "polite" });
  const saved = loadSavedHero();
  const useBtn = h("button", { type: "button", class: "btn primary", disabled: true }, "Use this hero in The Labyrinth");
  const resetBtn = h("button", { type: "button", class: "btn ghost" }, "Go back to the built-in hero");
  resetBtn.hidden = !saved;
  const yours = walker(() => (mine ? { img: mine.img, w: mine.w, hgt: mine.hgt } : { img: starter, w: FRAME * 2, hgt: FRAME * 4 }));
  const fileInput = h("input", { type: "file", accept: "image/png", id: "hw-file", class: "hw-file" }) as HTMLInputElement;

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const hgt = img.naturalHeight;
        mine = { img, w, hgt, url };
        const tips: string[] = [];
        if (hgt !== w * 2) tips.push(`It's ${w} x ${hgt}. A hero sheet is twice as tall as it is wide (32 x 64), so the boxes may be cut in the wrong places.`);
        else if (w % 32) tips.push(`It's ${w} x ${hgt}. That works, but 32 x 64 (or 64 x 128) keeps the pixels crisp.`);
        // Is the background see-through? Look at the top-left corner pixel.
        const probe = document.createElement("canvas");
        probe.width = probe.height = 1;
        const pg = probe.getContext("2d", { willReadFrequently: true })!;
        pg.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
        if (pg.getImageData(0, 0, 1, 1).data[3] > 0) tips.push("The corner isn't see-through, so your hero will walk around inside a coloured box. In Piskel, erase the background.");
        status.textContent = tips.length ? tips.join(" ") : `Looks great: ${w} x ${hgt}, with a see-through background. Watch it walk above.`;
        status.dataset.kind = tips.length ? "warn" : "ok";
        useBtn.disabled = false;
      };
      img.onerror = () => {
        status.textContent = "That file couldn't be opened as a picture. Export it from Piskel as a PNG.";
        status.dataset.kind = "warn";
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  });

  useBtn.addEventListener("click", () => {
    if (!mine) return;
    if (saveHero(mine.url)) {
      status.textContent = "Done! Open The Labyrinth on this device and your hero walks out. (To show it to everyone, see the last step.)";
      status.dataset.kind = "ok";
      resetBtn.hidden = false;
    } else {
      status.textContent = "This browser wouldn't save it (a private window, perhaps). The last step puts it in the game for everyone.";
      status.dataset.kind = "warn";
    }
  });
  resetBtn.addEventListener("click", () => {
    saveHero(null);
    resetBtn.hidden = true;
    status.textContent = "The Labyrinth is back to the built-in hero on this device.";
    status.dataset.kind = "ok";
  });

  // ---------- download the starter ----------
  const download = h("button", { type: "button", class: "btn primary" }, "Download the starter hero");
  download.addEventListener("click", () => {
    starter.toBlob((blob) => {
      if (!blob) return;
      const a = h("a", { href: URL.createObjectURL(blob), download: "hero-starter.png" }) as HTMLAnchorElement;
      document.body.append(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }, "image/png");
  });

  const swatches = h(
    "ul",
    { class: "hw-swatches", "aria-label": "The starter hero's colours" },
    ...HERO_PARTS.map(({ letter, part }) =>
      h("li", {}, h("span", { class: "hw-swatch", style: `background:${HERO_PALETTE[letter]}` }), part),
    ),
  );

  const ideas = h(
    "div",
    { class: "hw-ideas" },
    ...IDEAS.map((idea) => h("figure", {}, portrait(makeHeroSheet({ ...HERO_PALETTE, ...idea.swap })), h("figcaption", {}, idea.name))),
  );

  const step = (n: number, title: string, ...body: (Node | string | null)[]) =>
    h("li", { class: "hw-step" }, h("h3", {}, h("span", { class: "hw-num" }, String(n)), title), ...body);

  root.replaceChildren(
    h(
      "main",
      { class: "play hero-workshop" },
      h("div", { class: "play-top" }, h("a", { class: "back", href: "#" }, "◂ Arcade"), h("h1", { class: "play-title" }, "Hero Workshop")),
      h("p", { class: "lede" }, "Make your own hero for the arcade. You don't start from a blank page: download the starter hero, change its colours, then make it yours. Then try it out right here."),

      h("section", { class: "hw-top" },
        h("div", {}, labelledSheet(starter)),
        h("div", { class: "hw-top-side" },
          h("h2", {}, "The starter hero"),
          h("p", {}, "One picture, 32 pixels wide and 64 tall, cut into eight boxes. Each row is a direction. Step 1 and step 2 only differ in the feet: swapping between them is what makes the hero walk."),
          download,
          h("h3", {}, "Its colours"),
          swatches,
        ),
      ),

      h("ol", { class: "hw-steps" },
        step(1, "Open Piskel",
          h("p", {}, "Go to ", h("a", { href: "https://www.piskelapp.com", target: "_blank", rel: "noopener" }, "piskelapp.com"), " (free, in the browser) and click ", h("strong", {}, "Create Sprite"), "."),
        ),
        step(2, "Bring in the starter hero",
          h("p", {}, "In the menu on the right, click ", h("strong", {}, "Import"), ", then pick ", h("em", {}, "hero-starter.png"), ". If it asks how to import, choose to bring it in as a ", h("strong", {}, "single image"), " (not a spritesheet), so you get one picture of all eight boxes."),
          h("p", { class: "muted" }, "Check: the canvas should now be 32 x 64. Zoom in with the mouse wheel until it fills the screen."),
        ),
        step(3, "Recolour it",
          h("p", {}, "Pick a new colour, then use the paint bucket tool that says ", h("strong", {}, "Paint all pixels of the same color"), ". One click on the shirt changes the shirt in all eight boxes at once. Do the same for the hair, trousers and shoes."),
          h("p", {}, "Some ideas, made just by swapping colours:"),
          ideas,
        ),
        step(4, "Make it yours",
          h("p", {}, "Now change the shapes with the pen: a hat, a ponytail, a cape, a backpack. Do the same change in every box that shows it (a hat appears in all eight). Keep the feet as they are, and leave the background empty: empty means see-through."),
        ),
        step(5, "Save it as a picture",
          h("p", {}, "Click ", h("strong", {}, "Export"), " (the arrow on the right), choose the ", h("strong", {}, "PNG"), " tab, then ", h("strong", {}, "Download"), ". Rename the file to ", h("strong", {}, "hero.png"), "."),
        ),
        step(6, "Try it here",
          h("p", {}, "Choose your hero.png. It walks below, and the page tells you if anything needs fixing."),
          h("label", { class: "btn ghost hw-pick", for: "hw-file" }, "Choose your hero.png"),
          fileInput,
          yours.canvas,
          status,
          h("div", { class: "hw-actions" }, useBtn, resetBtn),
        ),
        step(7, "Put it in the game for everyone",
          h("p", {}, "On GitHub, open the project's ", h("strong", {}, "public/arcade"), " folder, click ", h("strong", {}, "Add file"), " then ", h("strong", {}, "Upload files"), ", and drop in hero.png. At the bottom, choose ", h("strong", {}, "Create a new branch and start a pull request"), " (never straight into main), then merge it like the others. A few minutes later your hero is in the live game."),
        ),
      ),
    ),
  );

  return () => yours.stop();
}
