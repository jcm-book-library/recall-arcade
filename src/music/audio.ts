// A simple piano-like sound made in the browser (Web Audio): no audio files needed.
// Browsers only allow sound after the player has clicked or tapped something,
// so the sound system starts on the first note played after a click.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Play one note. `when` is seconds from now; `length` is how long it rings. */
export function playNote(midi: number, length = 2.4, when = 0) {
  const ac = audio();
  if (!ac || !master) return;
  const t = ac.currentTime + when + 0.01;
  const out = ac.createGain();
  out.connect(master);
  // A struck string: quick attack, then a long fade. A few harmonics give it body.
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(0.9, t + 0.008);
  out.gain.exponentialRampToValueAtTime(0.5, t + 0.3);
  out.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.5, length));
  const partials: [number, number, OscillatorType][] = [
    [1, 0.6, "triangle"],
    [2, 0.22, "sine"],
    [3, 0.08, "sine"],
    [4, 0.04, "sine"],
  ];
  for (const [mult, level, type] of partials) {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = freq(midi) * mult;
    const g = ac.createGain();
    g.gain.value = level;
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + Math.max(0.5, length) + 0.05);
  }
}

export function playChord(midis: number[], length = 2.4, when = 0) {
  for (const m of midis) playNote(m, length, when);
}

/** Play notes one after another, `gap` seconds apart. */
export function playSequence(midis: number[], gap = 0.7, length = 1.4) {
  midis.forEach((m, i) => playNote(m, length, i * gap));
}
