package com.nativediagnostics

import com.facebook.react.bridge.ReactApplicationContext

class NativeDiagnosticsModule(reactContext: ReactApplicationContext) :
  NativeNativeDiagnosticsSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeNativeDiagnosticsSpec.NAME
  }
}
