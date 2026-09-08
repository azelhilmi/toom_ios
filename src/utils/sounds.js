let ctx = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/**
 * Crée un buffer de bruit blanc filtré, l'ingrédient de base de tout
 * son "mécanique" convaincant (un vrai clic n'est jamais une onde pure,
 * c'est une explosion de bruit avec une couleur spectrale précise).
 */
function makeNoiseBurst(c, durationSec) {
  const bufferSize = Math.max(1, Math.floor(c.sampleRate * durationSec));
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  return src;
}

function noiseClick(c, { start, duration, freq, q, gain, type = "bandpass" }) {
  const noise = makeNoiseBurst(c, duration);
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  noise.connect(filter).connect(g).connect(c.destination);
  noise.start(start);
}

function tonalPop(c, { start, duration, freqFrom, freqTo, gain, type = "sine" }) {
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, start);
  if (freqTo !== freqFrom) osc.frequency.exponentialRampToValueAtTime(freqTo, start + duration);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration);
}

/**
 * Cran de molette crantée : un clic sec et haut, comme un vrai
 * cliquet — bruit filtré étroit + un soupçon de composante tonale.
 */
export function playWheelTick() {
  const c = getContext();
  if (!c) return;
  const now = c.currentTime;
  noiseClick(c, { start: now, duration: 0.02, freq: 3200, q: 3.5, gain: 0.22 });
  tonalPop(c, { start: now, duration: 0.015, freqFrom: 1800, freqTo: 1200, gain: 0.03, type: "triangle" });
}

/**
 * Pellicule complètement armée : deux clics rapprochés, plus grave
 * que le tic de cran.
 */
export function playWheelArmed() {
  const c = getContext();
  if (!c) return;
  const now = c.currentTime;
  noiseClick(c, { start: now, duration: 0.035, freq: 1400, q: 2.5, gain: 0.28 });
  noiseClick(c, { start: now + 0.045, duration: 0.02, freq: 2000, q: 3, gain: 0.14 });
  tonalPop(c, { start: now, duration: 0.09, freqFrom: 420, freqTo: 180, gain: 0.1, type: "triangle" });
}

/**
 * Déclic d'obturateur d'un jetable : trois couches qui se chevauchent
 * légèrement, comme un vrai mécanisme —
 *  1. le "clac" principal, sec et plein
 *  2. le rideau qui se libère, plus aigu et bref, juste après
 *  3. le petit retour métallique du ressort, très bref, en dernier
 */
export function playShutter() {
  const c = getContext();
  if (!c) return;
  const now = c.currentTime;

  noiseClick(c, { start: now, duration: 0.05, freq: 1200, q: 1.1, gain: 0.4, type: "bandpass" });
  noiseClick(c, { start: now, duration: 0.03, freq: 3400, q: 2, gain: 0.18 });
  tonalPop(c, { start: now, duration: 0.045, freqFrom: 150, freqTo: 70, gain: 0.22, type: "sine" });

  noiseClick(c, { start: now + 0.03, duration: 0.025, freq: 2600, q: 2.5, gain: 0.16 });

  noiseClick(c, { start: now + 0.075, duration: 0.015, freq: 4200, q: 4, gain: 0.08 });
  tonalPop(c, { start: now + 0.075, duration: 0.02, freqFrom: 2800, freqTo: 2800, gain: 0.02, type: "square" });
}
