package com.nativediagnostics

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import java.util.HashMap

class NativeDiagnosticsPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == NativeDiagnosticsModule.NAME) {
      NativeDiagnosticsModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      NativeDiagnosticsModule.NAME to ReactModuleInfo(
        name = NativeDiagnosticsModule.NAME,
        className = NativeDiagnosticsModule.NAME,
        canOverrideExistingModule = false,
        needsEagerInit = false,
        isCxxModule = false,
        isTurboModule = true
      )
    )
  }
}
