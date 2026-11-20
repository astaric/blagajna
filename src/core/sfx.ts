// Tiny WebAudio beeps. iOS only lets audio start from a user tap, so unlockAudio() runs on the first pointerdown.

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try { ctx = new Ctor(); } catch { return null; }
  return ctx;
}

export function unlockAudio(): void {
  const c = context();
  if (c && c.state === 'suspended') void c.resume();
}

function tone(freq: number, startS: number, durS: number, type: OscillatorType = 'square', gain = 0.15): void {
  const c = context();
  if (!c) return;
  const t0 = c.currentTime + startS;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + durS);
  osc.connect(amp).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + durS + 0.02);
}

export type Sound = 'scan' | 'unknown' | 'paid';

export function play(sound: Sound): void {
  switch (sound) {
    case 'scan': tone(1800, 0, 0.12); break;
    case 'unknown': tone(220, 0, 0.18, 'sawtooth'); tone(160, 0.18, 0.25, 'sawtooth'); break;
    case 'paid': tone(880, 0, 0.12, 'triangle'); tone(1175, 0.12, 0.12, 'triangle'); tone(1760, 0.24, 0.25, 'triangle'); break;
  }
}
