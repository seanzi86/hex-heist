import { HW, PALETTE, TAU, Tile } from '../constants';
import { center } from '../geometry';
import { currentGame } from '../state';
import type { BoardTile, Game } from '../types';
import { drawGlow } from './glow';
import { chevron, hash2, hexPath, poly } from './shapes';
import { canvas, ctx, sp, view } from './viewport';

/** The static part of the board is drawn once into an offscreen layer. */
let boardLayer: HTMLCanvasElement | null = null;

const TILE_FILL: Record<number, string> = {
  [Tile.SPAWN]: '#2a0716', [Tile.END]: '#06283d', [Tile.HEAL]: '#06241a',
  [Tile.DAMAGE]: '#2a0a14', [Tile.FAST]: '#2a1d05', [Tile.SLOW]: '#061c30',
};
const PORTAL_COLOR: Record<number, string> = { [Tile.PORTAL_A]: PALETTE.cyan, [Tile.PORTAL_B]: PALETTE.amber, [Tile.PORTAL_C]: PALETTE.mag };

export function bakeBoard(game: Game): void {
  boardLayer = document.createElement('canvas');
  boardLayer.width = canvas.width;
  boardLayer.height = canvas.height;
  const c = boardLayer.getContext('2d');
  if (!c) return;
  c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  for (const t of game.grid.all) if (t.type !== Tile.INVALID) drawTileBase(c, t);
}

export function drawBoardLayer(): void {
  if (boardLayer) ctx.drawImage(boardLayer, 0, 0, view.w, view.h);
}

function drawTileBase(c: CanvasRenderingContext2D, t: BoardTile): void {
  const ct = center(t.x, t.y);
  const [px, py] = sp(ct.x, ct.y);
  const s = view.S, u = s * 0.05;

  hexPath(c, ct.x, ct.y, 0.94);
  c.fillStyle = TILE_FILL[t.type] ?? (t.dir ? '#071a2a' : '#07101b');
  c.fill();
  c.strokeStyle = t.type === Tile.END ? '#00f0ff99' : t.type === Tile.SPAWN ? '#ff335599' : '#123a56';
  c.lineWidth = 1;
  c.stroke();
  c.lineCap = 'round';
  c.lineWidth = Math.max(1.5, s * 0.012);

  if (t.type === Tile.NORMAL) {
    // little copper traces with vias
    c.strokeStyle = '#0e3a55';
    c.fillStyle = '#0e3a55';
    c.lineWidth = 1;
    const n = 1 + Math.floor(hash2(t.x, t.y, 1) * 2);
    for (let i = 0; i < n; i++) {
      const a = Math.floor(hash2(t.x, t.y, 2 + i) * 6) * (Math.PI / 3) + Math.PI / 6;
      const r0 = HW * s * 0.85, r1 = HW * s * (0.3 + hash2(t.x, t.y, 9 + i) * 0.25);
      c.beginPath();
      c.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0);
      c.lineTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1);
      c.stroke();
      c.beginPath();
      c.arc(px + Math.cos(a) * r1, py + Math.sin(a) * r1, 1.6, 0, TAU);
      c.fill();
    }
  } else if (t.type === Tile.HEAL) {
    c.strokeStyle = PALETTE.lime;
    c.beginPath(); c.moveTo(px - u, py); c.lineTo(px + u, py); c.moveTo(px, py - u); c.lineTo(px, py + u); c.stroke();
  } else if (t.type === Tile.DAMAGE) {
    c.strokeStyle = PALETTE.red;
    c.beginPath(); c.moveTo(px - u, py); c.lineTo(px + u, py); c.stroke();
    c.beginPath(); c.arc(px, py, u * 1.5, 0, TAU); c.stroke();
  } else if (t.type === Tile.FAST || t.type === Tile.SLOW) {
    const dir = t.type === Tile.FAST ? 1 : -1;
    const col = t.type === Tile.FAST ? PALETTE.amber : '#4d9bff';
    for (const o of [-0.7, 0.7]) chevron(c, px + o * u * dir, py, dir > 0 ? 0 : Math.PI, u * 0.8, col, 1);
  } else if (PORTAL_COLOR[t.type]) {
    c.strokeStyle = PORTAL_COLOR[t.type];
    c.beginPath(); c.arc(px, py, s * 0.075, 0, TAU); c.stroke();
  }
}

/** Tiles that animate (streams, proxy gates, spawn, core) are redrawn every frame. */
export function drawTileAnimations(game: Game): void {
  for (const t of game.grid.all) {
    if (t.type !== Tile.INVALID && (t.dir || t.type >= Tile.SPAWN)) drawTileAnim(t);
  }
}

function drawTileAnim(t: BoardTile): void {
  const game = currentGame();
  const ct = center(t.x, t.y);
  const [px, py] = sp(ct.x, ct.y);
  const s = view.S, u = s * 0.05, now = game.time;
  ctx.lineWidth = Math.max(1.5, s * 0.012);
  ctx.lineCap = 'round';

  if (t.dir) {
    // data stream: chevrons flowing toward the target tile
    const dc = center(t.dir.x, t.dir.y);
    const ang = Math.atan2(-(dc.y - ct.y), dc.x - ct.x);
    for (let i = 0; i < 2; i++) {
      const p = (now / 700 + i * 0.5) % 1;
      const off = (p - 0.5) * u * 3;
      chevron(ctx, px + Math.cos(ang) * off, py + Math.sin(ang) * off, ang, u * 0.9, PALETTE.cyan, Math.sin(p * Math.PI) * 0.9);
    }
  } else if (PORTAL_COLOR[t.type]) {
    // proxy gate: spinning arcs
    ctx.strokeStyle = PORTAL_COLOR[t.type];
    const a0 = (now / 500) * (t.type === Tile.PORTAL_B ? -1 : 1);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(px, py, s * 0.045, a0 + (i * TAU) / 3, a0 + (i * TAU) / 3 + 1.2);
      ctx.stroke();
    }
    ctx.fillStyle = PORTAL_COLOR[t.type];
    ctx.beginPath(); ctx.arc(px, py, s * 0.012, 0, TAU); ctx.fill();
    drawGlow(px, py, s * 0.14, PORTAL_COLOR[t.type], 0.3);
  } else if (t.type === Tile.SPAWN) {
    // intrusion point
    const p = (now / 900) % 1;
    ctx.strokeStyle = PALETTE.red;
    ctx.globalAlpha = 1 - p;
    ctx.beginPath(); ctx.arc(px, py, s * (0.03 + p * 0.09), 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
    drawGlow(px, py, s * 0.14, PALETTE.red, 0.2 + 0.2 * (1 - p));
    ctx.fillStyle = PALETTE.red;
    ctx.beginPath(); ctx.moveTo(px - u * 0.8, py - u * 0.6); ctx.lineTo(px + u * 0.8, py - u * 0.6); ctx.lineTo(px, py + u * 0.7); ctx.closePath(); ctx.fill();
  } else if (t.type === Tile.END) {
    // the data core, showing remaining lives
    drawGlow(px, py, s * 0.22, PALETTE.cyan, 0.35 + 0.1 * Math.sin(now / 300));
    ctx.save();
    ctx.translate(px, py);
    ctx.strokeStyle = PALETTE.cyan;
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now / 300);
    poly(ctx, 6, s * 0.1, now / 2000); ctx.stroke();
    poly(ctx, 6, s * 0.07, -now / 1500); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${s * 0.085}px ui-monospace, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(game.lives), 0, 1);
    ctx.restore();
  }
}
