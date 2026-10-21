import NativeDiagnostics from './NativeNativeDiagnostics';

export type BatteryState = 'charging' | 'full' | 'unplugged' | 'unknown';

/**
 * Battery level as a fraction from 0.0 to 1.0.
 * iOS simulators return -1 because they have no battery.
 */
export function getBatteryLevel(): number {
  return NativeDiagnostics.getBatteryLevel();
}

/** Whether the device is charging, full or running on battery. */
export function getBatteryState(): BatteryState {
  return NativeDiagnostics.getBatteryState() as BatteryState;
}

/** iOS Low Power Mode or Android Battery Saver. */
export function isLowPowerModeEnabled(): boolean {
  return NativeDiagnostics.isLowPowerModeEnabled();
}
