# ERP CORE HARDENING FINAL AUDIT

Fecha: 2026-10-02. Base inspeccionada: `868518619e030976d4f6fe4131eb6df28ccf5b45` en `main`. Estado: **CORE_HARDENING_CODE_COMPLETE / EXTERNAL_GATES_PENDING**. Esta fase no habilita Master Data. Ver [QA actual](QA-VERIFICATION.md) y [operación Core](CORE-HARDENING-OPERATIONS.md).

| Area          | Before                                                 | Change                                                   | Verification                                              | Status                     |
| ------------- | ------------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------- | -------------------------- |
| Environment   | JWT_SECRET duplicado; MONGODB_URI ausente en plantilla | Plantilla corregida y flags marcadas como reservadas     | Sanity test; `.env` ignorado y sin tracking               | COMPLETE                   |
| Render        | `npm ci` podía omitir patch-package                    | `npm ci --include=dev`; build backend acotado            | Build local completo; deploy real pendiente               | CONFIGURED                 |
| MongoDB       | Core probaba Mongo standalone temporal                 | Tests usan replica set para transacciones                | 40 tests de integración                                   | TEMP_VERIFIED              |
| Auth          | Sesiones con auditoría best effort                     | Login, refresh y logout transaccionales                  | Integración y E2E                                         | CODE_COMPLETE              |
| Sessions      | CAS/revocación sin auditoría atómica                   | Sesión y evento en misma transacción                     | Concurrent refresh, logout y revocación                   | CODE_COMPLETE              |
| RBAC          | `User.permissions` duplicaba autoridad                 | Schema/seed/repository sin override; Role manda          | Test histórico y migración idempotente                    | CODE_COMPLETE              |
| Audit         | Error de AuditLog se silenciaba                        | Fallo cerrado, evento UUID único, transacción            | Rollback, retry, no duplicado y tenant                    | CODE_COMPLETE              |
| Migrations    | Sin herramienta de inspección                          | Dry-run/apply seguro para permisos heredados             | Test dry-run/apply; Atlas no tocado                       | PREPARED                   |
| Web           | Build local sensible a OneDrive                        | Vite runner y URL por entorno                            | Build, sentinel Vite, 15 E2E                              | VERIFIED_LOCAL             |
| Android       | Documentos mezclaban estados                           | Estado reciente reportado separado de AVD                | RN/CLI/Gradle/SDK inspeccionados; APK no recompilado aquí | BUILD_REPORTED_VERIFIED    |
| CI            | Sin workflow                                           | Core CI con Node de `.node-version`                      | Archivo presente; ejecución remota pendiente              | CONFIGURED                 |
| Security      | `.env` histórico expuesto                              | Ignorado, sin tracking; secretos redactados en auditoría | Comprobación Git y búsqueda por nombre de archivo         | EXTERNAL_ROTATION_REQUIRED |
| QA            | Fechas/resultados contradictorios                      | Evidencia única 2026-10-02                               | 77 Jest, 15 E2E, build/lint/formato exit 0                | PASS_LOCAL                 |
| Documentation | Android/Prettier desactualizados                       | Estado, despliegue, QA, matriz y guía Core actualizados  | Revisión estática y Prettier                              | COMPLETE                   |
| Master Data   | Schemas sin tenant efectivo                            | Matriz de 16 modelos; rutas 501 conservadas              | Tests 501                                                 | BLOCKED_501                |

## FILES MODIFIED

- Configuración y CI: `.env.example`, `render.yaml`, `.github/workflows/ci.yml`, `apps/web/package.json`, `apps/mobile/package.json`, ambos `vite.config.ts`, `apps/web/playwright.config.ts` y `scripts/run-e2e.cjs`.
- Backend Core: `backend/package.json`, `backend/scripts/serve-qa.cjs`, `backend/src/config/database.ts`, controladores Auth/Branch/Company/Role, modelos AuditLog/User, repositorio User, rutas, servicios Audit/Auth/User, `backend/src/services/auditedMutation.ts`, seed, bootstrap y migraciones.
- Tests: `backend/tests/integration/mongodb.integration.test.ts`, `backend/tests/unit/core.test.ts`, `backend/tests/unit/hardening-config.test.ts`.
- Documentos: `README.md`, `docs/DEPLOYMENT-RENDER.md`, `docs/DEVELOPMENT-STATUS.md`, `docs/ERP-SOFTWARE-AUDIT-REPORT.md`, `docs/NEXT-STEPS.md`, `docs/QA-VERIFICATION.md`, `docs/qa/DEPENDENCY-AUDIT.md`, `docs/mobile/ANDROID-LOCAL-DEPLOYMENT-REPORT.md`, esta auditoría, [guía de operación](CORE-HARDENING-OPERATIONS.md) y [matriz](MASTER-DATA-MODEL-MATRIX.md).

