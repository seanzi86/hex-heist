/**
 * Level generator. Run with `npm run levels`; it writes src/data/layouts.ts.
 *
 * Each level has a recipe (layout style, spawn count, hazards). For every level we generate hundreds of random
 * candidate boards from the recipe, score each one with a difficulty formula, and keep the one closest to the
 * level's target difficulty. The seed is fixed, so the output is repeatable.
 */
import { writeFileSync } from 'node:fs';
import { Tile } from '../src/constants';
import { center, dist } from '../src/geometry';
import { buildGrid, placementValid, tileOK, traceRoute, updatePaths } from '../src/game/grid';
import type { BoardTile, Grid, Level } from '../src/types';

const W = 10;
const H = 11;
const CANDIDATES = 1500;
const NEAR = 0.55; // how close a tile must be to the route to be a useful build spot (about Ping's range)

// ---------- small helpers ----------
type Cells = number[][]; // cells[x][y], y = 0 is the bottom row

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const blank = (fill: number): Cells => Array.from({ length: W }, () => Array<number>(H).fill(fill));
const clone = (c: Cells): Cells => c.map((col) => [...col]);

function levelOf(c: Cells): Level {
  const grid: number[][] = [];
  for (let row = 0; row < H; row++) grid.push(Array.from({ length: W }, (_, x) => c[x][H - 1 - row]));
  return { name: '', w: W, h: H, grid, waves: [], hpScale: 1, threat: 1 };
}

const gridOf = (c: Cells): Grid => {
  const g = buildGrid(levelOf(c));
  updatePaths(g);
  return g;
};

// Which stream code (N, NE, ...) at (x, y) points at a given neighbour. The edge quirks live in buildGrid, so ask it.
const STREAMS = [Tile.N, Tile.NE, Tile.NW, Tile.S, Tile.SE, Tile.SW];
const DIRS = new Map<number, Map<string, string>>();
for (const code of STREAMS) {
  const g = buildGrid(levelOf(blank(code)));
  const m = new Map<string, string>();
  for (const t of g.all) if (t.dir) m.set(`${t.x},${t.y}`, `${t.dir.x},${t.dir.y}`);
  DIRS.set(code, m);
}
function streamCode(from: BoardTile, to: BoardTile): number | null {
  for (const code of STREAMS) if (DIRS.get(code)!.get(`${from.x},${from.y}`) === `${to.x},${to.y}`) return code;
  return null;
}

// ---------- recipes ----------
type Style = 'serpentine' | 'arena' | 'lanes';
interface Recipe {
  styles: Style[];
  spawns: number;
  /** serpentine bands / lane walls */
  walls: [number, number];
  /** random obstacle blobs */
  blobs: [number, number];
  slow?: number; fast?: number; damage?: number; heal?: number;
  streams?: number; portals?: number;
  /** wanted share of route tiles that two or more spawns share (1 = they merge straight away) */
  merge?: [number, number];
  minSteps: number;
}

const SERP: Style[] = ['serpentine'], LANES: Style[] = ['lanes'], MIX: Style[] = ['serpentine', 'lanes', 'arena'];
const R = (styles: Style[], spawns: number, walls: [number, number], blobs: [number, number], rest: Partial<Recipe> = {}): Recipe =>
  ({ styles, spawns, walls, blobs, minSteps: 9, ...rest });

