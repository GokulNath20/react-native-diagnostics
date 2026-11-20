import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  getBatteryLevel,
  getBatteryState,
  getCpuUsage,
  getFreeDiskStorage,
  getMemoryUsage,
  getThermalState,
  isLowPowerModeEnabled,
} from '../index';

jest.mock('../NativeNativeDiagnostics');

const mock = jest.requireMock<
  typeof import('../__mocks__/NativeNativeDiagnostics')
>('../NativeNativeDiagnostics');
const native = mock.default;

beforeEach(() => {
  mock.resetNativeMock();
});

describe('synchronous getters', () => {
  it('return the native values unchanged', () => {
    expect(getBatteryLevel()).toBe(mock.DEFAULTS.batteryLevel);
    expect(getBatteryState()).toBe(mock.DEFAULTS.batteryState);
    expect(isLowPowerModeEnabled()).toBe(mock.DEFAULTS.lowPowerMode);
    expect(getMemoryUsage()).toBe(mock.DEFAULTS.memoryUsage);
    expect(getFreeDiskStorage()).toBe(mock.DEFAULTS.freeDiskStorage);
    expect(getThermalState()).toBe(mock.DEFAULTS.thermalState);
    expect(getCpuUsage()).toBe(mock.DEFAULTS.cpuUsage);
  });

  it('pass through the "unknown" sentinels', () => {
    native.getBatteryLevel.mockReturnValue(-1);
    native.getBatteryState.mockReturnValue('unknown');
    native.getThermalState.mockReturnValue('unknown');
    native.getCpuUsage.mockReturnValue(-1);
    native.getFreeDiskStorage.mockReturnValue(-1);

    expect(getBatteryLevel()).toBe(-1);
    expect(getBatteryState()).toBe('unknown');
    expect(getThermalState()).toBe('unknown');
    expect(getCpuUsage()).toBe(-1);
    expect(getFreeDiskStorage()).toBe(-1);
  });

  it('read fresh values on every call', () => {
    native.getMemoryUsage.mockReturnValueOnce(1).mockReturnValueOnce(2);

    expect(getMemoryUsage()).toBe(1);
    expect(getMemoryUsage()).toBe(2);
    expect(native.getMemoryUsage).toHaveBeenCalledTimes(2);
  });
});
