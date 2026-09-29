# Estado de desarrollo del ERP

Actualizado: 2026-09-29. Fuente canónica: [ERP SOFTWARE AUDIT REPORT](ERP-SOFTWARE-AUDIT-REPORT.md). Los estados se refieren al alcance real, no al número de archivos.

**CURRENT PHASE: CORE HARDENING. NEXT PHASE: MASTER DATA HARDENING.** Las pruebas reales del Core ya pasaron; faltan rotación histórica, migración, auditoría durable y entorno de producción. Ningún módulo está QA_APPROVED.

| Área                     | Estado              | Implementado                                               | Verificado / pendiente                                                              |
| ------------------------ | ------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Architecture             | IN_PROGRESS         | Monorepo, paquetes UI/sesión/API y build de apps           | Build completo; controladores Core aún mezclan capas                                |
| MongoDB                  | IN_TESTING          | Pool/timeouts/cierre/config por entorno                    | Mongo temporal e índices; Atlas/migración pendientes                                |
| Auth / Sessions          | IN_TESTING          | Login, JWT sid/type, refresh CAS, logout y revocación      | Mongo real, concurrent refresh y cliente probados; fallos multioperación pendientes |
| Users                    | IN_TESTING          | CRUD API y pantalla real, scope empresa, validación refs   | Persistencia/tenant/RBAC; migración histórica pendiente                             |
| Roles / Permissions      | IN_TESTING          | CRUD, catálogo, protección plataforma                      | Denegaciones, sistema/tenant y permisos vigentes probados                           |
| Companies                | IN_TESTING          | Empresa propia y creación reservada plataforma             | Scope/cambios/desactivación probados; provisioning operativo pendiente              |
| Branches                 | IN_TESTING          | CRUD empresarial y protección de usuarios activos          | Referencias e índices probados; alcance sucursal completo pendiente                 |
| Audit                    | CORRECTION_REQUIRED | Eventos Core y redacción                                   | Persistencia/redacción probadas; pérdida de eventos posible ante fallo              |
| Categories               | CORRECTION_REQUIRED | Modelo heredado, 501                                       | Falta companyId efectivo y CRUD real                                                |
| Units                    | CORRECTION_REQUIRED | Modelo heredado, 501                                       | Falta companyId efectivo y CRUD real                                                |
| Customers                | CORRECTION_REQUIRED | Modelo heredado, 501                                       | Falta companyId efectivo y CRUD real                                                |
| Suppliers                | CORRECTION_REQUIRED | Modelo heredado, 501                                       | Falta companyId efectivo y CRUD real                                                |
| Warehouses               | CORRECTION_REQUIRED | Modelo heredado, 501                                       | Faltan companyId/branchId efectivos y CRUD real                                     |
| Products                 | CORRECTION_REQUIRED | Modelo heredado, 501                                       | Falta companyId efectivo, refs/costos/unidades y CRUD real                          |
| Inventory                | CORRECTION_REQUIRED | Bloqueo 501                                                | Sin libro de movimientos ni concurrencia verificada                                 |
| Sales                    | CORRECTION_REQUIRED | Bloqueo 501                                                | Sin flujo quote/order/delivery/invoice/AR                                           |
| Purchases                | CORRECTION_REQUIRED | Bloqueo 501                                                | Sin flujo request/approval/order/reception/AP                                       |
| Finance                  | CORRECTION_REQUIRED | Bloqueo 501                                                | Sin pagos/AR/AP/conciliación fiable                                                 |
| Reports                  | PLANNED             | Contenedor visual de métricas/gráficas                     | Backend 501, no datos ficticios                                                     |
| HR / Projects / CRM      | PLANNED             | Modelos parciales y bloqueos 501                           | Requisitos/tenant/servicios pendientes                                              |
| Settings / Notifications | PLANNED             | Estados de indisponibilidad                                | Sin funcionalidad real habilitada                                                   |
| UI / Web                 | IN_TESTING          | Design system, logo, layout/login/dashboard/usuarios       | Bundle y E2E en escritorio/tablet/móvil                                             |
| Mobile preview           | IN_TESTING          | Misma aplicación con entrada propia                        | Bundle y Chromium; no acredita native                                               |
| Mobile native            | IN_TESTING          | Host Android RN 0.73, Metro monorepo, branding y API debug | Gradle/AVD y login real pendientes de verificación; firma release pendiente         |
| Security                 | CORRECTION_REQUIRED | Revocación, RBAC, redacción y .env fuera de Git            | Rotación histórica y 7 alertas moderadas abiertas                                   |
| QA                       | IN_PROGRESS         | Jest/MongoDB/Playwright y capturas                         | 69 + 15 tests; migración, audit-failure/native/CI pendientes                        |

## Verificación ejecutada

- npm install: exit 0 y parche Metro aplicado.
- npm run build: exit 0, paquetes/backend/bundles web de ambas apps.
- npm run lint: exit 0, 0 errores y 163 advertencias.
- npm run format:check (2026-09-29): exit 1 por 171 archivos fuera de formato en el repositorio; los archivos de código y documentación editados en esta fase pasaron un chequeo dirigido.
- npm run test: 8 suites, 69 tests correctos.
- npm run test:unit (verificación anterior): 34 tests correctos, incluidos dentro de los 69.
- npm run test:integration (verificación anterior): 35 tests correctos, 31 con MongoDB temporal real.
- npm run test:e2e (verificación anterior): 15 tests Chromium correctos en tres tamaños.
- npm audit (verificación anterior): 7 moderadas; 0 altas/críticas; exit 1.

Resultados de formato y evidencia detallada: [QA-VERIFICATION](QA-VERIFICATION.md). No se ejecutó conexión Atlas, migración productiva, APK/IPA ni cobertura global.

## Criterio de promoción

IMPLEMENTED no equivale a VERIFIED ni a QA_APPROVED. La aprobación requiere requisitos completos, casos negativos, pruebas de tenant/RBAC, integridad, errores, build y documentación; no admite stubs/TODO funcionales pendientes. Un test de respuesta 501 acredita que el bloqueo es honesto, no que el módulo funcione.

## Android Native Bootstrap

**Estado: IN_TESTING.** El host Android está integrado en `apps/mobile/android` y registra `ERPApplication` desde la entrada React Native. La configuración de Metro observa el monorepo y resuelve React y React Native desde la instalación raíz. El emulador usa `10.0.2.2` solo en debug y el manifest debug limita HTTP sin cifrar a ese host. Logo, icono y splash derivan del activo compartido. La versión release todavía requiere URL HTTPS real y firma privada. El build Gradle, la ejecución en AVD y el flujo de login se reportan por separado en la guía Android; la existencia de archivos no acredita QA.

Metro generó el bundle Android y copió activos. `assembleDebug` quedó **ANDROID_BUILD_NOT_VERIFIED** porque este equipo tiene JBR 25 y un SDK sin plataforma/build tools 34 ni NDK requerido; no hubo ejecución en AVD. Consulta [ANDROID-SETUP](mobile/ANDROID-SETUP.md).
