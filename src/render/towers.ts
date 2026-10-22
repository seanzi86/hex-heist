import { TAU } from '../constants';
import type { Tower } from '../types';
import { drawGlow } from './glow';
import { hash2, poly, roundRect } from './shapes';
import { ctx, sp, view } from './viewport';

/**
 * Towers are hexagonal chips that sit on the hex tiles. The chip's trim shows the upgrade level
 * (brackets, an outer ring, then an orbiting spark and crest), and each tower type has its own animated glyph.
 * Projectiles, beams and arcs are separate effects (see effects.ts); this file only draws the tower itself.
 */

/** Everything the art needs, derived from the tower and the game clock. */
interface Art {
  /** half the chip size in px */
  h: number;
  level: number;
  now: number;
  /** aim angle (y-up, as in the game) */
  angle: number;
  /** ms since the tower last fired; large when it never fires (Firewall) or is idle */
  sinceFire: number;
  delay: number;
  /** has a target (Trace aim line) or enemies in range (Firewall) */
  active: boolean;
  col: string;
}

const NEVER = 99999;

export function drawTower(t: Tower, now: number): void {
  const [px, py] = sp(t.x, t.y);
  const art: Art = {
    h: view.S * 0.085,
    level: t.level,
    now,
    angle: t.angle,
    sinceFire: t.type === 'shockwave' ? NEVER : t.sinceFire,
    delay: t.delay,
    active: t.type === 'shockwave' ? t.sw < NEVER : !!t.target && !t.target.dead,
    col: t.def.color,
  };
  ctx.save();
  ctx.translate(px, py);

  const kick = art.sinceFire < 90 ? 1 + (1 - art.sinceFire / 90) * 0.6 : 1; // glow swells when the tower fires
  chipBase(art, kick);
  switch (t.type) {
    case 'minigun': drawPing(art); break;
    case 'laser': drawTrace(art); break;
    case 'rocket': drawSeeker(art); break;
    case 'shockwave': drawFirewall(art); break;
    case 'lightning': drawThrottle(art); break;
  }
  chipTrim(art);

  if (t.upgrading) { // a progress ring around the chip while it upgrades
    const lw = Math.max(2, art.h * 0.16);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, art.h * 1.5, -Math.PI / 2, -Math.PI / 2 + TAU * t.upgrading.p);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 0.25 + 0.25 * Math.sin(now / 60);
    ctx.fillStyle = art.col;
    poly(ctx, 6, art.h * 1.2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ---------------- chip: body, pins and level trim ----------------
function chipBase(a: Art, kick: number): void {
  const { h, level, now, col } = a;
  const lw = Math.max(1.5, h * 0.13);
  drawGlow(0, 0, h * (2.3 + level * 0.14) * kick, col, 0.36 + level * 0.05 + 0.1 * Math.sin(now / 400) + (kick - 1) * 0.7);

  if (level >= 2) { // level 3+: a second outer ring
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = lw * 0.55;
    poly(ctx, 6, h * 1.2 * 1.26);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#050a12';
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  poly(ctx, 6, h * 1.2);
  ctx.fill();
  ctx.stroke();

  // pins on the six corners
  ctx.lineWidth = Math.max(1, h * 0.05);
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = (i * TAU) / 6, r = h * 1.2;
    ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
    ctx.lineTo(Math.cos(ang) * (r + h * 0.24), Math.sin(ang) * (r + h * 0.24));
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function chipTrim(a: Art): void {
  const { h, level, now, col } = a;
  const lw = Math.max(1.5, h * 0.13);
  ctx.strokeStyle = col;
  ctx.fillStyle = col;

  if (level >= 1) { // level 2+: brackets on the corners
    ctx.lineWidth = lw * 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (i * TAU) / 6, r = h * 1.34;
      ctx.moveTo(Math.cos(ang - 0.2) * r, Math.sin(ang - 0.2) * r);
      ctx.arc(0, 0, r, ang - 0.2, ang + 0.2);
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  if (level >= 3) { // level 4: a bright spark circling the chip, and a pulsing crest
    const ang = now / 700, r = h * 1.62;
    drawGlow(Math.cos(ang) * r, Math.sin(ang) * r, h * 0.45, col, 0.9);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(Math.cos(ang) * r, Math.sin(ang) * r, h * 0.08, 0, TAU);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(now / 260);
    const y = -h * 1.62, w = h * 0.2;
    ctx.beginPath();
    ctx.moveTo(0, y - h * 0.22);
    ctx.lineTo(w, y + h * 0.08);
    ctx.lineTo(-w, y + h * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // level pips (4 slots)
  ctx.fillStyle = col;
  for (let i = 0; i < 4; i++) {
    ctx.globalAlpha = i <= level ? 1 : 0.2;
    ctx.fillRect(-h * 0.7 + i * h * 0.38, h * 1.42, h * 0.26, h * 0.2);
  }
  ctx.globalAlpha = 1;
}

// ---------------- the five towers ----------------
/** Ping: 1-3 barrels that recoil, with a muzzle flash. */
function drawPing(a: Art): void {
  const { h, level, sinceFire, angle, col } = a;
  const barrels = [1, 2, 3, 3][level];
  const kick = Math.max(0, 1 - sinceFire / 150);
  ctx.save();
  ctx.rotate(-angle);
  ctx.translate(-kick * 0.3 * h, 0);
  for (let i = 0; i < barrels; i++) {
    const y = (i - (barrels - 1) / 2) * h * 0.44;
    ctx.fillStyle = col;
    ctx.fillRect(0.15 * h, y - 0.09 * h, 0.95 * h, 0.18 * h);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(1.0 * h, y - 0.09 * h, 0.12 * h, 0.18 * h);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  ctx.fillStyle = '#08121e';
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(1.5, h * 0.12);
  ctx.beginPath(); ctx.arc(0, 0, h * 0.52, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(0, 0, h * 0.2, 0, TAU); ctx.fill();

  if (sinceFire < 90) { // muzzle flash
    ctx.save();
    ctx.rotate(-angle);
    const x = 1.2 * h;
    drawGlow(x, 0, h * 0.9, '#ffffff', 0.9 * (1 - sinceFire / 90));
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (i * TAU) / 8, r = i % 2 ? h * 0.14 : h * 0.4;
      ctx.lineTo(x + Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** Trace: a long emitter with a spinning lens that charges before each shot and shows an aim line. */
function drawTrace(a: Art): void {
  const { h, level, sinceFire, angle, delay, now, active, col } = a;
  const emitters = [1, 2, 3, 4][level];
  const window = Math.min(600, delay * 0.7);
  const charge = sinceFire < NEVER ? Math.max(0, Math.min(1, (sinceFire - (delay - window)) / window)) : 0;
  ctx.save();
  ctx.rotate(-angle);
  if (active) { // faint aim line
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(1.2 * h, 0); ctx.lineTo(2.8 * h, 0); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  for (let k = 1; k < emitters; k++) { // extra emitters on higher levels
    const side = k % 2 ? 1 : -1, y = side * (0.34 + Math.ceil(k / 2) * 0.16) * h;
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0.1 * h, y - 0.045 * h, 0.8 * h, 0.09 * h);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#08121e';
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(1.5, h * 0.1);
  roundRect(ctx, -0.35 * h, -0.2 * h, 1.3 * h, 0.4 * h, 0.12 * h);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = col;
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 3; i++) ctx.fillRect((-0.15 + i * 0.3) * h, -0.2 * h, 0.06 * h, 0.4 * h);
  ctx.globalAlpha = 1;

  ctx.save(); // spinning lens
  ctx.translate(0.98 * h, 0);
  ctx.rotate(now / 380);
  ctx.fillStyle = col;
  ctx.fillRect(-0.17 * h, -0.17 * h, 0.34 * h, 0.34 * h);
  ctx.fillStyle = '#04060d';
  ctx.fillRect(-0.07 * h, -0.07 * h, 0.14 * h, 0.14 * h);
  ctx.restore();
  if (charge > 0) drawGlow(0.98 * h, 0, h * (0.3 + 0.7 * charge), '#ffffff', 0.25 + 0.75 * charge);
  ctx.restore();
}

/** Seeker: an arrowhead launcher showing 1-3 loaded missiles; the first slot empties on firing, then reloads. */
function drawSeeker(a: Art): void {
  const { h, level, sinceFire, angle, col } = a;
  const missiles = [1, 2, 2, 3][level];
  ctx.save();
  ctx.rotate(-angle);
  ctx.beginPath();
  ctx.moveTo(1.05 * h, 0); ctx.lineTo(-0.6 * h, -0.68 * h); ctx.lineTo(-0.2 * h, 0); ctx.lineTo(-0.6 * h, 0.68 * h);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(1.5, h * 0.1);
  ctx.lineJoin = 'round';
  ctx.stroke();
  for (let i = 0; i < missiles; i++) {
    const y = (i - (missiles - 1) / 2) * 0.26 * h;
    const alpha = i === 0 ? (sinceFire < 200 ? 0 : Math.min(1, (sinceFire - 200) / 500)) : 1;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#050a12';
    ctx.fillRect(-0.25 * h, y - 0.055 * h, 0.8 * h, 0.11 * h);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0.55 * h, y - 0.1 * h); ctx.lineTo(0.85 * h, y); ctx.lineTo(0.55 * h, y + 0.1 * h);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** Firewall: rings that spin faster and flicker with flames when enemies are in range, plus outgoing heat pulses. */
function drawFirewall(a: Art): void {
  const { h, level, now, active, col } = a;
  const speed = active ? 1 : 0.4;
  const rings = [1, 2, 2, 2][level];
  const lw = Math.max(1.5, h * 0.1);
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  for (let r = 0; r < rings; r++) {
    poly(ctx, 6, (0.86 - r * 0.28) * h, ((now * speed) / 2400) * (r % 2 ? -1 : 1));
    ctx.globalAlpha = 1 - r * 0.25;
    ctx.stroke();
  }
  ctx.globalAlpha = active ? 0.55 : 0.3;
  ctx.lineWidth = lw * 0.5;
  poly(ctx, 12, 1.0 * h, (-now * speed) / 1500, 0.78);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = col;
  poly(ctx, 6, 0.34 * h * (1 + 0.12 * Math.sin(now / 220)), now / 900);
  ctx.fill();

  if (active) {
    for (let i = 0; i < 6; i++) { // flickering flames around the core
      const ang = (i * TAU) / 6 + now / 700;
      const len = 0.3 * h * (0.6 + 0.4 * Math.sin(now / 90 + i * 2));
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang - 0.2) * 0.5 * h, Math.sin(ang - 0.2) * 0.5 * h);
      ctx.lineTo(Math.cos(ang) * (0.5 * h + len), Math.sin(ang) * (0.5 * h + len));
      ctx.lineTo(Math.cos(ang + 0.2) * 0.5 * h, Math.sin(ang + 0.2) * 0.5 * h);
      ctx.closePath();
      ctx.fill();
    }
    const p = (now % 1000) / 1000; // heat pulse
    ctx.globalAlpha = (1 - p) * 0.7;
    ctx.lineWidth = lw;
    poly(ctx, 6, (0.5 + 1.9 * p) * h);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** Throttle: a bolt with idle crackle, orbiting sparks (one more per level) and a flicker of arcs when it fires. */
function drawThrottle(a: Art): void {
  const { h, level, now, sinceFire, col } = a;
  const sparks = [2, 3, 4, 5][level];
  const arc = (len: number, ang: number, seed: number, width: number, alpha: number): void => {
    ctx.strokeStyle = '#fff7a8';
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * 0.3 * h, Math.sin(ang) * 0.3 * h);
    for (let k = 1; k <= 3; k++) {
      const d = (len * k) / 3, j = (hash2(seed, k, 0) - 0.5) * 0.5 * h;
      ctx.lineTo(Math.cos(ang) * d - Math.sin(ang) * j, Math.sin(ang) * d + Math.cos(ang) * j);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  const q = Math.floor(now / 110);
  for (let i = 0; i < 2 + level; i++) { // idle crackle
    if (hash2(q, i, 0) > 0.35) arc(1.15 * h, hash2(q, i + 9, 0) * TAU, q * 13 + i, Math.max(1, h * 0.06), 0.55);
  }
  if (sinceFire < 160) { // a burst of short arcs on each shot
    const f = 1 - sinceFire / 160;
    for (let i = 0; i < 3 + level; i++) arc(1.5 * h, hash2(Math.floor(now / 50), i, 0) * TAU, i * 7 + 3, Math.max(1.5, h * 0.09), f);
  }
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(h * 0.18, -h * 0.78); ctx.lineTo(-h * 0.32, h * 0.05); ctx.lineTo(h * 0.05, h * 0.05);
  ctx.lineTo(-h * 0.23, h * 0.78); ctx.lineTo(h * 0.46, -h * 0.14); ctx.lineTo(h * 0.09, -h * 0.14);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < sparks; i++) { // orbiting sparks
    const ang = (now / 900) * (i % 2 ? -1 : 1) + (i * TAU) / sparks;
    const r = h * (0.98 + 0.08 * Math.sin(now / 200 + i));
    drawGlow(Math.cos(ang) * r, Math.sin(ang) * r, h * 0.26, col, 0.85);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(Math.cos(ang) * r, Math.sin(ang) * r, h * 0.07, 0, TAU);
    ctx.fill();
  }
}
