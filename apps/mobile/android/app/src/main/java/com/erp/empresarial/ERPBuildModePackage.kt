package com.erp.empresarial

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.uimanager.ViewManager

private class ERPBuildModeModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName(): String = "ERPBuildMode"

  override fun getConstants(): Map<String, Any> =
      mapOf(
        "isLocal" to (BuildConfig.BUILD_TYPE == "local"),
        "isDebug" to (BuildConfig.BUILD_TYPE == "debug"),
        "showDeveloperApiSettings" to (BuildConfig.BUILD_TYPE == "debug" && BuildConfig.SHOW_DEVELOPER_API_SETTINGS),
        "useLocalEmulatorApi" to (BuildConfig.BUILD_TYPE == "debug" && BuildConfig.USE_LOCAL_EMULATOR_API),
        "apiBaseUrl" to BuildConfig.MOBILE_API_BASE_URL,
      )
}

class ERPBuildModePackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
      listOf(ERPBuildModeModule(context))

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
      emptyList()
}
