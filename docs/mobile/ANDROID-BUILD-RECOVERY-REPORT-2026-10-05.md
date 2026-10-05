# ANDROID BUILD RECOVERY REPORT

Fecha: 2026-10-05. Repositorio: `eduardoportillo138-oss/repositorio-sistema-ERP`, rama `main`. Esta auditoría continúa la recuperación documentada en [WINDOWS-ANDROID-CMAKE-PATH-RECOVERY-REPORT.md](WINDOWS-ANDROID-CMAKE-PATH-RECOVERY-REPORT.md). Distingue los resultados de aquella ejecución de las comprobaciones repetidas aquí.

| Area | Before | Action | After | Status |
| --- | --- | --- | --- | --- |
| Checkout path | `C:\Users\eduar\OneDrive\Desktop\repositorio-sistema-ERP` (55 caracteres) | Clon corto `C:\ERP` en la recuperación anterior | `C:\ERP` (6 caracteres), `main` en `26e53e4` antes de este reporte | OK |
| Path length | Objeto de safe-area-context de 372 caracteres en OneDrive | Se consultaron ambos `build.ninja` y se compiló en ruta corta | Objeto de 245 caracteres; `buildCMakeDebug[arm64-v8a]` completó | `WINDOWS_PATH_FIXED` |
| OneDrive | `.cxx` bajo OneDrive producía la ruta larga | Build en `C:\ERP` | Artefactos del build bajo ruta corta | OK |
| Windows Long Paths | `LongPathsEnabled=1` según comprobación anterior | No se cambió el registro | La solución efectiva sigue siendo la ruta corta | OK |
| React Native | 0.86.3 | Se contrastó `apps/mobile/package.json` y lockfile | 0.86.3 | OK |
| safe-area-context | 5.10.1 | Sin modificación | 5.10.1 | OK |
| New Architecture | `newArchEnabled=true` | Se verificó `gradle.properties` | `true` | OK |
| CMake / Ninja | 3.22.1 / 1.10.2 según recuperación anterior | `buildCMakeDebug[arm64-v8a]` completó de nuevo | Sin error de 260 caracteres | OK |
| NDK | 27.1.12297006 | Sin modificación | 27.1.12297006 | OK |
| Gradle | Wrapper 9.3.1 | `assembleDebug --warning-mode all --no-daemon` | `BUILD SUCCESSFUL in 39s` | OK |
| Gradle deprecations | Aviso genérico sobre Gradle 10 | Se capturaron y clasificaron 13 advertencias | Ninguna bloquea Gradle 9.3.1 | `GRADLE_DEPRECATION_AUDITED` |
| AGP | 8.12.0 en catálogo de RN | Sin modificación | 8.12.0 | OK |
| JDK | Java 8 en PATH según recuperación anterior | Gradle se ejecutó con JBR 17.0.14 | Build exitoso | OK |
| assembleDebug | Fallaba Ninja desde OneDrive | Ejecución en `C:\ERP`, repetida con advertencias completas | `BUILD SUCCESSFUL`; CMake arm64 compiló | `ANDROID_DEBUG_BUILD_READY` |
| Debug APK | No disponible en build fallido | Se comprobó el archivo físico después de `--warning-mode all` | `app-debug.apk`, 123,626,711 bytes (2026-10-05 14:19) | `DEBUG_APK_READY` |
| Standalone APK | Variante `local` ya configurada | Build y prueba sin Metro en ejecución anterior; contenido ZIP comprobado ahora | `app-local.apk`, 55,627,997 bytes; bundle JS de 1,168,816 bytes y 3 entradas de assets | `STANDALONE_APK_READY` según prueba anterior |
| 16KB status | Requería evitar regresión | `zipalign -c -P 16 -v 4` y lectura ELF de 11 `.so` arm64 | Verificación correcta; alineación mínima `PT_LOAD` de 16,384 bytes | OK |
| Physical device | SM_A266M probado en recuperación anterior | `adb devices -l` repetido | `unauthorized` y luego sin entrada; no se repitió la instalación | Pendiente en esta ejecución |
| Android Studio | Sync/Run visual no verificado | Se intentó abrir la ventana | El control de aplicaciones denegó acceso a Android Studio | Pendiente |

## ROOT CAUSE

El `build.ninja` del checkout de OneDrive contiene la salida de `react_codegen_safeareacontext` para `RNCSafeAreaViewShadowNode.cpp.o` con longitud absoluta de 372 caracteres. Ninja reportó `Filename longer than 260 characters` durante `:app:buildCMakeDebug[arm64-v8a]`. El checkout corto generó una ruta de 245 caracteres y compiló. La advertencia de Gradle 10 es independiente del error de Ninja.

## PRIMARY ERROR FIX

Se utilizó `C:\ERP` sin cambiar dependencias, New Architecture, CMake, NDK, AGP, Kotlin ni el wrapper de Gradle. `:app:buildCMakeDebug[arm64-v8a]` y `assembleDebug` completaron sin el error de longitud.

## GRADLE DEPRECATION FINDINGS

La ejecución `gradlew.bat assembleDebug --warning-mode all --no-daemon` terminó con `BUILD SUCCESSFUL in 39s`. Se observaron 13 advertencias. Las tres de notación de dependencias muestran llamadas desde `build.gradle` pero las coordenadas `lint-gradle`, `aapt2` y `com.google.prefab:cli` sugieren código interno de AGP/Prefab; esa atribución es una inferencia, no una traza definitiva.

