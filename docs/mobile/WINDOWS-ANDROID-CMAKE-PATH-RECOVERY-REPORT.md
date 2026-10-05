# WINDOWS ANDROID CMAKE PATH RECOVERY REPORT

Fecha: 2026-10-05. Repositorio: `eduardoportillo138-oss/repositorio-sistema-ERP`. Checkout original: `C:\Users\eduar\OneDrive\Desktop\repositorio-sistema-ERP`; checkout de verificación: `C:\ERP`.

| Area | Before | Action | After | Status |
| --- | --- | --- | --- | --- |
| Checkout path | Ruta de OneDrive de 55 caracteres | Clon independiente desde `origin/main`; no se movió el original | `C:\ERP`, 6 caracteres | Corregido |
| Path length | `RNCSafeAreaViewShadowNode.cpp.o` de `react_codegen_safeareacontext`: ruta completa de 372 caracteres en `build.ninja` original | Build desde checkout corto, sin `ERP_ANDROID_CXX_STAGE` | CMake generó ruta completa de 245 caracteres y Ninja compiló arm64-v8a | `WINDOWS_PATH_LENGTH_FIXED` |
| OneDrive | Checkout y artefactos nativos bajo OneDrive | Desarrollo Android en clon fuera de OneDrive | `.cxx` y `build` bajo `C:\ERP` | Corregido |
| Windows Long Paths | `LongPathsEnabled=1`; no evitó el fallo de la ruta larga reportado | Solo lectura del registro | Sigue habilitado; ninguna política modificada | Sin cambio |
| React Native | 0.86.3 | `npm ci --include=dev`, `npm ls` | 0.86.3 | OK |
| safe-area-context | 5.10.1; objeto C++ de Codegen involucrado | Se conservó la dependencia | 5.10.1 | OK |
| New Architecture | `newArchEnabled=true`; genera `react_codegen_safeareacontext` | Se conservó | `true`; Codegen compila | OK |
| CMake | 3.22.1-g37088a8-dirty | Se conservó | Misma versión | OK |
| Ninja | 1.10.2 | Se conservó | Compiló el objeto acortado | OK |
| NDK | 27.1.12297006 | Se conservó | Misma versión | OK |
| Gradle | Wrapper 9.3.1 | `clean`, `assembleDebug`, `assembleLocal` | `BUILD SUCCESSFUL` en los tres | OK |
| AGP | 8.12.0, catálogo de RN 0.86.3 | Se conservó | Misma versión | OK |
| JDK | Java 8 en PATH; `JAVA_HOME` vacío | Se usó JBR 17.0.14 en los comandos Gradle | Builds CLI exitosos; JDK de Studio sin observar | CLI OK |
| assembleDebug | Ninja fallaba en la ruta larga según el error reportado | `assembleDebug --no-daemon --stacktrace` en `C:\ERP` | `BUILD SUCCESSFUL in 2m 13s`; APK de 123,256,661 bytes | `ANDROID_DEBUG_BUILD_READY` |
| Standalone build | Variante `local` existente | `build:packages` y `assembleLocal --no-daemon` directo en `C:\ERP` | `BUILD SUCCESSFUL in 5m 41s`; APK de 55,627,997 bytes y bundle JS de 1,168,816 bytes | `STANDALONE_PRESERVED` |
| Android Studio Sync | Sin resultado observado | Se intentó acceder a la ventana; Computer Use denegó acceso a Android Studio | Sync y Run desde Studio sin verificar | Pendiente |

## ROOT CAUSE

El `build.ninja` del checkout original contiene la salida `safeareacontext_autolinked_build/CMakeFiles/react_codegen_safeareacontext.dir/.../RNCSafeAreaViewShadowNode.cpp.o`. Sumada a `app/.cxx/Debug/.../arm64-v8a`, la ruta absoluta mide 372 caracteres. El error `ninja: error: Filename longer than 260 characters` durante `:app:buildCMakeDebug[arm64-v8a]` fue reportado para ese checkout y coincide con esa evidencia. En `C:\ERP`, CMake acortó la salida mediante un componente hash; la ruta real mide 245 caracteres y el task compiló. El problema es de longitud de ruta del entorno de build; no hizo falta cambiar React Native, safe-area-context, Codegen ni CMake.

