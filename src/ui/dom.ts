/** Tiny helper for building elements: h("div", { class: "x" }, "text", child) */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | ((e: Event) => void)> = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === "function") el.addEventListener(k.replace(/^on/, ""), v);
    else if (v === true) el.setAttribute(k, "");
    else if (v !== false) el.setAttribute(k, v);
  }
  for (const c of children) if (c) el.append(c);
  return el;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
