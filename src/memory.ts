import NativeDiagnostics from './NativeNativeDiagnostics';

/** Memory used by this app process, in bytes. */
export function getMemoryUsage(): number {
  return NativeDiagnostics.getMemoryUsage();
}
