import { sfx } from '../audio';
import { RULES, Tile } from '../constants';
import { TOWERS } from '../data/defs';
import { currentGame, session } from '../state';
import type { BoardTile, Tower, TowerType } from '../types';
import { addFx } from './emit';
import { placementValid, updatePaths } from './grid';
import { newTower, resaleValue } from './towers';

export type BuildResult = { ok: true; tower: Tower } | { ok: false; reason: string };

export const PAUSED_REASON = 'Paused: resume to build';

/** Try to build the armed tower on a tile. */
export function buildTower(type: TowerType, tile: BoardTile): BuildResult {
  const g = currentGame();
  const def = TOWERS[type];
  if (session.paused) return { ok: false, reason: PAUSED_REASON };
  if (g.credits < def.cost) return { ok: false, reason: 'Not enough credits' };
  if (!placementValid(g.grid, tile)) {
    return { ok: false, reason: tile.type === Tile.NORMAL && !tile.tower ? 'That would block the path' : "Can't build here" };
  }
  g.credits -= def.cost;
  const tower = newTower(type, tile);
  tile.tower = tower;
  g.towers.push(tower);
  updatePaths(g.grid);
  sfx('place');
  addFx({ k: 'ring', x: tower.x, y: tower.y, col: def.color, life: 350, max: 350, r: 0.18 });
  return { ok: true, tower };
}

/** Returns a reason if the tower could not be sold. */
export function sellTower(t: Tower): string | null {
  if (session.paused) return PAUSED_REASON;
  const g = currentGame();
  sfx('sell');
  g.credits += resaleValue(t);
  t.tile.tower = null;
  g.towers.splice(g.towers.indexOf(t), 1);
  g.selected = null;
  updatePaths(g.grid);
  return null;
}

export function canUpgrade(t: Tower): boolean {
  return !session.paused && t.level < RULES.maxUpgradeLevel && !t.upgrading && currentGame().credits >= t.upCost;
}

export function upgradeTower(t: Tower): void {
  if (!canUpgrade(t)) return;
  currentGame().credits -= t.upCost;
  t.upgrading = { p: 0 };
  sfx('click');
}

/** Tower types the player can build on the current level. */
export function availableTowers(): TowerType[] {
  const g = currentGame();
  return (Object.keys(TOWERS) as TowerType[]).filter((t) => t !== 'lightning' || g.hasLightning);
}

export function armTower(type: TowerType | null): void {
  session.placing = type;
  currentGame().selected = null;
}