const SL: Style[] = ['serpentine', 'lanes'], AL: Style[] = ['arena', 'lanes'], AS: Style[] = ['arena', 'serpentine'];
const RECIPES: Recipe[] = [
  // 1-5  onboarding: one spawn, long routes, no hazards
  R(SERP, 1, [1, 3], [0, 2], { minSteps: 14 }),
  R(SL, 1, [1, 3], [0, 3], { minSteps: 12 }),
  R(MIX, 1, [1, 4], [0, 3], { minSteps: 12 }),
  R(MIX, 1, [1, 4], [0, 4], { minSteps: 10 }),
  R(SL, 1, [1, 4], [0, 4], { slow: 2, minSteps: 14 }),
  // 6-10 pressure: shorter routes, lag as a gift and overclock as a hazard
  R(MIX, 1, [1, 3], [1, 6], { slow: 2, minSteps: 9 }),
  R(MIX, 1, [1, 3], [2, 6], { fast: 2, minSteps: 10 }),
  R(MIX, 1, [1, 3], [2, 8], { slow: 1, fast: 2, minSteps: 8 }),
  R(MIX, 1, [1, 3], [3, 8], { fast: 3, minSteps: 8 }),
  R(AS, 1, [1, 2], [5, 10], { slow: 2, fast: 3, minSteps: 8 }),
  // 11-15 two doors: merge early, then late, then never
  R(AL, 2, [1, 2], [2, 6], { merge: [0.5, 1], minSteps: 8 }),
  R(AL, 2, [1, 3], [2, 7], { merge: [0.3, 0.65], minSteps: 8 }),
  R(MIX, 2, [1, 3], [1, 6], { merge: [0.15, 0.45], minSteps: 10 }),
  R(LANES, 2, [2, 4], [1, 6], { merge: [0, 0.18], minSteps: 10 }),
  R(LANES, 2, [2, 4], [2, 7], { merge: [0, 0.12], slow: 1, minSteps: 10 }),
  // 16-20 shortcuts: data streams and proxy gates
  R(MIX, 2, [1, 3], [2, 7], { streams: 1, merge: [0.15, 1], minSteps: 10 }),
  R(MIX, 2, [1, 4], [1, 6], { portals: 1, minSteps: 14 }),
  R(MIX, 2, [1, 4], [2, 7], { streams: 2, merge: [0, 0.5], minSteps: 10 }),
  R(MIX, 2, [1, 3], [3, 8], { portals: 1, streams: 1, minSteps: 14 }),
  R(MIX, 2, [2, 4], [2, 7], { portals: 2, minSteps: 14 }),
  // 21-25 throttle: dense obstacles, narrow lanes, first corrupt sector
  R(MIX, 2, [2, 4], [2, 6], { slow: 1, minSteps: 12 }),
  R(AL, 2, [1, 4], [3, 8], { minSteps: 9 }),
  R(MIX, 2, [1, 4], [5, 10], { streams: 1, minSteps: 9 }),
  R(AL, 2, [2, 4], [4, 9], { slow: 1, minSteps: 9 }),
  R(MIX, 2, [1, 4], [6, 11], { damage: 1, minSteps: 9 }),
  // 26-30 gauntlet: three spawns, corrupt sectors against repair nodes
  R(MIX, 3, [1, 3], [3, 8], { merge: [0, 0.5], damage: 2, heal: 1, minSteps: 9 }),
  R(AL, 3, [2, 4], [3, 8], { merge: [0, 0.5], damage: 2, heal: 1, minSteps: 9 }),
  R(MIX, 3, [1, 3], [5, 10], { merge: [0, 0.45], damage: 3, heal: 1, minSteps: 8 }),
  R(AL, 3, [2, 4], [4, 10], { merge: [0, 0.45], damage: 2, heal: 2, streams: 1, minSteps: 9 }),
  R(MIX, 3, [1, 3], [6, 11], { merge: [0, 0.4], damage: 3, heal: 1, fast: 1, minSteps: 8 }),
  // 31-35 breach: everything at once, with minimal room
  R(MIX, 3, [1, 3], [6, 13], { merge: [0, 0.3], portals: 1, damage: 2, minSteps: 11 }),
  R(AL, 3, [2, 4], [6, 13], { merge: [0, 0.3], streams: 1, damage: 2, heal: 1, minSteps: 10 }),
  R(MIX, 3, [1, 3], [8, 15], { merge: [0, 0.25], portals: 2, damage: 3, minSteps: 10 }),
  R(AL, 3, [2, 4], [8, 15], { merge: [0, 0.2], portals: 1, streams: 1, damage: 3, heal: 1, minSteps: 12 }),
  R(MIX, 3, [1, 3], [9, 17], { merge: [0, 0.2], portals: 2, streams: 1, damage: 3, heal: 1, fast: 1, minSteps: 10 }),
];

