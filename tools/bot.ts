/**
 * Balance bot. Run with `npm run bot` (all levels) or `npm run bot -- 12` (one level, with details).
 *
 * It plays each level through the real game engine with a simple automatic player and reports how it did.
 * Two skill levels:
 *   good   - builds where the route is most exposed, mixes tower types, upgrades when it pays off
 *   casual - builds near the route but picks towers at random and upgrades rarely
 * Flags: --hard (Hard mode), --skill=good|casual, --calibrate (see below)
 *
 * `--calibrate` finds, for every level, the enemy-health multiplier at which the good bot only just wins (its breaking point),
 * then sets each level's real multiplier to a fraction of that. The fraction climbs from level 1 to level 35, so difficulty rises
 * smoothly whatever the layout. It writes src/data/calibration.ts.
 * The bot is a rough stand-in for a human. It shows whether levels are winnable and whether difficulty climbs.
 */
import { HEALTH_CURVE, REWARD_CURVE, START_CREDITS, TOWER_BALANCE } from '../src/data/balance';
import { LEVELS } from '../src/data/levels';
import { dist } from '../src/geometry';
import { availableTowers, buildTower, canUpgrade, upgradeTower } from '../src/game/actions';
import { createGame, startNextWave, update } from '../src/game/engine';
import { placementValid, traceRoute } from '../src/game/grid';
import { session, settings } from '../src/state';
import { writeFileSync } from 'node:fs';
import { RULES, Tile } from '../src/constants';
import type { BoardTile, Game, Tower, TowerType } from '../src/types';

type Skill = 'good' | 'casual';
const STEP = 20;
const DECIDE_EVERY = 500; // the bot reconsiders its spending twice a second of game time
const WAVE_TIMEOUT = 240000;

const SHOTS: Partial<Record<TowerType, number[]>> = { minigun: [1, 2, 3, 3], rocket: [1, 2, 2, 3] };

/** Rough damage-per-second value of a tower at a level, for choosing what to buy. */
function power(type: TowerType, level: number): number {
  const s = TOWER_BALANCE[type].levels[level];
  const shots = SHOTS[type]?.[level] ?? 1;
  switch (type) {
    case 'shockwave': return s.attack * 33.3 * 2;           // hits everything in range
    case 'laser': return ((s.attack * shots) / s.delay) * 1000 * 1.4; // pierces
    case 'lightning': return (s.attack * 30 * 1.5) / (s.delay / 1000) + s.attack * 25; // arcs plus the slow
    default: return ((s.attack * shots) / s.delay) * 1000;
  }
}

function routeTiles(g: Game): BoardTile[] {
  return g.grid.spawns.flatMap((s) => traceRoute(g.grid, s).map((st) => st.tile));
}

function coverage(route: BoardTile[], x: number, y: number, range: number): number {
  let n = 0;
  for (const t of route) {
    const c = { x: (t.x + 0.5) * 0.2, y: (t.y + 0.5 + (t.x & 1 ? 0.5 : 0)) * 0.26667 };
    if (Math.abs(c.x - x) <= range && Math.abs(c.y - y) <= range && dist(c.x, c.y, x, y) < range * 1.05) n++;
  }
  return n;
}

const centre = (t: BoardTile) => ({ x: (t.x + 0.5) * 0.2, y: (t.y + 0.5 + (t.x & 1 ? 0.5 : 0)) * 0.26667 });

let seed = 12345;
const rand = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

