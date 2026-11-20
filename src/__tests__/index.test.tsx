import { expect, it, jest } from '@jest/globals';
import * as api from '../index';

jest.mock('../NativeNativeDiagnostics');

// Guards the public API: removing or renaming an export is a breaking change.
it('exposes the documented API', () => {
  expect(Object.keys(api).sort()).toEqual([
    'DiagnosticsOverlay',
    'getBatteryLevel',
    'getBatteryState',
    'getCpuUsage',
    'getFreeDiskStorage',
    'getMemoryUsage',
    'getStartupTime',
    'getThermalState',
    'isLowPowerModeEnabled',
    'useDiagnostics',
    'useFps',
    'useJsFps',
    'useStartupTime',
  ]);
});