const NAMES = [
  'Boot Sector', 'Bus Lines', 'Ribbon Cable', 'Loopback', 'Lag Spike', 'Latency', 'Burst Mode',
  'Turbo Lag', 'Fast Lane', 'Mixed Signals', 'Twin Feed', 'Dual Uplink', 'Double Tap', 'Redundancy',
  'Failover', 'Data Belt', 'Wormhole', 'Express Lane', 'Side Channel', 'Dual Gate', 'Bottleneck',
  'Crossfire', 'Narrow Band', 'Thin Client', 'Corrupt Sector', 'Three Doors', 'Field Repair', 'Burn Notice',
  'Repair Loop', 'Hot Swap', 'Blind Jump', 'Squeeze Play', 'Warp Core', 'Rift', 'Total Breach',
];

/** Target difficulty (0-100): a steady climb, with a small dip on the first level of each block of five. */
function targetFor(i: number): number {
  return 6 + 2.3 * i - (i % 5 === 0 && i > 0 ? 3 : 0);
}

// ---------- layout styles ----------
const pick = <T>(r: () => number, a: T[]): T => a[Math.floor(r() * a.length)];
const between = (r: () => number, [lo, hi]: [number, number]): number => lo + Math.floor(r() * (hi - lo + 1));

function carve(r: () => number, rec: Recipe): Cells {
  const c = blank(Tile.NORMAL);
  const flip = r() < 0.5; // which end the spawns start from
  const style = pick(r, rec.styles);
  const walls = between(r, rec.walls);

  if (style === 'serpentine' && walls > 0) {
    const gapSide = r() < 0.5;
    for (let b = 1; b <= walls; b++) {
      const y = Math.round(((H - 1) * b) / (walls + 1));
      const left = (b % 2 === 1) === gapSide;
      const width = 1 + Math.floor(r() * 2);
      const gx = left ? Math.floor(r() * 3) : W - width - Math.floor(r() * 3);
      const stagger = 3 + Math.floor(r() * 4);
      for (let x = 0; x < W; x++) {
        if (x >= gx && x < gx + width) continue;
        c[x][Math.max(1, Math.min(H - 2, y + (x > stagger && r() < 0.35 ? 1 : 0)))] = Tile.INVALID;
      }
    }
  }
  if (style === 'lanes' && walls > 0) {
    const gapTop = r() < 0.5;
    for (let b = 1; b <= walls; b++) {
      const x = Math.round(((W - 1) * b) / (walls + 1));
      const top = (b % 2 === 1) === gapTop;
      const width = 1 + Math.floor(r() * 2);
      const gy = top ? H - width - Math.floor(r() * 3) : Math.floor(r() * 3);
      for (let y = 0; y < H; y++) if (!(y >= gy && y < gy + width)) c[x][y] = Tile.INVALID;
    }
  }
  // random obstacle blobs: little random walks of void tiles
  for (let b = between(r, rec.blobs); b > 0; b--) {
    let x = Math.floor(r() * W), y = Math.floor(r() * H);
    for (let k = 1 + Math.floor(r() * 4); k > 0; k--) {
      c[x][y] = Tile.INVALID;
      x = Math.max(0, Math.min(W - 1, x + pick(r, [-1, 0, 1])));
      y = Math.max(0, Math.min(H - 1, y + pick(r, [-1, 0, 1])));
    }
  }
  // ragged outline: nibble a few edge tiles so boards are not plain rectangles
  for (let k = Math.floor(r() * 8); k > 0; k--) {
    const edge = r() < 0.5;
    const x = edge ? pick(r, [0, W - 1]) : Math.floor(r() * W);
    const y = edge ? Math.floor(r() * H) : pick(r, [0, H - 1]);
    c[x][y] = Tile.INVALID;
  }
  void flip;
  return c;
}

