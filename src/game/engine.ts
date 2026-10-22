import { sfx } from '../audio';
import { CREEPS } from '../data/defs';
import { LEVELS } from '../data/levels';
import { RULES } from '../constants';
import { hooks } from '../hooks';
import { currentGame, session, settings } from '../state';
import type { CreepId, Game } from '../types';
import { startCredits } from './config';
import { addFx } from './emit';
import { makeCreep, placeCreep, updateCreep } from './creeps';
import { buildGrid, updatePaths } from './grid';
import { updateProjectiles } from './projectiles';
import { updateTower } from './towers';

export function createGame(index: number): Game {
  const level = LEVELS[index];
  const grid = buildGrid(level);
  updatePaths(grid);
  const game: Game = {
    index, level, grid, towers: [], creeps: [], fx: [], beams: [],
    credits: startCredits(index), lives: RULES.startLives, score: 0,
    wave: -1, waveCount: 0,
    intermission: { t: 0, bonusWindow: RULES.firstWaveBonusMs, active: true },
    spawn: null, over: false, completed: false,
    hasLightning: index >= RULES.lightningFromLevel,
    time: 0, shake: 0, selected: null,
  };
  session.game = game;
  session.placing = 'minigun';
  return game;
}

// ---------- waves ----------
function startWave(): void {
  const g = currentGame();
  g.wave++;
  g.waveCount++;
  g.spawn = { list: [...g.level.waves[g.wave % g.level.waves.length]], ms: -700, idx: 0 };
  g.intermission.active = false;
  sfx('wave');
  announceBosses(g.spawn.list);
  hooks.hud();
}

/** Warn about the bosses in this wave, and what they shrug off, before they appear. */
function announceBosses(ids: number[]): void {
  const warnings = new Set<string>();
  for (const id of ids) {
    const def = CREEPS[id as CreepId];
    if (def.boss && def.warning) warnings.add(`${def.name}: ${def.warning}`);
  }
  if (warnings.size) sfx('bossAlarm');
  if (warnings.size) hooks.toast(`⚠ Boss wave. ${[...warnings].join(' · ')}`, false, { warn: true, ms: 4000 });
}

function startIntermission(): void {
  const g = currentGame();
  g.intermission = { t: 0, bonusWindow: RULES.waveBonusMs, active: true };
  if (!g.completed && g.wave >= g.level.waves.length - 1) {
    g.completed = true;
    sfx('levelComplete');
    hooks.toast('Core secured! Hold the line for a high score', true);
    saveBest();
  } else sfx('waveClear');
}

/** Points for starting the next wave right now: shrinks the longer you wait. */
export function earlyStartBonus(g: Game): number {
  const i = g.intermission;
  return Math.floor(Math.max(0, i.bonusWindow - i.t) / 30);
}

/** Begin the next wave now (the ▶ button, Space, or tapping the intrusion point). */
export function startNextWave(): void {
  const g = currentGame();
  if (!g.intermission.active || g.over) return;
  g.score += earlyStartBonus(g);
  startWave();
}

function spawnCreeps(dt: number): void {
  const g = currentGame();
  const s = g.spawn;
  if (!s) return;
  s.ms += dt;
  if (s.list.length && s.ms > 1400 + s.idx * 100) {
    const id = s.list.shift() as CreepId;
    const spawn = g.grid.spawns[s.idx];
    const creep = makeCreep(id, g.wave, spawn);
    placeCreep(creep, spawn);
    g.creeps.push(creep);
    addFx({ k: 'ring', x: creep.x, y: creep.y, col: '#ff6a6a', life: 500, max: 500, r: 0.2 });
    s.idx = (s.idx + 1) % g.grid.spawns.length;
    if (s.idx === 0) s.ms = 0; // after a full round of spawn points, pause before the next round
  }
  if (!s.list.length) g.spawn = null;
}

// ---------- main step ----------
/** Advance the simulation by `dt` milliseconds. */
export function update(dt: number): void {
  const g = currentGame();
  if (g.shake > 0) g.shake = Math.max(0, g.shake - dt);
  if (g.over) {
    updateProjectiles(dt);
    return;
  }
  g.time += dt;

  if (g.intermission.active) {
    g.intermission.t += dt;
    if (session.autoStart && g.intermission.t >= RULES.autoStartMs) startNextWave();
  }
  spawnCreeps(dt);
  for (const c of g.creeps) if (!c.dead) updateCreep(c, dt);
  for (const t of g.towers) updateTower(t, dt);
  updateProjectiles(dt);
  g.creeps = g.creeps.filter((c) => !c.dead);

  if (g.lives <= 0) {
    endGame();
    return;
  }
  if (!g.spawn && !g.creeps.length && !g.intermission.active && g.wave >= 0) startIntermission();
}

// ---------- scoring ----------
function endGame(): void {
  const g = currentGame();
  g.over = true;
  g.shake = 500;
  sfx('over');
  g.score += Math.max(0, g.lives * 2000);
  hooks.gameOver();
}

const bestKey = (index: number): string => `hexheist2-best-${settings.difficulty}-${index}`;

export function bestScore(index: number, difficulty = settings.difficulty): number {
  try {
    return Number(localStorage.getItem(`hexheist2-best-${difficulty}-${index}`)) || 0;
  } catch {
    return 0;
  }
}

/** The score as it counts for the leaderboard: the lives bonus only applies once a level is finished or completed. */
function countedScore(g: Game): number {
  if (g.over) return g.score; // endGame() already added the bonus
  return g.score + (g.completed ? Math.max(0, g.lives * 2000) : 0);
}

/** Store the score if it beats the saved best. Returns true when it did. */
export function saveBest(): boolean {
  const g = currentGame();
  const current = countedScore(g);
  if (current <= 0 || current <= bestScore(g.index)) return false;
  try {
    localStorage.setItem(bestKey(g.index), String(current));
    return true;
  } catch {
    return false; // storage unavailable
  }
}

