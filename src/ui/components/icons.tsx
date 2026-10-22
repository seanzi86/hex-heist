import { TAU } from '../../constants';
import { CREEPS, TOWERS } from '../../data/defs';
import type { CreepId, TowerType } from '../../types';

/** Small SVG versions of the game's tower, enemy and tile art, for the help screen. */

function ngon(cx: number, cy: number, r: number, n: number, rot = 0, inner = 1): string {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * TAU) / n;
    const rr = inner !== 1 && i % 2 ? r * inner : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return pts.join(' ');
}

const SIZE = 40;
const stroke = { 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' } as const;

/** A tower as a hexagonal chip with its glyph, matching the art on the board. `size` is in px. */
export function TowerIcon({ type, size = SIZE }: { type: TowerType; size?: number }) {
  const c = TOWERS[type].color;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" style={{ color: c }}>
      <polygon points={ngon(20, 20, 17, 6)} fill="#050a12" stroke={c} {...stroke} />
      {type === 'minigun' && <><rect x="20" y="18.2" width="12" height="3.6" fill={c} /><circle cx="20" cy="20" r="5.2" fill="#08121e" stroke={c} stroke-width="1.6" /><circle cx="20" cy="20" r="2" fill={c} /></>}
      {type === 'laser' && <><rect x="10" y="17.5" width="17" height="5" rx="1.5" fill="#08121e" stroke={c} stroke-width="1.6" /><rect x="27" y="17.5" width="5" height="5" fill={c} transform="rotate(45 29.5 20)" /></>}
      {type === 'rocket' && <><polygon points="32,20 12,9 17,20 12,31" fill={c} /><rect x="16" y="19" width="9" height="2" fill="#050a12" /></>}
      {type === 'shockwave' && <><polygon points={ngon(20, 20, 10, 6)} fill="none" stroke={c} {...stroke} /><polygon points={ngon(20, 20, 4.5, 6)} fill={c} /></>}
      {type === 'lightning' && <polygon points="22.5,8.5 14.5,21.5 20,21.5 17.5,31.5 26,18 21,18" fill={c} />}
    </svg>
  );
}

export function CreepIcon({ id }: { id: CreepId }) {
  const c = CREEPS[id].color;
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 40 40" aria-hidden="true">
      {id === 0 && <><rect x="22" y="14" width="12" height="12" fill={c} /><rect x="13" y="15" width="9" height="10" fill={c} opacity="0.8" /><rect x="6" y="16.5" width="6" height="7" fill={c} opacity="0.6" /></>}
      {id === 5 && <polygon points="35,20 9,8 15,20 9,32" fill={c} />}
      {id === 6 && <><polygon points={ngon(20, 20, 14, 6)} fill={c} fill-opacity="0.2" stroke={c} {...stroke} /><polygon points={ngon(20, 20, 6, 6)} fill={c} /></>}
      {id === 1 && <><polygon points={ngon(20, 21, 15, 3, -Math.PI / 2)} fill={c} fill-opacity="0.25" stroke={c} {...stroke} /><polygon points={ngon(20, 21, 7, 3, Math.PI / 2)} fill={c} /></>}
      {id === 2 && <><rect x="6" y="6" width="28" height="28" rx="4" fill={c} fill-opacity="0.2" stroke={c} {...stroke} /><text x="20" y="25" text-anchor="middle" font-size="14" font-weight="700" fill={c} font-family="monospace">01</text></>}
      {id === 3 && <><circle cx="20" cy="20" r="6" fill={c} /><polygon points={ngon(20, 20, 14, 6)} fill="none" stroke={c} {...stroke} />{[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={20 + Math.cos((i * TAU) / 6) * 14} cy={20 + Math.sin((i * TAU) / 6) * 14} r="2" fill={c} />)}</>}
      {id === 4 && <><polygon points={ngon(20, 20, 16, 16, 0, 0.62)} fill={c} fill-opacity="0.3" stroke={c} {...stroke} /><circle cx="20" cy="20" r="4" fill={c} /></>}
    </svg>
  );
}

export type TileIconKind = 'repair' | 'corrupt' | 'fast' | 'slow' | 'stream' | 'gate' | 'spawn' | 'core';

export function TileIcon({ kind }: { kind: TileIconKind }) {
  const hex = <polygon points={ngon(20, 20, 17, 6)} fill="#07101b" stroke="#123a56" stroke-width="1.5" />;
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 40 40" aria-hidden="true">
      {hex}
      {kind === 'repair' && <path d="M12 20h16M20 12v16" stroke="#b6ff00" {...stroke} />}
      {kind === 'corrupt' && <><path d="M13 20h14" stroke="#ff3355" {...stroke} /><circle cx="20" cy="20" r="8" fill="none" stroke="#ff3355" {...stroke} /></>}
      {kind === 'fast' && <path d="M13 13l7 7-7 7M21 13l7 7-7 7" fill="none" stroke="#ffb300" {...stroke} />}
      {kind === 'slow' && <path d="M27 13l-7 7 7 7M19 13l-7 7 7 7" fill="none" stroke="#4d9bff" {...stroke} />}
      {kind === 'stream' && <path d="M14 14l8 6-8 6M21 14l8 6-8 6" fill="none" stroke="#00f0ff" {...stroke} />}
      {kind === 'gate' && <><circle cx="20" cy="20" r="9" fill="none" stroke="#ff2bd6" {...stroke} /><circle cx="20" cy="20" r="3" fill="#ff2bd6" /></>}
      {kind === 'spawn' && <><polygon points={ngon(20, 20, 17, 6)} fill="#2a0716" stroke="#ff3355" stroke-width="1.5" /><polygon points="13,15 27,15 20,27" fill="#ff3355" /></>}
      {kind === 'core' && <><polygon points={ngon(20, 20, 17, 6)} fill="#06283d" stroke="#00f0ff" stroke-width="1.5" /><polygon points={ngon(20, 20, 9, 6)} fill="none" stroke="#00f0ff" {...stroke} /></>}
    </svg>
  );
}
