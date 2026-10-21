import { useEffect, useState } from 'react';
import NativeDiagnostics from './NativeNativeDiagnostics';

// Native monitoring is shared, so only start it for the first user and only
// stop it when the last one unmounts.
let activeUsers = 0;

export type UseFpsOptions = {
  /** Turns FPS monitoring on or off. Default: true. */
  enabled?: boolean;
};

/**
 * Live UI frame rate, updated about once per second. null until the first
 * reading. Monitoring runs only while a component is using this hook with
 * enabled set to true; when disabled, the last value is kept.
 */
export function useFps({ enabled = true }: UseFpsOptions = {}): number | null {
  const [fps, setFps] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const subscription = NativeDiagnostics.onFpsUpdate(setFps);
    if (activeUsers++ === 0) {
      NativeDiagnostics.startFpsMonitoring();
    }

    return () => {
      subscription.remove();
      if (--activeUsers === 0) {
        NativeDiagnostics.stopFpsMonitoring();
      }
    };
  }, [enabled]);

  return fps;
}
