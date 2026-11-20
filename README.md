# react-native-diagnostics

Lightweight native diagnostics for React Native: battery, memory, CPU, thermal state, disk space, FPS and startup time via a typed TurboModule.

## Requirements

- React Native 0.80 or newer
- The New Architecture (the default since React Native 0.76). The old architecture is not supported.

## Installation

```sh
npm install react-native-diagnostics
cd ios && pod install
```

Then rebuild your app. A JS reload is not enough, because the library contains native code.

### Expo

The library doesn't work in Expo Go. Use a [development build](https://docs.expo.dev/develop/development-builds/introduction/):

```sh
npx expo install react-native-diagnostics
npx expo prebuild
```

No config plugin is needed.

### iOS privacy manifest

`getFreeDiskStorage` uses a disk space API that Apple requires a reason for. The library ships its own `PrivacyInfo.xcprivacy` declaring it with reasons `85F4.1` (showing disk space to the user) and `E174.1` (checking for space before writing files), and React Native merges it into your app's manifest during `pod install`. You don't need to do anything unless you use the value for another purpose, such as sending it in a bug report (`7D9E.1`). In that case, add that reason to your app's `PrivacyInfo.xcprivacy`. See [Apple's documentation](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api) for the full list.

## Usage

### Floating overlay

The quickest way to see everything: render `DiagnosticsOverlay` once at the root of your app, after your navigator. It floats above every screen, so you can watch the values change live as you navigate and test features.

```tsx
import { DiagnosticsOverlay } from 'react-native-diagnostics';

export default function App() {
  return (
    <>
      <NavigationContainer>{/* your screens */}</NavigationContainer>
      <DiagnosticsOverlay enabled={__DEV__} />
    </>
  );
}
```

- Shows UI and JS FPS with a 30-second history chart, plus CPU, memory, longest JS frame, JS stalls, thermal state, battery, low power mode, free disk and startup time.
- Values are colour-coded green, amber or red, and the status dot shows the worst of FPS, CPU and thermal state.
- Drag it anywhere; it snaps to the nearest side. Tap the header to collapse it to a small pill showing FPS and memory, and tap the pill to expand it.
- The panel is see-through, so your own screen stays visible underneath. Raise or lower that with `backgroundOpacity`. Touches outside the panel go straight to your app.
- With `enabled={false}` it renders nothing and stops all monitoring.

### Your own UI

To build your own UI or send the values to your analytics, use the hooks directly:

```tsx
import { useDiagnostics, useFps } from 'react-native-diagnostics';

function PerformanceBadge() {
  const { memoryUsage, cpuUsage } = useDiagnostics();
  const fps = useFps();

  // ...
}
```

## API

All functions are synchronous. Where a value can't be read, they return `-1` for numbers or `'unknown'` for strings instead of throwing.

### Components

#### `<DiagnosticsOverlay />`

| Prop                 | Type                                                           | Default       | Description                                                                                   |
| -------------------- | -------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| `enabled`            | `boolean`                                                      | `true`        | Shows the overlay. When `false`, nothing renders and all monitoring stops.                    |
| `position`           | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `'top-right'` | Corner the overlay starts in.                                                                 |
| `initiallyCollapsed` | `boolean`                                                      | `false`       | Start as the small pill.                                                                      |
| `draggable`          | `boolean`                                                      | `true`        | Let the user drag the overlay.                                                                |
| `options`            | `Omit<UseDiagnosticsOptions, 'enabled'>`                       | –             | Polling options, as for `useDiagnostics`. Metrics turned off in `options.metrics` are hidden. |
| `insets`             | `{ top?: number; bottom?: number }`                            | status bar and home indicator | Space to keep clear, e.g. from `useSafeAreaInsets()` in react-native-safe-area-context. |
| `backgroundOpacity`  | `number`                                                       | `0.65`        | Background opacity, from `0` (see-through) to `1` (solid). Text always stays fully opaque.    |
| `style`              | `StyleProp<ViewStyle>`                                         | –             | Extra styles for the panel.                                                                   |

Notes:

