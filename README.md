# ERP Empresarial

## Deployment con Render

El Blueprint [render.yaml](render.yaml) publica primero el backend: **GitHub → Render → Express API → MongoDB Atlas**. El servicio se construye desde la raíz del monorepo con `npm ci --include=dev && npm run build:packages && npm run backend:build`, arranca con `npm run backend:start` y expone `GET /health` sin autenticación. `GET /ready` comprueba la conexión MongoDB. La API está bajo `/api/v1`; Render define el puerto dinámico. Node queda fijado en `.node-version`.

Configura en el panel de Render `MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_SECRET`, `JWT_REFRESH_SECRET` y `CORS_ORIGIN`. Los secretos deben ser nuevos y distintos. **La credencial de Atlas que figuró en el historial de Git debe rotarse y revocarse antes de desplegar**; corregir la plantilla no borra ese historial. Permite en Atlas los rangos de salida reales del servicio Render. `CORS_ORIGIN` debe contener el origen HTTPS exacto del frontend, nunca `*`.

La web Vite se publica en una segunda etapa como sitio estático. Usa `VITE_API_BASE_URL=<URL real del backend>/api/v1` en el build web, configura `CORS_ORIGIN` con la URL real del sitio y verifica login y dashboard. Los módulos que devuelven 501 continúan en desarrollo. Consulta la [guía de despliegue, validación y rollback](docs/DEPLOYMENT-RENDER.md). No se ha declarado una URL de servicio hasta comprobar un despliegue real.

Monorepo TypeScript con API Express/Mongoose y una interfaz compartida en React Native y React Native Web.

**Estado al 2026-10-02:** CURRENT PHASE: CORE HARDENING. Core incorpora bootstrap explícito, auditoría transaccional, herramienta de migración y CI; 77 pruebas Jest y 15 E2E pasaron en esta fase. Web compila; Render/Atlas siguen sin validación productiva. Android build y APK debug figuran como verificados por la evidencia reciente aportada para esta fase; AVD, login/logout, Logcat, dispositivo físico y release permanecen sin probar. Master Data, Inventory, Sales, Purchases y Finance siguen en HTTP 501. Bloqueos externos: rotación de la credencial Atlas histórica, backup/migración real, validación Render y Android AVD. Consultar [QA actual](docs/QA-VERIFICATION.md). Ningún módulo nuevo está QA_APPROVED.

La [operación Core](docs/CORE-HARDENING-OPERATIONS.md), [matriz de modelos heredados](docs/MASTER-DATA-MODEL-MATRIX.md) y [QA actual](docs/QA-VERIFICATION.md) contienen los pasos, evidencia y límites vigentes. El [informe de auditoría anterior](docs/ERP-SOFTWARE-AUDIT-REPORT.md) es histórico. La credencial MongoDB que estuvo en el historial de Git debe rotarse antes de desplegar.

## Instalación y desarrollo

Requisitos: Node.js y npm compatibles con las dependencias del lockfile; ejecución verificada con Node 24.21.0. MongoDB de desarrollo para usar la API. Ejecuta desde la raíz de este repositorio:

```powershell
npm ci --include=dev
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Edita .env con tu base de desarrollo y dos secretos JWT aleatorios y distintos.
npm run build
npm run backend:dev
```

En otra terminal:

```powershell
npm run web:dev
```

Web: http://127.0.0.1:5173. API: http://127.0.0.1:3000/api/v1. Vite envía /api al backend mediante proxy; no hace falta publicar las credenciales de MongoDB en el frontend. VITE_API_BASE_URL permite cambiar la URL pública de la API. CORS_ORIGIN debe coincidir con el origen real cuando se accede directamente entre orígenes.

.env permanece local e ignorado; .env.example contiene valores ficticios que deben reemplazarse. En producción se validan secretos JWT distintos, de al menos 32 caracteres, sin marcadores de ejemplo. El servidor no está preparado para arrancar con los valores ficticios.

