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

Estos valores vienen de la plantilla instalada de RN 0.73.11 y su catálogo de versiones. Usa JDK 17 para Gradle; el JDK 8 del PATH y un JBR 25 reciente no sirven para esta combinación. En este equipo funciona `%USERPROFILE%\.jdks\jbr-17.0.14`: selecciónalo en **Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK**. Platform 34 y Build Tools 34.0.0 ya están instalados; Platform Tools y Android Emulator también. El NDK 25.1.8937393 está declarado, pero `assembleDebug` terminó sin instalarlo. Instálalo solo si otra tarea lo requiere. No guardes `local.properties` en Git.

## Instalación y emulador

1. En la raíz del repositorio ejecuta `npm.cmd ci`, `npm.cmd run build:packages` y `npm.cmd run backend:build`. Usa `npm.cmd` en PowerShell si la ExecutionPolicy bloquea `npm.ps1`. `npm ci` ejecuta `postinstall` y debe indicar que se aplicó `metro@0.80.12`.
2. Prepara `.env` local con una base de **desarrollo**, `JWT_SECRET` y `JWT_REFRESH_SECRET` distintos. Nunca copies los marcadores de `.env.example` como credenciales reales ni configures MongoDB dentro de Android. Si necesitas una cuenta, establece `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` y ejecuta `npm run db:seed -w backend` únicamente contra esa base de desarrollo.
3. Abre **Android Studio > File > Open > apps/mobile/android**. En **Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK** selecciona el JDK 17 indicado y espera **Gradle Sync**. Comprueba en SDK Manager Platform 34, Build Tools 34.0.0, Platform Tools y Android Emulator. Instala una imagen de sistema API 34 para el AVD.
4. Este checkout ya tiene `apps/mobile/android/local.properties` apuntando al SDK real y Git ignora el archivo. Si cambia la ubicación del SDK, actualiza solo este archivo local; no lo subas al repositorio.
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

React Native 0.73.11 trae CLI 12.3.7. La CLI y `cli-platform-android` están fijadas en esa versión en la raíz porque `settings.gradle` y `app/build.gradle` buscan `node_modules/@react-native-community/cli-platform-android/native_modules.gradle` desde allí. La CLI 20.2.0 instalada manualmente no incluía ese script. La plantilla oficial incluida en `node_modules/react-native/template/android` confirma el mecanismo de autolinking existente; no cambies esos archivos Gradle a otro mecanismo por este error. Tras `npm.cmd ci`, verifica `Test-Path .\node_modules\@react-native-community\cli-platform-android\native_modules.gradle`.

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

- **Gradle Sync o assembleDebug falla:** comprueba JDK 17, SDK 34, Build Tools 34.0.0 y acceso a los repositorios de Gradle. Si el error solicita el NDK, instala la versión declarada 25.1.8937393. No uses Java 8 ni JBR 25.
- **Falta `native_modules.gradle`:** ejecuta `npm.cmd ci` desde la raíz y confirma CLI y CLI Android 12.3.7; no instales `latest`. Si PowerShell bloquea `npm.ps1`, usa `npm.cmd` sin cambiar ExecutionPolicy.
- **Gradle intenta usar `C:\.gradle` sin permisos:** configura `GRADLE_USER_HOME` a una carpeta donde puedas escribir antes de ejecutar Gradle; la descarga inicial de Gradle 8.3 aún requiere acceso a `services.gradle.org`.
- **Metro no conecta:** comprueba `npm run mobile:start` en el puerto 8081, recarga desde Dev Menu y revisa firewall o `adb reverse tcp:8081 tcp:8081` si usas un dispositivo físico.
- **Backend no conecta:** comprueba Express en el puerto 3000, `.env`, MongoDB y `http://10.0.2.2:3000/api/v1` desde el emulador. `localhost` dentro del emulador es el propio Android. En teléfono, verifica la IP privada elegida, que el backend escuche en una interfaz accesible y las reglas de firewall.
- **Diagnóstico HTTP:** `ECONNREFUSED` suele indicar backend apagado; `Network request failed` requiere revisar URL, red y seguridad HTTP; 401 indica credenciales o sesión; 403 permisos; 404 ruta; 500 backend; 501 módulo todavía no implementado.
- **Duplicate React / Invalid hook call:** ejecuta `npm.cmd ci` desde la raíz y comprueba que Metro resuelva React y React Native en `node_modules` raíz. Reinicia Metro con `npm.cmd run mobile:start`.
- **Cleartext HTTP blocked:** confirma que estás ejecutando debug; la excepción de red vive en `app/src/debug`.
- **Pantalla roja:** lee el error de Metro y Logcat antes de borrar cachés. El build web no acredita compatibilidad nativa.

Las futuras integraciones NFC, Bluetooth, biometría, cámara e impresoras pueden añadirse como módulos nativos Kotlin sin mover la lógica ERP ni las pantallas fuera de React Native.

## Verificación en este entorno (2026-10-01)

- En el checkout del Escritorio, `npm.cmd ci` instaló CLI 12.3.7 y aplicó el parche Metro. Con `JAVA_HOME=%USERPROFILE%\.jdks\jbr-17.0.14`, `.\gradlew.bat clean --no-daemon` y `.\gradlew.bat assembleDebug --no-daemon` terminaron `BUILD SUCCESSFUL`.
- **APK_READY:** `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` existe con 55,510,714 bytes. El APK debug necesita Metro activo para cargar JavaScript. Gradle Sync dentro de Android Studio no se observó.
- `npm.cmd run test:mongodb` pasó 31/31 pruebas con MongoDB temporal. Este checkout no tiene `.env` de desarrollo; `npm.cmd run backend:dev` falló y `/health` rechazó la conexión. La prueba temporal no acredita una URI persistente.
- `adb.exe` y Emulator están instalados, pero `adb devices` está vacío y `emulator -list-avds` no muestra AVD. Metro sí respondió HTTP 200 y luego se detuvo. No se instaló ni abrió la app; login, logo en pantalla y Logcat siguen sin verificar.
- Véase el [estado de fases y siguientes pasos](ANDROID-LOCAL-DEPLOYMENT-REPORT.md). No se declara `ANDROID_LOCAL_READY`.
