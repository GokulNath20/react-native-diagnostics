#import "NativeDiagnostics.h"
#import <UIKit/UIKit.h>
#import <mach/mach.h>
#import <sys/sysctl.h>
#import <sys/time.h>

@implementation NativeDiagnostics {
  CADisplayLink *_displayLink;
  CFTimeInterval _windowStart;
  NSUInteger _frameCount;
}

- (NSNumber *)getBatteryLevel {
  UIDevice *device = [UIDevice currentDevice];
  device.batteryMonitoringEnabled = YES;
  return @(device.batteryLevel);
}

- (NSString *)getBatteryState {
  UIDevice *device = [UIDevice currentDevice];
  device.batteryMonitoringEnabled = YES;
  switch (device.batteryState) {
    case UIDeviceBatteryStateUnplugged:
      return @"unplugged";
    case UIDeviceBatteryStateCharging:
      return @"charging";
    case UIDeviceBatteryStateFull:
      return @"full";
    default:
      return @"unknown";
  }
}

- (NSNumber *)isLowPowerModeEnabled {
  return @([NSProcessInfo processInfo].isLowPowerModeEnabled);
}

- (NSNumber *)getFreeDiskStorage {
  NSURL *home = [NSURL fileURLWithPath:NSHomeDirectory()];
  NSDictionary *values =
      [home resourceValuesForKeys:@[ NSURLVolumeAvailableCapacityForImportantUsageKey ] error:nil];
  NSNumber *available = values[NSURLVolumeAvailableCapacityForImportantUsageKey];
  return available ?: @(-1);
}

- (NSNumber *)getProcessUptime {
  struct kinfo_proc info;
  size_t size = sizeof(info);
  int mib[4] = {CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()};

  if (sysctl(mib, 4, &info, &size, NULL, 0) != 0) {
    return @(-1);
  }

  struct timeval start = info.kp_proc.p_starttime;
  struct timeval now;
  gettimeofday(&now, NULL);

  double elapsedMs = (now.tv_sec - start.tv_sec) * 1000.0 + (now.tv_usec - start.tv_usec) / 1000.0;
  return @(elapsedMs);
}

- (NSNumber *)getMemoryUsage {
  task_vm_info_data_t info;
  mach_msg_type_number_t count = TASK_VM_INFO_COUNT;
  kern_return_t result = task_info(mach_task_self(), TASK_VM_INFO, (task_info_t)&info, &count);

  if (result != KERN_SUCCESS) {
    NSLog(@"[NativeDiagnostics] task_info failed: %d", result);
    return @(-1);
  }

  return @(info.phys_footprint);
}

- (NSString *)getThermalState {
  switch ([NSProcessInfo processInfo].thermalState) {
    case NSProcessInfoThermalStateNominal:
      return @"nominal";
    case NSProcessInfoThermalStateFair:
      return @"fair";
    case NSProcessInfoThermalStateSerious:
      return @"serious";
    case NSProcessInfoThermalStateCritical:
      return @"critical";
    default:
      return @"unknown";
  }
}

- (NSNumber *)getCpuUsage {
  thread_array_t threads;
  mach_msg_type_number_t threadCount;

  if (task_threads(mach_task_self(), &threads, &threadCount) != KERN_SUCCESS) {
    return @(-1);
  }

  double total = 0;
  for (mach_msg_type_number_t i = 0; i < threadCount; i++) {
    thread_basic_info_data_t info;
    mach_msg_type_number_t infoCount = THREAD_BASIC_INFO_COUNT;

    if (thread_info(threads[i], THREAD_BASIC_INFO, (thread_info_t)&info, &infoCount) == KERN_SUCCESS) {
      if (!(info.flags & TH_FLAGS_IDLE)) {
        total += info.cpu_usage / (double)TH_USAGE_SCALE * 100.0;
      }
    }

    // task_threads gave us a reference to each thread; release it.
    mach_port_deallocate(mach_task_self(), threads[i]);
  }

  vm_deallocate(mach_task_self(), (vm_address_t)threads, threadCount * sizeof(thread_t));

  return @(total);
}

- (void)displayLinkTick:(CADisplayLink *)link {
  if (_windowStart == 0) {
    _windowStart = link.timestamp;
    return;
  }

  _frameCount++;
  CFTimeInterval elapsed = link.timestamp - _windowStart;

  if (elapsed >= 1.0) {
    [self emitOnFpsUpdate:@(_frameCount / elapsed)];
    _frameCount = 0;
    _windowStart = link.timestamp;
  }
}

- (void)startFpsMonitoring {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self->_displayLink) {
      return;
    }
    self->_frameCount = 0;
    self->_windowStart = 0;
    self->_displayLink = [CADisplayLink displayLinkWithTarget:self
                                                     selector:@selector(displayLinkTick:)];
    [self->_displayLink addToRunLoop:[NSRunLoop mainRunLoop]
                             forMode:NSRunLoopCommonModes];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(appWillEnterForeground)
                                                 name:UIApplicationWillEnterForegroundNotification
                                               object:nil];
  });
}

- (void)stopFpsMonitoring {
  dispatch_async(dispatch_get_main_queue(), ^{
    [self stopDisplayLink];
  });
}

// Must run on the main thread.
- (void)stopDisplayLink {
  [[NSNotificationCenter defaultCenter] removeObserver:self
                                                  name:UIApplicationWillEnterForegroundNotification
                                                object:nil];
  [_displayLink invalidate];
  _displayLink = nil;
}

// Frames stop while backgrounded, so start a fresh window instead of
// reporting the whole background period as a few frames.
- (void)appWillEnterForeground {
  _frameCount = 0;
  _windowStart = 0;
}

// Called when React tears the module down, e.g. on a JS reload, where the
// useFps cleanup never runs.
- (void)invalidate {
  dispatch_async(dispatch_get_main_queue(), ^{
    [self stopDisplayLink];
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeNativeDiagnosticsSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"NativeDiagnostics";
}

@end
