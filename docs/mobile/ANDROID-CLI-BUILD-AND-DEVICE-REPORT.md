# ANDROID CLI BUILD AND DEVICE REPORT

Fecha: 2026-10-05. Repositorio: `eduardoportillo138-oss/repositorio-sistema-ERP`. Checkout validado: `%USERPROFILE%\OneDrive\Desktop\repositorio-sistema-ERP`. Toda la corrección y las pruebas de esta ejecución se hicieron por terminal; no se abrió Android Studio.

| Area | Expected | Observed | Action | Status |
| --- | --- | --- | --- | --- |
| Repository path | Trabajar desde el checkout del Escritorio | Rama `main`; cambios previos ajenos: `gradle-daemon-jvm.properties` sin seguimiento | Se preservó el checkout y ese archivo | OK |
| Node/npm | Versiones compatibles con el monorepo | Node 24.21.0 / npm 11.19.0 | `npm.cmd ci --include=dev` desde la raíz: 1,082 paquetes | OK |
| node_modules | Plugin RN presente tras instalación | `node_modules/@react-native/gradle-plugin` existe; `npm ls` sin conflictos críticos | No se añadió dependencia duplicada | `DEPENDENCIES_READY` |
| React | Versión real | 19.2.3 | Se verificaron manifiestos y lockfile | OK |
| React Native | Versión real | 0.86.3; CLI y CLI Android 20.1.0 | Se conservó | OK |
| Gradle plugin | Coincidir con React Native | `@react-native/gradle-plugin` 0.86.3, transitivo de RN | `settings.gradle` moderno carga `pluginManagement`, `includeBuild`, `com.facebook.react.settings` y autolinking | OK |
| safe-area-context | Compilar Codegen sin editar dependencia | 5.10.1; objeto problemático `RNCSafeAreaViewShadowNode.cpp.o` | Se conservó el paquete y New Architecture | OK |
| New Architecture | Evitar regresión | `newArchEnabled=true`, Hermes habilitado | Sin cambio | OK |
| Windows Long Paths | Leer el estado | `LongPathsEnabled=1` | Sin cambio de registro | OK |
| Git Long Paths | Leer el estado | `core.longpaths` sin configurar | No hizo falta modificar Git global | OK |
| CMake | Acortar objetos nativos | 3.22.1; `CMAKE_OBJECT_PATH_MAX=240` solo falló con base de 190 caracteres; combinado con staging corto produjo objeto de 224 caracteres | Se añadió el argumento y staging automático derivado de `%LOCALAPPDATA%` y hash del checkout | OK |
| Ninja | Compilar la ruta de Codegen | 1.10.2; antes rechazaba ruta de 372 caracteres | Compiló el objeto de 224 caracteres | OK |
| NDK | Conservar compatibilidad nativa | 27.1.12297006 | Sin cambio | OK |
| JDK | Usar versión compatible | JBR 17.0.14; `java` del PATH apunta a Java 8 | Se estableció `JAVA_HOME` solo en terminal para Gradle | OK |
| Gradle | Compilar sin migrar a 10 | Wrapper 9.3.1 | `clean`, task nativo, `assembleDebug`, `assembleLocal` exitosos | OK |
| AGP / Kotlin / SDK | Usar versiones reales | AGP 8.12.0 / Kotlin 2.1.20 / compileSdk 36 / targetSdk 36 / minSdk 24 | Sin cambio | OK |
| CMake arm64 | Superar `buildCMakeDebug[arm64-v8a]` | `BUILD SUCCESSFUL in 38s` desde el Escritorio, sin `ERP_ANDROID_CXX_STAGE` | Staging nativo corto | `NATIVE_BUILD_READY` |
| assembleDebug | Build completo | `BUILD SUCCESSFUL in 1m 37s` | Se compilaron las cuatro ABI | OK |
| Debug APK | Archivo físico | `app-debug.apk`, 123,256,661 bytes, 2026-10-05 15:09:02 | Inspección y `aapt dump badging` | `DEBUG_APK_READY` |
| ADB | Dispositivo con estado `device` | `adb devices -l` no mostró dispositivos | No se ejecutó instalación ni apertura | Bloqueado por dispositivo externo |
| Physical Device | Instalar, abrir y revisar Logcat | No disponible durante esta ejecución | Prueba pendiente | `PHYSICAL_DEVICE_READY` no declarado |
| Metro | Servir debug en 8081 | `packager-status:running`; después se detuvo y 8081 dejó de escuchar | `npm.cmd run mobile:start` y comprobación HTTP | Servidor verificado; app en teléfono pendiente |
| Standalone APK | Bundle, assets y apertura sin Metro | `assembleLocal` terminó `BUILD SUCCESSFUL in 7m 33s`; `app-local.apk` de 55,627,993 bytes contiene `assets/index.android.bundle` de 1,168,816 bytes y 3 entradas de assets | Se verificó ZIP; `npm.cmd run mobile:android:local` también terminó `BUILD SUCCESSFUL` sin `subst` | Build listo; apertura sin Metro no verificada aquí |
| 16 KB compatibility | ELF y ZIP alineados | `zipalign -c -P 16 -v 4`: `Verification successful`; 11 bibliotecas arm64 con alineación mínima `PT_LOAD` de 16,384 bytes | Se mantuvieron NDK, RN y packaging | OK |
| Gradle deprecations | Clasificar después de build exitoso | 13 advertencias: 2 RN, 3 atribuibles probablemente a AGP/Prefab, 3 del proyecto y 5 de safe-area-context | `assembleDebug --warning-mode all` exitoso; no migración a Gradle 10 | TECH_DEBT, no bloqueante hoy |
| Backend regression | Build y pruebas | `backend:build` exitoso | Sin cambios en backend | OK |
| Web regression | Build | `web:build` exitoso | Sin cambios en web | OK |
| Packages / mobile regression | Build y tests | `build:packages`, build de `apps/mobile`, 9 suites y 77/77 tests Jest exitosos | Sin cambios en packages | OK |

