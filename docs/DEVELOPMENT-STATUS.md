# Estado de desarrollo del ERP

Actualizado: 2026-09-24. Los estados reflejan código y verificación observados, no la cantidad de archivos creados.

## Resumen

| Área | Estado | Motivo |
| --- | --- | --- |
| Infraestructura y TypeScript | IN_PROGRESS | Instalación reproducible y build del backend verificados; faltan despliegue y base de datos real. |
| Auth | IN_TESTING | Login bcrypt, JWT, refresh rotatorio, logout y sesiones hash; pruebas con mocks. |
| Users | IN_TESTING | CRUD acotado por empresa, permisos, desactivación y auditoría; faltan pruebas MongoDB reales. |
| Roles / Permissions | IN_TESTING | CRUD de roles y catálogo compartido; falta verificación de índices y datos históricos. |
| Companies / Branches | IN_TESTING | Operaciones reales y alcance empresarial; falta integración MongoDB. |
| Audit | IN_TESTING | Registra acciones del núcleo y redacta secretos; escritura de mejor esfuerzo. |
| Customers / Suppliers / Categories / Products / Warehouses | CORRECTION_REQUIRED | Modelos y controladores heredados no garantizan CRUD ni aislamiento empresarial. |
| Inventory / Sales / Purchases / Finance | CORRECTION_REQUIRED | Controladores y reglas de negocio incompletos. |
| Reports / HR / Projects / CRM | PLANNED | Sin funcionalidad verificada. |
| Web / Mobile | IN_PROGRESS | Estructuras parciales; la compilación TypeScript de ambas apps falla por archivos/contextos faltantes. |

Ningún módulo está marcado QA_APPROVED.

## Hallazgos iniciales

- Auth tenía búsquedas que devolvían `null`, refresh sin persistencia y logout sin revocación.
- Users y Companies devolvían listas/objetos vacíos como éxito.
- `packages/types/src/index.ts` exportaba una ruta inexistente.
- TypeScript fallaba por imports, tipos ObjectId/string y validadores UUID.
- La documentación declaraba aprobados módulos con placeholders.
- `.gitignore` excluía `package-lock.json`; el `.env` versionado tenía una URI potencialmente sensible, sustituida por ejemplo seguro.

## Núcleo implementado en esta fase

- `createApp()` no conecta base ni abre puerto; `server.ts` hace arranque y cierre.
- Auth consulta MongoDB por repositorio, valida contraseña y estado, resuelve rol/empresa y almacena hash de refresh token en `sessions`.
- El access token lleva `userId`, `companyId` y `roleId`; el middleware consulta el estado y los permisos actuales.
- Users, Roles, Companies y Branches tienen rutas con permisos, validación ObjectId y consultas empresariales.
- Las rutas de módulos heredados devuelven 501 autenticado hasta que se corrijan.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| TypeScript backend | PASS: `tsc --noEmit`, 0 errores tras los cambios. |
| Instalación | PASS: `npm install` desde el lockfile generado. |
| Build raíz | PASS: paquetes compartidos y backend con `npm run build`; no incluye las apps. |
| Lint | PASS: 0 errores y 235 advertencias heredadas con `npm run lint`. |
| Tests | PASS: 4 suites, 27 pruebas, 0 fallidas con `npm run test -- --runInBand --silent`. Persistencia simulada. |
| Web / Mobile TypeScript | FAIL: faltan pantallas, contexto, tema y ajustes de imports/rootDir. |
| MongoDB | Configuración revisada. Conexión no verificada; no se usó una base productiva. |

## Riesgos y trabajo pendiente

1. Probar Auth/CRUD/índices/aislamiento con MongoDB de prueba. Los mocks no prueban persistencia ni índices.
2. Migrar índices globales de email y documentos Role/Branch existentes sin `companyId` antes de desplegar.
3. Revisar todos los modelos de catálogos y añadir `companyId`, validación e índices correctos.
4. Sustituir controladores heredados con stubs por servicios y pruebas reales; mantener 501 hasta entonces.
5. Validar web/mobile y configurar sus dependencias de ejecución.

La próxima fase sigue siendo **CORE HARDENING** hasta cerrar las pruebas con MongoDB y migración. Después corresponde **MASTER DATA HARDENING**.
