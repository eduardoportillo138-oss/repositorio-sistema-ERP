# Próximos pasos

## 1. CORE HARDENING

- [x] Reparar imports, exports y errores TypeScript del backend y del paquete Types.
- [x] Sustituir UUID por ObjectId en validación de rutas MongoDB.
- [x] Implementar Auth, repositorio de usuarios, refresh/logout persistidos y permisos vigentes por rol.
- [x] Implementar operaciones base de Users, Roles, Companies y Branches con `companyId` del token.
- [x] Integrar auditoría del núcleo con redacción de secretos.
- [ ] Ejecutar suite HTTP/CRUD contra MongoDB **de prueba**, sin tocar Atlas productivo.
- [ ] Probar índices, transacciones donde procedan, expiración de sesiones y aislamiento entre empresas con datos persistidos.
- [ ] Migrar datos históricos: índice global de email, Roles y Branches sin `companyId`.
- [ ] Revisar estrategia de auditoría ante fallo de escritura (actualmente mejor esfuerzo).
- [ ] Verificar configuración de producción, instalación reproducible y despliegue.

## 2. MASTER DATA HARDENING

Revisar individualmente Customer, Supplier, Category, Unit, Product y Warehouse. Añadir `companyId` obligatorio, índices por empresa, repositorios, controladores reales, validación y pruebas entre empresas. Las rutas actuales devuelven 501 hasta que cada módulo pase su revisión.

## 3. INVENTORY

Empezar cuando Products, Warehouses y el Core estén estables. Corregir cálculo de stock, movimientos, concurrencia y pruebas.

## 4. Fases posteriores

Sales → Purchases → Finance → Dashboard & Reports → HR / Projects / CRM → Mobile & Native Integrations.

No marcar QA_APPROVED sin código real, build, tests, RBAC, aislamiento, errores y documentación verificados.