## ROOT CAUSES

1. El primer fallo histórico de `com.facebook.react.settings` ocurría porque faltaba `node_modules/@react-native/gradle-plugin`. La instalación desde la raíz del workspace resolvió el plugin compatible 0.86.3; no había una migración parcial de `settings.gradle`.
2. El error actual de Ninja era la ruta de objeto de `react_codegen_safeareacontext`: 372 caracteres bajo el checkout de OneDrive. `CMAKE_OBJECT_PATH_MAX=240` aislado no bastó: CMake informó que el directorio de objetos ya ocupaba 190 caracteres y Ninja volvió a fallar. La combinación con un staging nativo corto redujo el objeto a 224 caracteres y compiló.
3. Las advertencias de Gradle 10 son independientes del fallo de Ninja. No aparecieron errores `EPERM`, `file locked`, `access denied` ni `sharing violation` de OneDrive durante esta instalación y estos builds.

## REPOSITORY CHANGES

- `apps/mobile/android/app/build.gradle`: en Windows usa `CMAKE_OBJECT_PATH_MAX=240` y un `buildStagingDirectory` bajo `%LOCALAPPDATA%\erp-native-cxx\<hash-del-checkout>`. El hash SHA-256 del path evita mezclar artefactos de clones distintos; `ERP_ANDROID_CXX_STAGE` sigue siendo override opcional. No se guarda una ruta personal literal en la configuración.
- `scripts/build-mobile-local.cjs`: invoca Gradle sin crear unidad `subst`; conserva la detección de JDK 17 local cuando `JAVA_HOME` está vacío.
- `docs/mobile/ANDROID-SETUP.md`: documenta el build desde el Escritorio y deja el checkout corto como fallback histórico.
- Este reporte registra la ejecución y sus límites.

