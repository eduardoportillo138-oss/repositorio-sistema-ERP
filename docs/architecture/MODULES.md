# Estado de módulos del ERP

Actualizado: 2026-09-24. Esta tabla registra funcionalidad verificada, no la presencia de archivos.

| Módulo | Estado | Nota |
| --- | --- | --- |
| Auth | IN_TESTING | Login, refresh, logout y sesiones; sin prueba MongoDB real. |
| Users | IN_TESTING | CRUD y aislamiento por empresa; pruebas con mocks. |
| Roles / Permissions | IN_TESTING | CRUD y catálogo de permisos; falta migración de datos. |
| Companies / Branches | IN_TESTING | CRUD empresarial; falta prueba MongoDB real. |
| Audit | IN_TESTING | Eventos del núcleo; escritura de mejor esfuerzo. |
| Customers / Suppliers / Categories / Products / Warehouses | CORRECTION_REQUIRED | Persistencia, validación y alcance empresarial por corregir. |
| Inventory / Sales / Purchases / Finance | CORRECTION_REQUIRED | Reglas y flujos por implementar/verificar. |
| HR / Projects / Reports / CRM | PLANNED | Sin funcionalidad verificada. |
| Web / Mobile | IN_PROGRESS | Estructura parcial; TypeScript falla. |

Las rutas heredadas de negocio responden 501 tras autenticación. Ningún módulo está QA_APPROVED. Véanse [DEVELOPMENT-STATUS.md](../DEVELOPMENT-STATUS.md) y [NEXT-STEPS.md](../NEXT-STEPS.md).