function spend(g: Game, skill: Skill): void {
  for (let guard = 0; guard < 30; guard++) {
    const route = routeTiles(g);
    const free = g.grid.all.filter((t) => t.type === Tile.NORMAL && !t.tower);
    const types = availableTowers();
    const owned = (type: TowerType): number => g.towers.filter((t) => t.type === type).length;

    let best: { value: number; run: () => void } | null = null;
    const consider = (value: number, run: () => void): void => {
      if (!best || value > best.value) best = { value, run };
    };

    // building
    const opening = skill === 'good' && g.towers.length < 3; // a sensible opening: a few cheap towers first
    const buildTypes = skill === 'good' ? (opening ? types.filter((t) => t === 'minigun') : types) : types.filter((t) => t !== 'lightning' && (t !== 'shockwave' || rand() < 0.3));
    for (const type of buildTypes) {
      const b = TOWER_BALANCE[type];
      if (g.credits < b.cost) continue;
      const range = b.levels[0].range;
      const ranked = free
        .map((t) => ({ t, cov: coverage(route, centre(t).x, centre(t).y, range) }))
        .filter((o) => o.cov > 0)
        .sort((a, b2) => b2.cov - a.cov);
      for (const { t, cov } of ranked.slice(0, 40)) {
        if (!placementValid(g.grid, t)) continue;
        const div = skill === 'good' ? 1 / (1 + 0.3 * owned(type)) : 1;
        const value = skill === 'good' ? (power(type, 0) * cov * div) / b.cost : rand();
        consider(value, () => { buildTower(type, t); });
        break;
      }
    }
    // upgrading
    for (const t of g.towers) {
      if (!canUpgrade(t) || opening) continue;
      const c = centre(t.tile);
      const cov = coverage(route, c.x, c.y, t.range);
      if (skill === 'good') {
        consider(((power(t.type, t.level + 1) - power(t.type, t.level)) * cov) / t.upCost, () => upgradeTower(t));
      } else if (g.credits >= t.upCost * 3) {
        consider(rand() * 0.5, () => upgradeTower(t));
      }
    }
    if (!best) return;
    (best as { run: () => void }).run();
  }
}

interface Outcome {
  won: boolean;
  waves: number;
  lives: number;
  towers: number;
  credits: number;
  stuck: boolean;
  /** lives lost per wave, for the detail view */
  leaks: number[];
}

function play(index: number, skill: Skill): Outcome {
  seed = 12345 + index;
  const g = createGame(index);
  session.paused = false;
  const leaks: number[] = [];
  let stuck = false;
  while (!g.over && !g.completed) {
    spend(g, skill);
    const before = g.lives;
    startNextWave();
    let waveTime = 0, sinceDecision = 0;
    while (!g.over && (g.spawn || g.creeps.length)) {
      update(STEP);
      waveTime += STEP;
      sinceDecision += STEP;
      if (sinceDecision >= DECIDE_EVERY) { sinceDecision = 0; spend(g, skill); }
      if (waveTime > WAVE_TIMEOUT) { stuck = true; break; }
    }
    leaks.push(before - g.lives);
    if (stuck) break;
    // the engine marks the level completed when the last wave is cleared (inside update); run one more step for it
    if (!g.over && !g.completed) update(STEP);
  }
  if (args.includes('--debug')) {
    const route = routeTiles(g);
    const free = g.grid.all.filter((t) => t.type === Tile.NORMAL && !t.tower);
    const near = free.filter((t) => coverage(route, centre(t).x, centre(t).y, 0.4) > 0);
    console.log(`  [${skill}] free ${free.length}, near route ${near.length}, valid ${near.filter((t) => placementValid(g.grid, t)).length}, towers ${g.towers.map((t) => t.type[0] + t.level).join(' ')}`);
  }
  return { won: g.completed && !g.over, waves: g.wave + 1, lives: g.lives, towers: g.towers.length, credits: g.credits, stuck, leaks };
}

// ---------- main ----------
const args = process.argv.slice(2);
const hard = args.includes('--hard');
settings.difficulty = hard ? 1 : 0;
// quick balance experiments without editing balance.ts: --dmg=1.2 --reward=1.5 --hp=0.8 --credits=80 --lives=12
const flag = (name: string): number | null => { const a = args.find((x) => x.startsWith(`--${name}=`)); return a ? Number(a.split('=')[1]) : null; };
const dmg = flag('dmg'), rew = flag('reward'), hpk = flag('hp'), cred = flag('credits'), lives = flag('lives');
if (dmg) for (const t of Object.values(TOWER_BALANCE)) for (const l of t.levels) l.attack *= dmg;
if (rew) { REWARD_CURVE.base *= rew; REWARD_CURVE.perWave *= rew; }
if (hpk) { HEALTH_CURVE.linear *= hpk; HEALTH_CURVE.quadratic *= hpk; }
if (cred) START_CREDITS.base = cred;
if (lives) (RULES as { startLives: number }).startLives = lives;
const only = args.find((a) => /^\d+$/.test(a));
const skillArg = args.find((a) => a.startsWith('--skill='))?.split('=')[1] as Skill | undefined;
const skills: Skill[] = skillArg ? [skillArg] : ['good', 'casual'];