/** Put the core and the spawns on open tiles. Returns null when the carve left no sensible spots. */
function place(r: () => number, c: Cells, rec: Recipe): Cells | null {
  const open: [number, number][] = [];
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (c[x][y] === Tile.NORMAL) open.push([x, y]);
  if (open.length < 40) return null;

  // the core prefers a spot with room around it
  const roomy = open.filter(([x, y]) => x > 0 && x < W - 1 && y > 0 && y < H - 1);
  const [cx, cy] = pick(r, roomy.length ? roomy : open);
  const out = clone(c);
  out[cx][cy] = Tile.END;
  const g = gridOf(out);
  const core = g.tiles[cx][cy];
  if (core.nbrs.filter(tileOK).length < 2) return null;

  // spawns: open tiles far from the core, away from each other
  const far = g.all.filter((t) => t.type === Tile.NORMAL && t.prio <= g.W * g.H && t.prio >= rec.minSteps).sort((a, b) => b.prio - a.prio);
  if (far.length < rec.spawns) return null;
  const chosen: BoardTile[] = [];
  for (const t of far.slice(0, Math.max(rec.spawns * 6, 12)).sort(() => r() - 0.5)) {
    if (chosen.length >= rec.spawns) break;
    const p = center(t.x, t.y);
    if (chosen.every((o) => { const q = center(o.x, o.y); return dist(p.x, p.y, q.x, q.y) >= 0.9; })) chosen.push(t);
  }
  if (chosen.length < rec.spawns) return null;
  for (const t of chosen) out[t.x][t.y] = Tile.SPAWN;

  // anything the creeps can never reach and that is not next to the route would be dead board: void it
  const g2 = gridOf(out);
  for (const t of g2.all) {
    if (t.type !== Tile.NORMAL) continue;
    if (t.prio <= g2.W * g2.H) continue;
    if (!t.nbrs.some((n) => tileOK(n) && n.prio <= g2.W * g2.H)) out[t.x][t.y] = Tile.INVALID;
  }
  return out;
}

// ---------- hazards, streams and gates ----------
const routeTiles = (g: Grid): BoardTile[][] => g.spawns.map((s) => traceRoute(g, s).map((st) => st.tile));
const isRoute = (t: BoardTile) => t.type === Tile.NORMAL;

function decorate(r: () => number, c: Cells, rec: Recipe): Cells | null {
  const out = clone(c);

  // proxy gates: two tiles on one route, far apart along it (a shortcut)
  const gateTypes = [Tile.PORTAL_A, Tile.PORTAL_B, Tile.PORTAL_C];
  for (let p = 0; p < (rec.portals ?? 0); p++) {
    const longest = routeTiles(gridOf(out)).filter((rt) => rt.length >= 14);
    if (!longest.length) return null;
    const route = pick(r, longest);
    const usable = route.map((t, i) => ({ t, i })).filter(({ t, i }) => isRoute(t) && i >= 2 && i < route.length - 3);
    if (usable.length < 6) return null;
    const a = pick(r, usable.slice(0, Math.floor(usable.length / 2)));
    const rest = usable.filter(({ i }) => i >= a.i + 5 && i <= a.i + 9);
    if (!rest.length) return null;
    const b = pick(r, rest);
    out[a.t.x][a.t.y] = gateTypes[p];
    out[b.t.x][b.t.y] = gateTypes[p];
  }

  // data streams: a run of consecutive route tiles that force creeps along
  for (let s = 0; s < (rec.streams ?? 0); s++) {
    const route = pick(r, routeTiles(gridOf(out)));
    const len = 3 + Math.floor(r() * 3);
    const start = 2 + Math.floor(r() * Math.max(1, route.length - len - 5));
    const seg = route.slice(start, start + len + 1);
    if (seg.length < len + 1 || seg.slice(0, len).some((t) => !isRoute(t))) continue;
    const codes = seg.slice(0, len).map((t, i) => streamCode(t, seg[i + 1]));
    if (codes.some((k) => k === null) || !isRoute(seg[len]) && seg[len].type !== Tile.END && seg[len].type !== Tile.SPAWN && seg[len].type < Tile.PORTAL_A) continue;
    seg.slice(0, len).forEach((t, i) => { out[t.x][t.y] = codes[i] as number; });
  }

  // floor hazards, scattered in short clusters along every route
  const hazards: [number, number][] = [
    [Tile.SLOW, rec.slow ?? 0], [Tile.FAST, rec.fast ?? 0], [Tile.DAMAGE, rec.damage ?? 0], [Tile.HEAL, rec.heal ?? 0],
  ];
  for (const [kind, count] of hazards) {
    for (let n = 0; n < count; n++) {
      const options = routeTiles(gridOf(out))
        .map((route) => ({ route, spots: route.map((t, i) => ({ t, i })).filter(({ t, i }) => isRoute(t) && i >= 2 && i < route.length - 2) }))
        .filter((o) => o.spots.length);
      if (!options.length) return null;
      const { route, spots } = pick(r, options);
      const at = pick(r, spots);
      out[at.t.x][at.t.y] = kind;
      if (kind !== Tile.DAMAGE && kind !== Tile.HEAL && r() < 0.6) {
        const nx = route[at.i + 1];
        if (nx && isRoute(nx)) out[nx.x][nx.y] = kind;
      }
    }
  }
  return out;
}