La advertencia `Deprecated Gradle features were used` apareció también en builds exitosos. Se registra como **TECH_DEBT** separada; no causó el fallo de Ninja y no se migró a Gradle 10.

## FILES MODIFIED

- `docs/mobile/ANDROID-SETUP.md`: instrucciones del checkout corto y prueba observada en teléfono.
- `docs/mobile/WINDOWS-ANDROID-CMAKE-PATH-RECOVERY-REPORT.md`: este reporte.
- `apps/mobile/android/local.properties` se recreó localmente en `C:\ERP` para apuntar al SDK; está ignorado por Git. Los APK, `.cxx` y `build` son artefactos ignorados.

El checkout original conserva intacto su archivo sin seguimiento `apps/mobile/android/gradle/gradle-daemon-jvm.properties`. No se modificaron fuentes, dependencias, lockfile, Gradle ni políticas de Windows.

## SYSTEM CHANGES REQUIRED

Ninguno para resolver MAX_PATH: `LongPathsEnabled` ya vale `1` y el checkout corto compiló. Para el Sync visual, Android Studio debe abrir `C:\ERP\apps\mobile\android` y usar JBR 17.0.14 como Gradle JDK.

## COMMANDS EXECUTED

Se revisaron `git status`, rama, log, manifiestos, lockfile y archivos Gradle; se midieron ambas rutas de objeto y se consultó `LongPathsEnabled`. Se ejecutaron `git clone` a `C:\ERP`, `npm.cmd ci --include=dev`, `npm.cmd ls` de RN/safe-area-context/plugin, `gradlew --stop`, `clean --no-daemon`, `assembleDebug --no-daemon --stacktrace`, `assembleLocal --no-daemon`, `npm.cmd run build:packages`, `backend:build`, `web:build`, `build -w apps/mobile` y `test -- --runInBand --silent`. Se inspeccionaron APK/ELF, se ejecutó `zipalign -c -P 16 -v 4` y se probó un teléfono mediante ADB.

## TEST RESULTS

`clean`, debug, local, paquetes, backend, web y build móvil: exitosos. Jest: 9 suites y 77/77 pruebas aprobadas. El APK debug se instaló en un SM_A266M (Android API 36, página de 4 KB), arrancó con Metro y mostró login. El APK local se instaló por separado y mostró login con Metro detenido y sin `adb reverse`; su proceso permaneció activo. No se probó autenticación con backend, dashboard ni logout. La URL API visible seguía en `10.0.2.2`, valor inicial de emulador; para el teléfono debe configurarse la IP LAN del PC.

## APK PATHS

- Debug: `C:\ERP\apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk`.
- Local standalone: `C:\ERP\apps\mobile\android\app\build\outputs\apk\local\app-local.apk`; contiene `assets/index.android.bundle`.

## 16KB REGRESSION CHECK

`zipalign -c -P 16 -v 4` devolvió `Verification successful`. Se leyeron los encabezados ELF de las 11 bibliotecas `arm64-v8a` y 11 `x86_64` del APK nuevo: todos los segmentos `PT_LOAD` revisados tienen alineación mínima de 16 KB. Se conservaron las cuatro ABI. El teléfono conectado usa 4 KB; esta ejecución no probó un dispositivo físico de 16 KB. La prueba anterior en emulador de 16 KB consta en `ANDROID-STANDALONE-16KB-MIGRATION-REPORT.md`.

## NEXT USER ACTION

Abrir `C:\ERP\apps\mobile\android` en Android Studio, elegir `C:\Users\eduar\.jdks\jbr-17.0.14` como Gradle JDK, ejecutar **Sync Project with Gradle Files** y después **Run app**. Registrar los resultados reales antes de declarar `ANDROID_STUDIO_READY`. Para probar la API en el teléfono, usar la IP LAN del PC en **Servidor de desarrollo** y realizar las pruebas de login/logout con backend real.