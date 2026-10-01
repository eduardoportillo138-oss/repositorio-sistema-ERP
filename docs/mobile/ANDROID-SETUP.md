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

1. En la raíz del repositorio ejecuta `npm ci`, `npm run build:packages` y `npm run backend:build`. `npm ci` ejecuta `postinstall` y debe indicar que se aplicó `metro@0.80.12`.
2. Prepara `.env` local con una base de **desarrollo**, `JWT_SECRET` y `JWT_REFRESH_SECRET` distintos. Nunca copies los marcadores de `.env.example` como credenciales reales ni configures MongoDB dentro de Android. Si necesitas una cuenta, establece `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` y ejecuta `npm run db:seed -w backend` únicamente contra esa base de desarrollo.
3. Abre **Android Studio > File > Open > apps/mobile/android**. En **Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK** selecciona JDK 17 y espera **Gradle Sync**. Comprueba en SDK Manager Platform 34, Build Tools 34.0.0, NDK 25.1.8937393, Platform Tools y Android Emulator.
4. Si Gradle no detecta el SDK, crea `apps/mobile/android/local.properties` con `sdk.dir=C:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk` ajustado a la ruta real. Este archivo ya está ignorado por Git.
5. Abre **Tools > Device Manager > Add device**; crea un Pixel 7 u 8 con imagen Android API 34 (Google APIs o AOSP) y arráncalo. Confirma `adb devices` con estado `device`.
6. Inicia el backend y Metro en terminales distintas:

   ```powershell
   npm run backend:dev
   # En otra terminal: Invoke-WebRequest http://127.0.0.1:3000/health
   npm run mobile:start
   ```

7. En otra terminal ejecuta `npm run mobile:android`, o selecciona el AVD y pulsa **Run** en Android Studio. Para compilar sin instalar: `cd apps/mobile/android; .\gradlew.bat assembleDebug` en Windows o `./gradlew assembleDebug` en Unix. Solo después de un build exitoso comprueba la existencia de `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`; instala con `adb install -r RUTA_DEL_APK`.

El preview web sigue usando `npm run mobile:web` con Vite. No uses Vite para el emulador. Para acceder al menú de desarrollo de RN usa Ctrl+M en el emulador; allí puedes recargar. Metro muestra errores JavaScript y Logcat muestra fallos nativos. En Android Studio abre **View > Tool Windows > Logcat** y filtra por `com.erp.empresarial`.

## Metro y paquetes compartidos

`apps/mobile/metro.config.js` observa la raíz del monorepo y dirige `react` y `react-native` a la instalación raíz para impedir copias duplicadas. `babel.config.js` usa el preset de React Native 0.73. La CLI autovincula `react-native-safe-area-context`, y `ERPApplication` ya contiene `SafeAreaProvider`, login, dashboard, navegación móvil y estados 501 sin datos ficticios. No hace falta añadir pantallas en Kotlin.

## API local y release

En debug Android se usa por defecto `http://10.0.2.2:3000/api/v1`, que apunta al equipo anfitrión desde el emulador. La URL inicial está centralizada en `apps/mobile/src/config/api.ts`; `apps/mobile/index.js` la aplica al cliente HTTP compartido. En el login debug, **Servidor de desarrollo** permite cambiarla en memoria a `http://IP_LAN_DEL_PC:3000/api/v1` para un teléfono físico, sin recompilar. Se aceptan direcciones IPv4 privadas; el puerto y la ruta siguen siendo `3000/api/v1`. El manifest y la configuración de seguridad **debug** permiten HTTP local para cualquiera de esas IP. El manifest principal no permite HTTP sin cifrar. La app consulta Express a través de `packages/api-client`, nunca MongoDB directamente. CORS web no requiere cambios para React Native nativo.

El preview web mantiene el proxy `/api/v1` hacia `127.0.0.1:3000` y admite `VITE_API_BASE_URL` si se configura deliberadamente. La URL release Android es un dominio `.invalid` deliberado; esta fase no selecciona automáticamente Render ni genera artefactos de distribución.

### Teléfono físico

En Android, activa opciones de desarrollador tocando siete veces **Build Number** en **Settings > About Phone** y luego **USB Debugging**. Conecta por USB, acepta la autorización y confirma `adb devices`. Si aparece `unauthorized`, acepta la huella RSA en el teléfono y vuelve a ejecutar el comando. PC y teléfono deben estar en la misma red Wi-Fi; consulta `ipconfig` para hallar la IPv4 LAN del PC. Abre **Servidor de desarrollo** en el login debug e introduce esa IP. Permite Node en el firewall de Windows para la red privada si el teléfono no alcanza el puerto 3000; conserva el firewall activo. Para Metro por USB, ejecuta `adb reverse tcp:8081 tcp:8081`. Instala con `npm run mobile:android` o con `adb install -r` después de comprobar que el APK existe.

