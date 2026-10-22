/** Sound effects, synthesised with Web Audio (no audio files): layers of filtered noise and tones through a saturator, reverb send and limiter. */
import { COL } from './constants';
import { RECIPES } from './sounds';
import { currentGame } from './state';
import type { SfxName } from './types';

interface NoiseLayer { kind: 'noise'; ft: BiquadFilterType; q: number }
interface ToneLayer { kind: 'tone'; wave?: OscillatorType; fmRatio?: number; fmIndex?: number }
interface LayerBase {
  dur: number; att?: number; vol: number; f0: number; f1: number;
  amRate?: number; amDepth?: number; delay?: number; curve?: 'exp' | 'lin';
  /** skip the saturator (keeps a transient clean) */
  dry?: boolean;
}
export interface Recipe {
  gain: number; drive: number; reverb: number;
  layers: (LayerBase & (NoiseLayer | ToneLayer))[];
}

const VOLUME = 0.9;
const PITCH_VARIATION = 0.06;
const MIN_GAP_MS = 50;
const GAP_MS: Partial<Record<SfxName, number>> = { pop: 35, minigun: 40, minigunSoft: 40, minigunHit: 40, click: 30 };
const MAX_VOICES = 24; // past this, only the important sounds play
const IMPORTANT: SfxName[] = ['boss', 'leak', 'over', 'wave', 'bossAlarm', 'levelComplete', 'waveClear', 'lowLives', 'place', 'sell', 'up', 'deny', 'click', 'pickup', 'woosh'];
const POPS = ['popA', 'popB', 'popC'];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let reverbBus: GainNode | null = null; // every sound sends into this one shared reverb
const voices: number[] = []; // end times of the sounds still playing
let muted = false;
try {
  muted = localStorage.getItem('hexheist-mute') === '1';
} catch {
  /* storage unavailable */
}
const lastPlayed: Partial<Record<SfxName, number>> = {};
const curves = new Map<number, Float32Array<ArrayBuffer>>();

