import { HW } from '../constants';
import { sp, view } from './viewport';

/** Hexagon (flat-top) centred on a world position; `r` scales its size (1 = full cell). */
export function hexPath(c: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const [px, py] = sp(cx, cy);
  const s = view.S;
  c.beginPath();
  c.moveTo(px - r * HW * s, py);
  c.lineTo(px - (r * HW * s) / 2, py - r * HW * s);
  c.lineTo(px + (r * HW * s) / 2, py - r * HW * s);
  c.lineTo(px + r * HW * s, py);
  c.lineTo(px + (r * HW * s) / 2, py + r * HW * s);
  c.lineTo(px - (r * HW * s) / 2, py + r * HW * s);
  c.closePath();
}

/** Regular polygon around the origin; `inner` < 1 alternates radii for spikes. */
export function poly(c: CanvasRenderingContext2D, n: number, r: number, rot = 0, inner = 1): void {
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i * Math.PI * 2) / n;
    const rad = inner !== 1 && i % 2 ? r * inner : r;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
    if (i) c.lineTo(x, y); else c.moveTo(x, y);
  }
  c.closePath();
}

export function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** A ">" mark pointing along `ang` (screen radians). */
export function chevron(c: CanvasRenderingContext2D, px: number, py: number, ang: number, u: number, col: string, alpha: number): void {
  c.save();
  c.translate(px, py);
  c.rotate(ang);
  c.globalAlpha = alpha;
  c.strokeStyle = col;
  c.beginPath();
  c.moveTo(-u * 0.6, -u);
  c.lineTo(u * 0.4, 0);
  c.lineTo(-u * 0.6, u);
  c.stroke();
  c.restore();
}

/** Deterministic pseudo-random number in [0, 1) from three integers. */
export function hash2(x: number, y: number, k: number): number {
  let h = (x * 374761393 + y * 668265263 + k * 1274126177) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
