import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { DiagnosticsOverlay } from '../DiagnosticsOverlay';

jest.mock('../NativeNativeDiagnostics');

const mock = jest.requireMock<
  typeof import('../__mocks__/NativeNativeDiagnostics')
>('../NativeNativeDiagnostics');
const native = mock.default;

beforeEach(() => {
  mock.resetNativeMock();
});

function panelBackground() {
  const style = StyleSheet.flatten(
    screen.getByTestId('diagnostics-overlay').props.style
  );
  return style.backgroundColor;
}

describe('DiagnosticsOverlay', () => {
  it('renders nothing and reads nothing when disabled', async () => {
    await render(<DiagnosticsOverlay enabled={false} />);

    expect(screen.queryByText('DIAGNOSTICS')).toBeNull();
    for (const fn of Object.values(native)) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it('shows every metric, formatted', async () => {
    await render(<DiagnosticsOverlay />);

    expect(screen.getByText('DIAGNOSTICS')).toBeTruthy();
    expect(screen.getByText('12.5%')).toBeTruthy(); // CPU
    expect(screen.getByText('143 MB')).toBeTruthy(); // 150,000,000 bytes
    expect(screen.getByText('7.5 GB')).toBeTruthy(); // free disk
    expect(screen.getByText('50% ⚡')).toBeTruthy(); // charging
    expect(screen.getByText('nominal')).toBeTruthy();
    expect(screen.getByText('off')).toBeTruthy(); // low power
    expect(screen.getByText('1.23 s')).toBeTruthy(); // startup
  });

  it('starts native FPS monitoring and shows live readings', async () => {
    await render(<DiagnosticsOverlay />);
    expect(native.startFpsMonitoring).toHaveBeenCalledTimes(1);

    await act(() => mock.emitFps(47.4));

    expect(screen.getByText('47')).toBeTruthy();
  });

  it('shows "n/a" for a missing battery instead of a negative percentage', async () => {
    native.getBatteryLevel.mockReturnValue(-1);
    native.getBatteryState.mockReturnValue('unknown');

    await render(<DiagnosticsOverlay />);

    expect(screen.getByText('n/a')).toBeTruthy();
  });

  it('hides metrics that are turned off', async () => {
    await render(
      <DiagnosticsOverlay
        options={{ metrics: { disk: false, battery: false } }}
      />
    );

    expect(screen.queryByText('Disk free')).toBeNull();
    expect(screen.queryByText('Battery')).toBeNull();
    expect(screen.queryByText('Low power')).toBeNull();
    expect(screen.getByText('CPU')).toBeTruthy();
    expect(native.getFreeDiskStorage).not.toHaveBeenCalled();
  });

  it('collapses to a pill and expands again', async () => {
    await render(<DiagnosticsOverlay />);

    await fireEvent.press(screen.getByTestId('diagnostics-overlay-header'));
    expect(screen.queryByText('DIAGNOSTICS')).toBeNull();
    expect(screen.getByTestId('diagnostics-overlay-pill')).toBeTruthy();
    expect(screen.getByText('143 MB')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('diagnostics-overlay-pill'));
    expect(screen.getByText('DIAGNOSTICS')).toBeTruthy();
  });

  it('has a see-through background by default', async () => {
    await render(<DiagnosticsOverlay />);

    expect(panelBackground()).toBe('rgba(12, 16, 24, 0.65)');
  });

  it.each([
    [0.3, 'rgba(12, 16, 24, 0.3)'],
    [1, 'rgba(12, 16, 24, 1)'],
    [5, 'rgba(12, 16, 24, 1)'],
    [-1, 'rgba(12, 16, 24, 0)'],
    [NaN, 'rgba(12, 16, 24, 0.65)'],
  ])('uses backgroundOpacity %p as %p', async (opacity, color) => {
    await render(<DiagnosticsOverlay backgroundOpacity={opacity} />);

    expect(panelBackground()).toBe(color);
  });

  it('can start collapsed', async () => {
    await render(<DiagnosticsOverlay initiallyCollapsed />);

    expect(screen.getByTestId('diagnostics-overlay-pill')).toBeTruthy();
  });

  it('stops native monitoring when turned off', async () => {
    const { rerender } = await render(<DiagnosticsOverlay />);

    await rerender(<DiagnosticsOverlay enabled={false} />);

    expect(native.stopFpsMonitoring).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('DIAGNOSTICS')).toBeNull();
  });
});