Para crear una cuenta de desarrollo, configura SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD (mínimo 12 caracteres, máximo 72 bytes UTF-8, mayúsculas, minúsculas y números) y ejecuta:

```powershell
npm run db:seed -w backend
```

El seed crea empresa, sucursal, rol empresarial y administrador; excluye permisos de plataforma y rechaza NODE_ENV=production. No crea productos ni stock y no fue ejecutado contra una instalación existente.

## Estructura y arquitectura

```text
apps/web/              entrada web y pruebas Playwright
apps/mobile/           entrada React Native y preview web con Vite
backend/src/           rutas, middleware, servicios, repositorios y modelos
backend/tests/         Jest, Supertest y MongoDB temporal
packages/api-client/   contratos HTTP, refresh y sesión en memoria
packages/session/      AuthProvider compartido
packages/ui/           tokens, logo, layout, pantallas y componentes
packages/types/        tipos y catálogo de permisos
docs/                  auditoría, estado, arquitectura, seguridad y QA
patches/               compatibilidad Metro / image-size
```

Frontend → REST /api/v1 → Express → controladores → servicios/repositorios → Mongoose → MongoDB. Auth/Users siguen esas capas; Roles/Companies/Branches aún consultan modelos desde controladores. Consulta [arquitectura real](docs/architecture/ARCHITECTURE.md).

## UI / Branding

El logo oficial de castor, baúl y cerradura conserva su proporción cuadrada. Se optimizó a PNG de 512 × 512 para UI y 128 × 128 para favicon. ERPLogo ofrece tamaños sm, md y lg. El activo compartido está en packages/ui/src/assets/logo/logo.png.

El design system centraliza #602CF5, fondos claros, tarjetas blancas, bordes, estados, tipografía, radios y espaciado. Web y Mobile usan la misma aplicación, sesión, login, dashboard y pantalla de usuarios. Desktop tiene sidebar fija; tablet, sidebar compacta; móvil, navegación inferior y menú de módulos. Los cortes son 768 y 1100 píxeles.

El dashboard prepara siete KPI y cinco categorías de gráficas. Muestra “Próximamente” cuando el backend responde 501; no presenta ceros ni tendencias ficticias. Productos, clientes e inventario muestran su disponibilidad real.

![Dashboard de escritorio en entorno de pruebas](docs/qa/screenshots/dashboard-desktop.png)

[Login desktop](docs/qa/screenshots/login-desktop.png) · [Dashboard móvil](docs/qa/screenshots/dashboard-mobile.png) · [Formulario móvil](docs/qa/screenshots/user-form-mobile.png)

Las capturas usan una empresa y cuentas ficticias almacenadas únicamente en MongoDB temporal de QA. Son evidencia de interfaz, no datos productivos.

## Seguridad y API

- JWT de acceso y refresh con tipo y sid; sesión activa comprobada en cada petición.
- Refresh rotatorio mediante actualización atómica de un documento; logout revoca ambos tokens.
- RBAC vigente consultado en backend, aislamiento por empresa y referencias de rol/sucursal validadas.
- Permisos platform.* requieren una cuenta de plataforma aprovisionada fuera de la API empresarial.
- Tokens frontend solo en memoria: recargar o cerrar la app exige iniciar sesión de nuevo.
- Auditoría redactada; la persistencia de eventos aún es de mejor esfuerzo.

Rutas reales: /auth/login, /auth/refresh, /auth/logout, /users, /roles, /companies y /branches. Listados: {success, data, pagination}. Errores: {success:false, error:{code,message}}. Los módulos pendientes responden 501 NOT_IMPLEMENTED después de autenticación.

GET /health comprueba Express; no acredita que MongoDB esté disponible. No hay recuperación de contraseña ni MFA funcionales.

## Pruebas y builds

```powershell
npm run build
npm run lint
npm run format:check
npm run test -- --runInBand --silent
npm run test:unit -- --runInBand --silent
npm run test:integration -- --runInBand --silent
npm run test:e2e
```