- The overlay measures startup time when it first mounts (see `getStartupTime`). Mounted at the root, that is the time to first render. If you call `getStartupTime()` yourself at a later point, call it before the overlay mounts, because only the first call is recorded.
- It is drawn inside your React tree, so native modals (React Native's `Modal`, native-stack modals on iOS) appear above it.

### Hooks

#### `useDiagnostics(options?)`

Polls the native metrics on separate intervals and returns the latest values. Each value is `null` until its metric has been read once.

```tsx
const diagnostics = useDiagnostics({
  memoryIntervalMs: 2000,
  metrics: { disk: false },
});
```

Returns:

| Field             | Type                                                          |
| ----------------- | ------------------------------------------------------------- |
| `batteryLevel`    | `number \| null`                                              |
| `batteryState`    | `'charging' \| 'full' \| 'unplugged' \| 'unknown' \| null`    |
| `lowPowerMode`    | `boolean \| null`                                             |
| `memoryUsage`     | `number \| null`                                              |
| `thermalState`    | `'nominal' \| 'fair' \| 'serious' \| 'critical' \| 'unknown' \| null` |
| `cpuUsage`        | `number \| null`                                              |
| `freeDiskStorage` | `number \| null`                                              |

See the matching functions below for units.

Options:

| Option              | Type                                          | Default   | Description                                                     |
| ------------------- | --------------------------------------------- | --------- | --------------------------------------------------------------- |
| `enabled`           | `boolean`                                     | `true`    | Turns all polling on or off. Paused metrics keep their last value. |
| `metrics`           | `Partial<Record<DiagnosticsMetric, boolean>>` | all `true` | Turns individual metrics (`battery`, `memory`, `cpu`, `thermal`, `disk`) on or off. |
| `intervalMs`        | `number`                                      | –         | Poll every metric at this rate unless it has its own interval.  |
| `batteryIntervalMs` | `number`                                      | `30000`   | Battery level, state and low power mode.                        |
| `memoryIntervalMs`  | `number`                                      | `5000`    | Memory usage.                                                   |
| `cpuIntervalMs`     | `number`                                      | `2000`    | CPU usage.                                                      |
| `thermalIntervalMs` | `number`                                      | `30000`   | Thermal state.                                                  |
| `diskIntervalMs`    | `number`                                      | `60000`   | Free disk storage.                                              |

Intervals below 250 ms are raised to 250 ms.

#### `useFps(options?)`

```tsx
const fps = useFps({ enabled: true });
```

Returns the UI (native) frame rate as `number | null`. It updates about once per second and is `null` until the first reading. Native monitoring runs only while at least one mounted component uses the hook with `enabled: true`, and it is shared between them.

#### `useJsFps(options?)`

```tsx
const { fps, maxFrameMs, stallCount } = useJsFps();
```

Measures how smoothly the JS thread runs, in pure JS. Updates about once per second.

| Field        | Type             | Description                                                    |
| ------------ | ---------------- | -------------------------------------------------------------- |
| `fps`        | `number \| null` | JS frames per second over the last second.                     |
| `maxFrameMs` | `number \| null` | Longest gap between two JS frames in the last second, in ms.   |
| `stallCount` | `number`         | Gaps of 100 ms or more since the hook started.                 |

A low UI FPS with a normal JS FPS points to native rendering work. A low JS FPS points to blocking JavaScript.

#### `useStartupTime()`

Returns the startup time in ms (see `getStartupTime`) measured when the component first mounts, or `null` on the first render. Use it in your root component to measure time to first render.

### Functions

| Function                  | Returns                                                         | Notes                                                                                                                         |
| ------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `getBatteryLevel()`       | `number`                                                        | `0.0` to `1.0`. `-1` on the iOS simulator.                                                                                    |
| `getBatteryState()`       | `'charging' \| 'full' \| 'unplugged' \| 'unknown'`              | On Android, plugged in but not charging (e.g. a charge limit) is reported as `'charging'`, as on iOS.                         |
| `isLowPowerModeEnabled()` | `boolean`                                                       | iOS Low Power Mode or Android Battery Saver.                                                                                  |
| `getMemoryUsage()`        | `number`                                                        | Bytes used by the app process. iOS: physical footprint (what Xcode shows). Android: total PSS.                                |
| `getCpuUsage()`           | `number`                                                        | Percent of one core, so it can exceed 100 on multi-core devices. iOS: current usage. Android: average since the previous call. |
| `getThermalState()`       | `'nominal' \| 'fair' \| 'serious' \| 'critical' \| 'unknown'`   | `'unknown'` below Android 10 (API 29).                                                                                        |
| `getFreeDiskStorage()`    | `number`                                                        | Bytes available to the app. On iOS this includes purgeable space the system can free on demand.                               |
| `getStartupTime()`        | `number`                                                        | Ms from process start to the first call; later calls return the same value. iOS pre-warming can make it larger than what the user saw. |

### Types

`BatteryState`, `ThermalState`, `Diagnostics`, `DiagnosticsMetric`, `UseDiagnosticsOptions`, `UseFpsOptions`, `JsFps`, `UseJsFpsOptions`, `DiagnosticsOverlayProps` and `DiagnosticsOverlayPosition` are exported for use in your own code.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
