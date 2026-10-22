import type { Recipe } from './audio';

/** Synth recipes for every sound (layers of filtered noise and tones). Tuned for punch, weight and long tails. */
export const RECIPES: Record<string, Recipe> = {
  minigun: { gain: 0.2975, drive: 0.5, reverb: 0.1, layers: [
    { kind: 'noise', dur: 0.194, att: 0.001, vol: 0.7, ft: 'lowpass', f0: 3500, f1: 700, q: 0.6 },
    { kind: 'noise', dur: 0.062, att: 0.001, vol: 0.3, ft: 'highpass', f0: 3000, f1: 3000, q: 0.5 },
    { kind: 'tone', f0: 140, f1: 55, dur: 0.159, att: 0.001, vol: 0.7 },
    { kind: 'noise', dur: 0.026, vol: 1.6, ft: 'bandpass', f0: 3000, f1: 2200, q: 0.6, dry: true },
  ] },
  minigunSoft: { gain: 0.1618, drive: 0.3, reverb: 0.06, layers: [
    { kind: 'noise', dur: 0.509, att: 0.004, vol: 0.45, ft: 'lowpass', f0: 1500, f1: 350, q: 0.7 },
    { kind: 'tone', f0: 120, f1: 70, dur: 0.285, att: 0.002, vol: 0.35 },
    { kind: 'noise', dur: 0.061, att: 0.001, vol: 1.6, ft: 'bandpass', f0: 3000, f1: 2200, q: 0.6, dry: true },
  ] },
  minigunHit: { gain: 0.5661, drive: 0.35, reverb: 0.35, layers: [
    { kind: 'noise', dur: 0.039, att: 0.001, vol: 0.5, ft: 'highpass', f0: 2500, f1: 2500, q: 0.5 },
    { kind: 'noise', dur: 0.195, att: 0.002, vol: 0.35, ft: 'bandpass', f0: 1500, f1: 600, q: 1.2 },
    { kind: 'tone', f0: 110, f1: 55, dur: 0.112, att: 0.001, vol: 0.5 },
    { kind: 'tone', f0: 2800, f1: 2400, dur: 0.195, att: 0.001, vol: 0.1, fmRatio: 1.4, fmIndex: 2 },
    { kind: 'noise', dur: 0.017, vol: 1.6, ft: 'bandpass', f0: 3000, f1: 2200, q: 0.6, dry: true },
  ] },
  laser: { gain: 0.1406, drive: 0.5, reverb: 0.15, layers: [
    { kind: 'tone', wave: 'sawtooth', f0: 140, f1: 210, dur: 1.17, att: 0.153, vol: 0.4, amRate: 38, amDepth: 0.6, curve: 'lin' },
    { kind: 'noise', dur: 1.17, att: 0.153, vol: 0.35, ft: 'bandpass', f0: 1200, f1: 2000, q: 1.5, amRate: 50, amDepth: 0.7, curve: 'lin' },
    { kind: 'tone', f0: 70, f1: 90, dur: 1.08, att: 0.153, vol: 0.35, curve: 'lin' },
    { kind: 'tone', wave: 'square', f0: 1800, f1: 2600, dur: 0.9, att: 0.18, vol: 0.08, fmRatio: 2, fmIndex: 3, curve: 'lin' },
    { kind: 'noise', dur: 0.027, vol: 1.6, ft: 'bandpass', f0: 3000, f1: 2200, q: 0.6, dry: true },
  ] },
  rocket: { gain: 0.1945, drive: 0.35, reverb: 0.2, layers: [
    { kind: 'noise', dur: 1.851, att: 0.104, vol: 0.55, ft: 'lowpass', f0: 6500, f1: 1300, q: 0.7 },
    { kind: 'noise', dur: 1.619, att: 0.104, vol: 0.2, ft: 'highpass', f0: 3000, f1: 2000, q: 0.6, amRate: 30, amDepth: 0.35 },
    { kind: 'noise', dur: 1.504, att: 0.104, vol: 0.4, ft: 'bandpass', f0: 700, f1: 400, q: 1, amRate: 24, amDepth: 0.3 },
    { kind: 'tone', wave: 'sawtooth', f0: 90, f1: 55, dur: 1.388, att: 0.093, vol: 0.25 },
  ] },
  rocketHit: { gain: 0.1957, drive: 0.6, reverb: 0.25, layers: [
    { kind: 'tone', f0: 70, f1: 35, dur: 0.815, att: 0.003, vol: 0.9, amRate: 8, amDepth: 0.35 },
    { kind: 'noise', dur: 0.667, att: 0.002, vol: 0.55, ft: 'lowpass', f0: 330, f1: 150, q: 0.8 },
    { kind: 'noise', dur: 0.059, att: 0.001, vol: 0.5, ft: 'highpass', f0: 2000, f1: 2000, q: 0.5 },
    { kind: 'noise', dur: 0.022, vol: 1.6, ft: 'bandpass', f0: 3000, f1: 2200, q: 0.6, dry: true },
  ] },
  shockwave: { gain: 0.1687, drive: 0.4, reverb: 0.2, layers: [
    { kind: 'tone', f0: 100, f1: 55, dur: 0.738, att: 0.066, vol: 0.6 },
    { kind: 'noise', dur: 0.656, att: 0.066, vol: 0.5, ft: 'bandpass', f0: 900, f1: 700, q: 2.5 },
    { kind: 'noise', dur: 0.205, att: 0.033, vol: 0.25, ft: 'highpass', f0: 5000, f1: 5000, q: 0.5 },
    { kind: 'noise', dur: 0.025, vol: 1.6, ft: 'bandpass', f0: 3000, f1: 2200, q: 0.6, dry: true },
  ] },
  lightning: { gain: 0.2768, drive: 0.55, reverb: 0.12, layers: [
    { kind: 'noise', dur: 0.5, att: 0.002, vol: 0.5, ft: 'highpass', f0: 2000, f1: 3500, q: 0.7, amRate: 110, amDepth: 0.9 },
    { kind: 'tone', wave: 'sawtooth', f0: 1100, f1: 200, dur: 0.4, att: 0.002, vol: 0.3, fmRatio: 3, fmIndex: 2 },
    { kind: 'tone', f0: 110, f1: 60, dur: 0.25, att: 0.002, vol: 0.5 },
    { kind: 'noise', dur: 0.12, att: 0.001, vol: 0.4, ft: 'bandpass', f0: 1500, f1: 800, q: 1 },
  ] },
  popA: { gain: 0.407, drive: 0.45, reverb: 0.2, layers: [
    { kind: 'noise', dur: 0.514, att: 0.002, vol: 0.4, ft: 'lowpass', f0: 1500, f1: 200, q: 0.7 },
    { kind: 'tone', wave: 'triangle', f0: 260, f1: 60, dur: 0.44, att: 0.001, vol: 0.6 },
    { kind: 'tone', f0: 90, f1: 45, dur: 0.367, att: 0.001, vol: 0.6 },
    { kind: 'noise', dur: 0.022, vol: 1.6, ft: 'bandpass', f0: 3000, f1: 2200, q: 0.6, dry: true },
  ] },
  popB: { gain: 0.2333, drive: 0.4, reverb: 0.2, layers: [
    { kind: 'noise', dur: 0.813, att: 0.058, vol: 0.6, ft: 'bandpass', f0: 1800, f1: 450, q: 1.2 },
    { kind: 'tone', wave: 'square', f0: 500, f1: 140, dur: 0.697, att: 0.058, vol: 0.15 },
    { kind: 'tone', f0: 100, f1: 50, dur: 0.465, att: 0.046, vol: 0.5 },
    { kind: 'noise', dur: 0.035, att: 0.001, vol: 1.6, ft: 'bandpass', f0: 3000, f1: 2200, q: 0.6, dry: true },
  ] },
  popC: { gain: 0.3222, drive: 0.55, reverb: 0.3, layers: [
    { kind: 'noise', dur: 1.271, att: 0.014, vol: 0.6, ft: 'lowpass', f0: 2000, f1: 180, q: 0.8 },
    { kind: 'tone', f0: 120, f1: 40, dur: 1.089, att: 0.003, vol: 0.6 },
    { kind: 'noise', dur: 0.064, att: 0.001, vol: 0.4, ft: 'highpass', f0: 3200, f1: 3200, q: 0.5 },
    { kind: 'noise', dur: 0.027, vol: 1.6, ft: 'bandpass', f0: 3000, f1: 2200, q: 0.6, dry: true },
  ] },
  boss: { gain: 0.2092, drive: 0.6, reverb: 0.4, layers: [
    { kind: 'noise', dur: 2, att: 0.005, vol: 0.7, ft: 'lowpass', f0: 2600, f1: 150, q: 0.8 },
    { kind: 'tone', f0: 100, f1: 30, dur: 1.8, att: 0.003, vol: 0.8, amRate: 7, amDepth: 0.3 },
    { kind: 'noise', dur: 0.14, att: 0.001, vol: 0.5, ft: 'highpass', f0: 3000, f1: 3000, q: 0.5 },
    { kind: 'noise', dur: 1.1, att: 0.15, vol: 0.3, ft: 'bandpass', f0: 1100, f1: 350, q: 1.5, delay: 0.25 },
    { kind: 'noise', dur: 0.03, att: 0.0005, vol: 1.6, ft: 'bandpass', f0: 3000, f1: 2200, q: 0.6, dry: true },
  ] },
  leak: { gain: 0.2298, drive: 0.5, reverb: 0.35, layers: [
    { kind: 'tone', wave: 'sawtooth', f0: 110, f1: 70, dur: 1.8, att: 0.13, vol: 0.4, amRate: 6, amDepth: 0.4 },
    { kind: 'noise', dur: 1.7, att: 0.12, vol: 0.5, ft: 'lowpass', f0: 800, f1: 300, q: 0.9 },
    { kind: 'tone', f0: 80, f1: 40, dur: 0.6, att: 0.1, vol: 0.7, delay: 0.1 },
    { kind: 'noise', dur: 0.03, att: 0.0005, vol: 1.6, ft: 'bandpass', f0: 3000, f1: 2200, q: 0.6, dry: true },
  ] },
  over: { gain: 0.2583, drive: 0.5, reverb: 0.5, layers: [
    { kind: 'tone', wave: 'sawtooth', f0: 260, f1: 60, dur: 3.6, att: 0.1, vol: 0.4, amRate: 3, amDepth: 0.35, curve: 'lin' },
    { kind: 'noise', dur: 3.4, att: 0.1, vol: 0.4, ft: 'lowpass', f0: 1200, f1: 250, q: 0.8, curve: 'lin' },
    { kind: 'tone', f0: 70, f1: 35, dur: 2.5, att: 0.1, vol: 0.4, delay: 0.1 },
  ] },
  wave: { gain: 0.1326, drive: 0.4, reverb: 0.3, layers: [
    { kind: 'noise', dur: 1.6, att: 1.4, vol: 0.1, ft: 'lowpass', f0: 250, f1: 900, q: 1.2, curve: 'lin' },
    { kind: 'tone', wave: 'sawtooth', f0: 100, f1: 400, dur: 1.6, att: 1.4, vol: 0.35, curve: 'lin' },
    { kind: 'tone', wave: 'sawtooth', f0: 300, f1: 295, dur: 1.2, att: 0.02, vol: 0.4, fmRatio: 1.005, fmIndex: 0.4, delay: 1.5 },
    { kind: 'tone', wave: 'square', f0: 200, f1: 198, dur: 1.2, att: 0.02, vol: 0.3, delay: 1.5 },
    { kind: 'tone', f0: 100, f1: 80, dur: 1.2, att: 0.02, vol: 0.4, delay: 1.5 },
  ] },
  waveClear: { gain: 0.3376, drive: 0.2, reverb: 0.3, layers: [
    { kind: 'tone', wave: 'triangle', f0: 440, f1: 440, dur: 0.18, att: 0.003, vol: 0.4 },
    { kind: 'tone', wave: 'triangle', f0: 554, f1: 554, dur: 0.18, att: 0.003, vol: 0.4, delay: 0.09 },
    { kind: 'tone', wave: 'triangle', f0: 660, f1: 660, dur: 0.4, att: 0.003, vol: 0.45, delay: 0.18 },
    { kind: 'noise', dur: 0.3, att: 0.02, vol: 0.12, ft: 'highpass', f0: 5000, f1: 5000, q: 0.5, delay: 0.18 },
  ] },
  levelComplete: { gain: 0.2991, drive: 0.2, reverb: 0.4, layers: [
    { kind: 'tone', wave: 'triangle', f0: 523, f1: 523, dur: 0.22, att: 0.003, vol: 0.45 },
    { kind: 'tone', wave: 'triangle', f0: 659, f1: 659, dur: 0.22, att: 0.003, vol: 0.45, delay: 0.13 },
    { kind: 'tone', wave: 'triangle', f0: 784, f1: 784, dur: 0.22, att: 0.003, vol: 0.45, delay: 0.26 },
    { kind: 'tone', wave: 'triangle', f0: 1047, f1: 1047, dur: 0.8, att: 0.003, vol: 0.5, delay: 0.39 },
    { kind: 'tone', wave: 'sawtooth', f0: 262, f1: 262, dur: 0.8, att: 0.01, vol: 0.2, delay: 0.39 },
  ] },
  bossAlarm: { gain: 0.3346, drive: 0.4, reverb: 0.25, layers: [
    { kind: 'tone', wave: 'sawtooth', f0: 440, f1: 440, dur: 0.25, att: 0.01, vol: 0.4 },
    { kind: 'tone', wave: 'sawtooth', f0: 330, f1: 330, dur: 0.25, att: 0.01, vol: 0.4, delay: 0.27 },
    { kind: 'tone', wave: 'sawtooth', f0: 440, f1: 440, dur: 0.25, att: 0.01, vol: 0.4, delay: 0.54 },
    { kind: 'tone', wave: 'sawtooth', f0: 330, f1: 330, dur: 0.3, att: 0.01, vol: 0.4, delay: 0.81 },
    { kind: 'noise', dur: 1.1, att: 0.05, vol: 0.2, ft: 'lowpass', f0: 900, f1: 500, q: 1 },
  ] },
  lowLives: { gain: 0.2294, drive: 0.3, reverb: 0.1, layers: [
    { kind: 'tone', f0: 80, f1: 45, dur: 0.18, att: 0.004, vol: 0.8 },
    { kind: 'tone', f0: 80, f1: 45, dur: 0.22, att: 0.004, vol: 0.7, delay: 0.2 },
  ] },
  click: { gain: 0.1808, drive: 0.2, reverb: 0, layers: [
    { kind: 'noise', dur: 0.082, att: 0.003, vol: 0.6, ft: 'bandpass', f0: 3500, f1: 2800, q: 0.8 },
    { kind: 'tone', wave: 'square', f0: 2000, f1: 1400, dur: 0.095, att: 0.003, vol: 0.15 },
    { kind: 'tone', f0: 200, f1: 120, dur: 0.068, att: 0.003, vol: 0.15 },
  ] },
  pickup: { gain: 0.1187, drive: 0.15, reverb: 0.05, layers: [
    { kind: 'tone', f0: 1600, f1: 3200, dur: 0.128, att: 0.043, vol: 0.4 },
    { kind: 'noise', dur: 0.085, att: 0.043, vol: 0.5, ft: 'bandpass', f0: 4200, f1: 5200, q: 1 },
  ] },
  place: { gain: 0.2047, drive: 0.3, reverb: 0.12, layers: [
    { kind: 'tone', f0: 180, f1: 75, dur: 0.317, att: 0.002, vol: 0.2 },
    { kind: 'noise', dur: 0.159, att: 0.001, vol: 0.7, ft: 'bandpass', f0: 2200, f1: 1500, q: 1.2 },
    { kind: 'tone', wave: 'triangle', f0: 900, f1: 700, dur: 0.227, att: 0.001, vol: 0.3, delay: 0.023 },
    { kind: 'noise', dur: 0.034, att: 0.001, vol: 1.6, ft: 'bandpass', f0: 3000, f1: 2200, q: 0.6, dry: true },
  ] },
  sell: { gain: 0.3006, drive: 0.2, reverb: 0.1, layers: [
    { kind: 'tone', f0: 800, f1: 220, dur: 0.18, att: 0.002, vol: 0.4 },
    { kind: 'noise', dur: 0.1, att: 0.001, vol: 0.3, ft: 'bandpass', f0: 2200, f1: 1200, q: 1 },
    { kind: 'tone', f0: 150, f1: 80, dur: 0.15, att: 0.002, vol: 0.35 },
  ] },
  up: { gain: 0.3253, drive: 0.2, reverb: 0.25, layers: [
    { kind: 'tone', wave: 'triangle', f0: 520, f1: 520, dur: 0.18, att: 0.003, vol: 0.4 },
    { kind: 'tone', wave: 'triangle', f0: 660, f1: 660, dur: 0.18, att: 0.003, vol: 0.4, delay: 0.07 },
    { kind: 'tone', wave: 'triangle', f0: 880, f1: 880, dur: 0.35, att: 0.003, vol: 0.45, delay: 0.14 },
    { kind: 'noise', dur: 0.25, att: 0.01, vol: 0.12, ft: 'highpass', f0: 6000, f1: 6000, q: 0.5, delay: 0.14 },
  ] },
  deny: { gain: 0.2252, drive: 0.4, reverb: 0, layers: [
    { kind: 'tone', wave: 'square', f0: 170, f1: 120, dur: 0.2, att: 0.003, vol: 0.4 },
    { kind: 'noise', dur: 0.12, att: 0.002, vol: 0.2, ft: 'lowpass', f0: 800, f1: 400, q: 1 },
  ] },
  swish: { gain: 2.629, drive: 0, reverb: 0.1, layers: [
    { kind: 'noise', dur: 0.55, att: 0.17, vol: 0.5, ft: 'bandpass', f0: 800, f1: 4500, q: 1.2 },
    { kind: 'noise', dur: 0.5, att: 0.15, vol: 0.12, ft: 'highpass', f0: 3500, f1: 4500, q: 0.6 },
  ] },
  woosh: { gain: 1.091, drive: 0, reverb: 0.1, layers: [
    { kind: 'noise', dur: 0.179, att: 0.045, vol: 0.55, ft: 'bandpass', f0: 1500, f1: 400, q: 1.1 },
    { kind: 'tone', f0: 160, f1: 90, dur: 0.161, att: 0.036, vol: 0.5 },
  ] },
};
