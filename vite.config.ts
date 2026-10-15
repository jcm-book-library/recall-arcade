import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Builds everything (code, styles, map data) into one index.html,
// so the game can be hosted anywhere as a single file.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
});
