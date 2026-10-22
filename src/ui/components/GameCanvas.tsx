import { useEffect, useRef } from 'preact/hooks';
import { startLoop, stopLoop } from '../../loop';
import { resize } from '../../render/draw';
import { attachCanvas, detachCanvas } from '../../render/viewport';
import { onCanvasPointerDown, onCanvasPointerLeave, onCanvasPointerMove } from '../input';
import styles from './GameScreen.module.css';

/** The game canvas. While mounted it owns the renderer and the frame loop. */
export function GameCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    attachCanvas(el);
    resize();
    startLoop();
    const observer = new ResizeObserver(() => resize()); // refit when the window or the bars change size
    observer.observe(el);
    return () => {
      observer.disconnect();
      stopLoop();
      detachCanvas();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      class={styles.canvas}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerLeave={onCanvasPointerLeave}
    />
  );
}
