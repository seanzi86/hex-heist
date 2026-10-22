import { useEffect } from 'preact/hooks';
import { session } from '../../state';
import { onKeyDown } from '../input';
import { backToMenu, retryLevel } from '../controller';
import { ui, useRefresh } from '../state';
import { GameCanvas } from './GameCanvas';
import styles from './GameScreen.module.css';
import { Hud } from './Hud';
import { PauseOverlay } from './PauseOverlay';
import { TowerBar } from './TowerBar';

export function GameScreen() {
  useRefresh();
  useEffect(() => {
    addEventListener('keydown', onKeyDown);
    return () => removeEventListener('keydown', onKeyDown);
  }, []);

  const { toast, message } = ui;
  return (
    <div class={styles.game}>
      <Hud />
      <main class={styles.stage}>
        <GameCanvas />
        {session.paused && !message && <PauseOverlay />}
        {toast && (
          <div
            key={toast.id}
            class={`${styles.toast} ${toast.good ? styles.good : ''} ${toast.warn ? styles.warn : ''}`}
            style={{ animationDuration: `${toast.ms}ms` }}
          >
            {toast.text}
          </div>
        )}
        {message && (
          <div class={styles.dialog}>
            <div>{message.title}</div>
            <p>{message.sub}</p>
            <button onClick={retryLevel}>Try again</button>
            <button onClick={backToMenu}>Levels</button>
          </div>
        )}
      </main>
      <TowerBar />
    </div>
  );
}
