import { PALETTE, TAU } from '../constants';
import type { Beam, Fx } from '../types';
import { drawGlow } from './glow';
import { hash2, poly } from './shapes';
import { ctx, sp, view } from './viewport';

export function drawFx(f: Fx): void {
  const s = view.S;
  switch (f.k) {
    case 'ring': {
      const a = f.life / f.max;
      const [px, py] = sp(f.x, f.y);
      ctx.globalAlpha = Math.max(0, a);
      ctx.strokeStyle = f.col;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, f.r * s * (1.1 - a), 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'boom': { // pixel burst
      const p = 1 - f.life / f.max;
      const [px, py] = sp(f.x, f.y);
      const n = f.r > 0.2 ? 22 : 10;
      f.seed ??= Math.random() * 1000;
      drawGlow(px, py, f.r * s * (1.6 + p * 2.4), f.col, (1 - p) * 0.5);
      ctx.fillStyle = f.col;
      ctx.strokeStyle = f.col;
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = Math.max(0, 1 - p);
      for (let i = 0; i < n; i++) {
        const a = hash2(i, 7, f.seed) * TAU;
        const v = 0.5 + hash2(i, 3, f.seed) * 0.9;
        const d = f.r * s * 2.2 * v * (1 - (1 - p) * (1 - p));
        const sz = Math.max(1.5, s * 0.016 * (1 - p) * (1 + hash2(i, 5, f.seed)));
        ctx.fillRect(px + Math.cos(a) * d - sz / 2, py + Math.sin(a) * d - sz / 2, sz, sz);
      }
      ctx.globalAlpha = Math.max(0, 0.6 - p);
      ctx.beginPath(); ctx.arc(px, py, f.r * s * 0.6 * p + 2, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'text': { // floating "+credits"
      const p = 1 - f.life / f.max;
      const [px, py] = sp(f.x, f.y);
      ctx.globalAlpha = Math.max(0, 1 - p * p);
      ctx.fillStyle = f.col;
      ctx.font = `700 ${s * 0.065}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(f.txt, px, py - s * 0.05 - p * s * 0.14);
      ctx.globalAlpha = 1;
      break;
    }
    case 'shock': { // Firewall pulse: expanding hexagon
      const a = f.life / f.max;
      const [px, py] = sp(f.x, f.y);
      drawGlow(px, py, f.r * s * (0.2 + 0.8 * (1 - a)), '#ff7a1a', a * 0.25);
      ctx.save();
      ctx.translate(px, py);
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = '#ff7a1a';
      ctx.lineWidth = 3;
      poly(ctx, 6, f.r * s * (0.2 + 0.8 * (1 - a)));
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
      break;
    }
    case 'bullet': { // Ping packet with a short tail
      if (f.delay > 0) break;
      const [px, py] = sp(f.x, f.y);
      const [qx, qy] = sp(f.px ?? f.x, f.py ?? f.y);
      ctx.strokeStyle = PALETTE.cyan;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(qx - (px - qx) * 2, qy - (py - qy) * 2); ctx.lineTo(px, py); ctx.stroke();
      ctx.globalAlpha = 1;
      drawGlow(px, py, s * 0.04, PALETTE.cyan, 0.9);
      ctx.fillStyle = '#fff';
      const z = Math.max(2, s * 0.012);
      ctx.fillRect(px - z / 2, py - z / 2, z, z);
      break;
    }
    case 'rocket': { // Seeker missile with a magenta trail
      if (f.trail) {
        ctx.strokeStyle = PALETTE.mag;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 2;
        ctx.beginPath();
        f.trail.forEach(([x, y], i) => {
          const [a, b] = sp(x, y);
          if (i) ctx.lineTo(a, b); else ctx.moveTo(a, b);
        });
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      const [px, py] = sp(f.x, f.y);
      const z = Math.max(3, s * 0.018);
      drawGlow(px, py, s * 0.07, PALETTE.mag, 0.8);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-f.ang);
      ctx.fillStyle = PALETTE.mag;
      ctx.beginPath(); ctx.moveTo(z * 1.4, 0); ctx.lineTo(-z, -z * 0.8); ctx.lineTo(-z, z * 0.8); ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    }
    case 'bolt': { // Throttle arcs
      ctx.globalAlpha = Math.min(1, f.left / 300);
      for (const l of f.links) {
        const from: [number, number] = l.from ? [l.from.x, l.from.y] : [f.t.x, f.t.y];
        const [x1, y1] = sp(...from);
        const [x2, y2] = sp(l.to.x, l.to.y);
        const pts: [number, number][] = [[x1, y1]];
        for (let i = 1; i < 4; i++) {
          const k = i / 4;
          pts.push([x1 + (x2 - x1) * k + (Math.random() - 0.5) * 9, y1 + (y2 - y1) * k + (Math.random() - 0.5) * 9]);
        }
        pts.push([x2, y2]);
        drawGlow(x2, y2, s * 0.06, '#ffe600', 0.5);
        for (const [w, col] of [[5, 'rgba(255,230,0,.25)'], [1.5, '#fff7a8']] as const) {
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.beginPath();
          pts.forEach(([x, y], i) => { if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
  }
}

/** Trace beams (one to six parallel lines depending on tower level). */
export function drawBeam(b: Beam): void {
  const t = b.t;
  const n = [1, 2, 3, 6][t.level] ?? 1;
  const spread = [0, 0.25, 0.15, 0.04][t.level] ?? 0;
  const len = Math.min(b.len, 6);
  const fade = Math.max(0.25, b.left / 400);
  for (let i = 0; i < n; i++) {
    const a = b.ang + (i - (n - 1) / 2) * spread * 0.5;
    const [x1, y1] = sp(t.x + Math.cos(a) * 0.11, t.y + Math.sin(a) * 0.11);
    const [x2, y2] = sp(t.x + Math.cos(b.ang) * len, t.y + Math.sin(b.ang) * len);
    if (i === 0) drawGlow(x1, y1, view.S * 0.09, PALETTE.lime, fade * 0.7);
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = PALETTE.lime;
    ctx.globalAlpha = fade * 0.35;
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade;
    ctx.strokeStyle = '#eaffb0';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