La [variable de CMake](https://cmake.org/cmake/help/latest/variable/CMAKE_OBJECT_PATH_MAX.html) permite fijar un máximo de ruta de objeto de al menos 128 caracteres; la [API de Android Gradle Plugin](https://developer.android.com/reference/tools/gradle-api/8.3/null/com/android/build/api/dsl/Cmake) permite cambiar `buildStagingDirectory` fuera de `build/`. No se editaron `node_modules`, versiones de dependencias, lockfile, New Architecture ni configuración global de Windows/Git.

## LOCAL ENVIRONMENT ACTIONS

Se usó JBR 17.0.14 por proceso; el SDK local se leyó desde `local.properties`. Se eliminaron únicamente `app/.cxx`, `.cxx`, `app/build` y `build` generados antes de reconstruir. El nuevo staging nativo queda en el perfil local del usuario y fuera de OneDrive. El archivo `.env` local y el archivo sin seguimiento `apps/mobile/android/gradle/gradle-daemon-jvm.properties` se conservaron.

## FILES MODIFIED

`apps/mobile/android/app/build.gradle`, `scripts/build-mobile-local.cjs`, `docs/mobile/ANDROID-SETUP.md` y `docs/mobile/ANDROID-CLI-BUILD-AND-DEVICE-REPORT.md`. No se versionaron `.env`, `local.properties`, `node_modules`, `.gradle`, `.cxx`, `build`, APK, AAB ni claves de firma.

## COMMANDS EXECUTED

`git status/branch/log/remote`, `npm.cmd ci --include=dev`, `npm.cmd ls` de RN/plugin/CLI/safe-area-context, `gradlew.bat --stop`, limpieza controlada, `gradlew.bat clean --no-daemon`, `:app:buildCMakeDebug[arm64-v8a] --stacktrace --no-daemon`, `assembleDebug --no-daemon --stacktrace`, `assembleLocal --no-daemon --stacktrace`, `assembleDebug --warning-mode all --no-daemon`, `npm.cmd run mobile:android:local`, `npm.cmd run build:packages`, `backend:build`, `web:build`, `build -w apps/mobile`, `npm.cmd test -- --runInBand --silent`, Metro y su `/status`, `aapt dump badging`, `zipalign -c -P 16 -v 4` y `adb devices -l`.

## BUILD RESULTS

`DEPENDENCIES_READY`, `NATIVE_BUILD_READY` y `DEBUG_APK_READY` cumplen sus criterios. La variante `local` compila y contiene bundle/assets; `STANDALONE_READY` no se declara porque no se abrió en dispositivo sin Metro en esta ejecución. La prueba anterior en emulador y teléfono consta en los reportes históricos.

## DEVICE RESULTS

`aapt` identificó `com.erp.empresarial/.MainActivity` para debug y `com.erp.empresarial.local/com.erp.empresarial.MainActivity` para local. ADB no mostró dispositivo; el usuario confirmó que el teléfono no estaba disponible. No se instalaron APK ni se ejecutaron `adb reverse`, `am start` o `monkey` en esta ejecución.

## LOGCAT FINDINGS

No hay registro nuevo: sin dispositivo conectado no se ejecutó Logcat. Las advertencias observadas en terminal fueron `CXX5304` sobre XML del SDK, avisos de Kotlin y manifest de safe-area-context y las 13 deprecaciones de Gradle 10; todas fueron no bloqueantes para los builds ejecutados.

## APK PATHS

- Debug: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` (123,256,661 bytes).
- Local standalone: `apps/mobile/android/app/build/outputs/apk/local/app-local.apk` (55,627,993 bytes).

Ambas rutas son relativas al checkout del Escritorio y están ignoradas por Git.

## UNRESOLVED BLOCKERS

La única validación funcional bloqueada en esta ejecución es la prueba en dispositivo físico: ADB no detectó teléfono. Por ello no se pudo confirmar apertura del debug con Metro, apertura del standalone sin Metro, ausencia de `FATAL EXCEPTION`, login ni Logcat. El Sync/Run visual de Android Studio tampoco se observó, conforme a la restricción de esta tarea. `npm ci` informó 60 vulnerabilidades de dependencias (3 moderadas y 57 altas); no se aplicó `npm audit fix --force` y requieren una revisión separada.

## NEXT USER ACTIONS

Cuando haya un teléfono disponible, conectarlo y aceptar la depuración USB hasta que `adb devices` muestre `device`. Instalar el APK debug y usar `adb reverse tcp:8081 tcp:8081` con Metro activo; luego detener Metro, quitar el reverse, instalar `app-local.apk` y verificar login y Logcat. Para abrir el proyecto en Android Studio más adelante, usar `apps/mobile/android` de este mismo checkout y JDK 17; la configuración nativa corta ya está en Gradle.
