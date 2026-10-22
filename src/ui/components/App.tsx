import { ui, useRefresh } from '../state';
import { GameScreen } from './GameScreen';
import { Help } from './Help';
import { Menu } from './Menu';

export function App() {
  useRefresh();
  return (
    <>
      {ui.screen === 'game' ? <GameScreen /> : <Menu />}
      {ui.help && <Help />}
    </>
  );
}
