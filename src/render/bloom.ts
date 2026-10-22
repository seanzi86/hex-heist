import { gfx } from './quality';
import { canvas, view } from './viewport';

/**
 * Cheap bloom: the finished frame is shrunk twice (quarter, then eighth size) and the small copies are scaled
 * back up, which blurs them. They are added over the scene with `screen` blending, so only bright things
 * visibly glow. No full-size extra layer is needed, which keeps it fast on phones.
 */
let quarter: HTMLCanvasElement | null = null;
let eighth: HTMLCanvasElement | null = null;

function small(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Call after the main canvas size changes. */
export function resizeBloom(): void {
  quarter = small(view.w / 4, view.h / 4);
  eighth = small(view.w / 8, view.h / 8);
}

/** Add bloom to the frame just drawn on `main` (call with the same transform used for drawing). */
export function bloomPass(main: CanvasRenderingContext2D): void {
  if (!gfx.bloom || !quarter || !eighth) return;
  const q = quarter.getContext('2d'), e = eighth.getContext('2d');
  if (!q || !e) return;
  q.drawImage(canvas, 0, 0, quarter.width, quarter.height);
  e.drawImage(quarter, 0, 0, eighth.width, eighth.height);

  main.save();
  main.globalCompositeOperation = 'screen';
  main.imageSmoothingEnabled = true;
  main.imageSmoothingQuality = 'high';
  main.globalAlpha = 0.5;
  main.drawImage(quarter, 0, 0, view.w, view.h);
  main.globalAlpha = 0.45;
  main.drawImage(eighth, 0, 0, view.w, view.h);
  main.restore();
}
