import { useState } from 'preact/hooks';
import { isMuted, setMuted, sfx } from '../../audio';
import { earlyStartBonus, startNextWave } from '../../game/engine';
import { session, setShowRoute } from '../../state';
import { backToMenu } from '../controller';
import { cycleSpeed, toggleAutoStart, togglePause } from '../playback';
import { notify, useRefresh } from '../state';
import styles from './Hud.module.css';

/** Top bar: menu, score, wave, credits and "next wave", with a row of tool buttons underneath. */
export function Hud() {
  useRefresh();
  const [muted, setMutedState] = useState(isMuted());
  const g = session.game;
  if (!g) return null;
  const waiting = g.intermission.active;
  const bonus = earlyStartBonus(g);

  const toggleSound = (): void => {
    setMuted(!muted);
    setMutedState(!muted);
    sfx('click');
  };
  const toggleRoute = (): void => {
    setShowRoute(!session.showRoute);
    sfx('click');
    notify();
  };

  return (
    <header class={styles.hud}>
      <div class={styles.top}>
        <button onClick={backToMenu} title="Levels">☰</button>
        <span class={styles.score}>{g.score}</span>
        <span class={styles.wave}>Wave {g.waveCount}</span>
        <span class={styles.credits}>₵{g.credits}</span>
        <button class={styles.go} onClick={startNextWave} disabled={!waiting} title="Start the next wave (Space). Starting sooner earns a bonus.">
          {waiting ? (bonus > 0 ? `▶ +${bonus}` : '▶ Start') : '▶'}
        </button>
      </div>
      <div class={styles.tools}>
        <button class={session.paused ? styles.active : ''} onClick={togglePause} disabled={g.over} title="Pause (P)" aria-label="Pause">
          {session.paused ? '▶' : '⏸'}
        </button>
        <button class={session.speed > 1 ? styles.active : ''} onClick={cycleSpeed} title="Game speed (F)" aria-label="Speed">
          {session.speed}×
        </button>
        <button class={session.autoStart ? styles.active : ''} onClick={toggleAutoStart} title="Auto-start waves (A)" aria-label="Auto-start">
          ⟳ Auto
        </button>
        <button class={session.showRoute ? styles.active : ''} onClick={toggleRoute} title="Show the route (R)" aria-label="Route">⤳</button>
        <button onClick={toggleSound} title="Sound" aria-label="Sound">{muted ? '🔇' : '🔊'}</button>
      </div>
    </header>
  );
}
