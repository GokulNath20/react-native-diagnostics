import type { ThermalState } from './thermal';

// Display helpers for DiagnosticsOverlay. Kept separate so they can be tested
// without rendering.

export type Level = 'good' | 'warn' | 'bad' | 'neutral';

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const PLACEHOLDER = '--';

/** Bytes as "512 KB", "84.2 MB", "150 MB" or "13.1 GB". */
export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes < 0 || !Number.isFinite(bytes)) {
    return PLACEHOLDER;
  }
  if (bytes >= GB) {
    return `${(bytes / GB).toFixed(1)} GB`;
  }
  if (bytes >= 100 * MB) {
    return `${Math.round(bytes / MB)} MB`;
  }
  if (bytes >= MB) {
    return `${(bytes / MB).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

/** Milliseconds as "850 ms" or "1.24 s". */
export function formatDuration(ms: number | null): string {
  if (ms === null || ms < 0 || !Number.isFinite(ms)) {
    return PLACEHOLDER;
  }
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

export function formatFps(fps: number | null): string {
  return fps === null ? PLACEHOLDER : String(Math.round(fps));
}

export function formatCpu(cpu: number | null): string {
  return cpu === null || cpu < 0 ? PLACEHOLDER : `${cpu.toFixed(1)}%`;
}

/** Battery fraction as "57%". Simulators report -1, shown as "n/a". */
export function formatBattery(level: number | null): string {
  if (level === null) {
    return PLACEHOLDER;
  }
  return level < 0 ? 'n/a' : `${Math.round(level * 100)}%`;
}

export function fpsLevel(fps: number | null): Level {
  if (fps === null) {
    return 'neutral';
  }
  if (fps >= 55) {
    return 'good';
  }
  return fps >= 40 ? 'warn' : 'bad';
}

/** CPU is a percentage of one core, so 100 means one core fully busy. */
export function cpuLevel(cpu: number | null): Level {
  if (cpu === null || cpu < 0) {
    return 'neutral';
  }
  if (cpu < 50) {
    return 'good';
  }
  return cpu < 90 ? 'warn' : 'bad';
}

export function thermalLevel(state: ThermalState | null): Level {
  switch (state) {
    case 'nominal':
      return 'good';
    case 'fair':
      return 'warn';
    case 'serious':
    case 'critical':
      return 'bad';
    default:
      return 'neutral';
  }
}

export function batteryLevelOf(level: number | null): Level {
  if (level === null || level < 0) {
    return 'neutral';
  }
  if (level > 0.2) {
    return 'good';
  }
  return level > 0.1 ? 'warn' : 'bad';
}

const SEVERITY: Record<Level, number> = {
  neutral: 0,
  good: 1,
  warn: 2,
  bad: 3,
};

/** The most severe of the given levels, for the collapsed status dot. */
export function worstLevel(levels: Level[]): Level {
  return levels.reduce<Level>(
    (worst, level) => (SEVERITY[level] > SEVERITY[worst] ? level : worst),
    'neutral'
  );
}
