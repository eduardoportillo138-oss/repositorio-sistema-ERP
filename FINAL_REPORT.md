# CORE HARDENING REPORT

Actualizado: 2026-09-24. Este informe sustituye el reporte anterior, que declaraba el ERP completo y varios módulos QA_APPROVED sin evidencia.

## Estado real

| Área | Estado | Evidencia y límite |
| --- | --- | --- |
| Auth | IN_TESTING | Login, JWT, refresh rotatorio y logout con sesión persistida; pruebas con mocks, sin MongoDB real. |
| Users | IN_TESTING | CRUD, aislamiento empresarial, permisos, desactivación y auditoría; falta integración MongoDB. |
| Roles / Permissions | IN_TESTING | CRUD y catálogo central; requieren migración y prueba de índices reales. |
| Companies / Branches | IN_TESTING | Operaciones empresariales reales; falta integración MongoDB. |
| Audit | IN_TESTING | Eventos del núcleo con redacción; escritura de mejor esfuerzo. |
| Catálogos | CORRECTION_REQUIRED | Modelos y controladores heredados incompletos; rutas 501. |
| Inventario, Ventas, Compras, Finanzas | CORRECTION_REQUIRED | Reglas y persistencia no verificadas; rutas 501. |
| HR, Proyectos, Reportes, CRM | PLANNED | Sin flujo funcional verificado. |
| Web / Mobile | IN_PROGRESS | TypeScript falla por archivos y configuraciones faltantes. |

Ningún módulo está QA_APPROVED.

## Verificación

- `npm install`: PASS.
- `npm run build`: PASS para paquetes compartidos y backend; las apps no forman parte del script.
- `npm run lint`: PASS con 0 errores y 235 advertencias.
- `npm run test -- --runInBand --silent`: PASS, 4 suites y 27 pruebas.
- MongoDB real: NO VERIFICADO; las pruebas usan mocks.
- Compilación TypeScript aislada de web/mobile: FAIL.

## Riesgos y siguiente fase

No desplegar el núcleo sin probarlo con una base MongoDB de prueba y sin migrar los índices de email y los documentos históricos de Role/Branch al alcance por empresa. El siguiente trabajo es cerrar CORE HARDENING y después avanzar a MASTER DATA HARDENING.

Ver [README.md](README.md) y [docs/DEVELOPMENT-STATUS.md](docs/DEVELOPMENT-STATUS.md).
