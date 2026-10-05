# ANDROID GRADLE PLUGIN RECOVERY REPORT

Fecha: 2026-10-05. Repositorio inspeccionado: `eduardoportillo138-oss/repositorio-sistema-ERP`, clon de `C:\Users\eduar\OneDrive\Desktop\repositorio-sistema-ERP`.

| Componente / prueba | Resultado |
| --- | --- |
| React Native / React | 0.86.3 / 19.2.3 en `package.json`, `apps/mobile/package.json` y lockfile |
| `@react-native/gradle-plugin` | 0.86.3, dependencia de `react-native` 0.86.3 en el lockfile; instalado tras `npm ci` |
| CLI / CLI Android | `@react-native-community/cli` 20.1.0 / `cli-platform-android` 20.1.0 |
| Gradle / AGP / Kotlin | Wrapper 9.3.1 / 8.12.0 / 2.1.20; AGP y Kotlin fijados por el catálogo del plugin RN 0.86.3 |
| JDK | `java` del PATH: Java 8; `JAVA_HOME` sin definir. Builds ejecutados con JBR 17.0.14 en `%USERPROFILE%\.jdks\jbr-17.0.14` |
| `settings.gradle` | Plantilla moderna de RN: `pluginManagement` e `includeBuild` apuntan a `../../../node_modules/@react-native/gradle-plugin`; usa `com.facebook.react.settings` y autolinking. `build.gradle` aplica `com.facebook.react.rootproject` y `app/build.gradle` usa `autolinkLibrariesWithApp()` |
| `node_modules` | El clon del Escritorio no tenía el plugin antes de instalar; después `Test-Path` devolvió `True` y `npm ls` mostró 0.86.3 bajo RN 0.86.3 |
| `npm ci --include=dev` | Completado en el clon del Escritorio: 1,082 paquetes instalados y `postinstall` de `patch-package` terminado |
| `gradlew --stop` | Completado; no había daemons activos |
| `gradlew clean --no-daemon` | `BUILD SUCCESSFUL in 38s` con JDK 17; el plugin de settings y autolinking resolvieron |
| `gradlew assembleDebug --no-daemon` | Primer intento: fallo CMake por ruta de más de 260 caracteres. Repetido con `ERP_ANDROID_CXX_STAGE` en una unidad temporal corta: `BUILD SUCCESSFUL in 1m 55s` |
| `npm.cmd run mobile:android:local` | Primer intento: faltaba `packages/api-client/dist/index.js` tras `npm ci`. Después de `npm.cmd run build:packages`: `BUILD SUCCESSFUL in 1m 35s` |
| APK debug / local standalone | Ambos existen en el clon del Escritorio: `app-debug.apk` (123,256,661 bytes) y `app-local.apk` (55,627,997 bytes). El local contiene `assets/index.android.bundle` (1,168,816 bytes) |
| Android Studio Sync | No observado en la interfaz. `clean` demuestra que Gradle cargó el plugin, pero no confirma el Sync de Studio |

## ROOT CAUSE

**A: `node_modules` no instalado en el clon del Escritorio.** `settings.gradle` apunta correctamente al `node_modules` de la raíz del monorepo. El lockfile sí incluye el plugin compatible 0.86.3 como dependencia de React Native; no hay evidencia de lockfile inconsistente, dependencia ausente, migración parcial ni plantilla Gradle incompatible. Una vez instalado, `gradlew clean` completó la carga del plugin y el autolinking.

El primer fallo de `assembleDebug` fue independiente: la ruta de `react-native-safe-area-context` supera el límite de 260 caracteres de Ninja en OneDrive. Se repitió con `ERP_ANDROID_CXX_STAGE` en una unidad temporal corta y terminó correctamente. Tras `npm ci`, la variante standalone también requirió reconstruir los paquetes del monorepo antes de que Metro pudiera encontrar `packages/api-client/dist/index.js`.

## FILES MODIFIED

`README.md`, `docs/DEVELOPMENT-STATUS.md`, `docs/mobile/ANDROID-SETUP.md` y este reporte: corrigen instrucciones antiguas de RN 0.73 y explican la instalación desde la raíz. No se cambió la configuración Android.

## DEPENDENCIES MODIFIED

Ninguna. `package.json` y `package-lock.json` ya estaban sincronizados. No se añadió un duplicado explícito de `@react-native/gradle-plugin` ni se actualizaron versiones.

## COMMANDS EXECUTED

Se inspeccionaron manifiestos, lockfile, archivos Gradle y `npm ls`. En el clon del Escritorio se ejecutaron `npm ci --include=dev`, `Test-Path node_modules/@react-native/gradle-plugin`, `npm ls @react-native/gradle-plugin`, `npm ls react-native`, `gradlew --stop`, `gradlew clean --no-daemon`, `gradlew assembleDebug --no-daemon` con JDK 17 y ruta CMake corta, `npm.cmd run build:packages` y `npm.cmd run mobile:android:local`. Una instalación limpia de la copia de trabajo alternativa falló por `EPERM` al borrar `backend/node_modules/superagent`; el clon del Escritorio sí completó la instalación.

## TEST RESULTS

La recuperación del plugin está verificada por `npm ls`, `BUILD SUCCESSFUL` de `clean`, `assembleDebug` y `assembleLocal`, y por la existencia física de ambos APK. El APK local contiene el bundle de JavaScript. Android Studio Sync sigue pendiente de verificación visual. Los APK permanecen ignorados y no se subieron a Git.

## NEXT USER ACTION

En Android Studio, abrir `apps/mobile/android`, seleccionar `%USERPROFILE%\.jdks\jbr-17.0.14` como Gradle JDK y ejecutar **Sync Project with Gradle Files**. Registrar el resultado real del Sync. El APK local anterior ya fue probado en emuladores de 4 y 16 KB según el informe de migración; esta ejecución confirmó la compilación, pero no repitió pruebas en un dispositivo.
