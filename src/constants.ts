/** Flat-top hexes in columns; odd columns sit half a row higher. World space is y-up. */
export const COL = 0.2;      // horizontal distance between columns
export const ROW = 0.26667;  // vertical distance between rows (also the hex height)
export const HW = 0.13333;   // half the hex width/height
export const TAU = Math.PI * 2;

/** Tile type codes used in the level files. */
export const Tile = {
  INVALID: -1,
  NORMAL: 0,
  HEAL: 1,    // repair node: creeps regain health
  DAMAGE: 2,  // corrupt sector: creeps lose health
  FAST: 3,    // overclock: creeps move 2x
  SLOW: 4,    // lag: creeps move 0.5x
  N: 5, NE: 6, NW: 7, S: 8, SE: 9, SW: 10, // data streams force the creep along an arrow
  SPAWN: 11,  // intrusion point
  END: 12,    // the core
  PORTAL_A: 13, PORTAL_B: 14, PORTAL_C: 15, // proxy gates: teleport between tiles of the same kind
} as const;

export const PALETTE = {
  bg: '#04060d',
  cyan: '#00f0ff',
  mag: '#ff2bd6',
  lime: '#b6ff00',
  amber: '#ffb300',
  vio: '#8a5cff',
  red: '#ff3355',
} as const;

/** Core rules: lives, timings and the upgrade limit. Other balance numbers are in data/balance.ts. */
export const RULES = {
  startLives: 12,
  /** between waves there is no timer; starting early earns a bonus that shrinks over this window */
  firstWaveBonusMs: 12000,
  waveBonusMs: 8000,
  /** with auto-start on, the next wave begins this long after the previous one is cleared */
  autoStartMs: 3000,
  upgradeMs: 5000,
  maxUpgradeLevel: 3,
  lightningFromLevel: 20, // level index (0-based) from which the Throttle tower is available
} as const;