function audio(): AudioContext | null {
  if (!ctx) {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const c = new Ctor();
      master = c.createGain();
      master.gain.value = VOLUME;
      const limiter = c.createDynamicsCompressor(); // stops a busy wave from clipping
      limiter.threshold.value = -6;
      limiter.knee.value = 4;
      limiter.ratio.value = 14;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.15;
      master.connect(limiter);
      limiter.connect(c.destination);
      noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const n = noise.getChannelData(0);
      for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
      const len = Math.floor(c.sampleRate * 1.4);
      const impulse = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = impulse.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
      }
      const reverb = c.createConvolver(); // one shared convolver: a unit per sound is far too heavy for a busy wave
      reverb.buffer = impulse;
      reverbBus = c.createGain();
      reverbBus.connect(reverb);
      reverb.connect(master);
      ctx = c;
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function saturation(drive: number): Float32Array<ArrayBuffer> {
  const key = Math.round(drive * 100);
  let a = curves.get(key);
  if (!a) {
    const k = 1 + drive * 14, norm = Math.tanh(k);
    a = new Float32Array(1024);
    for (let i = 0; i < a.length; i++) a[i] = Math.tanh(k * ((i / (a.length - 1)) * 2 - 1)) / norm;
    curves.set(key, a);
  }
  return a;
}

/** Play one recipe. `pitch` scales every frequency; `pan` is -1 (left) to 1 (right). */
function synth(c: AudioContext, r: Recipe, pitch: number, pan: number): number {
  const out = master!;
  const t0 = c.currentTime + 0.01;
  const bus = c.createGain();
  let wet: AudioNode = bus;
  if (r.drive > 0.01) {
    const sh = c.createWaveShaper();
    sh.curve = saturation(r.drive);
    sh.oversample = '2x';
    const trim = c.createGain();
    trim.gain.value = 1 / (1 + r.drive * 0.4);
    bus.connect(sh);
    sh.connect(trim);
    wet = trim;
  }
  const post = c.createGain();
  post.gain.value = r.gain;
  wet.connect(post);
  let last: AudioNode = post;
  if (Math.abs(pan) > 0.01) {
    const p = c.createStereoPanner();
    p.pan.value = pan;
    post.connect(p);
    last = p;
  }
  last.connect(out);
  if (r.reverb > 0.01) {
    const send = c.createGain();
    send.gain.value = r.reverb;
    last.connect(send);
    send.connect(reverbBus!);
  }

  for (const L of r.layers) {
    const t = t0 + (L.delay ?? 0), end = t + L.dur, att = L.att ?? 0;
    const amp = c.createGain();
    if (att > 0) { amp.gain.setValueAtTime(0.0001, t); amp.gain.linearRampToValueAtTime(L.vol, t + att); } else amp.gain.setValueAtTime(L.vol, t);
    if (L.curve === 'lin') amp.gain.linearRampToValueAtTime(0.0001, end);
    else amp.gain.setTargetAtTime(0.0001, t + att, Math.max(0.004, (L.dur - att) / 4)); // dur ~ audible length

    let head: AudioNode;
    if (L.kind === 'noise') {
      const src = c.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      src.loopStart = Math.random() * 0.5;
      const f = c.createBiquadFilter();
      f.type = L.ft;
      f.Q.value = L.q;
      f.frequency.setValueAtTime(L.f0 * pitch, t);
      if (L.f1 !== L.f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, L.f1 * pitch), end);
      src.connect(f);
      src.start(t, Math.random() * 1.5);
      src.stop(end + 0.1);
      head = f;
    } else {
      const o = c.createOscillator();
      o.type = L.wave ?? 'sine';
      o.frequency.setValueAtTime(L.f0 * pitch, t);
      if (L.f1 !== L.f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, L.f1 * pitch), end);
      if (L.fmIndex) {
        const ratio = L.fmRatio ?? 1;
        const m = c.createOscillator();
        m.frequency.setValueAtTime(L.f0 * pitch * ratio, t);
        if (L.f1 !== L.f0) m.frequency.exponentialRampToValueAtTime(Math.max(20, L.f1 * pitch * ratio), end);
        const depth = c.createGain();
        depth.gain.value = L.fmIndex * L.f0 * pitch * 0.5;
        m.connect(depth);
        depth.connect(o.frequency);
        m.start(t);
        m.stop(end + 0.05);
      }
      o.start(t);
      o.stop(end + 0.1);
      head = o;
    }
    if (L.amDepth && L.amRate) {
      const am = c.createGain();
      am.gain.value = 1 - L.amDepth / 2;
      const lfo = c.createOscillator();
      lfo.frequency.value = L.amRate;
      const lg = c.createGain();
      lg.gain.value = L.amDepth / 2;
      lfo.connect(lg);
      lg.connect(am.gain);
      lfo.start(t);
      lfo.stop(end + 0.05);
      head.connect(am);
      head = am;
    }
    head.connect(amp);
    amp.connect(L.dry ? post : bus);
  }
  return t0 + Math.max(...r.layers.map((L) => (L.delay ?? 0) + L.dur)) + 0.2;
}

/**
 * Play a sound, rate-limited so busy waves don't turn into noise.
 * `x` is the source's world x position; it pans the sound left/right across the board.
 */
export function sfx(name: SfxName, x?: number): void {
  if (muted) return;
  const now = performance.now();
  if (now - (lastPlayed[name] ?? 0) < (GAP_MS[name] ?? MIN_GAP_MS)) return;
  lastPlayed[name] = now;
  try {
    const c = audio();
    const recipe = RECIPES[name === 'pop' ? POPS[Math.floor(Math.random() * POPS.length)] : name];
    if (!c || !recipe) return;
    while (voices.length && voices[0] <= c.currentTime) voices.shift();
    if (voices.length >= MAX_VOICES && !IMPORTANT.includes(name)) return;
    let pan = 0;
    if (x !== undefined) pan = Math.max(-0.7, Math.min(0.7, (x / (currentGame().level.w * COL)) * 1.4 - 0.7));
    voices.push(synth(c, recipe, 1 + (Math.random() * 2 - 1) * PITCH_VARIATION, pan));
    voices.sort((a, b) => a - b);
  } catch {
    /* audio is best-effort */
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem('hexheist-mute', value ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
}

/** Browsers only allow audio after a user gesture; unlock on the first one. */
export function unlockAudio(): void {
  const unlock = (): void => {
    audio();
  };
  addEventListener('pointerdown', unlock);
  addEventListener('keydown', unlock);
}