## COMMANDS EXECUTED / TEST RESULTS

| Comando                                                            | Resultado final                                                                                 |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `git status`, `git branch --show-current`, `git log -10 --oneline` | `main`, base `8685186`, limpio al iniciar                                                       |
| `git check-ignore .env`, `git ls-files .env`                       | Ignorado, no versionado                                                                         |
| `npm run build`                                                    | exit 0                                                                                          |
| `npm run lint`                                                     | exit 0, 175 warnings                                                                            |
| `npm run format:check`                                             | exit 0                                                                                          |
| `npm run test -- --runInBand --silent`                             | exit 0, 77/77                                                                                   |
| `npm run test:unit -- --runInBand --silent`                        | exit 0, 37/37                                                                                   |
| `npm run test:integration -- --runInBand --silent`                 | exit 0, 40/40                                                                                   |
| `npm run test:e2e`                                                 | exit 0, 15/15                                                                                   |
| `npm audit`                                                        | Bloqueado: endpoint inaccesible en sandbox y consulta externa rechazada por revisión automática |

## OPEN EXTERNAL GATES

1. `EXTERNAL_ROTATION_REQUIRED`: rotar/revocar credencial Atlas expuesta históricamente y revisar accesos.
2. Backup comprobado, dry-run, revisión manual, apply y postvalidación sobre datos reales de Atlas.
3. Validar Render/Atlas/CORS, bootstrap de instalación nueva y `/ready` bajo desconexión/reconexión.
4. Observar CI remoto y completar auditoría npm actual si se autoriza consulta externa.
5. Ejecutar Android en AVD y probar login, logout y Logcat; release/dispositivo físico siguen pendientes.

## SECURITY FINDINGS

`.env` continúa presente localmente, ignorado y fuera de Git; no se leyó ni eliminó. `.jks`, `.keystore`, `.apk`, `.aab` y `local.properties` están ignorados. La búsqueda de patrones de URI entre archivos del proyecto señaló solo la plantilla y tests con valores ficticios. El historial Git no fue reescrito. La rotación Atlas no puede declararse resuelta. Conteos actuales de `npm audit` (critical/high/moderate/low): **no verificados**; el reporte de siete moderadas es histórico. React Native 0.73.11 y CLI 12.3.7 se conservaron.

## MIGRATION STATUS

`db:core-migrate -- --dry-run` informa permisos heredados, roles/sucursales sin companyId, email unique global, índices incompatibles, duplicados y referencias cross-tenant. `--apply` solo elimina `users.permissions` mediante `$unset` idempotente; no modifica Atlas automáticamente ni inventa companyId. Requiere backup → dry-run → validación → apply → postvalidación → plan de rollback. Casos ambiguos: `MANUAL_REVIEW_REQUIRED`.

## ANDROID STATUS

La evidencia reciente aportada al encargo reporta React Native CLI 12.3.7, autolinking, JDK 17, SDK, Gradle clean, `assembleDebug`, APK debug y Metro completados. Este checkout no tiene el APK generado y no se repitió la compilación nativa. AVD, ejecución real, login/logout, Logcat y teléfono físico: `NOT_TESTED / BLOCKED_EXTERNAL`; release: `NOT_READY`. No se declara `ANDROID_LOCAL_READY`.

## NEXT PHASE DECISION

**READY_FOR_MASTER_DATA_HARDENING** para el código Core verificado localmente, sujeto a los gates externos antes de producción. No se implementaron Categories ni otros catálogos. Orden posterior: Categories → Units → Customers → Suppliers → Warehouses → Products → Inventory → Sales → Purchases → Finance.
