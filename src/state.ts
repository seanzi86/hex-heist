import type { BoardTile, Game, TowerType } from './types';

function loadFlag(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

function saveFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
}

/** Choices that survive between games. */
export const settings = {
  difficulty: 0 as 0 | 1,
};

/** A tower being dragged from the bar onto the board. Coordinates are CSS pixels relative to the canvas. */
export interface DragState {
  type: TowerType;
  /** where the chip is drawn (above the finger on touch, so the finger doesn't hide the tile) */
  x: number;
  y: number;
  /** the actual pointer position */
  fx: number;
  fy: number;
  touch: boolean;
}

/** Things about the current play session (not part of the simulation). */
export const session = {
  game: null as Game | null,
  /** tower type armed for placement */
  placing: 'minigun' as TowerType | null,
  /** 1x / 2x / 3x */
  speed: 1,
  /** the simulation is frozen (building and selling still work) */
  paused: false,
  hover: null as BoardTile | null,
  drag: null as DragState | null,
  /** draw the route creeps will take */
  showRoute: loadFlag('hexheist-route', true),
  /** begin each wave automatically a few seconds after the last one is cleared */
  autoStart: loadFlag('hexheist-auto', false),
};

export function setShowRoute(value: boolean): void {
  session.showRoute = value;
  saveFlag('hexheist-route', value);
}

export function setAutoStart(value: boolean): void {
  session.autoStart = value;
  saveFlag('hexheist-auto', value);
}

export function currentGame(): Game {
  if (!session.game) throw new Error('No game in progress');
  return session.game;
}
