import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { getStartupTime, useStartupTime } from '../startup';

jest.mock('../NativeNativeDiagnostics');

const mock = jest.requireMock<
  typeof import('../__mocks__/NativeNativeDiagnostics')
>('../NativeNativeDiagnostics');
const native = mock.default;

beforeEach(() => {
  mock.resetNativeMock();
});

// startup.ts caches the first reading at module level for the life of the
// JS runtime, so these tests run in order against one shared cache. Jest
// gives each test file its own module registry, so no other file affects it.
describe('startup time', () => {
  it('useStartupTime is null on first render, then measures on mount', async () => {
    const renders: Array<number | null> = [];

    const { result } = await renderHook(() => {
      const value = useStartupTime();
      renders.push(value);
      return value;
    });

    expect(renders[0]).toBeNull();
    expect(result.current).toBe(mock.DEFAULTS.processUptime);
    expect(native.getProcessUptime).toHaveBeenCalledTimes(1);
  });

  it('getStartupTime returns the cached value without asking native again', () => {
    native.getProcessUptime.mockReturnValue(99_999);

    expect(getStartupTime()).toBe(mock.DEFAULTS.processUptime);
    expect(getStartupTime()).toBe(mock.DEFAULTS.processUptime);
    expect(native.getProcessUptime).not.toHaveBeenCalled();
  });

  it('a hook mounted later has the value on its first render', async () => {
    const renders: Array<number | null> = [];

    await renderHook(() => {
      const value = useStartupTime();
      renders.push(value);
      return value;
    });

    expect(renders[0]).toBe(mock.DEFAULTS.processUptime);
  });
});
