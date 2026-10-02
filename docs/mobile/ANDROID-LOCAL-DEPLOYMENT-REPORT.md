# ANDROID LOCAL PHASE STATUS

Fecha: 2026-10-01. Checkout verificado: `repositorio-sistema-ERP` en el Escritorio. Rama: `codex/android-local-deployment`. Alcance exclusivo: Android debug local.

| Phase            | Status           | Evidence                                                                                                                                              | Blocking issue                                                                                                           | Next action                                                                                                 |
| ---------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| React Native CLI | COMPLETED        | React Native 0.73.11 y CLI 12.3.7 fijada en `package.json` y `package-lock.json`; `npm.cmd ci` pasó.                                                  | Ninguno.                                                                                                                 | Conservar las versiones compatibles.                                                                        |
| Autolinking      | COMPLETED        | `native_modules.gradle` existe en `node_modules` raíz; `gradlew clean` y `assembleDebug` completaron `:app:generatePackageList`.                      | Ninguno.                                                                                                                 | No cambiar el mecanismo Gradle de RN 0.73.                                                                  |
| JDK              | COMPLETED        | `%USERPROFILE%\.jdks\jbr-17.0.14\bin\java.exe` informa Java 17.0.14; Gradle compiló con ese `JAVA_HOME`.                                              | El `java` por defecto del PATH sigue siendo Java 8.                                                                      | Seleccionar ese JDK 17 en Android Studio o establecer `JAVA_HOME` en cada terminal de build.                |
| Android SDK      | COMPLETED        | Gradle instaló Platform 34 y Build Tools 34.0.0; Platform Tools y Android Emulator ya existen. `local.properties` apunta al SDK real y Git lo ignora. | No hay imagen AVD API 34; NDK 25.1.8937393 no está instalado, pero `assembleDebug` no lo requirió.                       | Instalar imagen API 34 para crear AVD; instalar NDK solo si una tarea posterior lo exige.                   |
| Gradle           | COMPLETED        | Gradle 8.3: `--stop` detuvo dos daemons, `clean` terminó `BUILD SUCCESSFUL` en 2m 49s y `assembleDebug` en 3m 55s.                                    | Gradle Sync dentro de Android Studio no se probó.                                                                        | Abrir `apps/mobile/android` en Android Studio y verificar Sync con JDK 17.                                  |
| APK              | COMPLETED        | `app-debug.apk` existe; 55,510,714 bytes; modificación 2026-10-01 15:07:33 -06:00.                                                                    | No hay dispositivo para instalarlo.                                                                                      | Usar `adb install -r` cuando ADB muestre un dispositivo.                                                    |
| MongoDB          | BLOCKED_EXTERNAL | `npm.cmd run test:mongodb` pasó 31/31 pruebas con MongoDB temporal y consultas reales.                                                                | Este checkout no tiene `.env` ni URI de una base de desarrollo persistente; la prueba temporal no acredita esa conexión. | Configurar una URI de desarrollo; probarla con `npm.cmd run test:mongodb -w backend` y confirmar ping real. |
| Backend          | BLOCKED_EXTERNAL | `npm.cmd run backend:dev` registró error al iniciar; `GET http://127.0.0.1:3000/health` rechazó la conexión.                                          | Faltan `.env`, `MONGODB_URI` y secretos de desarrollo.                                                                   | Preparar `.env` ignorado con MongoDB de desarrollo y secretos JWT distintos; repetir `/health`.             |
| Metro            | COMPLETED        | `npm.cmd run mobile:start` inició Metro 0.80.12; `/status` respondió HTTP 200 con `packager-status:running`. El proceso se detuvo tras comprobarlo.   | Ninguno.                                                                                                                 | Reiniciarlo antes de ejecutar el APK debug.                                                                 |
| ADB              | COMPLETED        | `adb.exe` 1.0.41 está instalado en Platform Tools y `adb devices` respondió.                                                                          | Lista de dispositivos vacía.                                                                                             | Iniciar AVD o conectar y autorizar teléfono.                                                                |
| Emulator         | BLOCKED_EXTERNAL | `emulator.exe -list-avds` no devolvió ningún AVD; `adb devices` no mostró emulador.                                                                   | Falta crear AVD e instalar su imagen API 34.                                                                             | En Android Studio Device Manager, crear Pixel 7/8 API 34 y arrancarlo.                                      |
| Login            | NOT_TESTED       | No se ejecutó la app ni un login en Android. La prueba MongoDB temporal sí cubrió el endpoint a nivel backend.                                        | Backend local y AVD no disponibles.                                                                                      | Probar login válido e inválido, dashboard y logout en el AVD.                                               |
| Physical Device  | NOT_TESTED       | `adb devices` no mostró teléfono.                                                                                                                     | No hay dispositivo conectado.                                                                                            | Opcional: autorizar USB Debugging, usar IP LAN del PC y probar el flujo.                                    |
| Android QA       | NOT_TESTED       | No hubo pantalla, Logcat ni instalación Android observada.                                                                                            | Falta AVD o teléfono y backend local.                                                                                    | Revisar logo, navegación, 360 × 800, errores de API y Logcat tras ejecutar la app.                          |

