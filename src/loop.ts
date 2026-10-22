import { update } from './game/engine';
import { hooks } from './hooks';
import { draw } from './render/draw';
import { gfx } from './render/quality';
import { session } from './state';

let running = false;
let last = 0;
let lastHudTick = -1;

const MAX_FRAME_MS = 100; // clamp long pauses (tab in background)
const STEP_MS = 20;       // simulation step

// Adaptive quality: bloom is the costliest effect, so it switches itself off if the game runs slowly.
const SLOW_FRAME_MS = 18;   // average above this means we are dropping below ~55 fps
const SAMPLE_FRAMES = 90;
let sampleTotal = 0;
let sampleCount = 0;

function watchPerformance(frameMs: number): void {
  if (!gfx.bloom || frameMs > MAX_FRAME_MS) return; // ignore pauses (tab in background)
  sampleTotal += frameMs;
  if (++sampleCount < SAMPLE_FRAMES) return;
  if (sampleTotal / sampleCount > SLOW_FRAME_MS) gfx.bloom = false;
  sampleTotal = 0;
  sampleCount = 0;
}

function frame(now: number): void {
  if (!running) return;
  const raw = now - last;
  const dt = Math.min(MAX_FRAME_MS, raw);
  last = now;
  watchPerformance(raw);
  if (session.game) {
    for (let i = 0; i < (session.paused ? 0 : session.speed); i++) {
      for (let rest = dt; rest > 0; rest -= STEP_MS) update(Math.min(STEP_MS, rest));
    }
    const tick = Math.floor(now / 250);
    if (tick !== lastHudTick) { // keep the start-bonus and shop affordability fresh
      lastHudTick = tick;
      hooks.hud();
    }
  }
  draw();
  requestAnimationFrame(frame);
}

/** Start the frame loop (a no-op if it is already running). */
export function startLoop(): void {
  last = performance.now();
  if (running) return;
  running = true;
  requestAnimationFrame(frame);
}

export function stopLoop(): void {
  running = false;
}
