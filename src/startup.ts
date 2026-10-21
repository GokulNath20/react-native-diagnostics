import { useEffect, useState } from 'react';
import NativeDiagnostics from './NativeNativeDiagnostics';

let startupTimeMs: number | null = null;

/**
 * Time from process start until the first call, in ms. Call it once your app
 * is ready, e.g. when the first screen has rendered; later calls return the
 * same value. -1 if unknown.
 *
 * iOS may pre-warm an app process before the user launches it, which makes
 * the value larger than what the user experienced.
 */
export function getStartupTime(): number {
  if (startupTimeMs === null) {
    startupTimeMs = NativeDiagnostics.getProcessUptime();
  }
  return startupTimeMs;
}

/**
 * Startup time measured when the calling component first mounts. Use it in
 * your root component to measure time to first render.
 */
export function useStartupTime(): number | null {
  const [value, setValue] = useState<number | null>(startupTimeMs);

  useEffect(() => {
    setValue(getStartupTime());
  }, []);

  return value;
}
