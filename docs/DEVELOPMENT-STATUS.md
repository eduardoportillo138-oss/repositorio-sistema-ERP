# Estado de desarrollo del ERP

## Incremento local del 2026-10-07

Clientes, proveedores, categorías, unidades, productos y almacenes tienen API,
cliente tipado e interfaz compartida con CRUD, RBAC, auditoría, aislamiento de
empresa y pruebas. Inventario tiene ledger de movimientos, ajustes y
transferencias atómicas, interfaz compartida y pruebas de concurrencia. La
suite local pasó 20 suites y 144 pruebas; 39 E2E de catálogo, inventario y
órdenes pasaron en tamaños desktop, tablet y móvil. `assembleDebug` produjo un APK
debug. Los flujos nativos todavía requieren prueba en dispositivo.

Ventas y compras ya tienen borradores, confirmación/cancelación transaccional,
interfaz compartida y pruebas de integración/E2E. Finanzas conecta cuentas y
pagos enteros a ambas órdenes con bloqueo de cancelación tras pagar; el flujo
web/móvil pasó E2E en tres tamaños. HR, proyectos y CRM tienen workflows,
RBAC, auditoría, UI compartida y pruebas de integración/E2E. Reportes usa
agregaciones reales con filtro tenant, notificaciones se limitan al usuario y
empresa, y ajustes guarda idioma, zona horaria y formato de fecha por empresa.
La fase F pasa cinco pruebas de integración y tres E2E nuevos (desktop, tablet
y móvil). Las notificaciones pueden consultarse y marcarse como leídas; los productores automáticos de notificaciones
siguen pendientes. Los builds de paquetes y backend pasan. Atlas y el despliegue
real no se han modificado.
La migración controlada de índices de productos y permisos nuevos debe
revisarse antes de activar los módulos en producción. Véanse
[permisos](security/master-data-permissions.md) e
[inventario](architecture/INVENTORY.md).
Settings añade una nueva migración `db:settings-index` (`--dry-run`/`--apply`);
debe revisarse junto con los índices heredados antes de desplegar.

## Corte anterior

Actualizado: 2026-10-02. Commit base inspeccionado: `8685186`. **CURRENT PHASE: CORE HARDENING. Estado: `CORE_HARDENING_CODE_COMPLETE`, `EXTERNAL_GATES_PENDING`.** El cierre productivo requiere los gates externos descritos abajo.

| Área                                                  | Estado                     | Evidencia / pendiente                                                                                                                                                                              |
| ----------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture                                          | CODE_COMPLETE              | REST `/api/v1` → Express → servicios/repositorios → Mongoose; frontend sin MongoDB directo.                                                                                                        |
| MongoDB                                               | TEMP_VERIFIED              | Replica set temporal 7.0.24 verificó transacciones; Atlas no verificado.                                                                                                                           |
| Auth / Sessions                                       | CODE_COMPLETE              | Login, refresh, logout y revocación con auditoría atómica; integración Mongo y unitarias pasaron.                                                                                                  |
| Users / Roles / Companies / Branches                  | CODE_COMPLETE              | Mutaciones y auditoría atómicas; tenant, RBAC y rutas Core probados con Mongo temporal.                                                                                                            |
| RBAC                                                  | CODE_COMPLETE              | `Role.permissions` única autoridad; `User.permissions` eliminado del schema y preparado para migración idempotente.                                                                                |
| Audit                                                 | CODE_COMPLETE              | `AuditLog.eventId` único y fallo cerrado; rollback, retry y aislamiento probados en replica set temporal.                                                                                          |
| Migration                                             | PREPARED                   | `--dry-run`/`--apply` para `User.permissions`; no se ejecutó en Atlas. Hallazgos sin companyId y cross-tenant requieren revisión manual.                                                           |
| Web                                                   | VERIFIED_LOCAL             | Vite usa `VITE_API_BASE_URL` con fallback `/api/v1`; build y 15 E2E pasaron.                                                                                                                       |
| Render                                                | CONFIGURED                 | Backend instala devDependencies para patch-package/TypeScript; despliegue real pendiente. `/health` es liveness y `/ready` es readiness.                                                           |
| Android                                               | BUILD_VERIFIED             | El 2026-10-02 se repitieron `npm ci`, Gradle clean y assembleDebug en el clon del Escritorio; APK debug verificado. Sync de Android Studio, AVD/login/logout/Logcat no probados; release no listo. |
| Security                                              | EXTERNAL_ROTATION_REQUIRED | `.env` ignorado y fuera de tracking; credencial Atlas histórica aún requiere rotación/revocación confirmada.                                                                                       |
| CI                                                    | CONFIGURED                 | `.github/workflows/ci.yml` ejecuta build, lint, formato y Jest; resultado remoto pendiente.                                                                                                        |
| Master Data / Inventory / Sales / Purchases / Finance | BLOCKED_501                | Rutas permanecen `501 NOT_IMPLEMENTED`; ver [matriz](MASTER-DATA-MODEL-MATRIX.md).                                                                                                                 |

La [verificación QA actual](QA-VERIFICATION.md) registra comandos y exit codes de esta fecha: 77 Jest y 15 E2E. `npm audit` no pudo completarse por bloqueo de revisión automática a la consulta externa; los conteos actuales no están verificados. Los resultados de 2026-09-28/29 en el [informe anterior](ERP-SOFTWARE-AUDIT-REPORT.md) son `HISTORICAL RESULT`.

## Android

La configuración actual usa React Native 0.86.3, React 19.2.3, CLI 20.1.0, Gradle 9.3.1, AGP 8.12.0, Kotlin 2.1.20, JDK 17, compile/target SDK 36 y min SDK 24. El [informe de migración](mobile/ANDROID-STANDALONE-16KB-MIGRATION-REPORT.md) registra el APK local y las pruebas en emuladores de 4 y 16 KB. El [reporte de recuperación del plugin](mobile/ANDROID-GRADLE-PLUGIN-RECOVERY-REPORT.md) registra el diagnóstico posterior del clon del Escritorio. `ANDROID_STUDIO_SYNC_READY` espera Sync manual con JDK 17; teléfono físico, API real y autenticación siguen pendientes.
