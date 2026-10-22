import type { CreepId, TowerType } from '../types';

/**
 * Every balance number in one place: tower stats, enemy health and speed, and the health / reward curves.
 * Tuned with tools/bot.ts (`npm run bot`), which plays every level with a simple automatic player.
 */

export interface TowerLevel {
  /** reach in world units (towers see a square this far out) */
  range: number;
  /** milliseconds between shots */
  delay: number;
  /**
   * Ping/Trace/Seeker: damage per bullet, beam hit or missile.
   * Firewall: damage per millisecond to everything in range, times 30.
   * Throttle: slow strength (and 10x that in damage per second to each linked enemy).
   */
  attack: number;
}

export interface TowerBalance {
  cost: number;
  /** stats at each of the four levels */
  levels: [TowerLevel, TowerLevel, TowerLevel, TowerLevel];
  /** price of upgrading from level 0 to 1, 1 to 2 and 2 to 3 */
  upgrade: [number, number, number];
}

export const TOWER_BALANCE: Record<TowerType, TowerBalance> = {
  minigun: {
    cost: 18,
    levels: [
      { range: 0.40, delay: 300, attack: 10 },
      { range: 0.45, delay: 300, attack: 10 },   // two barrels
      { range: 0.50, delay: 280, attack: 11 },   // three barrels
      { range: 0.55, delay: 260, attack: 13 },
    ],
    upgrade: [18, 40, 80],
  },
  laser: {
    cost: 32,
    levels: [
      { range: 0.60, delay: 900, attack: 42 },
      { range: 0.60, delay: 850, attack: 54 },
      { range: 0.60, delay: 800, attack: 74 },
      { range: 0.60, delay: 750, attack: 99 },
    ],
    upgrade: [28, 55, 95],
  },
  rocket: {
    cost: 40,
    levels: [
      { range: 0.50, delay: 2300, attack: 208 },
      { range: 0.55, delay: 2250, attack: 200 }, // two missiles
      { range: 0.60, delay: 2200, attack: 304 },
      { range: 0.65, delay: 2150, attack: 296 }, // three missiles
    ],
    upgrade: [35, 65, 110],
  },
  shockwave: {
    cost: 55,
    levels: [
      { range: 0.24, delay: 1000, attack: 1.8 },
      { range: 0.29, delay: 1000, attack: 2.9 },
      { range: 0.34, delay: 1000, attack: 4.5 },
      { range: 0.39, delay: 1000, attack: 6.7 },
    ],
    upgrade: [45, 85, 150],
  },
  lightning: {
    cost: 45,
    levels: [
      { range: 0.55, delay: 2600, attack: 2 },
      { range: 0.62, delay: 2300, attack: 2.5 },
      { range: 0.69, delay: 2050, attack: 3.2 },
      { range: 0.76, delay: 1800, attack: 4.2 },
    ],
    upgrade: [40, 70, 120],
  },
};

export const CREEP_BALANCE: Record<CreepId, { health: number; mspt: number }> = {
  0: { health: 60, mspt: 1000 },  // Worm
  1: { health: 600, mspt: 2500 }, // Prism
  2: { health: 600, mspt: 2500 }, // Cipher
  3: { health: 600, mspt: 2500 }, // Interceptor
  4: { health: 600, mspt: 2500 }, // Rootkit
  5: { health: 38, mspt: 640 },   // Spike
  6: { health: 130, mspt: 1700 }, // Trojan
};

/** Enemy health multiplier for wave n (0-based): 1 + a*n + b*n^2. */
export const HEALTH_CURVE = { linear: 0.32, quadratic: 0.045 };

/** Credits per kill on wave n: base + perWave * n, rounded up. Bosses pay 7x. */
export const REWARD_CURVE = { base: 1.5, perWave: 0.6 };

/** Credits you start a level with: a little more on later levels, where the first waves hit sooner. */
export const START_CREDITS = { base: 60, perLevel: 3 };

/** Later levels also pay slightly more per kill (a share per level index), so the economy keeps up with enemy health. */
export const LEVEL_REWARD_BONUS = 0.01;

/** Hard mode scales the same numbers: tougher enemies, slightly smaller rewards. */
export const DIFFICULTY = [
  { health: 1, reward: 1 },
  { health: 1.3, reward: 0.9 },
] as const;