**APK_READY: COMPLETED.** No se declara `ANDROID_LOCAL_READY`, `EMULATOR_VERIFIED` ni `DEVICE_VERIFIED`. La existencia del APK no acredita ejecución de la app; la variante debug necesita Metro para cargar JavaScript.

## FILES MODIFIED

- `package.json` y `package-lock.json`: CLI y CLI Android fijadas en 12.3.7, compatibles con React Native 0.73.11.
- `README.md`, `docs/mobile/ANDROID-SETUP.md` y este reporte: evidencia actual, rutas y pasos pendientes.

## COMMANDS EXECUTED

- `git status`, `git branch --show-current`, `git log -5 --oneline`.
- `Test-Path node_modules/@react-native-community/cli-platform-android/native_modules.gradle` y `npm.cmd ls` de CLI, CLI Android, React Native y Gradle plugin.
- `npm.cmd uninstall -D @react-native-community/cli @react-native-community/cli-platform-android` y `npm.cmd install -D @react-native-community/cli@12.3.7 @react-native-community/cli-platform-android@12.3.7 --save-exact`.
- `npm.cmd ci --no-audit --no-fund`; `npm.cmd run build:packages`; `npm.cmd run test:mongodb`.
- Con `JAVA_HOME=%USERPROFILE%\.jdks\jbr-17.0.14`: `.\gradlew.bat --stop`, `.\gradlew.bat clean --no-daemon`, `.\gradlew.bat assembleDebug --no-daemon`.
- `adb version`, `adb devices`, `emulator -list-avds`, `npm.cmd run backend:dev`, `GET /health`, `npm.cmd run mobile:start`, `GET /status`.

## ERRORS FIXED

- La instalación manual de CLI 20.2.0 dejó `native_modules.gradle` ausente en `node_modules` raíz. La plantilla incluida con React Native 0.73.11 usa ese script; CLI 12.3.7 fijada lo restaura sin cambiar Gradle ni React Native.
- La primera ejecución de `test:mongodb` falló porque `npm ci` retiró `packages/types/dist`; `npm.cmd run build:packages` reconstruyó los paquetes y la repetición pasó 31/31.

## ERRORS PENDING

- No hay `.env` de desarrollo ni MongoDB persistente configurada en este checkout. El backend no responde `/health`; no se ejecutó seed ni login Android.
- No hay AVD ni dispositivo conectado. La imagen de sistema API 34 se debe instalar mediante Android Studio. No se probó instalación, interfaz ni Logcat.
- `JAVA_HOME` no está establecido de forma permanente; el Java por defecto del PATH es 8. El JDK 17 instalado funcionó al establecerlo para Gradle.
- Gradle emitió advertencias de deprecación y de `react-native-safe-area-context`; ninguna bloqueó `assembleDebug`.

## APK PATH

`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` (ruta relativa a la raíz del repositorio; 55,510,714 bytes).

El APK se mantiene ignorado por Git y no se subió a ninguna tienda ni servicio de distribución.

## NEXT USER ACTIONS

1. Configurar `.env` local con `MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_SECRET`, `JWT_REFRESH_SECRET` y `CORS_ORIGIN` de desarrollo. No colocar secretos en Git. Probar la conexión real con `npm.cmd run test:mongodb -w backend`, iniciar `npm.cmd run backend:dev` y exigir HTTP 200 en `/health`.
2. En Android Studio seleccionar `%USERPROFILE%\.jdks\jbr-17.0.14` como Gradle JDK. Instalar imagen de sistema API 34 y crear un Pixel 7/8 en Device Manager. Confirmar `adb devices` con estado `device`.
3. Con backend, AVD y Metro activos, ejecutar `npm.cmd run mobile:android` o instalar el APK existente con `adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`. Comprobar logo, login real, dashboard, logout y Logcat antes de declarar `ANDROID_LOCAL_READY`.
