import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// A gap this long between JS frames means the JS thread was blocked for
// roughly six frames at 60 Hz, which users notice as a freeze.
const STALL_THRESHOLD_MS = 100;

export type JsFps = {
  /** JS frames per second over the last window. null until the first reading. */
  fps: number | null;
  /** Longest gap between two JS frames in the last window, in ms. */
  maxFrameMs: number | null;
  /** Gaps of 100 ms or more seen since the hook started. */
  stallCount: number;
};

export type UseJsFpsOptions = {
  /** Turns JS FPS monitoring on or off. Default: true. */
  enabled?: boolean;
};

/**
 * Measures how smoothly the JS thread runs, updated about once per second.
 * Pure JS: it counts requestAnimationFrame callbacks, which arrive late when
 * the JS thread is busy. When disabled, the last values are kept.
 */
export function useJsFps({ enabled = true }: UseJsFpsOptions = {}): JsFps {
  const [state, setState] = useState<JsFps>({
    fps: null,
    maxFrameMs: null,
    stallCount: 0,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let frameId = 0;
    let windowStart: number | null = null;
    let lastFrame = 0;
    let frames = 0;
    let maxFrameMs = 0;
    let stalls = 0;

    const onFrame = () => {
      const now = performance.now();

      if (windowStart === null) {
        windowStart = now;
      } else {
        const frameMs = now - lastFrame;
        frames++;
        maxFrameMs = Math.max(maxFrameMs, frameMs);
        if (frameMs >= STALL_THRESHOLD_MS) {
          stalls++;
        }

        const elapsed = now - windowStart;
        if (elapsed >= 1000) {
          const fps = (frames * 1000) / elapsed;
          const windowMax = maxFrameMs;
          const windowStalls = stalls;
          setState((prev) => ({
            fps,
            maxFrameMs: windowMax,
            stallCount: prev.stallCount + windowStalls,
          }));
          windowStart = now;
          frames = 0;
          maxFrameMs = 0;
          stalls = 0;
        }
      }

      lastFrame = now;
      frameId = requestAnimationFrame(onFrame);
    };

    frameId = requestAnimationFrame(onFrame);

    // Frames stop while backgrounded; start a fresh window on return so the
    // background period isn't reported as a stall.
    const appStateSubscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        windowStart = null;
        frames = 0;
        maxFrameMs = 0;
        stalls = 0;
      }
    });

    return () => {
      cancelAnimationFrame(frameId);
      appStateSubscription.remove();
    };
  }, [enabled]);

  return state;
}
