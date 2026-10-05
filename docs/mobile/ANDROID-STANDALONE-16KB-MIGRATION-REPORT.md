# ANDROID STANDALONE + 16KB MIGRATION REPORT

Fecha: 2026-10-04. Rama de trabajo: `codex/android-standalone-16kb`. Baseline `57ad00c`; variante local previa a la migración `a6dc80e`.

## Estado

| Área | Antes | Después | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| React Native / React | 0.73.11 / 18.2.0 | 0.86.3 / 19.2.3 | lockfile y build Android | Verificado en build |
| CLI / Metro | 12.3.7 / 0.80.12 | 20.1.0 / 0.84.6 | npm y bundle | Verificado |
| Gradle / AGP / Kotlin | 8.3 / 8.1.1 / 1.8.0 | 9.3.1 / 8.12.0 / 2.1.20 | plantilla RN y Gradle | Verificado |
| NDK / Build Tools / SDK | 25.1 / 34 / 34 | 27.1 / 36 / 36 | Gradle, SDK instalado | Verificado |
| minSdk / ABIs | 21 / cuatro ABI | 24 / cuatro ABI | Gradle y APK | Verificado |
| Debug | Metro requerido | Metro requerido | APK sin bundle | Verificado estáticamente |
| Local | No existía | Bundle Hermes y asset, firma debug | APK y login en AVD 4/16 KB sin Metro | Verificado en emulador |
| 16 KB | 66 `.so` arm64 con LOAD 4 KB | 11/11 arm64 y 11/11 x86_64 ELF 16 KB | ELF, zipalign y AVD PAGE_SIZE=16384 | Verificado en emulador |
| Backend, web, móvil web | Compilaban | Compilan | builds | Verificado |
| Jest / lint | 77 pruebas | 77/77; lint 0 errores, 175 avisos | comandos | Verificado |
| Teléfono, emulador, login | Sin verificar | AVD 4 y 16 KB llegan al login; teléfono y autenticación pendientes | capturas y ADB | Parcial |

React Native 0.86.3 se eligió por su soporte vigente y plantilla oficial. RN 0.77 introdujo el soporte inicial de páginas 16 KB. La plantilla 0.86 fija New Architecture, Gradle 9.3.1, AGP 8.12.0, Kotlin 2.1.20, SDK 36 y NDK 27. Se mantuvo NDK 27 de la plantilla; Android prefiere r28, pero el APK real pasó la inspección ELF/ZIP.

## Auditoría de bibliotecas nativas

Se inspeccionaron los `PT_LOAD` de las 44 bibliotecas y sus desplazamientos ZIP. Las 11 bibliotecas de cada ABI se conservaron. Para cada fila siguiente, `arm64-v8a` y `x86_64` cumplen 16 KB en ELF y ZIP. El APK se instaló y abrió en AVD de 16 KB.

| Library | ABI | Source dependency | 16KB compatible | Action required |
| --- | --- | --- | --- | --- |
| `libappmodules.so` | arm64-v8a, x86_64 | app / RN codegen | Sí | Prueba en dispositivo |
| `libc++_shared.so` | arm64-v8a, x86_64 | NDK 27 | Sí | Prueba en dispositivo |
| `libfbjni.so` | arm64-v8a, x86_64 | RN / fbjni | Sí | Prueba en dispositivo |
| `libhermestooling.so` | arm64-v8a, x86_64 | RN / Hermes | Sí | Prueba en dispositivo |
| `libhermesvm.so` | arm64-v8a, x86_64 | RN / Hermes | Sí | Prueba en dispositivo |
| `libimagepipeline.so` | arm64-v8a, x86_64 | RN / Fresco | Sí | Prueba en dispositivo |
| `libjsi.so` | arm64-v8a, x86_64 | RN / JSI | Sí | Prueba en dispositivo |
| `libnative-filters.so` | arm64-v8a, x86_64 | RN / Fresco | Sí | Prueba en dispositivo |
| `libnative-imagetranscoder.so` | arm64-v8a, x86_64 | RN / Fresco | Sí | Prueba en dispositivo |
| `libreact_codegen_safeareacontext.so` | arm64-v8a, x86_64 | safe-area-context 5.10.1 | Sí | Prueba en dispositivo |
| `libreactnative.so` | arm64-v8a, x86_64 | RN 0.86.3 | Sí | Prueba en dispositivo |

