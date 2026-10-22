import { render } from 'preact';
import './styles/global.css';
import { unlockAudio } from './audio';
import { App } from './ui/components/App';
import { showHelpOnFirstRun, wireHooks } from './ui/controller';

unlockAudio();
wireHooks();
showHelpOnFirstRun();

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app');
render(<App />, root);
