import { TOWERS } from '../data/defs';
import { sfx } from '../audio';
import { buildTower, PAUSED_REASON } from '../game/actions';
import { canvas } from '../render/viewport';
import { session } from '../state';
import type { TowerType } from '../types';
import { tileAt } from './input';
import { notify, showToast } from './state';

/** Dragging a tower from the bar onto the board: preview while dragging, place on release, cancel off-board. */

const DRAG_THRESHOLD_PX = 8;  // movement before a press counts as a drag (below it, it is a tap)
const TOUCH_LIFT_PX = 56;     // the chip floats this far above a finger so the finger doesn't hide the tile
const CANCEL_ZONE_PX = 40;    // a finger this far below the board (deep in the bar) cancels the drag, even though the lifted chip is still over the board

interface Pending {
  type: TowerType;
  pointerId: number;
  startX: number;
  startY: number;
  touch: boolean;
  dragging: boolean;
  /** armed tower before the drag, restored afterwards */
  previousPlacing: TowerType | null;
}

let pending: Pending | null = null;
let suppressClick = false;

/** A drag ends with a click event on the button; the bar asks this so it can ignore it. */
export function consumeSuppressedClick(): boolean {
  const was = suppressClick;
  suppressClick = false;
  return was;
}

export function onTowerPointerDown(e: PointerEvent, type: TowerType): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  try {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); // keep receiving moves even over the canvas
  } catch {
    /* not capturable (e.g. synthetic events); moves still arrive while over the button */
  }
  pending = {
    type, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY,
    touch: e.pointerType !== 'mouse', dragging: false, previousPlacing: session.placing,
  };
}

export function onTowerPointerMove(e: PointerEvent): void {
  const p = pending;
  if (!p || e.pointerId !== p.pointerId || !session.game) return;

  if (!p.dragging) {
    if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < DRAG_THRESHOLD_PX) return;
    if (session.paused) {
      showToast(PAUSED_REASON);
      pending = null;
      return;
    }
    if (session.game.credits < TOWERS[p.type].cost) {
      showToast('Not enough credits');
      pending = null;
      return;
    }
    p.dragging = true;
    session.game.selected = null;
    sfx('pickup');
    session.placing = p.type; // arms the ghost, range circle and route preview
  }

  const rect = canvas.getBoundingClientRect();
  const lift = p.touch ? TOUCH_LIFT_PX : 0;
  const x = e.clientX - rect.left, fy = e.clientY - rect.top, y = fy - lift;
  const chipOverBoard = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
  const inside = chipOverBoard && (!p.touch || fy <= rect.height + CANCEL_ZONE_PX);
  session.drag = { type: p.type, x, y, fx: x, fy, touch: p.touch };
  session.hover = inside ? tileAt(x, y) : null;
  notify();
}

export function onTowerPointerUp(e: PointerEvent): void {
  const p = pending;
  if (!p || e.pointerId !== p.pointerId) return;
  pending = null;
  if (!p.dragging) return; // a tap: the button's normal click handler takes over

  const tile = session.hover;
  const g = session.game;
  if (g && tile) {
    const result = buildTower(p.type, tile);
    if (!result.ok) showToast(result.reason);
  }
  finishDrag(p);
}

export function onTowerPointerCancel(e: PointerEvent): void {
  if (pending && e.pointerId === pending.pointerId) cancelDrag();
}

/** Abort a drag in progress without placing anything. */
export function cancelDrag(): void {
  const p = pending;
  pending = null;
  if (p?.dragging) finishDrag(p);
}

function finishDrag(p: Pending): void {
  session.drag = null;
  session.hover = null;
  session.placing = p.previousPlacing;
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 0); // the click for this press (if any) fires right after pointerup
  notify();
}

