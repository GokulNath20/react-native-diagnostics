import NativeDiagnostics from './NativeNativeDiagnostics';

export type ThermalState =
  'nominal' | 'fair' | 'serious' | 'critical' | 'unknown';

/** Thermal pressure on the device. 'unknown' if the OS can't tell. */
export function getThermalState(): ThermalState {
  return NativeDiagnostics.getThermalState() as ThermalState;
}
