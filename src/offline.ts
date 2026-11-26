// Offline play: the page side. It starts the service worker (src/offline-sw.js, built into sw.js by
// vite.config.ts), and draws a small status line for the list page saying whether the site is saved
// on this device yet. Only the built site uses it: in `npm run dev` nothing is registered, so edits
// always show up straight away.
import { h } from "./ui/dom";

type State = "none" | "saving" | "ready";
let state: State = "none";
const listeners = new Set<() => void>();
const set = (s: State) => {
  state = s;
  listeners.forEach((f) => f());
};

export function startOffline() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  set("saving");
  navigator.serviceWorker.register("./sw.js").catch(() => set("none"));
  // "ready" waits for a worker that has finished saving every file (a failed save never becomes active).
  void navigator.serviceWorker.ready.then(() => set("ready"));
  window.addEventListener("online", () => listeners.forEach((f) => f()));
  window.addEventListener("offline", () => listeners.forEach((f) => f()));
}

/** Opened from the Home Screen (installed) rather than in a browser tab. */
const installed = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/** The status line for the list page. It keeps itself up to date until it leaves the page. */
export function offlineStatus(): HTMLElement {
  const el = h("p", { class: "offline-status", role: "status" });
  const draw = () => {
    if (!el.isConnected && el.dataset.drawn) {
      listeners.delete(draw);
      return;
    }
    el.dataset.drawn = "1";
    el.hidden = state === "none";
    el.dataset.state = state;
    const away = !navigator.onLine;
    const tip = installed() ? "" : " On a phone, add it to your Home Screen (Share ▸ Add to Home Screen) so it stays saved.";
    if (state === "saving") {
      el.replaceChildren(h("strong", {}, "Saving for offline play…"), " Keep this page open a moment.");
    } else if (away) {
      el.replaceChildren(h("strong", {}, "✈ Offline."), " The arcade and the quizzes still work. Photo quizzes and Empires' old maps need a connection.");
    } else {
      el.replaceChildren(h("strong", {}, "✓ Ready to play offline."), " The arcade and the quizzes work with no connection; photo quizzes and Empires' old maps need one." + tip);
    }
  };
  listeners.add(draw);
  draw();
  return el;
}