| SOURCE | WARNING | CURRENT IMPACT | FUTURE IMPACT | ACTION | BLOCKING |
| --- | --- | --- | --- | --- | --- |
| REACT_NATIVE | Valores heredados `java-api-jars` y `java-runtime-jars` para `Usage` en `:gradle-plugin:react-native-gradle-plugin` (2) | Ninguno en Gradle 9.3.1 | Error en Gradle 10 | Seguir la corrección del plugin RN antes de migrar | No; TECH_DEBT |
| ANDROID_GRADLE_PLUGIN (inferido) | Notación de varias cadenas para `lint-gradle`, `aapt2` y `com.google.prefab:cli` (3) | Ninguno | Error en Gradle 10 | Revisar actualización compatible de AGP/Prefab al planificar migración | No; TECH_DEBT |
| PROJECT_CODE | Sintaxis Groovy sin `=` para `ndkVersion`, `namespace` y `signingConfig` en `apps/mobile/android/app/build.gradle:92`, `:96` y `:114` (3) | Ninguno | Sintaxis retirada en Gradle 10 | Cambiar a asignación explícita en una edición controlada y volver a compilar | No; TECH_DEBT |
| THIRD_PARTY_PLUGIN | Sintaxis Groovy sin `=` para `namespace`, `buildConfig`, `ndkVersion`, `abortOnError` y `url` en `react-native-safe-area-context/android/build.gradle:60`, `:62`, `:74`, `:90` y `:125` (5) | Ninguno | Sintaxis retirada en Gradle 10 | Seguir versión compatible del paquete; no editar `node_modules` | No; TECH_DEBT |

No se observó advertencia bloqueante en Gradle 9.3.1. No se actualizó a Gradle 10.

## FILES MODIFIED

Solo este reporte se añadió para la auditoría. No se modificaron fuentes Android, dependencias ni lockfile. `assembleDebug` regeneró el APK ignorado por Git. La corrección de higiene Git para `.env` se registra en el commit de publicación: el archivo permanece local y deja de estar versionado, aunque su presencia en la historia anterior requiere revisar y rotar cualquier secreto real.

## SYSTEM CHANGES REQUIRED

Ninguno para MAX_PATH. Android Studio debe abrir `C:\ERP\apps\mobile\android` con JBR 17.0.14. La verificación visual quedó bloqueada porque el control de aplicaciones denegó acceso a su ventana. Para repetir la prueba física, el teléfono debe aparecer como `device` en `adb devices`.

## COMMANDS EXECUTED

La recuperación previa ejecutó `npm ci --include=dev`, `gradlew --stop`, `clean`, `assembleDebug`, `assembleLocal`, builds de paquetes/backend/web/móvil, Jest, ADB y pruebas de APK. En esta auditoría se ejecutó `assembleDebug --warning-mode all --no-daemon`, se midieron de nuevo las rutas de ambos `build.ninja`, se inspeccionaron manifests/lockfile/APK, se ejecutó `zipalign -c -P 16 -v 4` y se consultó ADB. El registro de advertencias completo quedó en un log local fuera de Git.

## TEST RESULTS

La ejecución actual de `assembleDebug` fue exitosa; `:app:buildCMakeDebug[arm64-v8a]` completó. La ejecución anterior registró `assembleLocal` exitoso, 9 suites y 77 pruebas Jest aprobadas, y builds de paquetes, backend, web y móvil exitosos. No se repitieron estas pruebas en la auditoría actual.

## APK PATHS

- Debug: `C:\ERP\apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk`.
- Local standalone: `C:\ERP\apps\mobile\android\app\build\outputs\apk\local\app-local.apk`; contiene `assets/index.android.bundle`.

Los APK también existen en la copia del Escritorio. Están ignorados por Git y no se publican en `main`.

## DEVICE TEST RESULT

La ejecución anterior observó el login con `app-local.apk` sin Metro en SM_A266M. En esta auditoría el teléfono apareció `unauthorized` y luego desapareció de ADB. No se atribuye una nueva instalación ni prueba de login.

## 16KB REGRESSION CHECK

`zipalign` informó `Verification successful`. Las 11 bibliotecas `arm64-v8a` del APK local tienen alineación mínima de 16,384 bytes en sus segmentos `PT_LOAD`. La ejecución anterior probó un emulador de 16 KB; aquí no se probó un dispositivo físico de 16 KB.

## REMAINING TECH DEBT

Las 13 advertencias de compatibilidad futura con Gradle 10, el Sync/Run visual de Android Studio y las pruebas de autenticación, dashboard y logout con backend real siguen pendientes. La nueva conexión ADB requiere autorización del teléfono.

## NEXT USER ACTION

Abrir `C:\ERP\apps\mobile\android` en Android Studio, seleccionar `C:\Users\eduar\.jdks\jbr-17.0.14` como Gradle JDK y ejecutar **Sync Project with Gradle Files** y **Run**. Para repetir la prueba física, reconectar el teléfono, aceptar su diálogo de depuración USB hasta que ADB muestre `device` y probar el APK local con Metro detenido y sin `adb reverse`.
