import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useFps } from './fps';
import { useJsFps } from './jsFps';
import { useStartupTime } from './startup';
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
  PLACEHOLDER,
  type Level,
} from './overlayFormat';
import {
  useDiagnostics,
  type DiagnosticsMetric,
  type UseDiagnosticsOptions,
} from './useDiagnostics';

export type DiagnosticsOverlayPosition =
  'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type DiagnosticsOverlayProps = {
  /**
   * Shows the overlay. When false it renders nothing and all monitoring
   * stops. Default: true. Pass `__DEV__` to keep it out of release builds.
   */
  enabled?: boolean;
  /** Corner the overlay starts in. Default: 'top-right'. */
  position?: DiagnosticsOverlayPosition;
  /** Start as the small pill instead of the full panel. Default: false. */
  initiallyCollapsed?: boolean;
  /** Let the user drag the overlay; it snaps to the nearest side. Default: true. */
  draggable?: boolean;
  /** Polling options passed to useDiagnostics. Disabled metrics are hidden. */
  options?: Omit<UseDiagnosticsOptions, 'enabled'>;
  /**
   * Space to keep clear at the top and bottom of the screen, e.g. from
   * react-native-safe-area-context. Defaults to a typical status bar and
   * home indicator.
   */
  insets?: { top?: number; bottom?: number };
  /**
   * Opacity of the panel background, from 0 (fully see-through) to 1
   * (solid). The text always stays fully opaque. Default: 0.65.
   */
  backgroundOpacity?: number;
  /** Extra styles for the panel. */
  style?: StyleProp<ViewStyle>;
};

const EDGE_MARGIN = 8;
const HISTORY_LENGTH = 30;
const DEFAULT_BACKGROUND_OPACITY = 0.65;

const COLORS = {
  border: 'rgba(255, 255, 255, 0.14)',
  divider: 'rgba(255, 255, 255, 0.12)',
  track: 'rgba(255, 255, 255, 0.08)',
  label: '#AEB6C4',
  good: '#34D399',
  warn: '#FBBF24',
  bad: '#F87171',
  neutral: '#E6EAF2',
} satisfies Record<string, string>;

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

// Keeps text readable on a see-through panel over any app content, light or
// dark.
const TEXT_SHADOW = {
  textShadowColor: 'rgba(0, 0, 0, 0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
};

function panelBackground(opacity: number) {
  const alpha = Number.isFinite(opacity)
    ? Math.min(1, Math.max(0, opacity))
    : DEFAULT_BACKGROUND_OPACITY;
  return `rgba(12, 16, 24, ${alpha})`;
}

function defaultInsets() {
  return Platform.OS === 'android'
    ? { top: (StatusBar.currentHeight ?? 24) + EDGE_MARGIN, bottom: 48 }
    : { top: 54, bottom: 34 };
}

/**
 * A floating panel that shows every diagnostic live, on top of your app.
 * Render it once at the root, after your navigator, so it stays visible on
 * every screen:
 *
 * ```tsx
 * <NavigationContainer>...</NavigationContainer>
 * <DiagnosticsOverlay enabled={__DEV__} />
 * ```
 */
export function DiagnosticsOverlay({
  enabled = true,
  ...props
}: DiagnosticsOverlayProps) {
  // Mounting the inner component only when enabled means every hook, timer
  // and native monitor stops as soon as the overlay is turned off.
  return enabled ? <Overlay {...props} /> : null;
}

