export type TowerType = 'minigun' | 'laser' | 'rocket' | 'shockwave' | 'lightning';
export type CreepId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ---------- data ----------
export interface Level {
  name: string;
  w: number;
  h: number;
  /** rows listed top first */
  grid: number[][];
  /** each wave is a list of creep ids */
  waves: number[][];
  /** multiplier on enemy health, rising with the level's position */
  hpScale: number;
  /** 1-5 pips shown in the menu */
  threat: number;
}

export interface TowerDef {
  name: string;
  cost: number;
  color: string;
  /** one short line, shown when you pick the tower */
  blurb: string;
  /** the full text on the how-to-play screen */
  description: string;
}

export interface CreepDef {
  /** milliseconds to cross one tile */
  mspt: number;
  name: string;
  color: string;
  /** drawing radius in world units */
  r: number;
  /** bosses are immune to exactly one tower type */
  boss?: TowerType;
  /** the text on the how-to-play screen */
  description: string;
  /** bosses only: the short warning shown when a boss wave starts */
  warning?: string;
}

// ---------- board ----------
export interface BoardTile {
  x: number;
  y: number;
  type: number;
  tower: Tower | null;
  /** distance to the nearest core by the path creeps will take */
  prio: number;
  /** forced next tile for data-stream tiles */
  dir: BoardTile | null;
  /** up to 6 hex neighbours (null = off board), followed by portal outlets */
  nbrs: (BoardTile | null)[];
}

export interface Grid {
  W: number;
  H: number;
  tiles: BoardTile[][];
  all: BoardTile[];
  spawns: BoardTile[];
  ends: BoardTile[];
  /** increases whenever paths are recomputed for real (towers built or sold) */
  rev: number;
}

// ---------- entities ----------
export interface Creep {
  id: CreepId;
  d: CreepDef;
  wave: number;
  max: number;
  hp: number;
  reward: number;
  tile: BoardTile;
  target: BoardTile | null;
  /** progress (0-1) from `tile` towards `target` */
  prog: number;
  mspt: number;
  /** slow modifier applied by Throttle arcs */
  mod: number;
  invisible: boolean;
  tele: { age: number; dest: BoardTile } | null;
  /** ms since last damage (drives hit flash and health bar) */
  hurt: number;
  x: number;
  y: number;
  /** heading in radians (y-up) */
  ang: number;
  rot: number;
  child: boolean;
  dead: boolean;
}

export interface Tower {
  type: TowerType;
  def: TowerDef;
  tile: BoardTile;
  x: number;
  y: number;
  range: number;
  delay: number;
  attack: number;
  /** total credits spent (resale is half) */
  cost: number;
  upCost: number;
  level: number;
  upgrading: { p: number } | null;
  sinceFire: number;
  sinceTarget: number;
  target: Creep | null;
  angle: number;
  /** firewall pulse timer */
  sw: number;
}

export interface Beam {
  t: Tower;
  ang: number;
  left: number;
  len: number;
}

// ---------- effects ----------
interface FxBase { life: number; max: number }
export interface RingFx extends FxBase { k: 'ring'; x: number; y: number; col: string; r: number }
export interface BoomFx extends FxBase { k: 'boom'; x: number; y: number; col: string; r: number; seed?: number }
export interface TextFx extends FxBase { k: 'text'; x: number; y: number; col: string; txt: string }
export interface ShockFx extends FxBase { k: 'shock'; x: number; y: number; r: number }
export interface BulletFx extends FxBase {
  k: 'bullet'; x: number; y: number; px?: number; py?: number; tx: number; ty: number;
  target: Creep; dmg: number; delay: number; ttl: number; miss: boolean; ang: number;
}
export interface RocketFx extends FxBase {
  k: 'rocket'; t: Tower; x: number; y: number; ang: number; age: number; last: number;
  target: Creep | null; trail?: [number, number][];
}
export interface BoltLink { from: Creep | null; to: Creep }
export interface BoltFx extends FxBase {
  k: 'bolt'; t: Tower; links: BoltLink[]; attacked: Creep[]; slow: number; dmg: number; left: number;
}
export type Fx = RingFx | BoomFx | TextFx | ShockFx | BulletFx | RocketFx | BoltFx;

// ---------- game ----------
/** The gap between waves: the game waits for the player (or auto-start) to begin the next wave. */
export interface Intermission {
  /** ms spent waiting so far */
  t: number;
  /** the early-start bonus shrinks to zero over this many ms */
  bonusWindow: number;
  active: boolean;
}
export interface SpawnState { list: number[]; ms: number; idx: number }

export interface Game {
  index: number;
  level: Level;
  grid: Grid;
  towers: Tower[];
  creeps: Creep[];
  fx: Fx[];
  beams: Beam[];
  credits: number;
  lives: number;
  score: number;
  /** index of the wave in progress (-1 before the first) */
  wave: number;
  /** number of waves started, shown in the HUD */
  waveCount: number;
  intermission: Intermission;
  spawn: SpawnState | null;
  over: boolean;
  completed: boolean;
  hasLightning: boolean;
  /** elapsed game time in ms (drives animation) */
  time: number;
  /** screen-shake remaining in ms */
  shake: number;
  selected: Tower | null;
}

export type SfxName =
  | TowerType
  | 'minigunSoft' | 'minigunHit' | 'rocketHit' | 'pop' | 'boss' | 'leak' | 'place' | 'sell' | 'up' | 'click' | 'deny'
  | 'wave' | 'over' | 'pickup' | 'woosh' | 'waveClear' | 'levelComplete' | 'bossAlarm' | 'lowLives';
