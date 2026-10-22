import { angleDiff, dist } from '../geometry';
import { sfx } from '../audio';
import { currentGame } from '../state';
import type { BoltFx, BulletFx, Fx, RocketFx } from '../types';
import { damage } from './creeps';
import { addFx } from './emit';

const BULLET_SPEED = 0.0024;  // world units per ms
const ROCKET_SPEED = 0.001;
const BEAM_HALF_ANGLE = 0.10472; // ~6 degrees either side of the aim line

function updateBullet(f: BulletFx, dt: number): void {
  if (f.delay > 0) {
    f.delay -= dt;
    if (f.delay <= 0) sfx('minigunSoft', f.x); // the extra barrels of an upgraded Ping
    return;
  }
  f.ttl -= dt;
  if (f.ttl <= 0) {
    f.life = 0;
    if (!f.miss && !f.target.dead) { damage(f.target, f.dmg, 'minigun'); sfx('minigunHit', f.tx); }
    return;
  }
  f.px = f.x;
  f.py = f.y;
  const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy) || 1;
  const mv = BULLET_SPEED * dt;
  f.x += (dx / d) * Math.min(mv, d);
  f.y += (dy / d) * Math.min(mv, d);
  if (f.miss) f.x += Math.cos(f.ang) * mv * 0.2; // shots at an immune boss drift off
}

function updateRocket(f: RocketFx, dt: number): void {
  const g = currentGame();
  f.age += dt;
  // an Interceptor boss destroys rockets that get close
  const shield = g.creeps.find((c) => !c.dead && c.d.boss === 'rocket' && dist(c.x, c.y, f.x, f.y) < 0.17);
  if (shield) {
    f.life = 0;
    addFx({ k: 'boom', x: f.x, y: f.y, col: '#ff9a9a', life: 300, max: 300, r: 0.08 });
    return;
  }
  if (f.target && (f.target.dead || f.target.invisible)) f.target = null;
  if (!f.target && f.age - f.last > 300) {
    f.last = f.age;
    let nearest = 1;
    let found = null as RocketFx['target'];
    for (const c of g.creeps) {
      if (c.dead || c.invisible) continue;
      if (Math.abs(c.x - f.t.x) > f.t.range || Math.abs(c.y - f.t.y) > f.t.range) continue;
      const d = dist(c.x, c.y, f.x, f.y);
      if (d < nearest && d >= 0.1) { nearest = d; found = c; }
    }
    f.target = found;
  }
  if (f.target) {
    const dx = f.target.x - f.x, dy = f.target.y - f.y;
    f.ang += angleDiff(Math.atan2(dy, dx), f.ang) * Math.min(1, 0.0044 * dt * 2.2);
    if (Math.abs(dx) < 0.07 && Math.abs(dy) < 0.07) {
      damage(f.target, f.t.attack, 'rocket');
      sfx('rocketHit', f.x);
      addFx({ k: 'boom', x: f.x, y: f.y, col: '#ff6a4d', life: 350, max: 350, r: 0.1 });
      f.life = 0;
      return;
    }
  }
  f.x += Math.cos(f.ang) * ROCKET_SPEED * dt;
  f.y += Math.sin(f.ang) * ROCKET_SPEED * dt;
  (f.trail ??= []).push([f.x, f.y]);
  if (f.trail.length > 10) f.trail.shift();
  if (f.age > 2000) f.life = 0;
}

function updateBolt(f: BoltFx, dt: number): void {
  f.left -= dt;
  const perStep = f.dmg * (dt / 100);
  for (const c of f.attacked) if (!c.dead) damage(c, perStep, 'lightning');
  if (f.attacked.some((c) => c.dead)) {
    // drop dead links and give back their share of the slow
    for (const c of f.attacked) if (c.dead) c.mod = Math.max(0, c.mod - f.slow);
    f.attacked = f.attacked.filter((c) => !c.dead);
    f.links = f.links.filter((l) => !l.to.dead && (!l.from || !l.from.dead));
  }
  if (f.left <= 0) {
    for (const c of f.attacked) c.mod = Math.max(0, c.mod - f.slow);
    f.life = 0;
  }
}

function updateFx(f: Fx, dt: number): void {
  switch (f.k) {
    case 'bullet': updateBullet(f, dt); break;
    case 'rocket': updateRocket(f, dt); break;
    case 'bolt': updateBolt(f, dt); break;
    default: f.life -= dt; // purely visual effects just fade out
  }
}

/** Advance all effects, projectiles and Trace beams. */
export function updateProjectiles(dt: number): void {
  const g = currentGame();
  for (const f of g.fx) updateFx(f, dt);
  g.fx = g.fx.filter((f) => f.life > 0);

  for (const b of g.beams) {
    const t = b.t;
    b.ang = t.angle;
    b.len = 100;
    // a Prism boss absorbs the beam: nothing behind it is hit
    for (const c of g.creeps) {
      if (c.dead || c.d.boss !== 'laser') continue;
      const off = Math.abs(angleDiff(Math.atan2(c.y - t.y, c.x - t.x), b.ang));
      if (off <= BEAM_HALF_ANGLE) b.len = Math.min(b.len, dist(c.x, c.y, t.x, t.y) - 0.08);
    }
    const frac = Math.min(dt, b.left) / 400;
    for (const c of g.creeps) {
      if (c.dead) continue;
      const off = Math.abs(angleDiff(Math.atan2(c.y - t.y, c.x - t.x), b.ang));
      if (off <= BEAM_HALF_ANGLE && dist(c.x, c.y, t.x, t.y) < b.len) damage(c, t.attack * frac, 'laser');
    }
    b.left -= dt;
  }
  g.beams = g.beams.filter((b) => b.left > 0);
}

