import { useEffect, useState } from 'react';
import { Button, ScrollView, Text, StyleSheet } from 'react-native';
import {
  useDiagnostics,
  useFps,
  useJsFps,
  useStartupTime,
} from 'react-native-diagnostics';

function format<T>(value: T | null, toText: (v: T) => string): string {
  return value === null ? '--' : toText(value);
}

export default function App() {
  const startupTime = useStartupTime();
  const [enabled, setEnabled] = useState(true);
  const {
    batteryLevel,
    batteryState,
    lowPowerMode,
    memoryUsage,
    thermalState,
    cpuUsage,
    freeDiskStorage,
  } = useDiagnostics({
    enabled,
    intervalMs: 10000,
    batteryIntervalMs: 5000,
    memoryIntervalMs: 2000,
    cpuIntervalMs: 10000,
    thermalIntervalMs: 30000,
  });
  const fps = useFps({ enabled });
  const jsFps = useJsFps({ enabled });
  const [stressing, setStressing] = useState(false);

  useEffect(() => {
    if (!stressing) {
      return;
    }

    const burn = setInterval(() => {
      const end = Date.now() + 80;
      while (Date.now() < end) {
        Math.sqrt(Math.random());
      }
    }, 100);
    const stop = setTimeout(() => setStressing(false), 10000);

    return () => {
      clearInterval(burn);
      clearTimeout(stop);
    };
  }, [stressing]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.text}>
        Startup: {format(startupTime, (v) => `${Math.round(v)} ms`)}
      </Text>
      <Text style={styles.text}>
        Battery: {format(batteryLevel, (v) => `${Math.round(v * 100)}%`)}
      </Text>
      <Text style={styles.text}>
        Battery state: {format(batteryState, (v) => v)}
      </Text>
      <Text style={styles.text}>
        Low power mode: {format(lowPowerMode, (v) => (v ? 'on' : 'off'))}
      </Text>
      <Text style={styles.text}>
        Memory:{' '}
        {format(memoryUsage, (v) => `${(v / (1024 * 1024)).toFixed(1)} MB`)}
      </Text>
      <Text style={styles.text}>
        Free disk:{' '}
        {format(
          freeDiskStorage,
          (v) => `${(v / (1024 * 1024 * 1024)).toFixed(1)} GB`
        )}
      </Text>
      <Text style={styles.text}>Thermal: {format(thermalState, (v) => v)}</Text>
      <Text style={styles.text}>
        CPU: {format(cpuUsage, (v) => `${v.toFixed(1)}%`)}
      </Text>
      <Text style={styles.text}>
        UI FPS: {format(fps, (v) => v.toFixed(0))}
      </Text>
      <Text style={styles.text}>
        JS FPS: {format(jsFps.fps, (v) => v.toFixed(0))} (longest frame{' '}
        {format(jsFps.maxFrameMs, (v) => `${Math.round(v)} ms`)})
      </Text>
      <Text style={styles.text}>JS stalls: {jsFps.stallCount}</Text>
      <Button
        title={enabled ? 'Pause diagnostics' : 'Resume diagnostics'}
        onPress={() => setEnabled((value) => !value)}
      />
      <Button
        title={stressing ? 'Stressing for 10s...' : 'Stress CPU (10s)'}
        onPress={() => setStressing(true)}
        disabled={stressing}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 18,
    color: '#000000',
    marginVertical: 6,
  },
});
