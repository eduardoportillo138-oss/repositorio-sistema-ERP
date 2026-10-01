# ANDROID LOCAL DEPLOYMENT REPORT

Fecha: 2026-10-01. Rama: `codex/android-local-deployment`. Repositorio: `eduardoportillo138-oss/repositorio-sistema-ERP`. Alcance: APK debug y pruebas locales; no se preparó release, AAB, firma de producción ni publicación.

## Estado verificado

| Área | Resultado |
| --- | --- |
| NODE | Node 24.21.0 y npm 11.19.0 disponibles. |
| DEPENDENCIES | `npm ci --no-audit --no-fund --cache .\tmp\npm-cache` pasó; `patch-package` aplicó `metro@0.80.12`. El primer intento con la caché global falló con `EPERM`. |
| PACKAGES | `npm run build:packages` pasó para los siete paquetes. `npm run backend:build` y `npm run typecheck -w apps/mobile` pasaron. ESLint sobre los tres archivos TypeScript modificados pasó. |
| GRADLE | **No verificado.** `assembleDebug` no llegó a ejecutar tareas Gradle: el directorio heredado `C:\.gradle` no era escribible; con `tmp/gradle-home`, la descarga del wrapper 8.3 falló con `Permission denied: connect`. Gradle Sync no se ejecutó en Android Studio. |
| ANDROID SDK | **No preparado en este equipo.** El directorio `C:\Users\eduar\AppData\Local\Android\Sdk` está vacío en el entorno visible; no se encontraron Platform 34, Build Tools 34.0.0, NDK 25.1.8937393 ni Platform Tools. `adb` no está en PATH. |
| JDK | `java -version` devuelve Java 8; el JBR de Android Studio es 25. No se encontró JDK 17. |
| METRO | `npm run mobile:start` levantó Metro 0.80.12; `/status` respondió HTTP 200. La CLI generó un bundle Android de 6,032,407 bytes y copió seis assets, incluido `__packages_ui_src_assets_logo_logo.png`. El bundle está en `tmp/` y no es un APK. |
| BACKEND | `npm run backend:dev` no abrió el puerto 3000. `GET http://127.0.0.1:3000/health` rechazó la conexión. El `.env` local tiene valores de ejemplo para MongoDB/JWT; no se usaron credenciales reales ni se ejecutó seed. |
| ANDROID APP | TypeScript y bundle JS verificados. **Ejecución nativa no verificada.** El manifest principal tiene `INTERNET`; la excepción HTTP está limitada al source set `debug`. |
| LOGIN | La sesión llama a `POST /api/v1/auth/login`, exige tokens y usuario reales, y guarda tokens en memoria. No se probó login en Android por falta de backend, emulador y APK. |
| APK | **APK_NOT_READY.** `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` no existe. |
| EMULATOR | **EMULATOR_NOT_VERIFIED.** `mobile:android` no encontró AVD. |
| PHYSICAL DEVICE | **DEVICE_NOT_VERIFIED.** No hay `adb` ni teléfono conectado verificado. |

**Resultado global: ANDROID_LOCAL_READY no declarado. ANDROID_STUDIO_EXTERNAL_STEP pendiente.**

## Cambios realizados

- Archivos: `.gitignore`, `README.md`, `apps/mobile/src/App.tsx`, `apps/mobile/android/app/src/debug/res/xml/debug_network_security_config.xml`, `packages/ui/src/ERPApplication.tsx`, `packages/ui/src/screens/LoginScreen.tsx`, `docs/mobile/ANDROID-SETUP.md` y este reporte.
- El login de Android debug permite elegir una URL privada del PC en memoria. El emulador conserva `http://10.0.2.2:3000/api/v1`; el teléfono puede usar `http://IP_LAN_DEL_PC:3000/api/v1`. El cliente HTTP sigue centralizado en `@erp/api-client`. La web conserva `/api/v1` mediante proxy.
- La configuración de seguridad `debug` permite HTTP local para IP privadas distintas del emulador. El manifest principal y release no recibieron esa excepción.
- `.gitignore` excluye archivos `.jks`, `.keystore`, `.apk` y `.aab`, además de `.env`, `local.properties` y salidas de build ya excluidas.
- README y `docs/mobile/ANDROID-SETUP.md` describen JDK, SDK, Android Studio, backend, Metro, emulador, teléfono, ADB, Gradle, APK, login y diagnóstico.

## Comandos y evidencia

| Comando | Resultado |
| --- | --- |
| `git status`, `git branch --show-current`, `git log -5 --oneline` | Árbol inicialmente limpio en `main`, último commit `bc9365d`. |
| `node -v`, `npm -v`, `java -version` | 24.21.0, 11.19.0 y Java 8. |
| `npm ci --no-audit --no-fund` | Falló por `EPERM` al leer caché global. |
| `npm ci --no-audit --no-fund --cache .\tmp\npm-cache` | Pasó; 1198 paquetes y parche Metro aplicado. |
| `npm run build:packages`, `npm run backend:build` | Pasaron. |
| `npm run typecheck -w apps/mobile`, `npx eslint ...` | Pasaron después de los cambios. |
| `.\gradlew.bat assembleDebug --no-daemon` | Falló antes de compilar por falta de permiso en `C:\.gradle`. |
| `assembleDebug` con `GRADLE_USER_HOME=tmp/gradle-home` | Falló al descargar Gradle 8.3: `Permission denied: connect`. |
| `npm run backend:dev`, `GET /health` | No quedó servidor en 3000; conexión rechazada. |
| `npm run mobile:start`, `GET /status` | Metro inició; HTTP 200. |
| `react-native bundle --platform android --dev true` | Pasó; seis assets copiados. |
| `npm run mobile:android` | Falló: `adb` ausente, ningún AVD y bloqueo Gradle. |

## Próxima acción en Android Studio

1. Tener instalado JDK 17 y seleccionarlo en **Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK**. Confirmar `java -version` en la terminal usada para Gradle. No se descargó ni configuró JDK en esta ejecución.
2. En **SDK Manager**, instalar solo lo requerido: Android SDK Platform 34, Build Tools 34.0.0, Platform Tools, Android Emulator y NDK 25.1.8937393 (declarado en el proyecto). Si Gradle no detecta el SDK, crear `apps/mobile/android/local.properties` con la ruta SDK real; no versionarlo.
3. Permitir al wrapper obtener Gradle 8.3 desde `services.gradle.org` o disponer de esa distribución por un medio local autorizado. Ejecutar Gradle Sync y luego `cd apps/mobile/android; .\gradlew.bat assembleDebug`. Registrar el error exacto si aparece otro bloqueo.
4. Configurar `.env` con una base de desarrollo y secretos JWT distintos; confirmar `GET http://127.0.0.1:3000/health`. Si se requiere usuario, ejecutar el seed solo contra desarrollo, sin colocar la contraseña en Git.
5. Crear y arrancar un Pixel 7/8 API 34. Confirmar `adb devices`, iniciar Metro y ejecutar `npm run mobile:android`. Probar `http://10.0.2.2:3000/health` en el emulador, login real, dashboard, Usuarios si el permiso existe y logout. Capturar evidencia antes de declarar `EMULATOR_VERIFIED`.
6. Tras `assembleDebug` exitoso, verificar el archivo real en `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` e instalar con `adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` desde la raíz. Para teléfono físico, usar la IPv4 LAN del PC en **Servidor de desarrollo**, autorizar depuración USB y probar el mismo flujo.

No se puede afirmar visibilidad del logo en pantalla, funcionamiento de login, Gradle Sync ni existencia de APK hasta completar los pasos anteriores.
