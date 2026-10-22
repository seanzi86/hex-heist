import { gfx } from './quality';
import { ctx } from './viewport';

/** Pre-rendered radial glows, one per colour, composited with `screen` blending. */
const sprites = new Map<string, HTMLCanvasElement>();
const SIZE = 64;

function glowSprite(color: string): HTMLCanvasElement {
  let c = sprites.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d');
  if (g) {
    const r = parseInt(color.slice(1, 3), 16), gr = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
    const grad = g.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
    grad.addColorStop(0, `rgba(${r},${gr},${b},1)`);
    grad.addColorStop(0.25, `rgba(${r},${gr},${b},0.45)`);
    grad.addColorStop(0.6, `rgba(${r},${gr},${b},0.12)`);
    grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, SIZE, SIZE);
  }
  sprites.set(color, c);
  return c;
}

/** Add a soft glow of `color` (a #rrggbb string) centred on (x, y) in the current transform. */
export function drawGlow(x: number, y: number, radius: number, color: string, alpha: number): void {
  if (!gfx.glow || alpha <= 0 || radius <= 0) return;
  const prevOp = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'screen'; // rolls off softly instead of clipping to white
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(glowSprite(color), x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = prevOp;
}
