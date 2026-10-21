package com.nativediagnostics

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.Debug
import android.os.PowerManager
import android.os.Process
import android.os.StatFs
import android.os.SystemClock
import android.view.Choreographer
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil

class NativeDiagnosticsModule(reactContext: ReactApplicationContext) :
  NativeNativeDiagnosticsSpec(reactContext), LifecycleEventListener {

  init {
    reactContext.addLifecycleEventListener(this)
  }

  private var lastCpuTimeMs = Process.getElapsedCpuTime()
  private var lastWallTimeMs = SystemClock.elapsedRealtime()
  private var fpsRunning = false
  private var fpsFrameCount = 0
  private var fpsWindowStartNanos = 0L

  private val frameCallback = object : Choreographer.FrameCallback {
    override fun doFrame(frameTimeNanos: Long) {
      if (!fpsRunning) {
        return
      }

      if (fpsWindowStartNanos == 0L) {
        fpsWindowStartNanos = frameTimeNanos
      } else {
        fpsFrameCount++
        val elapsedNanos = frameTimeNanos - fpsWindowStartNanos
        if (elapsedNanos >= 1_000_000_000L) {
          emitOnFpsUpdate(fpsFrameCount * 1_000_000_000.0 / elapsedNanos)
          fpsFrameCount = 0
          fpsWindowStartNanos = frameTimeNanos
        }
      }

      Choreographer.getInstance().postFrameCallback(this)
    }
  }

  override fun getBatteryLevel(): Double {
    val batteryManager =
      reactApplicationContext.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
    val percentage = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    // Unsupported devices return Integer.MIN_VALUE (or 0 on old target SDKs).
    if (percentage < 0) {
      return -1.0
    }
    return percentage / 100.0
  }

  override fun getBatteryState(): String {
    // ACTION_BATTERY_CHANGED is sticky: passing a null receiver just returns
    // the latest value without registering anything.
    val intent =
      reactApplicationContext.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        ?: return "unknown"
    val pluggedIn = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) != 0

    return when (intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)) {
      BatteryManager.BATTERY_STATUS_CHARGING -> "charging"
      BatteryManager.BATTERY_STATUS_FULL -> "full"
      BatteryManager.BATTERY_STATUS_DISCHARGING -> "unplugged"
      // Plugged in but paused, e.g. by a charge limit; iOS reports this as
      // charging too.
      BatteryManager.BATTERY_STATUS_NOT_CHARGING -> if (pluggedIn) "charging" else "unplugged"
      else -> "unknown"
    }
  }

  override fun isLowPowerModeEnabled(): Boolean {
    val powerManager =
      reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
    return powerManager.isPowerSaveMode
  }

  override fun getFreeDiskStorage(): Double {
    return StatFs(reactApplicationContext.filesDir.path).availableBytes.toDouble()
  }

  override fun getProcessUptime(): Double {
    return (SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime()).toDouble()
  }

  override fun getMemoryUsage(): Double {
    val memoryInfo = Debug.MemoryInfo()
    Debug.getMemoryInfo(memoryInfo)
    return memoryInfo.totalPss * 1024.0
  }

  override fun getThermalState(): String {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      return "unknown"
    }

    val powerManager =
      reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
    return when (powerManager.currentThermalStatus) {
      PowerManager.THERMAL_STATUS_NONE,
      PowerManager.THERMAL_STATUS_LIGHT -> "nominal"
      PowerManager.THERMAL_STATUS_MODERATE -> "fair"
      PowerManager.THERMAL_STATUS_SEVERE -> "serious"
      PowerManager.THERMAL_STATUS_CRITICAL,
      PowerManager.THERMAL_STATUS_EMERGENCY,
      PowerManager.THERMAL_STATUS_SHUTDOWN -> "critical"
      else -> "unknown"
    }
  }

  override fun getCpuUsage(): Double {
    val cpuTimeMs = Process.getElapsedCpuTime()
    val wallTimeMs = SystemClock.elapsedRealtime()

    val cpuDelta = cpuTimeMs - lastCpuTimeMs
    val wallDelta = wallTimeMs - lastWallTimeMs

    lastCpuTimeMs = cpuTimeMs
    lastWallTimeMs = wallTimeMs

    if (wallDelta <= 0) {
      return 0.0
    }

    return cpuDelta * 100.0 / wallDelta
  }

  override fun startFpsMonitoring() {
    UiThreadUtil.runOnUiThread {
      if (fpsRunning) {
        return@runOnUiThread
      }
      fpsRunning = true
      fpsFrameCount = 0
      fpsWindowStartNanos = 0L
      Choreographer.getInstance().postFrameCallback(frameCallback)
    }
  }

  override fun stopFpsMonitoring() {
    UiThreadUtil.runOnUiThread {
      fpsRunning = false
      Choreographer.getInstance().removeFrameCallback(frameCallback)
    }
  }

  // Called on the UI thread when the app returns to the foreground. Frames
  // stop while backgrounded, so start a fresh window instead of reporting the
  // whole background period as a few frames.
  override fun onHostResume() {
    fpsFrameCount = 0
    fpsWindowStartNanos = 0L
  }

  override fun onHostPause() {}

  override fun onHostDestroy() {}

  // Called when React tears the module down, e.g. on a JS reload, where the
  // useFps cleanup never runs.
  override fun invalidate() {
    reactApplicationContext.removeLifecycleEventListener(this)
    UiThreadUtil.runOnUiThread {
      fpsRunning = false
      Choreographer.getInstance().removeFrameCallback(frameCallback)
    }
    super.invalidate()
  }

  companion object {
    const val NAME = NativeNativeDiagnosticsSpec.NAME
  }
}
