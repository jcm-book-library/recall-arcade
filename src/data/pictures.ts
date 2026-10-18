// Photos for the picture quizzes, fetched from Wikipedia in the player's browser.
// For each item we use the main image of its Wikipedia article, but only if that image
// is freely licensed, and we show the photographer and licence alongside it.
import TITLES from "./picture-titles.json";

export interface Picture {
  src: string;
  artist: string;
  license: string;
  /** The image's page on Wikimedia, for the credit link. */
  page: string;
}

const API = "https://en.wikipedia.org/w/api.php";
const strip = (html: string | undefined) => (html ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function query(params: Record<string, string>) {
  const url = `${API}?${new URLSearchParams({ action: "query", format: "json", formatversion: "2", origin: "*", ...params })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikipedia returned ${res.status}`);
  return res.json();
}

const cache = new Map<string, Promise<Map<string, Picture>>>();

/** Look up the pictures for one quiz ("animals", "dogs" or "landmarks"). */
export function loadPictures(set: keyof typeof TITLES): Promise<Map<string, Picture>> {
  if (!cache.has(set)) {
    // Forget a failed attempt so the next round can try again.
    cache.set(set, fetchSet(set).catch((e) => {
      cache.delete(set);
      throw e;
    }));
  }
  return cache.get(set)!;
}

async function fetchSet(set: keyof typeof TITLES) {
  const titles = TITLES[set] as Record<string, string>;
  const out = new Map<string, Picture>();
  const entries = Object.entries(titles);
  // 1. Each article's main image (free licences only) and a 500px thumbnail.
  const pageInfo = new Map<string, { file: string; thumb: string }>();
  for (let i = 0; i < entries.length; i += 40) {
    const chunk = entries.slice(i, i + 40);
    const r = await query({
      prop: "pageimages",
      piprop: "name|thumbnail",
      pithumbsize: "500",
      pilicense: "free",
      redirects: "1",
      titles: chunk.map(([, t]) => t).join("|"),
    });
    const renamed = new Map<string, string>();
    for (const n of [...(r.query.normalized ?? []), ...(r.query.redirects ?? [])]) renamed.set(n.from, n.to);
    const byTitle = new Map<string, { pageimage?: string; thumbnail?: { source: string } }>(
      r.query.pages.map((p: { title: string }) => [p.title, p]),
    );
    for (const [id, t] of chunk) {
      let title = t;
      while (renamed.has(title)) title = renamed.get(title)!;
      const p = byTitle.get(title);
      if (p?.pageimage && p.thumbnail) pageInfo.set(id, { file: p.pageimage, thumb: p.thumbnail.source });
    }
  }
  // 2. Who took each photo, and its licence.
  const files = [...new Set([...pageInfo.values()].map((v) => v.file))];
  const meta = new Map<string, { artist: string; license: string; page: string }>();
  for (let i = 0; i < files.length; i += 40) {
    const r = await query({ prop: "imageinfo", iiprop: "extmetadata|url", titles: files.slice(i, i + 40).map((f) => `File:${f}`).join("|") });
    for (const p of r.query.pages as { title: string; imageinfo?: { descriptionurl: string; extmetadata?: Record<string, { value: string }> }[] }[]) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      meta.set(p.title.replace(/^File:/, "").replace(/ /g, "_"), {
        artist: strip(ii.extmetadata?.Artist?.value) || "Unknown",
        license: strip(ii.extmetadata?.LicenseShortName?.value) || "Free licence",
        page: ii.descriptionurl,
      });
    }
  }
  for (const [id, v] of pageInfo) {
    const m = meta.get(v.file.replace(/ /g, "_"));
    out.set(id, { src: v.thumb, artist: m?.artist ?? "Unknown", license: m?.license ?? "Free licence", page: m?.page ?? "" });
  }
  return out;
}
