# Próximos pasos

Actualizado: 2026-09-28. **CURRENT PHASE: CORE HARDENING. NEXT PHASE: MASTER DATA HARDENING.**

## 1. Cerrar CORE HARDENING

- [x] Inspeccionar repo real, contratos, modelos, queries y estado anterior.
- [x] Reparar compilación web/mobile y build completo.
- [x] Sesiones persistidas, refresh atómico, logout y revocación de access.
- [x] Bloquear escalada de administrador empresarial a plataforma.
- [x] Verificar CRUD Core, RBAC, aislamiento A/B e índices con MongoDB real temporal.
- [x] Implementar refresh del cliente, sesiones en memoria y errores reales.
- [x] Redactar auditoría/logs; quitar .env y artefactos generados de tracking.
- [x] Sustituir éxitos ficticios por 501.
- [x] Integrar logo, design system, login, layout, dashboard y QA responsive.
- [ ] Rotar credenciales expuestas en el historial y revisar accesos a Atlas. Coordinar limpieza histórica después de rotar; no tratarla como revocación.
- [ ] Inventario de datos antiguos, backup, dry run, migración idempotente y rollback. Revisar email global, Roles/Branches sin empresa, duplicados y referencias cruzadas.
- [ ] Garantizar evento de auditoría junto con cambio de negocio mediante transacción/outbox. Probar fallo de DB, recuperación y reintentos sin duplicación.
- [ ] Verificar índices/configuración/TLS/backups y cierre en el entorno objetivo, sin publicar secretos.
- [ ] Migrar dependencias nativas para resolver la cadena fast-xml-parser con pruebas de compatibilidad.
- [ ] Automatizar CI y revisar cobertura; resolver deuda de 163 advertencias.

La promoción se mantiene bloqueada por secretos históricos, migración y auditoría durable. Las pruebas de MongoDB y aislamiento sobre una base limpia ya no son un pendiente.

## 2. MASTER DATA HARDENING

Orden: Categories → Units → Customers → Suppliers → Warehouses → Products.

Para cada catálogo: definir campos y estados; añadir companyId requerido y referencias válidas; diseñar índices empresariales; migrar existentes; repositorio con tenant obligatorio; service con reglas; controlador y RBAC; eventos durables; pruebas de CRUD real/duplicados/errores/A-B; UI con loading/error/empty. Eliminar 501 solo del módulo aprobado para habilitación.

Warehouse debe validar sucursal de la empresa. Products debe validar categoría/unidad y reglas de costo/precio/decimales. No agregar un stock mutable como fuente de verdad.

## 3. INVENTORY

Iniciar tras Products/Warehouses y Core estables. Libro de movimientos ENTRY, EXIT, TRANSFER, ADJUSTMENT y RETURN; empresa/sucursal/almacén; idempotencia, saldo derivado, consistencia de transferencias y control concurrente. Probar stock insuficiente, referencias cruzadas, devoluciones y reintentos. Nunca basar el mecanismo principal en product.stock = nuevoStock.

## 4. SALES

Customer → Quote → Sales Order → Inventory Validation → Delivery → Invoice → Accounts Receivable → Payment.

Definir estados/transiciones, reservas/salida de inventario, impuestos/totales en backend, cancelaciones, cuentas por cobrar e idempotencia. No implementar antes de inventario confiable.

## 5. PURCHASES

Supplier → Request → Approval → Purchase Order → Reception → Invoice → Accounts Payable → Payment.

Recepción debe originar movimientos de entrada; validación de documentos, aprobación, costos, recepción parcial y cancelaciones trazables.

## 6. FINANCE

AR/AP, pagos, gastos, ingresos y movimientos de caja. Manejo explícito de moneda/precisión, conciliación, reversos y consistencia con ventas/compras. Pruebas de fallos y dobles pagos.

## 7. DASHBOARD & REPORTS

La presentación base ya está disponible. Agregar agregaciones tenant-scoped sobre datos fiables, ventanas/zonas horarias, filtros y permisos. Sustituir “Próximamente” solo al conectar cada dato real. Probar acceso y exactitud contable.

## 8. HR / PROJECTS / CRM

Primero requisitos, estados y pertenencia empresarial. Evitar habilitar modelos heredados sin scope. CRM alimentará leads únicamente cuando el flujo real exista.

## 9. MOBILE & NATIVE INTEGRATIONS

Mantener paridad visual/funcional del preview. Crear proyectos Android/iOS y pipeline, almacenamiento seguro de tokens, URL por entorno, splash/icono y pruebas en dispositivo. Integraciones nativas requieren SDK, permisos y firma definidos. No utilizar el éxito del browser preview como evidencia de release nativo.
