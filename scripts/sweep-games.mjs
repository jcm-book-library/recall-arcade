// Opens every game card on the home page at phone width, starts the game, and reports
// page errors and sideways scrolling. The quickest "did I break anything?" check.
//
// Usage:   npm run build && npx vite preview --port 4173 &
//          node scripts/sweep-games.mjs [http://localhost:4173/] [path to playwright/index.mjs] [path to chromium]
// Needs Playwright and a Chromium. On the cloud machine they are at the defaults below.
// Wikipedia and the historical maps are faked, so the check works offline.
const base = process.argv[2] ?? "http://localhost:4173/";
const pw = process.argv[3] ?? "/opt/node22/lib/node_modules/playwright/index.mjs";
const chromePath = process.argv[4] ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const { chromium } = await import(pw);

const browser = await chromium.launch({ executablePath: chromePath });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
await page.route("https://en.wikipedia.org/w/api.php*", (r) => r.fulfill({ json: { query: { pages: [] } } }));
await page.route("https://raw.githubusercontent.com/**", (r) => r.fulfill({ json: { type: "FeatureCollection", features: [] } }));

// The home page is the island now; the game cards live on the list page.
await page.goto(`${base}#list`);
await page.waitForTimeout(500);
const ids = await page.$$eval(".card", (cards) => cards.map((c) => c.getAttribute("href").slice(1)).filter((id) => id && !["pong", "labyrinth", "flyover", "brawl", "hero", "island", "list"].includes(id)));
for (const id of ids) {
  await page.goto(base);
  await page.goto(`${base}#${id}`);
  await page.waitForTimeout(900);
  const start = await page.$("text=Start ▸");
  // Some start buttons nudge for a moment, so force the click if it never settles.
  if (start) await start.click({ timeout: 3000 }).catch(() => start.click({ force: true }));
  await page.waitForTimeout(400);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  if (width > 392) problems.push(`${id}: sideways scroll (${width}px)`);
  const giveUp = await page.$("text=Give up");
  if (giveUp && (await giveUp.isVisible())) await giveUp.click({ force: true, timeout: 3000 }).catch(() => {});
}
for (const id of ["pong", "labyrinth", "flyover", "brawl", "hero", "island", "list"]) {
  await page.goto(`${base}#${id}`);
  await page.waitForTimeout(500);
  // The Brawl waits on a start card: press Space and run for a moment, so a mistake in play would show up as an error.
  if (id === "brawl") {
    await page.keyboard.press("Space");
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(1200);
    await page.keyboard.up("ArrowRight");
  }
  if ((await page.evaluate(() => document.documentElement.scrollWidth)) > 392) problems.push(`${id}: sideways scroll`);
}
console.log(`${ids.length} game cards + arcade pages checked.`, problems.length ? problems : "No problems.");
await browser.close();
process.exit(problems.length ? 1 : 0);