function Overlay({
  position = 'top-right',
  initiallyCollapsed = false,
  draggable = true,
  options,
  insets,
  backgroundOpacity = DEFAULT_BACKGROUND_OPACITY,
  style,
}: Omit<DiagnosticsOverlayProps, 'enabled'>) {
  const diagnostics = useDiagnostics(options);
  const uiFps = useFps();
  const jsFps = useJsFps();
  const startupTime = useStartupTime();
  const uiHistory = useHistory(uiFps);
  const jsHistory = useHistory(jsFps.fps);
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);

  const defaults = defaultInsets();
  const drag = useDraggable({
    position,
    top: insets?.top ?? defaults.top,
    bottom: insets?.bottom ?? defaults.bottom,
  });

  const shows = (metric: DiagnosticsMetric) =>
    options?.metrics?.[metric] !== false;

  const levels = {
    ui: fpsLevel(uiFps),
    js: fpsLevel(jsFps.fps),
    cpu: cpuLevel(diagnostics.cpuUsage),
    thermal: thermalLevel(diagnostics.thermalState),
    battery: batteryLevelOf(diagnostics.batteryLevel),
    frame: frameLevel(jsFps.maxFrameMs),
    stalls: (jsFps.stallCount > 0 ? 'warn' : 'good') as Level,
  };
  const status = worstLevel([levels.ui, levels.js, levels.cpu, levels.thermal]);

  const toggle = () => setCollapsed((value) => !value);

  return (
    <View style={styles.root}>
      <Animated.View
        testID="diagnostics-overlay"
        onLayout={drag.onLayout}
        style={[
          styles.panel,
          { backgroundColor: panelBackground(backgroundOpacity) },
          collapsed && styles.panelCollapsed,
          drag.style,
          style,
        ]}
        {...(draggable ? drag.panHandlers : undefined)}
      >
        {collapsed ? (
          <Pressable
            onPress={toggle}
            style={styles.pill}
            accessibilityRole="button"
            accessibilityLabel="Expand diagnostics"
            testID="diagnostics-overlay-pill"
          >
            <StatusDot level={status} />
            <Text style={[styles.pillValue, { color: COLORS[levels.ui] }]}>
              {formatFps(uiFps)}
            </Text>
            <Text style={styles.pillSeparator}>|</Text>
            <Text style={[styles.pillValue, { color: COLORS[levels.js] }]}>
              {formatFps(jsFps.fps)}
            </Text>
            <Text style={styles.pillUnit}>fps</Text>
            {shows('memory') && (
              <Text style={styles.pillMemory}>
                {formatBytes(diagnostics.memoryUsage)}
              </Text>
            )}
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={toggle}
              style={styles.header}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Collapse diagnostics"
              testID="diagnostics-overlay-header"
            >
              <StatusDot level={status} />
              <Text style={styles.title}>DIAGNOSTICS</Text>
              <Text style={styles.collapseIcon}>−</Text>
            </Pressable>

            <View style={styles.fpsRow}>
              <FpsBlock label="UI FPS" value={uiFps} history={uiHistory} />
              <View style={styles.fpsDivider} />
              <FpsBlock label="JS FPS" value={jsFps.fps} history={jsHistory} />
            </View>

            <View style={styles.grid}>
              {shows('cpu') && (
                <Cell
                  label="CPU"
                  value={formatCpu(diagnostics.cpuUsage)}
                  level={levels.cpu}
                />
              )}
              {shows('memory') && (
                <Cell
                  label="Memory"
                  value={formatBytes(diagnostics.memoryUsage)}
                />
              )}
              <Cell
                label="JS frame"
                value={
                  jsFps.maxFrameMs === null
                    ? PLACEHOLDER
                    : `${Math.round(jsFps.maxFrameMs)} ms`
                }
                level={levels.frame}
              />
              <Cell
                label="JS stalls"
                value={String(jsFps.stallCount)}
                level={levels.stalls}
              />
              {shows('thermal') && (
                <Cell
                  label="Thermal"
                  value={diagnostics.thermalState ?? PLACEHOLDER}
                  level={levels.thermal}
                />
              )}
              {shows('battery') && (
                <Cell
                  label="Battery"
                  value={batteryText(
                    diagnostics.batteryLevel,
                    diagnostics.batteryState
                  )}
                  level={levels.battery}
                />
              )}
              {shows('battery') && (
                <Cell
                  label="Low power"
                  value={
                    diagnostics.lowPowerMode === null
                      ? PLACEHOLDER
                      : diagnostics.lowPowerMode
                        ? 'on'
                        : 'off'
                  }
                  level={diagnostics.lowPowerMode ? 'warn' : 'neutral'}
                />
              )}
              {shows('disk') && (
                <Cell
                  label="Disk free"
                  value={formatBytes(diagnostics.freeDiskStorage)}
                />
              )}
              <Cell label="Startup" value={formatDuration(startupTime)} />
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

function frameLevel(ms: number | null): Level {
  if (ms === null) {
    return 'neutral';
  }
  if (ms >= 100) {
    return 'bad';
  }
  // Two frames at 60 Hz.
  return ms > 34 ? 'warn' : 'good';
}

function batteryText(level: number | null, state: string | null): string {
  const text = formatBattery(level);
  if (state === 'charging') {
    return `${text} ⚡`;
  }
  return state === 'full' ? `${text} full` : text;
}

function StatusDot({ level }: { level: Level }) {
  return <View style={[styles.dot, { backgroundColor: COLORS[level] }]} />;
}

function FpsBlock({
  label,
  value,
  history,
}: {
  label: string;
  value: number | null;
  history: number[];
}) {
  const level = fpsLevel(value);
  return (
    <View style={styles.fpsBlock}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.fpsValue, { color: COLORS[level] }]}>
        {formatFps(value)}
      </Text>
      <Sparkline values={history} />
    </View>
  );
}

function Sparkline({ values }: { values: number[] }) {
  // Scale to at least 60 so a steady 60 fps fills the chart; 120 Hz screens
  // scale up automatically.
  const max = Math.max(60, ...values);
  const empty = HISTORY_LENGTH - values.length;

  return (
    <View style={styles.sparkline}>
      {Array.from({ length: HISTORY_LENGTH }, (_, index) => {
        const value = index < empty ? null : values[index - empty]!;
        return (
          <View key={index} style={styles.barSlot}>
            {value !== null && (
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(6, (value / max) * 100)}%`,
                    backgroundColor: COLORS[fpsLevel(value)],
                  },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

function Cell({
  label,
  value,
  level = 'neutral',
}: {
  label: string;
  value: string;
  level?: Level;
}) {
  return (
    <View style={styles.cell}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.cellValue, { color: COLORS[level] }]}>{value}</Text>
    </View>
  );
}

/** The last HISTORY_LENGTH readings of a value, sampled once per second. */
function useHistory(value: number | null): number[] {
  const latest = useRef(value);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    latest.current = value;
  }, [value]);

  useEffect(() => {
    // Sample on a timer rather than on change: a steady 60 is still a reading.
    const id = setInterval(() => {
      const current = latest.current;
      if (current !== null) {
        setHistory((prev) => [...prev.slice(1 - HISTORY_LENGTH), current]);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return history;
}

type Bounds = {
  windowWidth: number;
  windowHeight: number;
  top: number;
  bottom: number;
};

type Size = { width: number; height: number };

/**
 * Drag handling with plain PanResponder, so the library needs no gesture or
 * animation dependencies. The panel snaps to the nearest side and stays
 * within the screen as it resizes or the device rotates.
 */
function useDraggable({
  position,
  top,
  bottom,
}: {
  position: DiagnosticsOverlayPosition;
  top: number;
  bottom: number;
}) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [pan] = useState(() => new Animated.ValueXY());
  const [measured, setMeasured] = useState(false);

  const bounds = useRef<Bounds>({ windowWidth, windowHeight, top, bottom });
  const size = useRef<Size | null>(null);
  const point = useRef<{ x: number; y: number } | null>(null);
  const side = useRef<'left' | 'right'>(
    position.endsWith('left') ? 'left' : 'right'
  );

  // Moves the panel to (x, y), snapped to the nearest side and kept on screen.
  const [settle] = useState(
    () =>
      (x: number, y: number, { animated = false, snap = true } = {}) => {
        const s = size.current;
        if (!s) {
          return;
        }
        const b = bounds.current;
        if (snap) {
          side.current = x + s.width / 2 < b.windowWidth / 2 ? 'left' : 'right';
        }
        const rightX = b.windowWidth - s.width - EDGE_MARGIN;
        const maxY = b.windowHeight - s.height - b.bottom;
        const target = {
          x:
            side.current === 'left'
              ? EDGE_MARGIN
              : Math.max(EDGE_MARGIN, rightX),
          y: Math.max(b.top, Math.min(y, maxY)),
        };
        point.current = target;
        if (animated) {
          Animated.spring(pan, {
            toValue: target,
            friction: 8,
            tension: 70,
            useNativeDriver: false,
          }).start();
        } else {
          pan.setValue(target);
        }
      }
  );

  // Keep the panel on screen when the window or insets change (rotation,
  // split screen, foldables).
  useEffect(() => {
    bounds.current = { windowWidth, windowHeight, top, bottom };
    if (point.current) {
      settle(point.current.x, point.current.y, { snap: false });
    }
  }, [windowWidth, windowHeight, top, bottom, settle]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    size.current = { width, height };

    if (point.current) {
      // Resized, e.g. collapsed or expanded: keep the same side and top.
      settle(point.current.x, point.current.y, { snap: false });
      return;
    }

    // First layout: place it in the requested corner.
    const b = bounds.current;
    const y = position.startsWith('top')
      ? b.top
      : b.windowHeight - height - b.bottom;
    settle(0, y, { snap: false });
    setMeasured(true);
  };

  const [responder] = useState(() => {
    const release = (dx: number, dy: number) => {
      pan.flattenOffset();
      const start = point.current ?? { x: 0, y: 0 };
      settle(start.x + dx, start.y + dy, { animated: true });
    };

    return PanResponder.create({
      // Claim the gesture only once the finger moves, so taps still reach
      // the buttons inside the panel.
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        pan.setOffset(point.current ?? { x: 0, y: 0 });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => release(gesture.dx, gesture.dy),
      onPanResponderTerminate: (_, gesture) => release(gesture.dx, gesture.dy),
    });
  });

  return {
    onLayout,
    panHandlers: responder.panHandlers,
    style: {
      // Hidden until measured so it never flashes in the wrong corner.
      opacity: measured ? 1 : 0,
      transform: pan.getTranslateTransform(),
    },
  };
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // Lets touches through to the app everywhere except the panel itself.
    pointerEvents: 'box-none',
    zIndex: 9999,
    elevation: 9999,
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 212,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    // No shadow or elevation: on a see-through panel they show through as a
    // dark smudge. The root view's elevation keeps it above the app.
  },
  panelCollapsed: {
    width: undefined,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    borderRadius: 999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  title: {
    flex: 1,
    color: COLORS.label,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    ...TEXT_SHADOW,
  },
  collapseIcon: {
    color: COLORS.label,
    fontSize: 16,
    lineHeight: 16,
    paddingHorizontal: 4,
    ...TEXT_SHADOW,
  },
  fpsRow: {
    flexDirection: 'row',
    marginTop: 4,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  fpsBlock: {
    flex: 1,
  },
  fpsDivider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: 10,
    backgroundColor: COLORS.divider,
  },
  fpsValue: {
    fontFamily: MONO,
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
    ...TEXT_SHADOW,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 18,
    marginTop: 4,
    borderRadius: 3,
    backgroundColor: COLORS.track,
    overflow: 'hidden',
  },
  barSlot: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    marginHorizontal: 0.5,
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
    opacity: 0.85,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  cell: {
    width: '50%',
    paddingTop: 6,
  },
  label: {
    color: COLORS.label,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    ...TEXT_SHADOW,
  },
  cellValue: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
    ...TEXT_SHADOW,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillValue: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    ...TEXT_SHADOW,
  },
  pillSeparator: {
    color: COLORS.label,
    fontSize: 12,
    marginHorizontal: 4,
    ...TEXT_SHADOW,
  },
  pillUnit: {
    color: COLORS.label,
    fontSize: 10,
    marginLeft: 4,
    ...TEXT_SHADOW,
  },
  pillMemory: {
    color: COLORS.neutral,
    fontFamily: MONO,
    fontSize: 12,
    marginLeft: 10,
    fontVariant: ['tabular-nums'],
    ...TEXT_SHADOW,
  },
});
