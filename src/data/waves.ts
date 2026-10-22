/**
 * Wave lists. Each block of five levels gets its own, so later blocks differ in more than layout:
 * enemy types arrive earlier, bosses come more often, and boss waves bring escorts.
 * Creep ids: 0 Worm, 5 Spike, 6 Trojan, 1-4 the bosses (see CREEPS in defs.ts).
 */
const WORM = 0, SPIKE = 5, TROJAN = 6;

interface Profile {
  /** creeps in the first wave, and how many more each wave adds */
  start: number;
  growth: number;
  /** first wave (0-based) that can include spikes / trojans */
  spikeFrom: number;
  trojanFrom: number;
  /** boss waves (0-based wave index -> boss ids). The last wave is always one. */
  bosses: Record<number, number[]>;
  /** worms escorting a boss, as a share of the normal wave size */
  escort: number;
}

const WAVE_COUNT = 20;

const rep = (id: number, n: number): number[] => Array<number>(Math.max(0, Math.round(n))).fill(id);

/** Interleave groups so different enemy types arrive mixed together instead of in blocks. */
function interleave(groups: number[][]): number[] {
  const out: number[] = [];
  for (let i = 0; groups.some((g) => i < g.length); i++) for (const g of groups) if (i < g.length) out.push(g[i]);
  return out;
}

function build(p: Profile): number[][] {
  const waves: number[][] = [];
  for (let w = 0; w < WAVE_COUNT; w++) {
    const size = p.start + p.growth * w;
    const boss = p.bosses[w];
    if (boss) {
      waves.push([...boss, ...rep(WORM, size * p.escort)]);
      continue;
    }
    // a four-wave rhythm: worms, spike rush, mixed, trojans
    const theme = w % 4;
    const spikes = w >= p.spikeFrom, trojans = w >= p.trojanFrom;
    if (theme === 1 && spikes) waves.push(rep(SPIKE, size * 1.3));
    else if (theme === 3 && trojans) waves.push(rep(TROJAN, Math.max(3, size * 0.7)));
    else if (theme === 2 && (spikes || trojans)) {
      waves.push(interleave([rep(WORM, size * 0.4), rep(spikes ? SPIKE : WORM, size * 0.4), rep(trojans ? TROJAN : WORM, size * 0.2)]));
    } else waves.push(rep(WORM, size));
  }
  return waves;
}

const PROFILES: Profile[] = [
  { start: 6, growth: 0.3, spikeFrom: 2, trojanFrom: 8, escort: 0, bosses: { 9: [1], 19: [2] } },
  { start: 7, growth: 0.35, spikeFrom: 1, trojanFrom: 5, escort: 0, bosses: { 7: [1], 14: [2], 19: [3] } },
  { start: 8, growth: 0.4, spikeFrom: 1, trojanFrom: 4, escort: 0.3, bosses: { 5: [1], 11: [2], 15: [3], 19: [4] } },
  { start: 8, growth: 0.45, spikeFrom: 1, trojanFrom: 3, escort: 0.4, bosses: { 4: [3], 9: [1], 14: [2], 19: [4, 1] } },
  { start: 9, growth: 0.45, spikeFrom: 1, trojanFrom: 3, escort: 0.5, bosses: { 4: [2], 9: [4], 14: [3, 1], 19: [1, 2] } },
  { start: 9, growth: 0.5, spikeFrom: 1, trojanFrom: 2, escort: 0.5, bosses: { 3: [1], 7: [2], 11: [3], 15: [4, 1], 19: [2, 3, 4] } },
  { start: 10, growth: 0.5, spikeFrom: 1, trojanFrom: 2, escort: 0.6, bosses: { 2: [4], 5: [3], 8: [2], 11: [1], 14: [1, 3], 17: [2, 4], 19: [1, 2, 3, 4] } },
];

export const WAVE_SETS: number[][][] = PROFILES.map(build);

/** The wave list for a level (0-based): one set per block of five levels. */
export const wavesForLevel = (index: number): number[][] => WAVE_SETS[Math.min(WAVE_SETS.length - 1, Math.floor(index / 5))];
