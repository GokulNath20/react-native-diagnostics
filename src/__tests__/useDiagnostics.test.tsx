import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { useDiagnostics, type UseDiagnosticsOptions } from '../useDiagnostics';

jest.mock('../NativeNativeDiagnostics');

const mock = jest.requireMock<
  typeof import('../__mocks__/NativeNativeDiagnostics')
>('../NativeNativeDiagnostics');
const native = mock.default;

beforeEach(() => {
  mock.resetNativeMock();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

async function advance(ms: number) {
  await act(() => {
    jest.advanceTimersByTime(ms);
  });
}

function renderDiagnostics(options: UseDiagnosticsOptions = {}) {
  return renderHook((props: UseDiagnosticsOptions) => useDiagnostics(props), {
    initialProps: options,
  });
}

describe('useDiagnostics', () => {
  it('reads every metric on the first render', async () => {
    const { result } = await renderDiagnostics();

    expect(result.current).toEqual({
      batteryLevel: mock.DEFAULTS.batteryLevel,
      batteryState: mock.DEFAULTS.batteryState,
      lowPowerMode: mock.DEFAULTS.lowPowerMode,
      memoryUsage: mock.DEFAULTS.memoryUsage,
      thermalState: mock.DEFAULTS.thermalState,
      cpuUsage: mock.DEFAULTS.cpuUsage,
      freeDiskStorage: mock.DEFAULTS.freeDiskStorage,
    });
    // Once each: the mount effect must not repeat the initial read.
    expect(native.getCpuUsage).toHaveBeenCalledTimes(1);
    expect(native.getMemoryUsage).toHaveBeenCalledTimes(1);
  });

  it('polls each metric at its default interval', async () => {
    await renderDiagnostics();

    await advance(2_000);
    expect(native.getCpuUsage).toHaveBeenCalledTimes(2);
    expect(native.getMemoryUsage).toHaveBeenCalledTimes(1);

    await advance(3_000); // t = 5s
    expect(native.getCpuUsage).toHaveBeenCalledTimes(3);
    expect(native.getMemoryUsage).toHaveBeenCalledTimes(2);
    expect(native.getBatteryLevel).toHaveBeenCalledTimes(1);

    await advance(25_000); // t = 30s
    expect(native.getBatteryLevel).toHaveBeenCalledTimes(2);
    expect(native.getBatteryState).toHaveBeenCalledTimes(2);
    expect(native.isLowPowerModeEnabled).toHaveBeenCalledTimes(2);
    expect(native.getThermalState).toHaveBeenCalledTimes(2);
    expect(native.getFreeDiskStorage).toHaveBeenCalledTimes(1);

    await advance(30_000); // t = 60s
    expect(native.getFreeDiskStorage).toHaveBeenCalledTimes(2);
  });

  it('updates the returned values when polled', async () => {
    const { result } = await renderDiagnostics();

    native.getCpuUsage.mockReturnValue(87);
    await advance(2_000);

    expect(result.current.cpuUsage).toBe(87);
  });

  it('uses intervalMs for every metric without its own interval', async () => {
    await renderDiagnostics({ intervalMs: 1_000, cpuIntervalMs: 10_000 });

    await advance(1_000);
    expect(native.getMemoryUsage).toHaveBeenCalledTimes(2);
    expect(native.getBatteryLevel).toHaveBeenCalledTimes(2);
    expect(native.getFreeDiskStorage).toHaveBeenCalledTimes(2);
    expect(native.getCpuUsage).toHaveBeenCalledTimes(1);

    await advance(9_000);
    expect(native.getCpuUsage).toHaveBeenCalledTimes(2);
  });

  it('skips metrics that are turned off', async () => {
    const { result } = await renderDiagnostics({
      metrics: { disk: false, battery: false },
    });

    await advance(60_000);

    expect(result.current.freeDiskStorage).toBeNull();
    expect(result.current.batteryLevel).toBeNull();
    expect(result.current.batteryState).toBeNull();
    expect(result.current.lowPowerMode).toBeNull();
    expect(native.getFreeDiskStorage).not.toHaveBeenCalled();
    expect(native.getBatteryLevel).not.toHaveBeenCalled();
    expect(result.current.memoryUsage).toBe(mock.DEFAULTS.memoryUsage);
  });

  it('reads nothing while disabled', async () => {
    const { result } = await renderDiagnostics({ enabled: false });

    await advance(60_000);

    expect(Object.values(result.current).every((v) => v === null)).toBe(true);
    for (const fn of Object.values(native)) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it('reads immediately when switched on, without waiting an interval', async () => {
    const { result, rerender } = await renderDiagnostics({ enabled: false });

    await rerender({ enabled: true });

    expect(result.current.cpuUsage).toBe(mock.DEFAULTS.cpuUsage);
    expect(native.getCpuUsage).toHaveBeenCalledTimes(1);
  });

  it('keeps the last values while paused', async () => {
    const { result, rerender } = await renderDiagnostics();

    await rerender({ enabled: false });
    native.getCpuUsage.mockReturnValue(99);
    await advance(10_000);

    expect(result.current.cpuUsage).toBe(mock.DEFAULTS.cpuUsage);
    expect(native.getCpuUsage).toHaveBeenCalledTimes(1);
  });

  it('raises intervals below 250 ms to 250 ms', async () => {
    await renderDiagnostics({ cpuIntervalMs: 10 });

    await advance(249);
    expect(native.getCpuUsage).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(native.getCpuUsage).toHaveBeenCalledTimes(2);
  });

  it.each([NaN, Infinity, -Infinity])(
    'treats an interval of %p as 250 ms',
    async (cpuIntervalMs) => {
      await renderDiagnostics({ cpuIntervalMs });

      await advance(1_000);

      expect(native.getCpuUsage).toHaveBeenCalledTimes(5);
    }
  );

  it('restarts the timer when the interval changes', async () => {
    const { rerender } = await renderDiagnostics({ cpuIntervalMs: 10_000 });

    await rerender({ cpuIntervalMs: 1_000 });
    await advance(1_000);

    expect(native.getCpuUsage).toHaveBeenCalledTimes(2);
  });

  it('stops polling on unmount', async () => {
    const { unmount } = await renderDiagnostics({ intervalMs: 1_000 });
    await unmount();
    for (const fn of Object.values(native)) {
      fn.mockClear();
    }

    await advance(120_000);

    for (const fn of Object.values(native)) {
      expect(fn).not.toHaveBeenCalled();
    }
  });
});
