import { sfx } from '../audio';
import { RULES } from '../constants';
import { TOWER_BALANCE } from '../data/balance';
import { TOWERS } from '../data/defs';
import { angleDiff, center, dist } from '../geometry';
import { currentGame } from '../state';
import type { BoardTile, Creep, Tower, TowerType } from '../types';
import { damage } from './creeps';
import { addFx } from './emit';

export function newTower(type: TowerType, tile: BoardTile): Tower {
  const def = TOWERS[type];
  const b = TOWER_BALANCE[type];
  const c = center(tile.x, tile.y);
  return {
    type, def, tile, x: c.x, y: c.y,
    range: b.levels[0].range, delay: b.levels[0].delay, attack: b.levels[0].attack,
    cost: b.cost, upCost: b.upgrade[0],
    level: 0, upgrading: null, sinceFire: 0, sinceTarget: 999, target: null, angle: 0, sw: 0,
  };
}

export const resaleValue = (t: Tower): number => Math.ceil(t.cost * 0.5);

/** Move a tower up one level using the stat table in balance.ts. */
function finishUpgrade(t: Tower): void {
  const b = TOWER_BALANCE[t.type];
  t.cost += t.upCost;
  t.level++;
  const lv = b.levels[t.level];
  t.range = lv.range;
  t.delay = lv.delay;
  t.attack = lv.attack;
  t.upCost = b.upgrade[t.level] ?? 0;
}

// ---------- targeting ----------
/** Towers see a square around themselves: a cheap check that also feels generous on a hex grid. */
const inBox = (t: Tower, c: Creep): boolean => Math.abs(c.x - t.x) <= t.range && Math.abs(c.y - t.y) <= t.range;
const angleTo = (t: Tower, c: Creep): number => Math.atan2(c.y - t.y, c.x - t.x);

/** The creep closest to the core. */
function nearestToCore(t: Tower): Creep | null {
  let best: Creep | null = null;
  let bestPrio = 10000;
  for (const c of currentGame().creeps) {
    if (c.dead || c.invisible) continue;
    if (inBox(t, c) && c.tile.prio < bestPrio) { bestPrio = c.tile.prio; best = c; }
  }
  return best;
}

/** Trace picks the aim line that would hit the most creeps. */
function bestBeamTarget(t: Tower): Creep | null {
  const scan = t.range * 1.5;
  const near: { c: Creep; a: number; d: number }[] = [];
  for (const c of currentGame().creeps) {
    if (c.dead || c.invisible) continue;
    const d = dist(c.x, c.y, t.x, t.y);
    if (d < scan) near.push({ c, a: angleTo(t, c), d });
  }
  let best: Creep | null = null;
  let bestHits = 0;
  for (const n of near) {
    if (n.d > t.range) continue;
    let hits = 0;
    for (const m of near) if (Math.abs(m.a - n.a) <= 0.0524) hits++;
    if (hits > bestHits) { bestHits = hits; best = n.c; }
  }
  return best;
}

export function updateTower(t: Tower, dt: number): void {
  if (t.upgrading) {
    t.upgrading.p += dt / RULES.upgradeMs;
    if (t.upgrading.p >= 1) { t.upgrading = null; finishUpgrade(t); sfx('up'); }
    return;
  }
  const g = currentGame();

  if (t.type === 'shockwave') {
    // Firewall burns everything in range continuously and emits a visual pulse
    let any = false;
    for (const c of g.creeps) {
      if (c.dead || c.invisible || !inBox(t, c)) continue;
      if (dist(c.x, c.y, t.x, t.y) < t.range) { damage(c, t.attack * 0.03333 * dt, 'shockwave'); any = true; }
    }
    t.sw = any ? t.sw + dt : 99999;
    if (any && t.sw >= t.delay) {
      t.sw = 0;
      sfx('shockwave', t.x);
      addFx({ k: 'shock', x: t.x, y: t.y, r: t.range, life: 600, max: 600 });
    }
    return;
  }

  t.sinceFire += dt;
  t.sinceTarget += dt;
  if (t.sinceTarget > 250 || !t.target || t.target.dead) {
    t.target = t.type === 'laser' ? bestBeamTarget(t) : nearestToCore(t);
    t.sinceTarget = 0;
  }
  const target = t.target;
  if (!target || target.dead) return;

  const want = angleTo(t, target);
  if (t.type === 'rocket') t.angle += angleDiff(want, t.angle) * (1 - Math.pow(0.89, dt / 16.7)); // slews toward the target
  else t.angle = want;
  if (t.sinceFire > t.delay) { t.sinceFire = 0; fire(t, target); }
}

function fire(t: Tower, target: Creep): void {
  const g = currentGame();
  sfx(t.type, t.x);
  switch (t.type) {
    case 'minigun': {
      // later levels fire extra staggered bullets
      const shots: [number, number][] = t.level === 0 ? [[0, 0]] : t.level === 1 ? [[0.2, 0], [-0.2, 120]] : [[0, 0], [0.3, 120], [-0.3, 120]];
      const immune = target.d.boss === 'minigun';
      for (const [spread, delay] of shots) {
        const a = t.angle + spread;
        const sx = t.x + Math.cos(a) * 0.06, sy = t.y + Math.sin(a) * 0.06;
        const travel = dist(target.x, target.y, sx, sy) + (immune ? 2 : 0);
        g.fx.push({ k: 'bullet', x: sx, y: sy, tx: target.x, ty: target.y, target, dmg: t.attack, delay, ttl: Math.max(40, travel / 0.0024), life: 1, max: 1, miss: immune, ang: a });
      }
      break;
    }
    case 'laser':
      g.beams.push({ t, ang: t.angle, left: 400, len: 100 });
      break;
    case 'rocket': {
      const launch = t.level === 0 ? [0] : t.level < 3 ? [0.3927, -0.3927] : [0, 4.712, -4.712];
      for (const o of launch) g.fx.push({ k: 'rocket', t, x: t.x, y: t.y, ang: t.angle + o, age: 0, target, last: 0, life: 1, max: 1 });
      break;
    }
    case 'lightning':
      fireLightning(t, target);
      break;
    case 'shockwave':
      break;
  }
}

/** Throttle: an arc hops between nearby creeps within its range budget, damaging and slowing each. */
function fireLightning(t: Tower, target: Creep): void {
  const near = currentGame().creeps.filter((c) => !c.dead && !c.invisible && dist(c.x, c.y, t.x, t.y) <= t.range);
  const attacked: Creep[] = [target];
  const links = [{ from: null as Creep | null, to: target }];
  let budget = t.range - dist(target.x, target.y, t.x, t.y);
  while (budget > 0 && attacked.length <= 5) {
    let bestDist = Infinity;
    let bestCreep: Creep | null = null;
    let bestFrom: Creep | null = null;
    for (const c of near) {
      if (attacked.includes(c)) continue;
      const fromTower = dist(c.x, c.y, t.x, t.y);
      if (fromTower < bestDist) { bestDist = fromTower; bestCreep = c; bestFrom = null; }
      for (const s of attacked) {
        const d = dist(c.x, c.y, s.x, s.y);
        if (d < bestDist) { bestDist = d; bestCreep = c; bestFrom = s; }
      }
    }
    if (!bestCreep || budget <= bestDist) break;
    attacked.push(bestCreep);
    links.push({ from: bestFrom, to: bestCreep });
    budget -= bestDist;
  }
  const slow = t.attack;
  for (const c of attacked) c.mod += slow;
  currentGame().fx.push({ k: 'bolt', t, links, attacked, slow, dmg: t.attack, left: 1500, life: 1, max: 1 });
}

