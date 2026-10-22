import { HW, PALETTE, TAU, Tile } from '../constants';
import { TOWERS } from '../data/defs';
import { center } from '../geometry';
import { TOWER_BALANCE } from '../data/balance';
import { session } from '../state';
import type { Game, Tower } from '../types';
import { bakeBoard, drawBoardLayer, drawTileAnimations } from './board';
import { bloomPass, resizeBloom } from './bloom';
import { drawCreep } from './creeps';
import { drawBeam, drawFx } from './effects';
import { drawDragChip } from './drag';
import { drawRoutes, previewPlacement, type PlacementPreview } from './route';
import { hexPath } from './shapes';
import { drawTower } from './towers';
import { canvas, ctx, sp, view } from './viewport';

/** Fit the board into the canvas and rebuild the static board layer. */
export function resize(): void {
  const r = canvas.getBoundingClientRect();
  if (!r.width) return;
  view.dpr = window.devicePixelRatio || 1;
  canvas.width = r.width * view.dpr;
  canvas.height = r.height * view.dpr;
  view.w = r.width;
  view.h = r.height;
  resizeBloom();
  const g = session.game;
  if (!g) return;

  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const t of g.grid.all) {
    if (t.type === Tile.INVALID) continue;
    const c = center(t.x, t.y);
    x0 = Math.min(x0, c.x - HW); x1 = Math.max(x1, c.x + HW);
    y0 = Math.min(y0, c.y - HW); y1 = Math.max(y1, c.y + HW);
  }
  view.S = Math.min((view.w - 8) / (x1 - x0), (view.h - 8) / (y1 - y0));
  view.ox = view.w / 2 - ((x0 + x1) / 2) * view.S;
  view.oy = view.h / 2 + ((y0 + y1) / 2) * view.S;
  bakeBoard(g);
}

interface RangePreview {
  x: number;
  y: number;
  range: number;
  /** armed tower hovering an empty tile (draws a ghost) */
  ghost: { color: string } | null;
}

function rangePreview(g: Game, valid: boolean): RangePreview | null {
  const sel: Tower | null = g.selected;
  if (sel) return { x: sel.x, y: sel.y, range: sel.range, ghost: null };
  const hover = session.hover;
  if (hover && !hover.tower && session.placing) {
    const c = center(hover.x, hover.y);
    const def = TOWERS[session.placing];
    return { x: c.x, y: c.y, range: TOWER_BALANCE[session.placing].levels[0].range, ghost: { color: valid ? def.color : PALETTE.red } };
  }
  return null;
}

/** Draw one frame. */
export function draw(): void {
  const g = session.game;
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, view.w, view.h);
  if (!g) return;

  ctx.save();
  if (g.shake > 0) {
    const k = Math.min(1, g.shake / 300) * 7;
    ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
  }
  drawBoardLayer();
  drawTileAnimations(g);

  // route creeps will take, and a "what if" route while placing a tower
  const hover = session.hover;
  const armed = session.placing && !g.selected && hover && hover.type === Tile.NORMAL && !hover.tower ? hover : null;
  const placement: PlacementPreview | null = armed ? previewPlacement(g, armed) : null;
  if (session.showRoute) drawRoutes(g, placement);

  const preview = rangePreview(g, placement?.valid ?? true);
  if (preview) {
    const [px, py] = sp(preview.x, preview.y);
    ctx.beginPath();
    ctx.arc(px, py, preview.range * view.S, 0, TAU);
    ctx.fillStyle = 'rgba(0,240,255,.05)';
    ctx.fill();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(0,240,255,.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    if (preview.ghost) {
      hexPath(ctx, preview.x, preview.y, 0.9);
      ctx.fillStyle = preview.ghost.color + '33';
      ctx.fill();
      ctx.strokeStyle = preview.ghost.color;
      ctx.stroke();
    }
  }

  for (const t of g.towers) drawTower(t, g.time);
  for (const b of g.beams) drawBeam(b);
  for (const c of g.creeps) drawCreep(c, g.time);
  for (const f of g.fx) drawFx(f);
  bloomPass(ctx);
  drawDragChip(g);
  ctx.restore();
}
