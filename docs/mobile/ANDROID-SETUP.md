# Android: instalación y APK local

Estado al 2026-10-05. Véanse el [informe de migración y evidencia](ANDROID-STANDALONE-16KB-MIGRATION-REPORT.md) y el [reporte de recuperación del plugin](ANDROID-GRADLE-PLUGIN-RECOVERY-REPORT.md).

## Requisitos

Node 22.13+ (este checkout usa 24.21), JDK 17, Android SDK Platform 36, Build Tools 36, NDK 27.1.12297006, Gradle wrapper 9.3.1 y una instalación Android Studio compatible con AGP 8.12.0. RN 0.86.3 usa React 19.2.3, CLI 20.1.0 y New Architecture. El mínimo de Android es API 24. El identificador es `com.erp.empresarial`; la variante local instala `com.erp.empresarial.local` y no reemplaza debug.

En este equipo el JDK 17 está en `%USERPROFILE%\.jdks\jbr-17.0.14`; el script de build local lo detecta si `JAVA_HOME` no está definido. `apps/mobile/android/local.properties` apunta al SDK y está ignorado por Git. Android Studio debe abrir `apps/mobile/android` y seleccionar JDK 17 para Gradle Sync. La comprobación visual del Sync sigue pendiente a cargo del usuario.

## Preparación

Desde la raíz del repositorio:

```powershell
npm.cmd ci --include=dev
Test-Path node_modules/@react-native/gradle-plugin
npm.cmd ls @react-native/gradle-plugin
npm.cmd run build:packages
npm.cmd run typecheck -w apps/mobile
```

Ejecuta la instalación desde la raíz del monorepo antes de abrir el proyecto Android en Studio. `settings.gradle` incluye `../../../node_modules/@react-native/gradle-plugin`; si esa carpeta falta, el Sync falla antes de autolinking. React Native 0.86.3 ya declara el plugin 0.86.3 y el lockfile lo fija; no necesita una dependencia duplicada. Conserva `.env` local para el backend. No pongas credenciales MongoDB, JWT ni secretos dentro del APK. El backend sigue la cadena Android → REST API → Express → MongoDB.

## Debug con Metro

```powershell
npm.cmd run backend:dev
npm.cmd run mobile:start
# En otra terminal:
npm.cmd run mobile:android
```

`assembleDebug` genera `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`, sin `index.android.bundle`; requiere Metro en 8081. Para un teléfono físico conectado por USB puede requerirse `adb reverse tcp:8081 tcp:8081` y la IP LAN del PC en el selector **Servidor de desarrollo**.

## APK local con JavaScript incluido

```powershell
npm.cmd run mobile:android:local
adb install -r apps/mobile/android/app/build/outputs/apk/local/app-local.apk
```

`assembleLocal` genera `app-local.apk`, firmado con la clave debug estándar exclusivamente para pruebas, con bundle Hermes y assets. Llegó al login sin Metro en emuladores de 4 y 16 KB; aún falta un teléfono físico. El comando crea una letra temporal para los archivos C++ de CMake cuando se ejecuta en Windows y la libera al terminar; los APK permanecen ignorados por Git. Si ya existe una letra de unidad ocupada, busca otra entre R y Z. En macOS/Linux usa el wrapper Gradle directamente.

Para probar independencia de Metro: detén Metro, confirma que 8081 no escucha, elimina cualquier `adb reverse`, instala el APK local, abre la app y verifica que llegue a login sin `Unable to load script`. Esto pasó en ambos AVD. Después prueba login válido e inválido, dashboard, logout y Logcat con backend real; falta esta fase y la prueba en teléfono físico.

## API local

La URL inicial en Android local/debug es `http://10.0.2.2:3000/api/v1` para emulador. En teléfono, abre **Servidor de desarrollo** y pon `http://IP_LAN_PC:3000/api/v1`, con PC y teléfono en la misma red privada y backend escuchando en una interfaz accesible. Se acepta también una URL HTTPS terminada en `/api/v1`; el selector no se presenta en release. El HTTP sin cifrar se habilita solo en las variantes local y debug. La configuración de release conserva HTTPS y no es un paquete de producción.

## 16 KB y diagnóstico

El APK local RN 0.86.3 fue inspeccionado: 11/11 `.so` arm64 y 11/11 x86_64 tienen ELF de 16 KB o superior, y `zipalign -c -P 16 -v 4` pasó. Se conservaron las cuatro ABI. El AVD 16 KB devolvió `PAGE_SIZE=16384` y el Pixel_8 estándar `4096`; ambos instalaron y abrieron el APK sin advertencia ni `FATAL EXCEPTION` observada. Aún faltan Android Studio APK Analyzer y un teléfono físico.

En Windows/OneDrive, Gradle puede fallar por rutas C++ >260 caracteres o por archivos codegen marcados como reparse. `mobile:android:local` usa una ruta temporal corta para CMake y fuerza codegen solo en esa ejecución. Para `assembleDebug` manual, usa un checkout con ruta corta o establece `ERP_ANDROID_CXX_STAGE` a una unidad temporal mapeada al mismo repositorio. No borres `.env`, no copies keystores ni subas APK al repositorio.
