import { describe, expect, it } from '@jest/globals';
import {
  batteryLevelOf,
  cpuLevel,
  formatBattery,
  formatBytes,
  formatCpu,
  formatDuration,
  formatFps,
  fpsLevel,
  thermalLevel,
  worstLevel,
  type Level,
} from '../overlayFormat';
import type { ThermalState } from '../thermal';

const MB = 1024 * 1024;
const GB = 1024 * MB;

describe('formatBytes', () => {
  it.each([
    [512 * 1024, '512 KB'],
    [84.24 * MB, '84.2 MB'],
    [150.4 * MB, '150 MB'],
    [13.06 * GB, '13.1 GB'],
  ])('formats %p as %p', (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });

  it.each([null, -1, NaN, Infinity])('shows a placeholder for %p', (bytes) => {
    expect(formatBytes(bytes)).toBe('--');
  });
});

describe('formatDuration', () => {
  it('uses ms below one second and seconds above', () => {
    expect(formatDuration(849.6)).toBe('850 ms');
    expect(formatDuration(1234)).toBe('1.23 s');
  });

  it('shows a placeholder when unknown', () => {
    expect(formatDuration(null)).toBe('--');
    expect(formatDuration(-1)).toBe('--');
  });
});

describe('small formatters', () => {
  it('formats fps, cpu and battery', () => {
    expect(formatFps(59.6)).toBe('60');
    expect(formatFps(null)).toBe('--');
    expect(formatCpu(12.345)).toBe('12.3%');
    expect(formatCpu(-1)).toBe('--');
    expect(formatBattery(0.574)).toBe('57%');
  });

  it('shows "n/a" for the simulator battery instead of -100%', () => {
    expect(formatBattery(-1)).toBe('n/a');
  });
});

describe('levels', () => {
  it.each<[number | null, Level]>([
    [60, 'good'],
    [55, 'good'],
    [54, 'warn'],
    [40, 'warn'],
    [39, 'bad'],
    [null, 'neutral'],
  ])('fps %p is %p', (fps, level) => {
    expect(fpsLevel(fps)).toBe(level);
  });

  it.each<[number, Level]>([
    [10, 'good'],
    [50, 'warn'],
    [90, 'bad'],
    [-1, 'neutral'],
  ])('cpu %p is %p', (cpu, level) => {
    expect(cpuLevel(cpu)).toBe(level);
  });

  it.each<[ThermalState, Level]>([
    ['nominal', 'good'],
    ['fair', 'warn'],
    ['serious', 'bad'],
    ['critical', 'bad'],
    ['unknown', 'neutral'],
  ])('thermal %p is %p', (state, level) => {
    expect(thermalLevel(state)).toBe(level);
  });

  it.each<[number, Level]>([
    [0.5, 'good'],
    [0.15, 'warn'],
    [0.05, 'bad'],
    [-1, 'neutral'],
  ])('battery %p is %p', (battery, level) => {
    expect(batteryLevelOf(battery)).toBe(level);
  });

  it('picks the most severe level', () => {
    expect(worstLevel(['good', 'neutral', 'warn'])).toBe('warn');
    expect(worstLevel(['good', 'bad', 'warn'])).toBe('bad');
    expect(worstLevel([])).toBe('neutral');
  });
});
