import { jest } from '@jest/globals';

// Manual mock for the TurboModule. Tests opt in with
// jest.mock('../NativeNativeDiagnostics') and reach the helpers below through
// jest.requireMock, so they share this instance with the code under test.

type FpsListener = (fps: number) => void;

const fpsListeners = new Set<FpsListener>();

const NativeDiagnostics = {
  getBatteryLevel: jest.fn<() => number>(),
  getBatteryState: jest.fn<() => string>(),
  isLowPowerModeEnabled: jest.fn<() => boolean>(),
  getMemoryUsage: jest.fn<() => number>(),
  getFreeDiskStorage: jest.fn<() => number>(),
  getProcessUptime: jest.fn<() => number>(),
  getThermalState: jest.fn<() => string>(),
  getCpuUsage: jest.fn<() => number>(),
  startFpsMonitoring: jest.fn<() => void>(),
  stopFpsMonitoring: jest.fn<() => void>(),
  onFpsUpdate: jest.fn((listener: FpsListener) => {
    fpsListeners.add(listener);
    return {
      remove: () => {
        fpsListeners.delete(listener);
      },
    };
  }),
};

export const DEFAULTS = {
  batteryLevel: 0.5,
  batteryState: 'charging',
  lowPowerMode: false,
  memoryUsage: 150_000_000,
  freeDiskStorage: 8_000_000_000,
  processUptime: 1234,
  thermalState: 'nominal',
  cpuUsage: 12.5,
};

/** Clears calls, queued return values and FPS listeners; restores defaults. */
export function resetNativeMock() {
  for (const fn of Object.values(NativeDiagnostics)) {
    fn.mockClear();
  }
  NativeDiagnostics.getBatteryLevel
    .mockReset()
    .mockReturnValue(DEFAULTS.batteryLevel);
  NativeDiagnostics.getBatteryState
    .mockReset()
    .mockReturnValue(DEFAULTS.batteryState);
  NativeDiagnostics.isLowPowerModeEnabled
    .mockReset()
    .mockReturnValue(DEFAULTS.lowPowerMode);
  NativeDiagnostics.getMemoryUsage
    .mockReset()
    .mockReturnValue(DEFAULTS.memoryUsage);
  NativeDiagnostics.getFreeDiskStorage
    .mockReset()
    .mockReturnValue(DEFAULTS.freeDiskStorage);
  NativeDiagnostics.getProcessUptime
    .mockReset()
    .mockReturnValue(DEFAULTS.processUptime);
  NativeDiagnostics.getThermalState
    .mockReset()
    .mockReturnValue(DEFAULTS.thermalState);
  NativeDiagnostics.getCpuUsage.mockReset().mockReturnValue(DEFAULTS.cpuUsage);
  fpsListeners.clear();
}

/** Simulates the native module emitting an onFpsUpdate event. */
export function emitFps(fps: number) {
  fpsListeners.forEach((listener) => listener(fps));
}

export function fpsListenerCount() {
  return fpsListeners.size;
}

resetNativeMock();

export default NativeDiagnostics;