### Verificación manual después de instalar

1. Abre la app y confirma el logo de castor, baúl y cerradura en el login.
2. Verifica `GET /health` desde el PC y, si es posible, desde el navegador del emulador usando `http://10.0.2.2:3000/health`.
3. Inicia sesión con una cuenta de desarrollo real. Credenciales erróneas deben mostrar error; backend apagado debe mostrar fallo de conexión.
4. Confirma dashboard, Usuarios si hay permiso, cierre de sesión y regreso al login.
5. Revisa la vista vertical de 360 × 800 y Pixel 7/8. Usa Logcat para registrar cualquier cierre o error nativo.

Los JWT continúan solo en memoria; una nueva apertura requiere login. Esta fase se limita a debug local y no prepara firma ni publicación.

## Problemas frecuentes

- **Gradle Sync o assembleDebug falla:** comprueba JDK 17, SDK 34, Build Tools 34.0.0, NDK 25.1.8937393 y acceso a los repositorios de Gradle. No uses Java 8 ni JBR 25.
- **Gradle intenta usar `C:\.gradle` sin permisos:** configura `GRADLE_USER_HOME` a una carpeta donde puedas escribir antes de ejecutar Gradle; la descarga inicial de Gradle 8.3 aún requiere acceso a `services.gradle.org`.
- **Metro no conecta:** comprueba `npm run mobile:start` en el puerto 8081, recarga desde Dev Menu y revisa firewall o `adb reverse tcp:8081 tcp:8081` si usas un dispositivo físico.
- **Backend no conecta:** comprueba Express en el puerto 3000, `.env`, MongoDB y `http://10.0.2.2:3000/api/v1` desde el emulador. `localhost` dentro del emulador es el propio Android. En teléfono, verifica la IP privada elegida, que el backend escuche en una interfaz accesible y las reglas de firewall.
- **Diagnóstico HTTP:** `ECONNREFUSED` suele indicar backend apagado; `Network request failed` requiere revisar URL, red y seguridad HTTP; 401 indica credenciales o sesión; 403 permisos; 404 ruta; 500 backend; 501 módulo todavía no implementado.
- **Duplicate React / Invalid hook call:** ejecuta `npm install` desde la raíz y comprueba que Metro resuelva React y React Native en `node_modules` raíz. Reinicia Metro con `npm run mobile:start -- --reset-cache`.
- **Cleartext HTTP blocked:** confirma que estás ejecutando debug; la excepción de red vive en `app/src/debug`.
- **Pantalla roja:** lee el error de Metro y Logcat antes de borrar cachés. El build web no acredita compatibilidad nativa.

Las futuras integraciones NFC, Bluetooth, biometría, cámara e impresoras pueden añadirse como módulos nativos Kotlin sin mover la lógica ERP ni las pantallas fuera de React Native.

## Verificación en este entorno (2026-10-01)

- `npm ci` pasó usando una caché local en `tmp/npm-cache`; `postinstall` aplicó `metro@0.80.12`. `npm run build:packages`, `npm run backend:build` y el typecheck móvil pasaron.
- Metro respondió HTTP 200 en `/status`. El comando `react-native bundle --platform android --dev true` produjo un bundle JavaScript y copió seis assets, incluido el logo compartido.
- **ANDROID_BUILD_NOT_VERIFIED:** `assembleDebug` no llegó a compilar. El `GRADLE_USER_HOME` heredado apuntaba a `C:\.gradle` sin permiso; al redirigirlo a `tmp/gradle-home`, el wrapper no pudo descargar Gradle 8.3 por restricción de red. Java del PATH es 8 y el JBR de Android Studio es 25; no se encontró JDK 17. El SDK local visible está vacío, `adb` no está en PATH y no hay AVD.
- **BACKEND_NOT_VERIFIED:** el `.env` local contiene marcadores de ejemplo y `/health` rechazó la conexión. No se ejecutó seed ni se probaron credenciales. **EMULATOR_NOT_VERIFIED / DEVICE_NOT_VERIFIED / APK_NOT_READY.** Véase el [reporte de ejecución](ANDROID-LOCAL-DEPLOYMENT-REPORT.md).
