import NativeDiagnostics from './NativeNativeDiagnostics';

/**
 * Free storage available to the app, in bytes. -1 if unknown.
 * On iOS this includes space the system can free up on demand (purgeable
 * caches), so it can be higher than the Android figure for a similar device.
 */
export function getFreeDiskStorage(): number {
  return NativeDiagnostics.getFreeDiskStorage();
}
