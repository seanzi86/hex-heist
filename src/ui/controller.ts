import { sfx } from '../audio';
import { createGame, saveBest } from '../game/engine';
import { hooks } from '../hooks';
import { hasCanvas } from '../render/viewport';
import { resize } from '../render/draw';
import { session } from '../state';
import { notify, showToast, ui } from './state';

/** Start (or restart) a level and switch to the game screen. */
export function playLevel(index: number): void {
  const game = createGame(index);
  session.paused = false;
  ui.message = null;
  ui.screen = 'game';
  if (hasCanvas()) resize(); // retrying: the canvas is already mounted, so refit it to the new board
  showToast(`${index + 1}. ${game.level.name} · enemy HP ×${game.level.hpScale.toFixed(2)}`, true);
  notify();
}

const HELP_SEEN_KEY = 'hexheist-help-seen';

function helpSeen(): boolean {
  try {
    return localStorage.getItem(HELP_SEEN_KEY) === '1';
  } catch {
    return true; // can't remember, so don't nag
  }
}

/** Open the how-to-play sheet. A game in progress is paused behind it. */
export function openHelp(): void {
  const g = session.game;
  if (g && !g.over && ui.screen === 'game') session.paused = true;
  ui.help = true;
  notify();
}

export function closeHelp(): void {
  ui.help = false;
  try {
    localStorage.setItem(HELP_SEEN_KEY, '1');
  } catch {
    /* storage unavailable */
  }
  notify();
}

/** Show the help automatically the first time the game is opened. */
export function showHelpOnFirstRun(): void {
  if (!helpSeen()) ui.help = true;
}

export function backToMenu(): void {
  if (session.game) saveBest();
  session.game = null;
  session.paused = false;
  ui.screen = 'menu';
  ui.message = null;
  notify();
}

export function retryLevel(): void {
  if (session.game) playLevel(session.game.index);
}

function onGameOver(): void {
  const g = session.game;
  if (!g) return;
  const best = saveBest();
  ui.message = { title: 'CORE BREACHED', sub: `Reached wave ${g.waveCount} · score ${g.score}${best ? ' · new best!' : ''}` };
  notify();
}

/** Connect the game rules to the UI. */
export function wireHooks(): void {
  hooks.toast = (message, good = false, options) => {
    if (!good && !options?.warn) sfx('deny'); // warnings have their own sound (the wave horn)
    showToast(message, good, options);
  };
  hooks.hud = notify;
  hooks.gameOver = onGameOver;

  // switching apps or tabs pauses a running game, so a phone call doesn't cost you the core
  document.addEventListener('visibilitychange', () => {
    const g = session.game;
    if (document.hidden && g && !g.over && ui.screen === 'game' && !session.paused) {
      session.paused = true;
      notify();
    }
  });
}
