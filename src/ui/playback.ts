import { sfx } from '../audio';
import { session, setAutoStart } from '../state';
import { notify } from './state';

/** Pause / speed controls, shared by the buttons and the keyboard. */

export function togglePause(): void {
  const g = session.game;
  if (!g || g.over) return;
  session.paused = !session.paused;
  sfx('woosh');
  notify();
}

/** 1x -> 2x -> 3x -> 1x */
export function cycleSpeed(): void {
  session.speed = (session.speed % 3) + 1;
  sfx('click');
  notify();
}

/** Begin each wave automatically a few seconds after the last one is cleared. */
export function toggleAutoStart(): void {
  setAutoStart(!session.autoStart);
  sfx('click');
  notify();
}
