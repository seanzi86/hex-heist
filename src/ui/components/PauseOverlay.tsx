import { useEffect, useRef } from 'preact/hooks';
import { backToMenu, openHelp, retryLevel } from '../controller';
import { togglePause } from '../playback';
import styles from './PauseOverlay.module.css';

/** Dims and blurs the board while paused, blocks taps on it, and offers Resume / Restart / Levels. */
export function PauseOverlay() {
  const resume = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    resume.current?.focus();
  }, []);

  return (
    // tapping the dark area resumes; the card itself swallows its own taps
    <div class={styles.overlay} onClick={togglePause} role="presentation">
      <div class={styles.card} role="dialog" aria-modal="true" aria-label="Paused" onClick={(e) => e.stopPropagation()}>
        <h2 class={styles.title}>PAUSED</h2>
        <button ref={resume} class={styles.primary} onClick={togglePause}>Resume</button>
        <div class={styles.secondary}>
          <button onClick={retryLevel}>Restart</button>
          <button onClick={backToMenu}>Levels</button>
          <button onClick={openHelp}>Help</button>
        </div>
      </div>
    </div>
  );
}