// ---------- scoring ----------
interface Metrics {
  spawns: number; steps: number; time: number; useful: number; merge: number;
  damage: number; heal: number; fast: number; slow: number; streams: number; portals: number; open: number; placeable: number;
  difficulty: number;
}

const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));

function measure(c: Cells): Metrics | null {
  const g = gridOf(c);
  if (g.spawns.some((s) => s.prio > g.W * g.H)) return null;
  const routes = routeTiles(g);
  if (routes.some((rt) => !g.ends.includes(rt[rt.length - 1]))) return null;

  const cost = (t: BoardTile): number => (t.type === Tile.SLOW ? 2 : t.type === Tile.FAST ? 0.5 : 1);
  const steps = routes.reduce((a, rt) => a + rt.length, 0) / routes.length;
  const time = routes.reduce((a, rt) => a + rt.reduce((s, t) => s + cost(t), 0), 0) / routes.length;
  const counts = new Map<BoardTile, number>();
  for (const rt of routes) for (const t of rt) counts.set(t, (counts.get(t) ?? 0) + 1);
  const all = [...counts.keys()];
  const shared = all.filter((t) => (counts.get(t) ?? 0) > 1).length;
  const merge = routes.length > 1 ? shared / all.length : 0;

  const spots = g.all.filter((t) => t.type === Tile.NORMAL && all.some((rt) => {
    const a = center(t.x, t.y), b = center(rt.x, rt.y);
    return dist(a.x, a.y, b.x, b.y) < NEAR;
  }));
  const placeable = spots.filter((t) => placementValid(g, t)).length;

  const of = (kind: number): number => routes.reduce((a, rt) => a + rt.filter((t) => t.type === kind).length, 0) / routes.length;
  const damage = of(Tile.DAMAGE), heal = of(Tile.HEAL), fast = of(Tile.FAST), slow = of(Tile.SLOW);
  const streams = g.all.filter((t) => t.dir).length;
  const portals = g.all.filter((t) => t.type >= Tile.PORTAL_A).length / 2;
  const open = g.all.filter((t) => t.type !== Tile.INVALID).length;

  const split = ((routes.length - 1) / 2) * (1 - 0.4 * merge);
  const route = 1 - clamp((time - 8) / 28);
  const space = 1 - clamp((spots.length - 16) / 55);
  const hazard = clamp((2 * damage + 1.2 * fast - 0.8 * slow - heal) / 8);
  const difficulty = 100 * (0.38 * split + 0.3 * route + 0.22 * space + 0.1 * hazard);
  return { spawns: routes.length, steps, time, useful: spots.length, merge, damage, heal, fast, slow, streams, portals, open, placeable, difficulty };
}

function acceptable(m: Metrics, rec: Recipe): boolean {
  if (m.steps < rec.minSteps || m.placeable < 10 || m.open < 40) return false;
  if (m.damage > 4) return false;
  return true;
}

function penalty(m: Metrics, rec: Recipe, target: number): number {
  let p = Math.abs(m.difficulty - target);
  if (rec.merge) {
    const [lo, hi] = rec.merge;
    if (m.merge < lo) p += 120 * (lo - m.merge);
    if (m.merge > hi) p += 120 * (m.merge - hi);
  }
  // every hazard the recipe asks for must actually be on the route
  const want = (n: number | undefined, have: number): number => (n ? Math.max(0, n * 0.5 - have) * 8 : 0);
  p += want(rec.damage, m.damage) + want(rec.slow, m.slow) + want(rec.fast, m.fast) + want(rec.heal, m.heal);
  if (rec.streams && m.streams === 0) p += 25;
  if (rec.portals && m.portals < rec.portals) p += 25;
  return p;
}

// ---------- main ----------
interface Result { name: string; cells: Cells; m: Metrics; target: number; rec: Recipe }

function generate(i: number): Result {
  for (let relax = 0; ; relax++) {
    try {
      return attempt(i, relax);
    } catch (e) {
      if (RECIPES[i].minSteps - relax <= 6) throw e;
    }
  }
}

