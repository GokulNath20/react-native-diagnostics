# react-native-diagnostics

Lightweight native diagnostics for React Native: battery, memory, CPU, thermal state, disk space, FPS and startup time via a typed TurboModule.

Add one line to your app and a see-through overlay shows every value live on top of your screens while you develop and test. Or use the hooks to build your own UI. See the [Quick start](#quick-start).

## Requirements

- iOS and Android. Web isn't supported, because the diagnostics come from native code.
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

## Quick start

The fastest way to use the library is the built-in overlay: a see-through panel that floats above every screen and shows all the diagnostics live while you use your app.

**1. Install the package** and rebuild your app (see [Installation](#installation)).

**2. Add one line at the root of your app**, after your navigator, so the overlay sits above every screen:

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

With Expo Router, put it in your root layout, `app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { DiagnosticsOverlay } from 'react-native-diagnostics';

export default function RootLayout() {
  return (
    <>
      <Stack />
      <DiagnosticsOverlay enabled={__DEV__} />
    </>
  );
}
```

**3. Run a debug build.** The panel appears in the top-right corner. Navigate through your app and test features as usual; the values update live.

### What the overlay shows

| Value         | Meaning                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------ |
| **UI FPS**    | Native frame rate. Drops when rendering or animations are too heavy.                       |
| **JS FPS**    | How smoothly the JS thread runs. Drops when JavaScript blocks, e.g. a heavy render or loop. |
| **CPU**       | CPU used by your app, as a percentage of one core (can exceed 100 on multi-core devices).  |
| **Memory**    | Memory used by your app process.                                                            |
| **JS frame**  | Longest gap between two JS frames in the last second.                                       |
| **JS stalls** | Number of JS freezes of 100 ms or more since the overlay appeared.                          |
| **Thermal**   | How hot the device is: `nominal`, `fair`, `serious` or `critical`.                          |
| **Battery**   | Battery level and charging state. `n/a` on simulators, which have no battery.               |
| **Low power** | Whether iOS Low Power Mode or Android Battery Saver is on.                                  |
| **Disk free** | Free storage available to your app.                                                         |
| **Startup**   | Time from process start until the overlay first rendered.                                   |

Values are green when healthy, amber when worth a look and red when there's a problem. The dot next to **DIAGNOSTICS** shows the worst of FPS, CPU and thermal state, so you can tell at a glance whether something is wrong. The bars under each FPS value show the last 30 seconds.

### Using the overlay

- **Move it:** drag the panel anywhere. It snaps to the nearest side of the screen.
- **Shrink it:** tap the header to collapse it to a small pill showing FPS and memory. Tap the pill to expand it again.
- **See through it:** the panel is see-through so your own screen stays visible underneath, and touches outside the panel go straight to your app.

## Turning the overlay on and off

The overlay is controlled by its `enabled` prop. When `enabled` is `false`, the overlay renders nothing and stops all monitoring: no polling, no native FPS tracking and no frame callbacks. It costs nothing while off.

### Development builds only (recommended)

```tsx
<DiagnosticsOverlay enabled={__DEV__} />
```

`__DEV__` is `true` in debug builds and `false` in release builds, so the overlay never appears for your users.

### Toggle it from the dev menu

Add a **Toggle diagnostics** item to the React Native dev menu (shake the device, or press <kbd>Cmd</kbd>+<kbd>D</kbd> on the iOS simulator or <kbd>Cmd</kbd>+<kbd>M</kbd> on the Android emulator):

```tsx
import { useEffect, useState } from 'react';
import { DevSettings } from 'react-native';
import { DiagnosticsOverlay } from 'react-native-diagnostics';

export default function App() {
  const [showDiagnostics, setShowDiagnostics] = useState(__DEV__);

  useEffect(() => {
    // Does nothing in release builds.
    DevSettings.addMenuItem('Toggle diagnostics', () =>
      setShowDiagnostics((show) => !show)
    );
  }, []);

  return (
    <>
      <NavigationContainer>{/* your screens */}</NavigationContainer>
      <DiagnosticsOverlay enabled={showDiagnostics} />
    </>
  );
}
```

### Internal or QA release builds

To show the overlay in a release build for testers (for example a TestFlight or internal track build) but not in your store build, pass any flag you set at build time. With Expo:

```tsx
<DiagnosticsOverlay
  enabled={process.env.EXPO_PUBLIC_SHOW_DIAGNOSTICS === 'true'}
/>
```

Then set the variable only in the build profile your testers get, in `eas.json`:

```json
{
  "build": {
    "preview": {
      "env": { "EXPO_PUBLIC_SHOW_DIAGNOSTICS": "true" }
    }
  }
}
```

In a bare React Native app, use whatever you already use for build-time configuration, such as [react-native-config](https://github.com/lugg/react-native-config).

### Always on

`enabled` defaults to `true`, so `<DiagnosticsOverlay />` on its own is always shown, including in release builds. Use this only for internal apps.

### Removing it

Delete the `<DiagnosticsOverlay />` line. Nothing else needs to change.

## Customising the overlay

```tsx
<DiagnosticsOverlay
  enabled={__DEV__}
  position="bottom-left" // start in another corner
  initiallyCollapsed // start as the small pill
  backgroundOpacity={0.8} // 0 = fully see-through, 1 = solid
  options={{
    metrics: { disk: false, battery: false }, // hide metrics you don't need
    memoryIntervalMs: 2000, // poll memory more often
  }}
/>
```

The overlay keeps clear of the status bar and home indicator using typical sizes. If your app has a custom header or you use [react-native-safe-area-context](https://github.com/AppAndFlow/react-native-safe-area-context), pass exact insets:

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Diagnostics() {
  const insets = useSafeAreaInsets();
  return (
    <DiagnosticsOverlay
      enabled={__DEV__}
      insets={{ top: insets.top + 8, bottom: insets.bottom + 8 }}
    />
  );
}
```

`useSafeAreaInsets` must be called inside `SafeAreaProvider`. See [`<DiagnosticsOverlay />`](#diagnosticsoverlay-) for every prop.

## Troubleshooting

**The overlay doesn't appear.**

- Check that `enabled` is `true`. `__DEV__` is `false` in release builds.
- Render it at the root of your app, after your navigator, not inside a screen or a `ScrollView`.
- React Native's `Modal` and native modal screens (for example native-stack modals on iOS) are drawn above the overlay, because it lives inside your React tree.

**The app shows "'NativeDiagnostics' could not be found".**

The native code isn't in your build yet. Run `pod install` in `ios/` and rebuild the app; a JS reload isn't enough. The library needs the New Architecture and doesn't work in Expo Go.

**The panel covers my header or sits under the notch.**

Drag it out of the way, start it in another corner with `position`, or pass exact `insets` (see [Customising the overlay](#customising-the-overlay)).

**A value shows `--`.**

FPS and JS frame need about a second of frames before the first reading. Any other value shows `--` when the device can't report it.

**FPS looks low in development.**

Debug builds run JavaScript much more slowly than release builds. Use the overlay in development to spot relative changes, and check a release build for real-world numbers.

## Using the hooks directly

To build your own UI, log the values or send them to your analytics, use the hooks and functions directly:

```tsx
import { useDiagnostics, useFps } from 'react-native-diagnostics';

function PerformanceBadge() {
  const { memoryUsage, cpuUsage } = useDiagnostics();
  const fps = useFps();

  // ...
}
```

The hooks and functions are described in the [API](#api) below.

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
