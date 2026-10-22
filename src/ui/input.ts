import { HW, Tile } from '../constants';
import { armTower, availableTowers, buildTower } from '../game/actions';
import { startNextWave } from '../game/engine';
import { center, dist } from '../geometry';
import { canvas, toWorld } from '../render/viewport';
import { session, setShowRoute } from '../state';
import type { BoardTile } from '../types';
import { openHelp } from './controller';
import { cancelDrag } from './drag';
import { cycleSpeed, toggleAutoStart, togglePause } from './playback';
import { notify, showToast, ui } from './state';

/** The playable tile under a canvas position, if any. */
export function tileAt(px: number, py: number): BoardTile | null {
  const g = session.game;
  if (!g) return null;
  const [wx, wy] = toWorld(px, py);
  let best: BoardTile | null = null;
  let bestDist = Infinity;
  for (const t of g.grid.all) {
    if (t.type === Tile.INVALID) continue;
    const c = center(t.x, t.y);
    const d = dist(c.x, c.y, wx, wy);
    if (d < bestDist) { bestDist = d; best = t; }
  }
  return bestDist < HW * 1.05 ? best : null;
}

function canvasPoint(e: PointerEvent): [number, number] {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

export function onCanvasPointerMove(e: PointerEvent): void {
  if (session.drag) return; // the drag owns the hover tile
  session.hover = tileAt(...canvasPoint(e));
}

export function onCanvasPointerLeave(): void {
  if (session.drag) return;
  session.hover = null;
}

export function onCanvasPointerDown(e: PointerEvent): void {
  const g = session.game;
  if (!g || g.over) return;
  const tile = tileAt(...canvasPoint(e));
  session.hover = tile;
  if (!tile) { g.selected = null; notify(); return; }
  if (tile.type === Tile.SPAWN && g.intermission.active) { startNextWave(); return; }
  if (tile.tower) { g.selected = g.selected === tile.tower ? null : tile.tower; notify(); return; }

  g.selected = null;
  if (session.placing) {
    const result = buildTower(session.placing, tile);
    if (!result.ok) showToast(result.reason);
  }
  notify();
}

export function onKeyDown(e: KeyboardEvent): void {
  const g = session.game;
  if (!g || ui.screen !== 'game' || ui.help) return; // the help sheet owns the keyboard while it is open
  if (e.code === 'Space') {
    e.preventDefault();
    startNextWave();
  } else if (e.key >= '1' && e.key <= '5') {
    const type = availableTowers()[Number(e.key) - 1];
    if (type) { armTower(type); notify(); }
  } else if (e.key === 'Escape') {
    if (session.drag) { cancelDrag(); return; }
    if (session.paused) { togglePause(); return; } // Esc closes the pause card
    armTower(null);
    notify();
  } else if (e.key === 'p') {
    togglePause();
  } else if (e.key === 'a') {
    toggleAutoStart();
  } else if (e.key === 'h') {
    openHelp();
  } else if (e.key === 'r') {
    setShowRoute(!session.showRoute);
    notify();
  } else if (e.key === 'f') {
    cycleSpeed();
  }
}
