# Verificación de calidad

Actualizado: 2026-09-24. Este documento registra resultados ejecutados, no aprobación de producción.

| Comando o comprobación | Resultado |
| --- | --- |
| `npm install` | PASS |
| `npm run build` | PASS: paquetes compartidos y backend |
| `npm run lint` | PASS: 0 errores, 235 advertencias |
| `npm run test -- --runInBand --silent` | PASS: 4 suites, 27 pruebas |
| TypeScript web y mobile | FAIL: archivos, contexto, tema y configuración incompletos |
| Conexión MongoDB real | NO VERIFICADO |

Las pruebas cubren autenticación, expiración/revocación/rotación de refresh, RBAC, validaciones y aislamiento de Users, Roles, Companies y Branches mediante mocks. No verifican índices, transacciones, migración ni persistencia MongoDB. Ningún módulo tiene estado QA_APPROVED.

Pendiente antes de aprobar el núcleo: pruebas de integración con MongoDB de desarrollo, migración de índices/documentos históricos, revisión de 235 advertencias y verificación del despliegue. Los módulos heredados de negocio devuelven 501 autenticado hasta que tengan implementación y pruebas.
