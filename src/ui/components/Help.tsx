import { useEffect, useRef } from 'preact/hooks';
import { CREEPS, TOWERS, TOWER_TYPES } from '../../data/defs';
import { RULES } from '../../constants';
import { START_CREDITS } from '../../data/balance';
import type { CreepId } from '../../types';
import { closeHelp } from '../controller';
import { CreepIcon, TileIcon, TowerIcon, type TileIconKind } from './icons';
import styles from './Help.module.css';

/** The order enemies are listed in: ordinary ones first, then the bosses. */
const ENEMY_ORDER: CreepId[] = [0, 5, 6, 1, 2, 3, 4];

const TILES: { kind: TileIconKind; name: string; note: string }[] = [
  { kind: 'repair', name: 'Repair node', note: 'Enemies heal while they cross it.' },
  { kind: 'corrupt', name: 'Corrupt sector', note: 'Enemies lose health while they cross it.' },
  { kind: 'fast', name: 'Overclock', note: 'Enemies move twice as fast.' },
  { kind: 'slow', name: 'Lag', note: 'Enemies move at half speed.' },
  { kind: 'stream', name: 'Data stream', note: 'Forces enemies along the arrow. You can\'t build on it.' },
  { kind: 'gate', name: 'Proxy gate', note: 'Enemies can jump between gates of the same kind.' },
  { kind: 'spawn', name: 'Intrusion point', note: 'Where enemies enter. Tap it to start the wave.' },
  { kind: 'core', name: 'Data core', note: 'Protect it. The number is your remaining lives.' },
];

/** The how-to-play screen: a full-screen scrollable sheet above everything else. */
export function Help() {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.stopPropagation(); closeHelp(); }
    };
    addEventListener('keydown', onKey, true);
    return () => removeEventListener('keydown', onKey, true);
  }, []);

  return (
    <div class={styles.sheet} role="dialog" aria-modal="true" aria-label="How to play">
      <div class={styles.bar}>
        <h2 class={styles.heading}>HOW TO PLAY</h2>
        <button ref={closeRef} onClick={closeHelp} aria-label="Close">✕</button>
      </div>

      <div class={styles.body}>
        <section>
          <h3>The goal</h3>
          <p>Hostile code pours in at the red <b>intrusion point</b> and heads for your <b>data core</b>. Every enemy that reaches it costs a life, and you start with {RULES.startLives}. Survive 20 waves to beat a level, then keep going for a high score.</p>
        </section>

        <section>
          <h3>Build your defence</h3>
          <ul>
            <li><b>Drag</b> a tower from the bottom bar onto the board and release to place it. Release over the bar to cancel. Or tap a tower, then tap tiles.</li>
            <li><b>Tap a tower</b> on the board to upgrade it (up to level 4, takes 5 seconds) or sell it for half of what you spent.</li>
            <li>You start with ₵{START_CREDITS.base}, and a little more on later levels. Kills pay credits.</li>
          </ul>
        </section>

        <section>
          <h3>Shape the route</h3>
          <p>Enemies take the shortest open path to your core, shown as the dashed line. <b>Towers block tiles</b>, so building them bends the route, and a longer route means more time under fire. You can't seal the path completely.</p>
          <p>While you drag a tower, the <b class={styles.lime}>green line</b> shows the new route, and a <b class={styles.red}>red tile</b> means that spot would block the path.</p>
        </section>

        <section>
          <h3>Waves</h3>
          <ul>
            <li>Nothing starts on a timer. Build as long as you like, then press <b>▶</b> (or <b>Space</b>) to send the wave.</li>
            <li>Starting sooner earns <b>bonus points</b>, shown on the button. <b>⟳ Auto</b> starts each wave a few seconds after the last is cleared.</li>
            <li><b>⏸ Pause</b> freezes the game. You can't build while paused.</li>
          </ul>
        </section>

        <section>
          <h3>Towers</h3>
          <div class={styles.list}>
            {TOWER_TYPES.map((type) => (
              <div key={type} class={styles.row}>
                <TowerIcon type={type} />
                <div>
                  <b style={{ color: TOWERS[type].color }}>{TOWERS[type].name}</b> <span class={styles.cost}>₵{TOWERS[type].cost}</span>
                  <p>{TOWERS[type].description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3>Enemies</h3>
          <div class={styles.list}>
            {ENEMY_ORDER.map((id) => (
              <div key={id} class={styles.row}>
                <CreepIcon id={id} />
                <div>
                  <b style={{ color: CREEPS[id].color }}>{CREEPS[id].name}</b>
                  <p>{CREEPS[id].description}</p>
                </div>
              </div>
            ))}
          </div>
          <p class={styles.tip}>Each boss shrugs off one kind of tower, so don't rely on a single type. You get a warning when a boss wave starts.</p>
        </section>

        <section>
          <h3>Tiles</h3>
          <p>You can only build on plain tiles. The special ones below shape how enemies move.</p>
          <div class={styles.grid}>
            {TILES.map((t) => (
              <div key={t.kind} class={styles.row}>
                <TileIcon kind={t.kind} />
                <div>
                  <b>{t.name}</b>
                  <p>{t.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3>Scoring and tips</h3>
          <ul>
            <li>Points come from kills and the early-start bonus. Your best score also counts <b>2000 per life left</b> once you've completed all 20 waves.</li>
            <li>Most towers shoot the enemy <b>closest to your core</b>.</li>
            <li>Trace works best along straight runs of the route. Firewall works best on a bend, where enemies pass close by.</li>
            <li>Later levels are harder: enemy health rises with each level.</li>
          </ul>
        </section>

        <section>
          <h3>Controls</h3>
          <table class={styles.keys}>
            <tbody>
              <tr><td>1-5</td><td>pick a tower</td></tr>
              <tr><td>Space</td><td>start the next wave</td></tr>
              <tr><td>P</td><td>pause / resume</td></tr>
              <tr><td>F</td><td>game speed 1× / 2× / 3×</td></tr>
              <tr><td>A</td><td>auto-start waves</td></tr>
              <tr><td>R</td><td>show / hide the route</td></tr>
              <tr><td>H</td><td>this screen</td></tr>
              <tr><td>Esc</td><td>cancel / close</td></tr>
            </tbody>
          </table>
        </section>

        <button class={styles.done} onClick={closeHelp}>Got it</button>
      </div>
    </div>
  );
}
