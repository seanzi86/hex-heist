import { sfx } from '../audio';
import { Tile } from '../constants';
import { CREEP_BALANCE } from '../data/balance';
import { CREEPS } from '../data/defs';
import { center } from '../geometry';
import { hooks } from '../hooks';
import { currentGame, settings } from '../state';
import type { BoardTile, Creep, CreepId, TowerType } from '../types';
import { creditsForWave, healthMultiplier } from './config';
import { addFx } from './emit';
import { nextStep } from './grid';

const PURPLE: CreepId = 6;

export function makeCreep(id: CreepId, wave: number, tile: BoardTile): Creep {
  const d = CREEPS[id];
  const g = currentGame();
  let max = CREEP_BALANCE[id].health * healthMultiplier(wave) * g.level.hpScale;
  let reward = creditsForWave(wave, g.index);
  if (d.boss) reward *= 7;
  if (id === PURPLE) max /= 2; // the Trojan's shell; the payload inside is a separate creep
  const p = center(tile.x, tile.y);
  return {
    id, d, wave, max, hp: max, reward, tile, target: null, prog: 0, mspt: d.mspt, mod: 0,
    invisible: false, tele: null, hurt: 99999, x: p.x, y: p.y, ang: 0, rot: Math.random() * 360, child: false, dead: false,
  };
}

export function placeCreep(c: Creep, tile: BoardTile): void {
  c.tile = tile;
  c.target = null;
  c.prog = 0;
  const p = center(tile.x, tile.y);
  c.x = p.x;
  c.y = p.y;
}

function pickTarget(c: Creep): void {
  const step = nextStep(c.tile);
  if (!step) { c.target = null; return; }
  if (step.viaPortal) { c.tele = { age: 0, dest: step.tile }; c.target = null; return; }
  c.target = step.tile;
  c.prog = 0;
}

export function updateCreep(c: Creep, dt: number): void {
  const g = currentGame();
  c.hurt += dt;
  if (c.tele) {
    c.tele.age += dt;
    if (c.tele.age > 375) c.invisible = true;
    if (c.tele.age > 1500) {
      placeCreep(c, c.tele.dest);
      c.tele = null;
      c.invisible = false;
    }
    return;
  }
  if (!c.target) pickTarget(c);
  const target = c.target;
  if (!target) return;

  const under = c.prog > 0.5 ? target.type : c.tile.type;
  let step = dt / c.mspt;
  if (c.mod > 0) step *= 1 - (Math.min(c.mod, 10) / 10) * 0.75; // Throttle slow
  if (under === Tile.FAST) step *= 2;
  else if (under === Tile.SLOW) step *= 0.5;
  else if (under === Tile.DAMAGE) {
    c.hurt = 0;
    c.hp -= Math.ceil(c.max / (140 + c.wave * 10)) * (dt / 40);
    if (c.hp <= 0) { killCreep(c); return; }
  } else if (under === Tile.HEAL) {
    c.hurt = 0;
    c.hp = Math.min(c.max, c.hp + Math.ceil(c.max / (140 + c.wave * 10)) * (dt / 40));
  }

  c.prog += step;
  if (c.prog >= 1) {
    placeCreep(c, target);
    if (under === Tile.HEAL) addFx({ k: 'ring', x: c.x, y: c.y, col: '#4dff7a', life: 500, max: 500, r: 0.2 });
    else if (under === Tile.DAMAGE) addFx({ k: 'ring', x: c.x, y: c.y, col: '#ff4d4d', life: 500, max: 500, r: 0.2 });
    if (g.grid.ends.includes(target)) creepReachedCore(c);
  } else {
    const a = center(c.tile.x, c.tile.y), b = center(target.x, target.y);
    c.x = a.x + (b.x - a.x) * c.prog;
    c.y = a.y + (b.y - a.y) * c.prog;
    c.ang = Math.atan2(b.y - a.y, b.x - a.x);
  }
}

export function killCreep(c: Creep): void {
  if (c.dead) return;
  const g = currentGame();
  c.dead = true;
  g.score += c.reward * (settings.difficulty === 0 ? 15 : 22);
  g.credits += c.reward;
  addFx({ k: 'boom', x: c.x, y: c.y, col: c.d.color, life: 450, max: 450, r: c.d.boss ? 0.3 : 0.15 });
  addFx({ k: 'text', x: c.x, y: c.y, txt: '+' + c.reward, col: '#b6ff00', life: 800, max: 800 });
  if (c.d.boss) { sfx('boss', c.x); g.shake = 280; } else sfx('pop', c.x);

  if (c.id === PURPLE && !c.child) {
    // the Trojan's payload: two smaller creeps burst out
    for (let i = 0; i < 2; i++) {
      const k = makeCreep(PURPLE, c.wave, c.tile);
      k.child = true;
      k.reward = Math.floor(creditsForWave(c.wave, g.index) / 2);
      k.max = Math.floor(k.max * 0.6 - k.max / 12 + (k.max / 6) * Math.random());
      k.hp = k.max;
      k.mspt = 1000;
      g.creeps.push(k);
    }
  }
  hooks.hud();
}

function creepReachedCore(c: Creep): void {
  const g = currentGame();
  c.dead = true;
  g.lives = Math.max(0, g.lives - 1);
  g.shake = 300;
  sfx('leak');
  if (g.lives > 0 && g.lives <= 3) setTimeout(() => sfx('lowLives'), 500);
  addFx({ k: 'boom', x: c.x, y: c.y, col: '#ff3355', life: 600, max: 600, r: 0.3 });
  hooks.hud();
}

/** Apply damage; `source` lets bosses ignore the one tower type they are immune to. */
export function damage(c: Creep, amount: number, source: TowerType): void {
  if (c.dead || c.hp <= 0) return;
  if (c.d.boss === source) return;
  c.hp -= amount;
  c.hurt = 0;
  if (c.hp <= 0) killCreep(c);
}
