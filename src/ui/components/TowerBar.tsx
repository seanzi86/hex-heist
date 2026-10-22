import { sfx } from '../../audio';
import { RULES } from '../../constants';
import { TOWERS } from '../../data/defs';
import { armTower, availableTowers, canUpgrade, sellTower, upgradeTower } from '../../game/actions';
import { resaleValue } from '../../game/towers';
import { session } from '../../state';
import type { Tower } from '../../types';
import { consumeSuppressedClick, onTowerPointerCancel, onTowerPointerDown, onTowerPointerMove, onTowerPointerUp } from '../drag';
import { notify, showToast, useRefresh } from '../state';
import { TowerIcon } from './icons';
import styles from './TowerBar.module.css';

/** Bottom bar: the tower shop, or sell/upgrade controls when a tower is selected. */
export function TowerBar() {
  useRefresh();
  const g = session.game;
  if (!g) return null;
  return <footer class={styles.bar}>{g.selected ? <SelectedTower tower={g.selected} /> : <Shop />}</footer>;
}

function Shop() {
  const g = session.game;
  if (!g) return null;
  return (
    <>
      {availableTowers().map((type) => {
        const def = TOWERS[type];
        const armed = session.placing === type;
        const poor = g.credits < def.cost;
        const choose = (): void => {
          if (consumeSuppressedClick()) return; // this press was a drag, not a tap
          armTower(armed ? null : type);
          sfx('click');
          if (session.placing) showToast(`${def.name}: ${def.blurb}`, true);
          notify();
        };
        return (
          <button key={type} class={`${styles.tower} ${armed ? styles.armed : ''} ${poor ? styles.poor : ''}`} title={def.blurb}
            onClick={choose}
            onPointerDown={(e) => onTowerPointerDown(e, type)}
            onPointerMove={onTowerPointerMove}
            onPointerUp={onTowerPointerUp}
            onPointerCancel={onTowerPointerCancel}
          >
            <TowerIcon type={type} size={32} />
            {def.name}
            <i class={styles.cost}>₵{def.cost}</i>
          </button>
        );
      })}
    </>
  );
}

function SelectedTower({ tower }: { tower: Tower }) {
  const g = session.game;
  if (!g) return null;
  const maxed = tower.level >= RULES.maxUpgradeLevel;
  const upgradeLabel = maxed ? 'Max level' : tower.upgrading ? 'Upgrading…' : (
    <>Upgrade ₵{tower.upCost}<small>{RULES.upgradeMs / 1000}s build time</small></>
  );
  return (
    <>
      <button class={styles.action} onClick={() => { const reason = sellTower(tower); if (reason) showToast(reason); notify(); }}>
        Sell ₵{resaleValue(tower)}<small>{tower.def.name} · lvl {tower.level + 1}</small>
      </button>
      <button class={styles.action} disabled={!canUpgrade(tower)} onClick={() => { upgradeTower(tower); notify(); }}>
        {upgradeLabel}
      </button>
      <button onClick={() => { g.selected = null; notify(); }}>✕</button>
    </>
  );
}
