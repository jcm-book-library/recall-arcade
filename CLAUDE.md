# Recall Arcade: notes for Claude

**Read the house rules first:** [HOUSE-RULES.md](https://github.com/jcm-book-library/control-room/blob/main/HOUSE-RULES.md) in `control-room` (plain text: https://raw.githubusercontent.com/jcm-book-library/control-room/main/HOUSE-RULES.md). They cover Google Sheet safety, branches and pull requests into `main`, using cheaper models to save usage credits, and the build template. The notes below are this repo's own; where they are more specific, they win. The project charter is `project.json`.

## This repo
- Vite and TypeScript project: `npm install`, `npm run dev` for a live copy, `npm run build` makes the site in `dist/`.
- GitHub Action `.github/workflows/deploy.yml` builds the game and publishes it to GitHub Pages on every push to `main`.
- Games are decks in `src/decks/`, drawn by boards in `src/boards/`; shared parts are in `src/engine/`.
- Progress is saved in the browser; there is no sheet.
- Plans and ideas live in `docs/`.