Se conservaron `armeabi-v7a` y `x86`: 8/11 bibliotecas de cada ABI de 32 bits mantienen LOAD de 4 KB. La [guía Android](https://developer.android.com/guide/practices/page-sizes) pide corregir las bibliotecas `arm64-v8a` y `x86_64` para dispositivos 16 KB. No se eliminaron ABI para ocultar resultados. `zipalign -c -P 16 -v 4` terminó `Verification successful`; `assets/index.android.bundle` y un asset están dentro del APK local. Debug carece de bundle y assets.

## Archivos, dependencias y cambios incompatibles

- `package.json`, `package-lock.json`, manifests de mobile/web/ui/session: React 19.2.3, RN 0.86.3, CLI 20.1.0, RNW 0.21.3, safe-area-context 5.10.1 y pares compatibles.
- `apps/mobile/android`: plantilla RN nueva, Gradle y autolink, variante local, Hermes hoisted, CMake en ruta corta, módulo `ERPBuildMode`, manifest HTTP solo local/debug.
- `apps/mobile/metro.config.js`, `index.js`, `src/App.tsx`, `src/config/api.ts`: resolución monorepo, bundle y selector de API local para emulador, IP privada y HTTPS.
- `scripts/build-mobile-local.cjs`, ignores, Jest y prueba de assets: build Windows reproducible y acceso privado de Metro nuevo. Se retiró el parche Metro 0.80.12.
- minSdk subió de 21 a 24; Android API 21–23 deja de estar soportado. New Architecture queda habilitada. `native_modules.gradle` fue sustituido por autolink del plugin RN.
- La firma debug sirve únicamente para pruebas locales. No se guardaron secretos, APK, AAB ni keystore en Git.

## Comandos, APK y pruebas pendientes

Baseline: `npm.cmd ci --include=dev`, `build:packages`, typecheck móvil, `gradlew clean`, `assembleDebug` pasaron. Después de migrar pasaron `build:packages`, typecheck móvil, `backend:build`, `web:build`, build Vite móvil, `assembleLocal`, `assembleDebug`, 77 pruebas Jest y lint con 0 errores. El APK local está en `apps/mobile/android/app/build/outputs/apk/local/app-local.apk`; debug en `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`.

`Medium_Phone` (imagen x86_64 de 16 KB, `getconf PAGE_SIZE=16384`) y `Pixel_8` (4 KB, `4096`) instalaron `app-local.apk` con `adb install -r` (`Success`). Con Metro apagado, puerto 8081 sin listener y sin `adb reverse`, ambos abrieron el login; el proceso siguió activo y el Logcat consultado no mostró `FATAL EXCEPTION` ni `Unable to load script`. Evidencia: [login 16 KB](screenshots/local-login-16kb.png) y [login 4 KB](screenshots/local-login-4kb.png). **`STANDALONE_LOCAL_APK_READY` verificado en emuladores.** La inspección CLI y la prueba del AVD 16 KB pasaron; Android Studio APK Analyzer y Gradle Sync quedan para el usuario. Teléfono físico, API real, credenciales válidas/invalidas y logout siguen pendientes; no se declara `ANDROID_LOCAL_READY` ni se extiende la prueba 16 KB a un teléfono físico.

## Rollback

`57ad00c` conserva RN 0.73 anterior y `a6dc80e` la variante local antes de migrar. Crear una rama desde el commit elegido y ejecutar `npm.cmd ci --include=dev`; no reutilizar `node_modules` de RN 0.86. Conservar `.env` ignorado. No hacer reset forzado de `main` compartida.

Fuentes: [Android 16 KB](https://developer.android.com/guide/practices/page-sizes), [RN 0.77](https://reactnative.dev/blog/2025/01/21/version-0.77), [versiones RN](https://reactnative.dev/releases/).
