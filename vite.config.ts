import { defineConfig, type Plugin } from "vite";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * Offline play. After the site is built, this writes `sw.js` (a service worker) into the build
 * folder. The service worker keeps a copy of every file of the site on the device, so once the
 * site has been opened online it also opens with no connection (on a plane, say).
 *
 * The file list and a version made from the files' contents are written into sw.js, so each new
 * build is a new version: the browser notices sw.js changed, saves the new files, then swaps over.
 * The service worker itself is in `src/offline-sw.js`; the page side is `src/offline.ts`.
 */
function offline(): Plugin {
  let outDir = "dist";
  let root = ".";
  return {
    name: "recall-offline",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) walk(full);
          else files.push(relative(outDir, full).split("\\").join("/"));
        }
      };
      walk(outDir);
      // Notes for people (README.md) aren't part of the site; sw.js is the worker itself.
      const keep = files.filter((f) => f !== "sw.js" && !f.endsWith(".md")).sort();
      const hash = createHash("sha256");
      for (const f of keep) hash.update(f).update(readFileSync(join(outDir, f)));
      const version = hash.digest("hex").slice(0, 12);
      const template = readFileSync(resolve(root, "src/offline-sw.js"), "utf8");
      // "./" is the page itself (index.html), which is what a visit to the site's address asks for.
      const list = ["./", ...keep.filter((f) => f !== "index.html")];
      const sw = template
        .replace('"__VERSION__"', JSON.stringify(version))
        .replace("[] /* __FILES__ */", JSON.stringify(list));
      writeFileSync(join(outDir, "sw.js"), sw);
    },
  };
}

export default defineConfig({
  // Relative paths so the site works from any folder, e.g. /recall-arcade/ on GitHub Pages.
  base: "./",
  plugins: [offline()],
});
