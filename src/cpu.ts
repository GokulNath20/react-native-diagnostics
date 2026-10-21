import NativeDiagnostics from './NativeNativeDiagnostics';

/**
 * CPU used by this app, as a percentage of one core.
 * Can exceed 100 on multi-core devices. -1 if unknown.
 */
export function getCpuUsage(): number {
  return NativeDiagnostics.getCpuUsage();
}
