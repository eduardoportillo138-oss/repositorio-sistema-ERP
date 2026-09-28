# Estado de módulos

Actualizado: 2026-09-28. La matriz vigente está en [DEVELOPMENT-STATUS](../DEVELOPMENT-STATUS.md) y en [ERP SOFTWARE AUDIT REPORT](../ERP-SOFTWARE-AUDIT-REPORT.md).

Auth, Users, Roles, Companies y Branches tienen operaciones reales y pruebas con MongoDB temporal. Continúan IN_TESTING por migración, integridad de auditoría y verificación de entorno pendientes. Audit está CORRECTION_REQUIRED por persistencia de mejor esfuerzo.

Categories, Units, Customers, Suppliers, Warehouses y Products requieren corrección de schemas, tenant y CRUD. Inventory, Sales, Purchases y Finance no tienen flujos habilitados. Reports, HR, Projects y CRM están PLANNED. Todos esos endpoints devuelven 501 después de autenticación.

La interfaz web y el preview móvil tienen build y E2E en tres tamaños; el release Android/iOS no fue probado. Ningún módulo está QA_APPROVED. El [roadmap](../NEXT-STEPS.md) mantiene las dependencias entre fases.
