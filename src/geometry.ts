import { COL, ROW } from './constants';

/** World-space centre of tile (x, y). */
export function center(x: number, y: number): { x: number; y: number } {
  return { x: (x + 0.5) * COL, y: (y + 0.5 + (x & 1 ? 0.5 : 0)) * ROW };
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/** Smallest signed difference between two angles. */
export function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
