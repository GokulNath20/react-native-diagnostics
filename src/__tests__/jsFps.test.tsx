import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useJsFps } from '../jsFps';

// Drives requestAnimationFrame by hand so each frame lands at an exact time.
let pendingFrame: ((time: number) => void) | null = null;
let nextFrameId = 0;
let now = 0;
let appStateHandler: ((state: AppStateStatus) => void) | null = null;

const cancelAnimationFrameSpy =
  jest.fn<(handle: number | null | undefined) => void>();
const removeAppStateListener = jest.fn<() => void>();

beforeEach(() => {
  pendingFrame = null;
  nextFrameId = 0;
  now = 0;
  appStateHandler = null;
  cancelAnimationFrameSpy.mockClear();
  removeAppStateListener.mockClear();

  jest
    .spyOn(globalThis, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      pendingFrame = callback;
      return ++nextFrameId;
    });
  jest
    .spyOn(globalThis, 'cancelAnimationFrame')
    .mockImplementation(cancelAnimationFrameSpy);
  jest.spyOn(performance, 'now').mockImplementation(() => now);
  // React Native's jest setup already mocks addEventListener, so spyOn hands
  // back that shared mock; clear calls left over from earlier tests.
  jest
    .spyOn(AppState, 'addEventListener')
    .mockClear()
    .mockImplementation((_type, handler) => {
      appStateHandler = handler as (state: AppStateStatus) => void;
      return { remove: removeAppStateListener };
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Runs one frame callback at each of the given times (ms). */
async function runFrames(times: number[]) {
  await act(() => {
    for (const time of times) {
      const callback = pendingFrame;
      if (!callback) {
        throw new Error('No frame was requested');
      }
      pendingFrame = null;
      now = time;
      callback(time);
    }
  });
}

/** Times from start to end inclusive, every step ms. */
function every(step: number, start: number, end: number) {
  const times: number[] = [];
  for (let t = start; t <= end; t += step) {
    times.push(t);
  }
  return times;
}

describe('useJsFps', () => {
  it('starts with no reading', async () => {
    const { result } = await renderHook(() => useJsFps());

    expect(result.current).toEqual({
      fps: null,
      maxFrameMs: null,
      stallCount: 0,
    });
  });

  it('does not report before a full second has passed', async () => {
    const { result } = await renderHook(() => useJsFps());

    await runFrames(every(20, 0, 980));

    expect(result.current.fps).toBeNull();
  });

  it('reports the frame rate once per second', async () => {
    const { result } = await renderHook(() => useJsFps());

    // 50 frames, 20 ms apart, over exactly one second.
    await runFrames(every(20, 0, 1000));

    expect(result.current).toEqual({ fps: 50, maxFrameMs: 20, stallCount: 0 });
  });

  it('records the longest frame and counts stalls of 100 ms or more', async () => {
    const { result } = await renderHook(() => useJsFps());

    // Gaps: 20, 20, 150 (stall), 810 (stall).
    await runFrames([0, 20, 40, 190, 1000]);

    expect(result.current).toEqual({ fps: 4, maxFrameMs: 810, stallCount: 2 });
  });

  it('accumulates stalls across windows but resets the per-window max', async () => {
    const { result } = await renderHook(() => useJsFps());

    await runFrames([0, 20, 140, 1000]); // 2 stalls, max 860
    await runFrames(every(20, 1020, 2000)); // smooth second

    expect(result.current.stallCount).toBe(2);
    expect(result.current.maxFrameMs).toBe(20);
    expect(result.current.fps).toBe(50);
  });

  it('ignores the gap while the app was in the background', async () => {
    const { result } = await renderHook(() => useJsFps());

    await runFrames([0, 20, 40]);
    await act(() => appStateHandler?.('background'));
    await act(() => appStateHandler?.('active'));
    await runFrames(every(20, 5000, 6000));

    expect(result.current).toEqual({ fps: 50, maxFrameMs: 20, stallCount: 0 });
  });

  it('cancels the pending frame and app state listener on unmount', async () => {
    const { unmount } = await renderHook(() => useJsFps());
    await runFrames([0, 20]);

    await unmount();

    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(nextFrameId);
    expect(removeAppStateListener).toHaveBeenCalledTimes(1);
  });

  it('does not request frames while disabled', async () => {
    await renderHook(() => useJsFps({ enabled: false }));

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(AppState.addEventListener).not.toHaveBeenCalled();
  });

  it('keeps the last values when disabled', async () => {
    const { result, rerender } = await renderHook(
      ({ enabled }: { enabled: boolean }) => useJsFps({ enabled }),
      { initialProps: { enabled: true } }
    );
    await runFrames(every(20, 0, 1000));

    await rerender({ enabled: false });

    expect(cancelAnimationFrameSpy).toHaveBeenCalled();
    expect(result.current.fps).toBe(50);
  });
});
