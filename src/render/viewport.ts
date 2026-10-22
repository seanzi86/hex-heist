/** How world coordinates map to the canvas (CSS pixels). */
export const view = { S: 1, ox: 0, oy: 0, dpr: 1, w: 1, h: 1 };

// The canvas belongs to a UI component; it registers itself here while mounted.
// These are live bindings, so every renderer module sees the current element.
export let canvas!: HTMLCanvasElement;
export let ctx!: CanvasRenderingContext2D;
let attached = false;

export function attachCanvas(el: HTMLCanvasElement): void {
  const context = el.getContext('2d');
  if (!context) throw new Error('Canvas 2D is not available');
  canvas = el;
  ctx = context;
  attached = true;
}

export function detachCanvas(): void {
  attached = false;
}

export function hasCanvas(): boolean {
  return attached;
}

/** World -> screen. */
export function sp(x: number, y: number): [number, number] {
  return [view.ox + x * view.S, view.oy - y * view.S];
}

/** Screen -> world. */
export function toWorld(px: number, py: number): [number, number] {
  return [(px - view.ox) / view.S, (view.oy - py) / view.S];
}
