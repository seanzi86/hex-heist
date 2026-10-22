import { PALETTE, TAU } from '../constants';
import type { Creep } from '../types';
import { drawGlow } from './glow';
import { hash2, poly, roundRect } from './shapes';
import { ctx, sp, view } from './viewport';

/** One pass of a creep's body. Called three times with offsets/colours for the glitch look. */
function creepShape(c: Creep, px: number, py: number, r: number, ang: number, col: string, alpha: number, now: number): void {
  ctx.save();
  ctx.translate(px, py);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  switch (c.id) {
    case 0: { // Worm: wriggling segments
      ctx.rotate(ang);
      for (let i = 0; i < 3; i++) {
        const sz = r * (1.05 - i * 0.22);
        ctx.fillRect(-i * r * 1.05 - sz / 2, Math.sin(now / 140 - i * 1.1 + c.rot) * r * 0.28 - sz / 2, sz, sz);
      }
      break;
    }
    case 5: // Spike: fast dart
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(r * 1.35, 0); ctx.lineTo(-r * 0.8, -r * 0.85); ctx.lineTo(-r * 0.3, 0); ctx.lineTo(-r * 0.8, r * 0.85);
      ctx.closePath(); ctx.fill();
      break;
    case 6: // Trojan: shell around a payload (the released payloads are bare)
      if (c.child) {
        poly(ctx, 6, r * 0.7, c.rot);
        ctx.fill();
      } else {
        poly(ctx, 6, r, now / 2000);
        ctx.globalAlpha = alpha * 0.25; ctx.fill();
        ctx.globalAlpha = alpha; ctx.stroke();
        poly(ctx, 6, r * (0.4 + 0.08 * Math.sin(now / 200)), -now / 900);
        ctx.fill();
      }
      break;
    case 1: // Prism: spinning triangles (absorbs Trace beams)
      ctx.rotate(now / 800);
      poly(ctx, 3, r * 1.1, -Math.PI / 2);
      ctx.globalAlpha = alpha * 0.3; ctx.fill();
      ctx.globalAlpha = alpha; ctx.stroke();
      ctx.rotate(Math.PI);
      poly(ctx, 3, r * 0.55, -Math.PI / 2);
      ctx.fill();
      break;
    case 2: { // Cipher: scrambled bits (immune to Ping)
      roundRect(ctx, -r, -r, r * 2, r * 2, r * 0.2);
      ctx.globalAlpha = alpha * 0.25; ctx.fill();
      ctx.globalAlpha = alpha; ctx.stroke();
      ctx.font = `700 ${r * 0.7}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const q = Math.floor(now / 160);
      for (let i = 0; i < 4; i++) ctx.fillText(hash2(q, i, c.wave) > 0.5 ? '1' : '0', (i % 2 ? 1 : -1) * r * 0.42, (i < 2 ? -1 : 1) * r * 0.42);
      break;
    }
    case 3: // Interceptor: shielded core (destroys incoming Seekers)
      ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, TAU); ctx.fill();
      ctx.rotate(now / 1000);
      poly(ctx, 6, r * 1.05);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05, r * 0.12, 0, TAU); ctx.fill();
      }
      break;
    case 4: // Rootkit: spiked core (immune to Firewall)
      ctx.rotate(now / 1300);
      poly(ctx, 16, r * 1.15, 0, 0.62);
      ctx.globalAlpha = alpha * 0.35; ctx.fill();
      ctx.globalAlpha = alpha; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, TAU); ctx.fill();
      break;
  }
  ctx.restore();
}

/** Malware with chromatic-aberration glitch, hit flash and a health bar. */
export function drawCreep(c: Creep, now: number): void {
  if (c.invisible) return;
  const [px, py] = sp(c.x, c.y);
  const s = view.S, r = c.d.r * s * 1.05, ang = -c.ang;
  const main = c.hurt < 90 ? '#ffffff' : c.d.color;

  drawGlow(px, py, r * (c.d.boss ? 3.2 : 2.2), c.d.color, c.d.boss ? 0.32 : 0.2);
  const glitch = 1.2 + (Math.sin(now / 90 + c.rot) > 0.96 ? 3.5 : 0); // occasional bigger glitch
  ctx.globalCompositeOperation = 'lighter';
  creepShape(c, px - glitch, py, r, ang, PALETTE.mag, 0.5, now);
  creepShape(c, px + glitch, py, r, ang, PALETTE.cyan, 0.5, now);
  ctx.globalCompositeOperation = 'source-over';
  creepShape(c, px, py, r, ang, main, 1, now);

  if (c.mod > 0) { // slowed by Throttle
    ctx.strokeStyle = PALETTE.amber;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(px, py, r * 1.4, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (c.hurt < 800 || c.hp < c.max) {
    const w = r * 2.2, f = Math.max(0, c.hp / c.max), y = py - r * 1.4 - 5;
    ctx.fillStyle = '#000b';
    ctx.fillRect(px - w / 2, y, w, 3);
    ctx.fillStyle = f > 0.66 ? PALETTE.lime : f > 0.33 ? PALETTE.amber : PALETTE.red;
    ctx.fillRect(px - w / 2, y, w * f, 3);
  }
}
