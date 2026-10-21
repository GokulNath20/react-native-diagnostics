import { useEffect, useRef, useState } from 'react';
import {
  getBatteryLevel,
  getBatteryState,
  isLowPowerModeEnabled,
  type BatteryState,
} from './battery';
import { getMemoryUsage } from './memory';
import { getThermalState, type ThermalState } from './thermal';
import { getCpuUsage } from './cpu';
import { getFreeDiskStorage } from './disk';

export type DiagnosticsMetric =
  'battery' | 'memory' | 'cpu' | 'thermal' | 'disk';

/**
 * Each value is null until the metric has been read at least once, e.g. when
 * it is disabled from the start. A paused metric keeps its last value.
 */
export type Diagnostics = {
  batteryLevel: number | null;
  batteryState: BatteryState | null;
  lowPowerMode: boolean | null;
  memoryUsage: number | null;
  thermalState: ThermalState | null;
  cpuUsage: number | null;
  freeDiskStorage: number | null;
};

export type UseDiagnosticsOptions = {
  /** Turns all polling on or off. Default: true. */
  enabled?: boolean;
  /** Turns individual metrics on or off. Every metric defaults to true. */
  metrics?: Partial<Record<DiagnosticsMetric, boolean>>;
  /** Poll every metric at this rate (ms), unless it has its own interval below. */
  intervalMs?: number;
  /** Battery level, state and low power mode polling interval in ms. Default: 30000. */
  batteryIntervalMs?: number;
  /** Memory polling interval in ms. Default: 5000. */
  memoryIntervalMs?: number;
  /** CPU polling interval in ms. Default: 2000. */
  cpuIntervalMs?: number;
  /** Thermal state polling interval in ms. Default: 30000. */
  thermalIntervalMs?: number;
  /** Free disk space polling interval in ms. Default: 60000. */
  diskIntervalMs?: number;
};

const DEFAULT_INTERVALS_MS = {
  battery: 30_000,
  memory: 5_000,
  cpu: 2_000,
  thermal: 30_000,
  disk: 60_000,
};

// Guards against intervals so small they would hurt app performance.
const MIN_INTERVAL_MS = 250;

function usePolledValue<T>(
  read: () => T,
  intervalMs: number,
  active: boolean
): T | null {
  const [value, setValue] = useState<T | null>(() => (active ? read() : null));
  // The initial state above already covers the first read on mount.
  const wasActiveRef = useRef(active);

  useEffect(() => {
    const wasActive = wasActiveRef.current;
    wasActiveRef.current = active;

    if (!active) {
      return;
    }

    // Just switched on: read now instead of waiting a full interval.
    if (!wasActive) {
      setValue(read());
    }

    // NaN or Infinity would make setInterval fire as fast as it can.
    const safeIntervalMs = Number.isFinite(intervalMs)
      ? Math.max(intervalMs, MIN_INTERVAL_MS)
      : MIN_INTERVAL_MS;
    const id = setInterval(() => setValue(read()), safeIntervalMs);

    return () => clearInterval(id);
  }, [read, intervalMs, active]);

  return value;
}

export function useDiagnostics(
  options: UseDiagnosticsOptions = {}
): Diagnostics {
  const { enabled = true, metrics = {}, intervalMs } = options;
  const isActive = (metric: DiagnosticsMetric) =>
    enabled && metrics[metric] !== false;
  const batteryIntervalMs =
    options.batteryIntervalMs ?? intervalMs ?? DEFAULT_INTERVALS_MS.battery;

  return {
    batteryLevel: usePolledValue(
      getBatteryLevel,
      batteryIntervalMs,
      isActive('battery')
    ),
    batteryState: usePolledValue(
      getBatteryState,
      batteryIntervalMs,
      isActive('battery')
    ),
    lowPowerMode: usePolledValue(
      isLowPowerModeEnabled,
      batteryIntervalMs,
      isActive('battery')
    ),
    memoryUsage: usePolledValue(
      getMemoryUsage,
      options.memoryIntervalMs ?? intervalMs ?? DEFAULT_INTERVALS_MS.memory,
      isActive('memory')
    ),
    thermalState: usePolledValue(
      getThermalState,
      options.thermalIntervalMs ?? intervalMs ?? DEFAULT_INTERVALS_MS.thermal,
      isActive('thermal')
    ),
    cpuUsage: usePolledValue(
      getCpuUsage,
      options.cpuIntervalMs ?? intervalMs ?? DEFAULT_INTERVALS_MS.cpu,
      isActive('cpu')
    ),
    freeDiskStorage: usePolledValue(
      getFreeDiskStorage,
      options.diskIntervalMs ?? intervalMs ?? DEFAULT_INTERVALS_MS.disk,
      isActive('disk')
    ),
  };
}