El build raíz compila paquetes/backend y genera bundles web de ambas apps; no produce APK/IPA. El preview móvil se inicia con npm run mobile:web. El host Android de React Native vive en apps/mobile/android; iOS aún no tiene proyecto nativo.

## Android Studio / Android Emulator

La app usa React Native 0.73.11 y la plantilla Android de esa versión: Gradle 8.3, AGP 8.1.1, Kotlin 1.8.0, compileSdk/targetSdk 34 y minSdk 21. Usa **JDK 17** para Gradle (Android Studio > Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK). En este equipo funcionó `%USERPROFILE%\.jdks\jbr-17.0.14`. Android SDK Platform 34, Build Tools 34.0.0, Platform Tools y Emulator están instalados. El NDK 25.1.8937393 está declarado, pero el build debug no lo requirió.

Abre `apps/mobile/android` en Android Studio y deja terminar Gradle Sync. En Tools > Device Manager crea un Pixel 7 u 8 con una imagen Android API 34 y arráncalo. Desde la raíz del repositorio, ejecuta en terminales separadas:

```powershell
npm ci
npm run build:packages
npm run backend:build
npm run backend:dev
npm run mobile:start
npm run mobile:android
```

Configura antes el `.env` local con una base de desarrollo y secretos reales, y crea una cuenta de desarrollo según la sección de instalación. También puedes usar Run en Android Studio con Metro activo. El Android Emulator alcanza el backend del equipo en `http://10.0.2.2:3000/api/v1`; el preview web conserva su proxy `/api/v1`. En un teléfono físico, abre **Servidor de desarrollo** en el login debug y escribe `http://IP_LAN_DEL_PC:3000/api/v1`. El PC y el teléfono deben compartir red. HTTP local se permite únicamente en la variante debug. La variante release requiere una URL HTTPS real y firma privada antes de distribuirse.

Para compilar directamente: `cd apps/mobile/android; .\gradlew.bat assembleDebug`. El APK debug debe verificarse en `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` antes de instalarlo con `adb install -r`. Si Metro no conecta, comprueba el puerto 8081; si la API no conecta, comprueba el backend en el puerto 3000 y `10.0.2.2`. Consulta la [guía Android](docs/mobile/ANDROID-SETUP.md) para arquitectura, Logcat, dispositivo físico y problemas frecuentes.

**Android:** el [reporte local del 2026-10-01](docs/mobile/ANDROID-LOCAL-DEPLOYMENT-REPORT.md) verifica CLI y CLI Android 12.3.7, `gradlew clean`, `assembleDebug`, APK debug de 55,510,714 bytes y Metro con JDK 17/SDK. Este checkout no conserva el APK y no se repitió la compilación nativa aquí. AVD, login/logout y Logcat siguen `NOT_TESTED / BLOCKED_EXTERNAL`; release `NOT_READY`.

Para preparar E2E la primera vez:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) 'node_modules/.cache/ms-playwright'
npx playwright install chromium
node backend/scripts/cache-test-mongo.cjs
npm run build
npm run test:e2e
```

Los servidores E2E usan puertos 3081, 4173 y 4174 y una base efímera aislada. No usan la URI Atlas de .env. npm install aplica el parche Metro que permite image-size 2.0.4; una prueba carga el logo mediante el lector real de assets.

Resultados y límites: [verificación](docs/QA-VERIFICATION.md), [estrategia QA](docs/qa/QA-STRATEGY.md), [seguridad](docs/security/SECURITY.md), [dependencias](docs/qa/DEPENDENCY-AUDIT.md).

## Continuación

[Estado por módulo](docs/DEVELOPMENT-STATUS.md) y [siguiente fase](docs/NEXT-STEPS.md). El código de Master Data permanece bloqueado hasta completar QA Core y gates externos. Después: Categories → Units → Customers → Suppliers → Warehouses → Products.
