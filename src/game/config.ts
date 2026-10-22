import { DIFFICULTY, HEALTH_CURVE, LEVEL_REWARD_BONUS, REWARD_CURVE, START_CREDITS } from '../data/balance';
import { settings } from '../state';

export function creditsForWave(wave: number, levelIndex: number): number {
  const perKill = (REWARD_CURVE.base + REWARD_CURVE.perWave * wave) * (1 + LEVEL_REWARD_BONUS * levelIndex);
  return Math.ceil(perKill * DIFFICULTY[settings.difficulty].reward);
}

export function startCredits(levelIndex: number): number {
  return Math.round(START_CREDITS.base + START_CREDITS.perLevel * levelIndex);
}

/** Enemy health multiplier for a wave (0-based), including the difficulty setting. */
export function healthMultiplier(wave: number): number {
  return (1 + HEALTH_CURVE.linear * wave + HEALTH_CURVE.quadratic * wave * wave) * DIFFICULTY[settings.difficulty].health;
}
