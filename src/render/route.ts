import { PALETTE, TAU } from '../constants';
import { center } from '../geometry';
import { traceRoute, type NextStep, updatePaths } from '../game/grid';
import type { BoardTile, Game, Grid } from '../types';
import { ctx, sp, view } from './viewport';

type Route = NextStep[];

/** Routes with the towers as they are now (recomputed only when towers change). */
let cachedGrid: Grid | null = null;
let cachedRev = -1;
let cachedRoutes: Route[] = [];

function currentRoutes(g: Game): Route[] {
  if (cachedGrid !== g.grid || cachedRev !== g.grid.rev) {
    cachedGrid = g.grid;
    cachedRev = g.grid.rev;
    cachedRoutes = g.grid.spawns.map((s) => traceRoute(g.grid, s));
  }
  return cachedRoutes;
}

export interface PlacementPreview {
  /** every intrusion point can still reach the core */
  valid: boolean;
  /** the routes creeps would take if a tower stood on the tile */
  routes: Route[];
}

let previewGrid: Grid | null = null;
let previewKey = '';
let previewValue: PlacementPreview | null = null;

/** "What if" routes for a tower on `tile` (cached per tile until towers change). */
export function previewPlacement(g: Game, tile: BoardTile): PlacementPreview {
  const key = `${g.grid.rev}:${tile.x},${tile.y}`;
  if (previewValue && previewGrid === g.grid && key === previewKey) return previewValue; // same board, same towers, same tile
  updatePaths(g.grid, tile);
  const valid = g.grid.spawns.every((s) => s.prio <= g.grid.W * g.grid.H);
  // trace with the tile treated as a tower, so the route can't pass through it
  const routes = valid ? g.grid.spawns.map((s) => traceRoute(g.grid, s, tile)) : [];
  updatePaths(g.grid, undefined, false); // put the real paths back
  previewGrid = g.grid;
  previewKey = key;
  previewValue = { valid, routes };
  return previewValue;
}

/** Marching dashes along a route; proxy-gate jumps break the line and get a ring at each end. */
function strokeRoute(route: Route, color: string, alpha: number, now: number): void {
  const s = view.S;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = Math.max(1.5, s * 0.014);
  ctx.setLineDash([s * 0.03, s * 0.04]);
  ctx.lineDashOffset = -now * 0.03;
  ctx.beginPath();
  route.forEach((step, i) => {
    const c = center(step.tile.x, step.tile.y);
    const [px, py] = sp(c.x, c.y);
    if (i === 0 || step.viaPortal) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.lineWidth = Math.max(1, s * 0.01);
  route.forEach((step, i) => {
    if (!step.viaPortal || i === 0) return;
    for (const t of [route[i - 1].tile, step.tile]) {
      const c = center(t.x, t.y);
      const [px, py] = sp(c.x, c.y);
      ctx.beginPath();
      ctx.arc(px, py, s * 0.05, 0, TAU);
      ctx.stroke();
    }
  });
  ctx.restore();
}

/** Draw the route creeps will take; while placing a tower, also where the route would go if it stood on the hovered tile. */
export function drawRoutes(g: Game, preview: PlacementPreview | null): void {
  const showNew = preview?.valid === true;
  for (const route of currentRoutes(g)) strokeRoute(route, PALETTE.cyan, showNew ? 0.2 : 0.45, g.time);
  if (showNew && preview) for (const route of preview.routes) strokeRoute(route, PALETTE.lime, 0.85, g.time);
}
