import {
  TurboModuleRegistry,
  type CodegenTypes,
  type TurboModule,
} from 'react-native';

export interface Spec extends TurboModule {
  getBatteryLevel(): number;
  getBatteryState(): string;
  isLowPowerModeEnabled(): boolean;
  getMemoryUsage(): number;
  getFreeDiskStorage(): number;
  getProcessUptime(): number;
  getThermalState(): string;
  getCpuUsage(): number;
  startFpsMonitoring(): void;
  stopFpsMonitoring(): void;
  readonly onFpsUpdate: CodegenTypes.EventEmitter<number>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeDiagnostics');
