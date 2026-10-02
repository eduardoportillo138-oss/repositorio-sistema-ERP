# Operación de Core Hardening

Actualizado: 2026-10-02. El código Core exige MongoDB con transacciones (Atlas o replica set). MongoDB standalone no puede garantizar atomicidad entre negocio y auditoría; las escrituras críticas fallan cerradas en ese entorno. `/health` es liveness y `/ready` devuelve 503 si Mongoose pierde conexión. Render conserva `/health` como health check hasta validar el despliegue real.

## Variables y banderas

`.env.example` contiene únicamente valores ficticios. `.env` está ignorado y no se versiona. `VITE_API_BASE_URL` es público y se incorpora al bundle Vite; nunca colocar URI MongoDB, JWT ni contraseñas en variables `VITE_*`.

`ENABLE_MULTI_COMPANY`, `ENABLE_BRANCHES`, `ENABLE_WAREHOUSES` y `ENABLE_MFA` están **reservadas**: hoy se parsean en configuración pero ningún consumidor runtime cambia comportamiento con ellas. Multiempresa y sucursales Core funcionan según RBAC y tenant aunque las banderas sean `false`; Warehouses sigue 501; MFA no está implementado. Mantener `false` hasta diseñar y probar su semántica. Ningún despliegue debe interpretarlas como control de acceso.

## Primer administrador de producción

El seed continúa exclusivo de desarrollo. Antes del bootstrap, configurar MongoDB, secretos JWT y CORS de producción en el entorno seguro del operador. La base Core debe estar vacía. Crear backup/snapshot de Atlas y verificar su restauración. Configurar por canal seguro:

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD` (mínimo 12 caracteres, mayúscula, minúscula, dígito y máximo 72 bytes UTF-8)
- `BOOTSTRAP_COMPANY_NAME`
- `BOOTSTRAP_COMPANY_TAX_ID`
- `BOOTSTRAP_COMPANY_COUNTRY`
- `BOOTSTRAP_BRANCH_NAME` (opcional, por defecto `Principal`)
- `BOOTSTRAP_BRANCH_ADDRESS`
- `BOOTSTRAP_BRANCH_CITY`

Ejecutar una sola vez desde la raíz, con acceso temporal a la base y un MongoDB replica set:

```sh
npm ci --include=dev
npm run build:packages
npm run backend:build
npm run db:bootstrap-admin -w backend
```

El comando rechaza datos Core existentes y una segunda ejecución. Empresa, sucursal, rol, usuario, marca de bootstrap y auditoría se confirman juntos en una transacción. El rol excluye `platform.*`; el usuario no recibe `isPlatformAdmin`. La contraseña no se imprime. Retirar las variables `BOOTSTRAP_*` tras completar el comando y verificar login. Si el proceso falla, inspeccionar el estado antes de repetir; una transacción abortada no deja documentos parciales.

## Migración de datos Core

No ejecutar `--apply` sobre Atlas sin autorización operativa, backup reciente y revisión de dry-run. El comando no inventa `companyId` ni elimina índices. Revisa: `User.permissions`, roles/sucursales sin empresa, índices globales incompatibles, duplicados dentro de tenant y referencias User→Role/Branch fuera de tenant.

```sh
npm run backend:build
npm run db:core-migrate -w backend -- --dry-run
# Tras backup y revisión del informe:
npm run db:core-migrate -w backend -- --apply
npm run db:core-migrate -w backend -- --dry-run
```

El informe usa IDs de muestra, no credenciales. `--apply` únicamente hace `$unset` idempotente de `users.permissions`, campo histórico sin autoridad de autorización. `Role.permissions` es la única autoridad RBAC; middleware y login recargan el rol vigente. Los hallazgos `MANUAL_REVIEW_REQUIRED` se resuelven caso por caso antes de crear o retirar índices. Para rollback, restaurar el snapshot probado o los documentos afectados desde un export seguro; no reconstruir permisos de usuario como autoridad. Registrar conteos e IDs antes/después.

## Auditoría

Cada escritura crítica de Auth/Sessions, Users, Roles, Companies y Branches se guarda en una transacción con un `AuditLog` del mismo tenant. `eventId` UUID tiene índice único. Los reintentos transitorios de la transacción conservan el mismo ID; si falla auditoría, la operación de negocio se revierte y puede reintentarse. `oldValue` y `newValue` se redactan recursivamente. No existen operaciones Core con éxito silencioso tras un fallo de auditoría. La auditoría conserva su TTL actual de siete años; confirmar política de retención con el negocio antes de producción.

## Gates externos

- Rotar y revocar la credencial Atlas presente históricamente: `EXTERNAL_ROTATION_REQUIRED`.
- Backup, dry-run y validación de índices/datos en Atlas; no ejecutados automáticamente.
- Probar despliegue Render y `/ready` con pérdida/reconexión MongoDB.
- Ejecutar app Android en AVD, probar login/logout y Logcat; un APK por sí solo no valida estos flujos.
