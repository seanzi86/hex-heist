import { useEffect, useRef, useState } from 'preact/hooks';
import { RULES } from '../../constants';
import { LEVELS } from '../../data/levels';
import { bestScore } from '../../game/engine';
import { settings } from '../../state';
import type { Level } from '../../types';
import { openHelp, playLevel } from '../controller';
import styles from './Menu.module.css';

/** Tile code -> colour for the level thumbnails. */
const THUMB_COLORS: Record<number, string> = {
  0: '#0b2236', 1: '#19b36e', 2: '#c0264a', 3: '#d99a1a', 4: '#1f6fb3',
  11: '#ff3355', 12: '#00f0ff', 13: '#00f0ff', 14: '#ffb300', 15: '#ff2bd6',
};

function Thumbnail({ level }: { level: Level }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext('2d');
    if (!c) return;
    const cw = 88 / (level.w * 0.75 + 0.3), ch = 116 / (level.h + 0.7);
    for (let r = 0; r < level.h; r++) {
      for (let x = 0; x < level.w; x++) {
        const v = level.grid[r][x];
        if (v === -1) continue;
        c.fillStyle = THUMB_COLORS[v] ?? '#7a5b1f'; // stream tiles
        c.fillRect(x * 0.75 * cw + 1, (r + (x & 1 ? 0 : 0.5)) * ch + 1, cw * 0.6, ch * 0.8);
      }
    }
  }, [level]);
  return <canvas ref={ref} width={88} height={116} />;
}

export function Menu() {
  const [difficulty, setDifficulty] = useState<0 | 1>(settings.difficulty);
  const choose = (d: 0 | 1): void => {
    settings.difficulty = d;
    setDifficulty(d);
  };

  return (
    <main class={styles.menu}>
      <h1 class={styles.title}>HEX//HEIST</h1>
      <div class={styles.subtitle}>
        Hostile code is breaching the grid. Deploy defences, bend the route, protect the core — survive 20 waves, then see how long you last.
      </div>
      <div class={styles.help}>
        <button onClick={openHelp}>How to play</button>
      </div>
      <div class={styles.difficulty}>
        <button class={difficulty === 0 ? styles.selected : ''} onClick={() => choose(0)}>Easy</button>
        <button class={difficulty === 1 ? styles.selected : ''} onClick={() => choose(1)}>Hard</button>
      </div>
      <div class={styles.levels}>
        {LEVELS.map((level, i) => {
          const best = bestScore(i, difficulty);
          return (
            <button key={level.name} class={styles.level} onClick={() => playLevel(i)}>
              <Thumbnail level={level} />
              <div>
                <b>{i + 1}. {level.name}</b>
                <span>THREAT {'▮'.repeat(level.threat)}{'▯'.repeat(5 - level.threat)}{i >= RULES.lightningFromLevel ? ' · ⚡' : ''}</span>
                {best > 0 && <small>★ {best}</small>}
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
}
