import { useEffect, useState } from 'preact/hooks';

/** UI-only state (what the game rules don't know about). Components re-render when `notify()` runs. */
export type Screen = 'menu' | 'game';

export interface Message { title: string; sub: string }
export interface ToastState { id: number; text: string; good: boolean; warn: boolean; ms: number }

export const ui = {
  screen: 'menu' as Screen,
  message: null as Message | null,
  toast: null as ToastState | null,
  /** the how-to-play sheet is open */
  help: false,
};

const listeners = new Set<() => void>();
let scheduled = false;

/** Ask subscribed components to re-render. Bursts within one tick are coalesced. */
export function notify(): void {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    for (const listener of [...listeners]) listener();
  });
}

/** Re-render the calling component whenever `notify()` runs. */
export function useRefresh(): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = (): void => setTick((n) => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
}

let toastTimer = 0;
let toastId = 0;

export function showToast(text: string, good = false, options: { warn?: boolean; ms?: number } = {}): void {
  const ms = options.ms ?? 1600;
  ui.toast = { id: ++toastId, text, good, warn: !!options.warn, ms };
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { ui.toast = null; notify(); }, ms);
  notify();
}
