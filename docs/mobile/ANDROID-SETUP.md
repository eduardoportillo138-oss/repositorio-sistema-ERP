# Android Native Bootstrap

## Arquitectura

`apps/mobile/android` es el host de React Native. `MainActivity` registra el componente `ERP` de `apps/mobile/index.js`, que carga `src/App.tsx` y `@erp/ui`/`ERPApplication`. Las pantallas, sesión y tokens de diseño permanecen en `packages/ui`, `packages/session` y `packages/api-client`. `native/android/kotlin` queda reservado para integraciones futuras; no es una segunda app.

El identificador Android es `com.erp.empresarial`, elegido para coincidir con el nombre ERP Empresarial. Cambiarlo después afecta instalaciones y distribución. Los recursos Android usan el logo de `packages/ui/src/assets/logo/logo.png` y los colores nativos mínimos del mismo branding; el diseño de pantallas sigue en `packages/ui/src/tokens.ts`.

## Versiones y requisitos

| Componente                      | Versión                           |
| ------------------------------- | --------------------------------- |
| React Native                    | 0.73.11                           |
| Gradle wrapper                  | 8.3                               |
| Android Gradle Plugin           | 8.1.1, fijado por el plugin de RN |
| Kotlin                          | 1.8.0                             |
| compileSdk / targetSdk / minSdk | 34 / 34 / 21                      |
| Build Tools / NDK               | 34.0.0 / 25.1.8937393             |
| JDK para Gradle                 | 17                                |

Estos valores vienen de la plantilla instalada de RN 0.73.11 y su catálogo de versiones. Usa JDK 17 para Gradle; el JDK 8 del PATH y un JBR 25 reciente no sirven para esta combinación. En Android Studio selecciona JDK 17 en **Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK**. Instala SDK Platform 34, Build Tools 34.0.0, NDK 25.1.8937393, Platform Tools y Android Emulator desde SDK Manager. No guardes `local.properties` en Git.

## Instalación y emulador

1. En la raíz del repositorio ejecuta `npm install` y prepara `.env` y una cuenta de desarrollo siguiendo el README.
2. Abre **Android Studio > Open > apps/mobile/android** y espera Gradle Sync.
3. Abre **Tools > Device Manager > Add device**; crea un Pixel 7 u 8 con imagen Android API 34 y arráncalo.
4. Inicia el backend y Metro en terminales distintas:

   ```powershell
   npm run backend:dev
   npm run mobile:start
   ```

5. En otra terminal ejecuta `npm run mobile:android`, o selecciona el AVD y pulsa **Run** en Android Studio. Para compilar sin instalar: `cd apps/mobile/android; .\gradlew.bat assembleDebug` en Windows o `./gradlew assembleDebug` en Unix.

El preview web sigue usando `npm run mobile:web` con Vite. No uses Vite para el emulador. Para acceder al menú de desarrollo de RN usa Ctrl+M en el emulador; allí puedes recargar. Metro muestra errores JavaScript y Logcat muestra fallos nativos. En Android Studio abre **View > Tool Windows > Logcat** y filtra por `com.erp.empresarial`.

## Metro y paquetes compartidos

`apps/mobile/metro.config.js` observa la raíz del monorepo y dirige `react` y `react-native` a la instalación raíz para impedir copias duplicadas. `babel.config.js` usa el preset de React Native 0.73. La CLI autovincula `react-native-safe-area-context`, y `ERPApplication` ya contiene `SafeAreaProvider`, login, dashboard, navegación móvil y estados 501 sin datos ficticios. No hace falta añadir pantallas en Kotlin.

## API local y release

En debug Android se usa `http://10.0.2.2:3000/api/v1`, que apunta al equipo anfitrión desde el emulador. La URL está centralizada en `apps/mobile/src/config/api.ts`. El manifest debug habilita HTTP sin cifrar solo para `10.0.2.2`; el manifest principal no lo habilita. La app consulta Express a través de `packages/api-client`, nunca MongoDB directamente. CORS web no requiere cambios para React Native nativo.

La URL release es un dominio `.invalid` deliberado. Antes de distribuir, sustitúyelo por un endpoint HTTPS real, configura firma release fuera de Git y verifica el flujo completo. Los JWT continúan solo en memoria; una nueva apertura requiere login.

## Problemas frecuentes

- **Gradle Sync o assembleDebug falla:** comprueba JDK 17, SDK 34, Build Tools 34.0.0, NDK 25.1.8937393 y acceso a los repositorios de Gradle. No uses Java 8 ni JBR 25.
- **Metro no conecta:** comprueba `npm run mobile:start` en el puerto 8081, recarga desde Dev Menu y revisa firewall o `adb reverse tcp:8081 tcp:8081` si usas un dispositivo físico.
- **Backend no conecta:** comprueba Express en el puerto 3000, `.env`, MongoDB y `http://10.0.2.2:3000/api/v1` desde el emulador. `localhost` dentro del emulador es el propio Android.
- **Duplicate React / Invalid hook call:** ejecuta `npm install` desde la raíz y comprueba que Metro resuelva React y React Native en `node_modules` raíz. Reinicia Metro con `npm run mobile:start -- --reset-cache`.
- **Cleartext HTTP blocked:** confirma que estás ejecutando debug; la excepción de red vive en `app/src/debug`.
- **Pantalla roja:** lee el error de Metro y Logcat antes de borrar cachés. El build web no acredita compatibilidad nativa.

Las futuras integraciones NFC, Bluetooth, biometría, cámara e impresoras pueden añadirse como módulos nativos Kotlin sin mover la lógica ERP ni las pantallas fuera de React Native.

## Verificación en este entorno (2026-09-29)

- `npm install`, `npm run build`, `npm run lint` y `npm run test -- --runInBand --silent` terminaron con éxito. Lint conservó 163 advertencias existentes; Jest pasó 8 suites y 69 tests.
- La CLI de React Native detectó `apps/mobile/android`, `com.erp.empresarial` y el autolink de `react-native-safe-area-context`. Metro generó el bundle Android y copió seis activos.
- `gradlew.bat assembleDebug` se intentó, pero **ANDROID_BUILD_NOT_VERIFIED**: Gradle 8.3 no puede ejecutarse con el JBR 25 instalado (`Unsupported class file major version 69`). El SDK local solo contiene plataforma 37 y Build Tools 36; también faltan SDK 34, Build Tools 34.0.0, NDK 25.1.8937393 e imagen AVD. No se ejecutó emulador ni se hicieron capturas Android.
