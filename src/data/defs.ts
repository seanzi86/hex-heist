import { RULES } from '../constants';
import { CREEP_BALANCE, TOWER_BALANCE } from './balance';
import type { CreepDef, CreepId, TowerDef, TowerType } from '../types';

export const TOWERS: Record<TowerType, TowerDef> = {
  minigun: {
    name: 'Ping', cost: TOWER_BALANCE.minigun.cost, color: '#00f0ff',
    blurb: 'cheap and quick, single shots',
    description: 'Cheap and quick. Fires single shots at the enemy closest to your core.',
  },
  laser: {
    name: 'Trace', cost: TOWER_BALANCE.laser.cost, color: '#b6ff00',
    blurb: 'a beam that pierces everything in a line',
    description: 'A beam that pierces everything in a straight line, so it shines on long, straight stretches.',
  },
  rocket: {
    name: 'Seeker', cost: TOWER_BALANCE.rocket.cost, color: '#ff2bd6',
    blurb: 'slow to reload, but homing missiles hit hard',
    description: 'Reloads slowly, but its homing missiles hit hard. Great against tough enemies.',
  },
  shockwave: {
    name: 'Firewall', cost: TOWER_BALANCE.shockwave.cost, color: '#ff7a1a',
    blurb: 'burns everything around it',
    description: 'Burns everything near it, all the time. Short range, so put it right on the route.',
  },
  lightning: {
    name: 'Throttle', cost: TOWER_BALANCE.lightning.cost, color: '#ffe600',
    blurb: 'chain arcs that slow and zap',
    description: `Arcs between nearby enemies, slowing them and zapping them a little. Unlocks at level ${RULES.lightningFromLevel + 1}.`,
  },
};
export const TOWER_TYPES = Object.keys(TOWERS) as TowerType[];

export const CREEPS: Record<CreepId, CreepDef> = {
  0: { mspt: CREEP_BALANCE[0].mspt, name: 'Worm', color: '#7dff9a', r: 0.07, description: 'The basic enemy.' },
  1: {
    mspt: CREEP_BALANCE[1].mspt, name: 'Prism', color: '#00ffc8', r: 0.1, boss: 'laser',
    description: "Boss. Reflects Trace beams, so Trace can't hurt it (or anything behind it).",
    warning: 'reflects Trace beams',
  },
  2: {
    mspt: CREEP_BALANCE[2].mspt, name: 'Cipher', color: '#ffffff', r: 0.1, boss: 'minigun',
    description: 'Boss. Immune to Ping.',
    warning: 'immune to Ping',
  },
  3: {
    mspt: CREEP_BALANCE[3].mspt, name: 'Interceptor', color: '#ff4dd8', r: 0.1, boss: 'rocket',
    description: 'Boss. Its shield destroys Seeker missiles before they land.',
    warning: 'destroys Seeker missiles',
  },
  4: {
    mspt: CREEP_BALANCE[4].mspt, name: 'Rootkit', color: '#ff4d4d', r: 0.1, boss: 'shockwave',
    description: 'Boss. Immune to Firewall.',
    warning: 'immune to Firewall',
  },
  5: { mspt: CREEP_BALANCE[5].mspt, name: 'Spike', color: '#ffe600', r: 0.07, description: 'Fast but fragile.' },
  6: {
    mspt: CREEP_BALANCE[6].mspt, name: 'Trojan', color: '#c77dff', r: 0.085,
    description: 'A slow shell with a payload: when it breaks, two smaller, faster enemies burst out.',
  },
};
