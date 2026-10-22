import { PALETTE, TAU, Tile } from '../constants';
import { TOWERS } from '../data/defs';
import { previewPlacement } from './route';
import { drawGlow } from './glow';
import { poly } from './shapes';
import { session } from '../state';
import type { Game } from '../types';
import { ctx, view } from './viewport';

/** The chip that follows the pointer while a tower is being dragged from the bar. */
export function drawDragChip(g: Game): void {
  const d = session.drag;
  if (!d) return;
  const def = TOWERS[d.type];
  const tile = session.hover;
  const ok = !!tile && tile.type === Tile.NORMAL && !tile.tower && previewPlacement(g, tile).valid;
  const col = tile ? (ok ? def.color : PALETTE.red) : '#8899aa'; // grey when not over the board
  const h = view.S * 0.085;

  if (d.touch) { // a thin tether from the finger up to the chip
    ctx.save();
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(d.fx, d.fy); ctx.lineTo(d.x, d.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(d.fx, d.fy, 10, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(d.x, d.y);
  drawGlow(0, 0, h * 2.4, col, 0.55);
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#050a12';
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(1.5, view.S * 0.011);
  poly(ctx, 6, h * 1.2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(0, 0, h * 0.35, 0, TAU); ctx.fill();
  ctx.restore();
}
