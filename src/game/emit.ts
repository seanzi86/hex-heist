import { currentGame } from '../state';
import type { Fx } from '../types';

/** Add a visual effect (or projectile) to the running game. */
export function addFx(fx: Fx): void {
  currentGame().fx.push(fx);
}