function attempt(i: number, relax: number): Result {
  const rec = { ...RECIPES[i], minSteps: RECIPES[i].minSteps - relax };
  const target = targetFor(i);
  let best: { cells: Cells; m: Metrics; p: number } | null = null;
  const r = rng(1000 + i * 7919);
  const why = { place: 0, decorate: 0, measure: 0, spawns: 0, accept: 0 };
  for (let n = 0; n < CANDIDATES; n++) {
    const carved = carve(r, rec);
    const placed = place(r, carved, rec);
    if (!placed) { why.place++; continue; }
    const full = decorate(r, placed, rec);
    if (!full) { why.decorate++; continue; }
    const m = measure(full);
    if (!m) { why.measure++; continue; }
    if (m.spawns !== rec.spawns) { why.spawns++; continue; }
    if (!acceptable(m, rec)) { why.accept++; continue; }
    const p = penalty(m, rec, target);
    if (!best || p < best.p) best = { cells: full, m, p };
  }
  if (!best) throw new Error(`no valid board for level ${i + 1}: rejected ${JSON.stringify(why)}`);
  return { name: NAMES[i], cells: best.cells, m: best.m, target, rec };
}

const SYMBOL: Record<number, string> = {
  [-1]: '  ', 0: '. ', 1: '+ ', 2: 'x ', 3: '» ', 4: '~ ', 5: '↑ ', 6: '↗ ', 7: '↖ ', 8: '↓ ', 9: '↘ ', 10: '↙ ', 11: 'S ', 12: 'C ', 13: 'A ', 14: 'B ', 15: 'D ',
};

function ascii(c: Cells): string {
  return levelOf(c).grid.map((row, i) => (i % 2 ? '  ' : '') + row.map((t) => SYMBOL[t]).join(' ')).join('\n');
}

const only = /^\d+$/.test(process.argv[2] ?? '') ? Number(process.argv[2]) - 1 : null;
const results: Result[] = [];
for (let i = 0; i < RECIPES.length; i++) {
  if (only !== null && i !== only) continue;
  results.push(generate(i));
}

console.log('lvl  name                 target  got   spawns steps time  open  nearby  merge  dmg heal fast slow strm gate');
results.forEach((res, k) => {
  const i = only ?? k, m = res.m;
  console.log(
    `${String(i + 1).padStart(2)}   ${res.name.padEnd(20)} ${res.target.toFixed(0).padStart(5)}  ${m.difficulty.toFixed(0).padStart(4)}  ${String(m.spawns).padStart(5)}  ${m.steps.toFixed(0).padStart(5)} ${m.time.toFixed(0).padStart(4)}  ${String(m.open).padStart(4)}  ${String(m.useful).padStart(5)}   ${m.merge.toFixed(2)}   ${m.damage.toFixed(0).padStart(3)} ${m.heal.toFixed(0).padStart(4)} ${m.fast.toFixed(0).padStart(4)} ${m.slow.toFixed(0).padStart(4)} ${String(m.streams).padStart(4)} ${m.portals.toFixed(0).padStart(4)}`,
  );
  if (only !== null || process.argv.includes('--ascii')) console.log(ascii(res.cells) + '\n');
});

if (only === null) {
  const threat = (d: number): number => clamp(Math.ceil(d / 20), 1, 5);
  const lines = results.map((res, i) => {
    const rows = levelOf(res.cells).grid.map((row) => `      [${row.join(',')}],`).join('\n');
    return `  {\n    name: ${JSON.stringify(res.name)}, w: ${W}, h: ${H}, hpScale: ${(1 + 0.035 * i).toFixed(3)}, threat: ${threat(res.m.difficulty)},\n    grid: [\n${rows}\n    ],\n    waves: [],\n  },`;
  });
  writeFileSync(
    'src/data/layouts.ts',
    `import type { Level } from '../types';\n\n/**\n * Generated by tools/generate-levels.ts (npm run levels). Do not edit by hand: change a recipe in the tool and rerun.\n * Tile codes: see Tile in constants.ts. Rows are listed top first.\n * \`waves\` is filled in by levels.ts.\n */\nexport const LAYOUTS: Level[] = [\n${lines.join('\n')}\n];\n`,
  );
  console.log('\nwrote src/data/layouts.ts');
}