const cell = (o: Outcome): string => (o.stuck ? 'STUCK' : o.won ? `win  ${String(o.lives).padStart(2)}♥` : `LOSE w${String(o.waves).padStart(2)}`);
if (args.includes('--calibrate')) {
  settings.difficulty = 0;
  const margin = (i: number): number => 0.5 + 0.42 * (i / (LEVELS.length - 1)) - (i % 5 === 0 && i > 0 ? 0.04 : 0);
  const breaks: number[] = [];
  for (let i = 0; i < LEVELS.length; i++) {
    const level = LEVELS[i];
    let lo = 0.3, hi = 24;
    for (let k = 0; k < 11; k++) {
      const mid = Math.sqrt(lo * hi);
      level.hpScale = mid;
      if (play(i, 'good').won) lo = mid; else hi = mid;
    }
    breaks.push(lo);
  }
  // The bot is clumsy on a few layouts. Compare each result with the median of its neighbours and keep it within
  // 20% below / 25% above, so one odd result does not make a level far too easy or too hard.
  const median = (i: number): number => [breaks[Math.max(0, i - 1)], breaks[i], breaks[Math.min(breaks.length - 1, i + 1)]].sort((x, y) => x - y)[1];
  const med = (i: number): number => Math.max(0.8 * median(i), Math.min(1.25 * median(i), breaks[i]));
  const rows: { hpScale: number; threat: number }[] = [];
  console.log('lvl name                  bot breaks at  used       margin  hpScale');
  for (let i = 0; i < LEVELS.length; i++) {
    const m = margin(i);
    const hpScale = Math.round(med(i) * m * 100) / 100;
    const threat = 1 + Math.min(4, Math.floor(((m - 0.5) / 0.42) * 5));
    rows.push({ hpScale, threat });
    console.log(`${String(i + 1).padStart(2)}  ${LEVELS[i].name.padEnd(20)} ${breaks[i].toFixed(2).padStart(10)} ${med(i).toFixed(2).padStart(9)}${Math.abs(med(i) - breaks[i]) > 0.01 ? '*' : ' '}  ${m.toFixed(2)}   ${hpScale.toFixed(2)}`);
  }
  writeFileSync(
    'src/data/calibration.ts',
    `/**\n * Generated by tools/bot.ts (npm run bot -- --calibrate). Per level: the enemy-health multiplier and the menu threat pips.\n * Each multiplier is a growing fraction of the point where the balance bot starts losing.\n */\nexport const CALIBRATION: { hpScale: number; threat: number }[] = [\n${rows.map((r) => `  { hpScale: ${r.hpScale}, threat: ${r.threat} },`).join('\n')}\n];\n`,
  );
  console.log('\nwrote src/data/calibration.ts');
  process.exit(0);
}
console.log(`mode: ${hard ? 'Hard' : 'Easy'}   skills: ${skills.join(', ')}`);
console.log('lvl name                  spawns hpx   ' + skills.map((s) => s.padEnd(18)).join(' '));
for (let i = 0; i < LEVELS.length; i++) {
  if (only && i !== Number(only) - 1) continue;
  const level = LEVELS[i];
  const results = skills.map((s) => play(i, s));
  const spawns = level.grid.flat().filter((t) => t === Tile.SPAWN).length;
  console.log(
    `${String(i + 1).padStart(2)}  ${level.name.padEnd(20)} ${String(spawns).padStart(4)}   ${level.hpScale.toFixed(2)}  ` +
      results.map((o) => `${cell(o)} (${o.towers}T ₵${String(o.credits).padStart(3)})`.padEnd(18)).join(' '),
  );
  if (only) results.forEach((o, k) => console.log(`  ${skills[k]} lives lost per wave: ${o.leaks.join(' ')}`));
}
