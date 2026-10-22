/**
 * Callbacks the game rules use to talk to the UI. The UI registers real
 * implementations at start-up, so the simulation never imports DOM code.
 */
/** `warn` styles the banner as a warning; `ms` is how long it stays. */
export interface ToastOptions {
  warn?: boolean;
  ms?: number;
}

export interface Hooks {
  toast(message: string, good?: boolean, options?: ToastOptions): void;
  /** credits / score / wave / bar need refreshing */
  hud(): void;
  gameOver(): void;
}

export const hooks: Hooks = {
  toast() {},
  hud() {},
  gameOver() {},
};
