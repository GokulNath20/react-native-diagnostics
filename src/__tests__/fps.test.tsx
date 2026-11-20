import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { useFps } from '../fps';

jest.mock('../NativeNativeDiagnostics');

const mock = jest.requireMock<
  typeof import('../__mocks__/NativeNativeDiagnostics')
>('../NativeNativeDiagnostics');
const native = mock.default;

beforeEach(() => {
  mock.resetNativeMock();
});

describe('useFps', () => {
  it('is null until the first reading, then follows native updates', async () => {
    const { result } = await renderHook(() => useFps());

    expect(result.current).toBeNull();
    expect(native.startFpsMonitoring).toHaveBeenCalledTimes(1);

    await act(() => mock.emitFps(59.8));
    expect(result.current).toBe(59.8);

    await act(() => mock.emitFps(42));
    expect(result.current).toBe(42);
  });

  it('stops native monitoring and unsubscribes on unmount', async () => {
    const { unmount } = await renderHook(() => useFps());
    expect(mock.fpsListenerCount()).toBe(1);

    await unmount();

    expect(native.stopFpsMonitoring).toHaveBeenCalledTimes(1);
    expect(mock.fpsListenerCount()).toBe(0);
  });

  it('shares one native monitor between components', async () => {
    const first = await renderHook(() => useFps());
    const second = await renderHook(() => useFps());

    expect(native.startFpsMonitoring).toHaveBeenCalledTimes(1);

    await act(() => mock.emitFps(60));
    expect(first.result.current).toBe(60);
    expect(second.result.current).toBe(60);

    await first.unmount();
    expect(native.stopFpsMonitoring).not.toHaveBeenCalled();

    await second.unmount();
    expect(native.stopFpsMonitoring).toHaveBeenCalledTimes(1);
  });

  it('starts again after every user has unmounted', async () => {
    const first = await renderHook(() => useFps());
    await first.unmount();
    await renderHook(() => useFps());

    expect(native.startFpsMonitoring).toHaveBeenCalledTimes(2);
  });

  it('does nothing while disabled', async () => {
    const { result } = await renderHook(() => useFps({ enabled: false }));

    expect(native.startFpsMonitoring).not.toHaveBeenCalled();
    expect(mock.fpsListenerCount()).toBe(0);
    expect(result.current).toBeNull();
  });

  it('keeps the last value when disabled and resumes when re-enabled', async () => {
    const { result, rerender } = await renderHook(
      ({ enabled }: { enabled: boolean }) => useFps({ enabled }),
      { initialProps: { enabled: true } }
    );
    await act(() => mock.emitFps(55));

    await rerender({ enabled: false });
    expect(native.stopFpsMonitoring).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(55);

    await act(() => mock.emitFps(10));
    expect(result.current).toBe(55);

    await rerender({ enabled: true });
    expect(native.startFpsMonitoring).toHaveBeenCalledTimes(2);
  });

  it('keeps monitoring for others when one component disables it', async () => {
    const other = await renderHook(() => useFps());
    const toggled = await renderHook(
      ({ enabled }: { enabled: boolean }) => useFps({ enabled }),
      { initialProps: { enabled: true } }
    );

    await toggled.rerender({ enabled: false });

    expect(native.stopFpsMonitoring).not.toHaveBeenCalled();
    await act(() => mock.emitFps(30));
    expect(other.result.current).toBe(30);
  });
});
