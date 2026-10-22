import { Tile } from '../constants';
import type { BoardTile, Grid, Level } from '../types';

export function tileOK(t: BoardTile | null): t is BoardTile {
  return t !== null && t.type !== Tile.INVALID;
}

/** Build the board for a level, including hex neighbours, data-stream targets and proxy-gate links. */
export function buildGrid(level: Level): Grid {
  const { w: W, h: H } = level;
  const tiles: BoardTile[][] = [];
  for (let x = 0; x < W; x++) {
    tiles.push([]);
    for (let y = 0; y < H; y++) {
      // level rows are listed top-first; y = 0 is the bottom row
      tiles[x].push({ x, y, type: level.grid[H - 1 - y][x], tower: null, prio: 0, dir: null, nbrs: [] });
    }
  }
  const at = (x: number, y: number): BoardTile | null => (x >= 0 && x < W && y >= 0 && y < H ? tiles[x][y] : null);

  const all = tiles.flat();
  const spawns = all.filter((t) => t.type === Tile.SPAWN);
  const ends = all.filter((t) => t.type === Tile.END);
  const portals: Record<number, BoardTile[]> = { [Tile.PORTAL_A]: [], [Tile.PORTAL_B]: [], [Tile.PORTAL_C]: [] };
  for (const t of all) portals[t.type]?.push(t);

  for (const t of all) {
    if (t.type === Tile.INVALID) continue;
    const { x, y } = t;
    // Odd columns sit half a row higher, so which diagonal neighbours exist depends on the column's parity.
    const even = x % 2 === 0;
    const upper = even ? 0 : 1;  // row offset of the neighbour diagonally up
    const lower = even ? -1 : 0; // row offset of the neighbour diagonally down

    // Stream tiles push creeps to one neighbour; at() gives null where that neighbour is off the board.
    switch (t.type) {
      case Tile.N:  t.dir = at(x, y + 1); break;
      case Tile.NE: t.dir = at(x + 1, y + upper); break;
      case Tile.NW: t.dir = at(x - 1, y + upper); break;
      case Tile.S:  t.dir = at(x, y - 1); break;
      case Tile.SE: t.dir = at(x + 1, y + lower); break;
      case Tile.SW: t.dir = at(x - 1, y + lower); break;
    }

    // Six neighbours: left, left-diagonal, right, right-diagonal, up, down (the diagonal is on the side away from the column's half-row shift).
    const diagonal = even ? -1 : 1;
    const n: (BoardTile | null)[] = [at(x - 1, y), at(x - 1, y + diagonal), at(x + 1, y), at(x + 1, y + diagonal), at(x, y + 1), at(x, y - 1)];
    t.nbrs = n;
    for (const other of portals[t.type] ?? []) if (other !== t) t.nbrs.push(other); // slots 6+ are portal outlets
  }
  return { W, H, tiles, all, spawns, ends, rev: 0 };
}

/**
 * Recompute every tile's distance to the core (multi-source BFS from the cores).
 * `probe` pretends an extra tower stands on that tile (used to test placements).
 * `bump` raises `g.rev`, which caches (like the route preview) use to know the towers changed.
 */
export function updatePaths(g: Grid, probe?: BoardTile, bump = !probe): void {
  const INF = g.W * g.H + 1;
  for (const t of g.all) t.prio = INF;
  const seen = new Set<BoardTile>();
  const queue: BoardTile[] = [];
  for (const e of g.ends) {
    e.prio = 0;
    seen.add(e);
    queue.push(e);
  }
  for (let i = 0; i < queue.length; i++) {
    const t = queue[i];
    for (const n of t.nbrs) {
      if (!tileOK(n) || seen.has(n)) continue;
      if (n.dir && n.dir !== t) continue; // a stream tile can only be entered along its own arrow
      seen.add(n);
      if (!n.tower && n !== probe) queue.push(n);
      n.prio = Math.min(t.prio + 1, n.prio);
    }
  }
  if (bump) g.rev++;
}

/** A tower may go on any plain tile as long as every intrusion point can still reach the core. */
export function placementValid(g: Grid, tile: BoardTile): boolean {
  if (tile.type !== Tile.NORMAL || tile.tower) return false;
  updatePaths(g, tile);
  const ok = g.spawns.every((s) => s.prio <= g.W * g.H);
  updatePaths(g, undefined, false); // restore the real paths; towers did not change
  return ok;
}

/** Where a creep standing on `t` heads next, or null if it has nowhere to go. */
export interface NextStep {
  tile: BoardTile;
  /** reached through a proxy gate (a teleport) rather than a normal step */
  viaPortal: boolean;
}

export function nextStep(t: BoardTile, probe?: BoardTile): NextStep | null {
  if (t.dir) {
    // stream tiles force the creep along their arrow; it waits if a tower blocks the way
    return tileOK(t.dir) && !t.dir.tower && t.dir !== probe ? { tile: t.dir, viaPortal: false } : null;
  }
  let best: BoardTile | null = null;
  let bestPrio = Infinity;
  let viaPortal = false;
  for (let i = 0; i < t.nbrs.length; i++) {
    const n = t.nbrs[i];
    if (tileOK(n) && !n.tower && n !== probe && n.prio < bestPrio) {
      bestPrio = n.prio;
      best = n;
      viaPortal = i >= 6; // slots 6+ are proxy-gate outlets
    }
  }
  return best ? { tile: best, viaPortal } : null;
}

/** The tiles a creep spawned on `from` will walk through (with the current towers, plus a pretend tower on `probe`). */
export function traceRoute(g: Grid, from: BoardTile, probe?: BoardTile): NextStep[] {
  const steps: NextStep[] = [{ tile: from, viaPortal: false }];
  const seen = new Set<BoardTile>([from]);
  let t = from;
  for (let i = 0; i < g.W * g.H && !g.ends.includes(t); i++) {
    const step = nextStep(t, probe);
    if (!step || seen.has(step.tile)) break;
    seen.add(step.tile);
    steps.push(step);
    t = step.tile;
  }
  return steps;
}
