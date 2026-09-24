# Decisiones Arquitectónicas (ADR)

## ADR-001: Zustand vs Redux Toolkit
**Decisión:** Zustand
**Contexto:** Se necesita un estado global para el ERP con múltiples módulos.
**Opciones:** Zustand, Redux Toolkit, MobX, Recoil
**Seleccionada:** Zustand
**Motivo:** Menor boilerplate, API más simple, excelente rendimiento con selectors.
**Consecuencias:** Menos código de configuración, menos middleware disponible.

## ADR-002: JWT vs Sessions con Redis
**Decisión:** JWT + Refresh Token
**Contexto:** Autenticación para API REST.
**Opciones:** JWT, Sessions con Redis, OAuth2
**Seleccionada:** JWT con refresh token
**Motivo:** Escalable, stateless, compatible con microservicios.

## ADR-003: Repository Pattern
**Decisión:** Repository base simplificado
**Contexto:** Persistencia de datos con Mongoose.
**Seleccionada:** Repository base con métodos comunes
**Motivo:** Reduce duplicación en queries, facilita testing.

## ADR-004: MongoDB Transactions
**Decisión:** Selectivo, no indiscriminado
**Contexto:** Operaciones multi-documento como ventas.
**Seleccionada:** Transacciones solo cuando hay consistencia crítica
**Motivo:** Las transacciones MongoDB tienen overhead. Se usarán para ventas completas.

## ADR-005: Stock por Movimientos
**Decisión:** Inventario basado en movimientos
**Contexto:** Evitar manipulación directa de stock.
**Seleccionada:** Cada stock cambia mediante InventoryMovement
**Motivo:** Trazabilidad completa, prevención de stock negativo, auditoría.

## ADR-006: Monorepo con Workspaces
**Decisión:** npm workspaces
**Contexto:** Compartir código entre frontend y backend.
**Seleccionada:** Monorepo con npm workspaces
**Motivo:** Paquetes compartidos, versión consistente.

## ADR-007: Valores Monetarios
**Decisión:** Decimal128 de MongoDB
**Contexto:** Evitar floats para cálculos financieros.
**Seleccionada:** Tipo Number en Mongoose
**Motivo:** Precisión decimal para operaciones financieras.

## ADR-008: Eliminación Lógica
**Decisión:** status = active/inactive/cancelled
**Contexto:** Preservar historial empresarial.
**Seleccionada:** Eliminación lógica mediante campo status
**Motivo:** Información fiscal debe preservarse.

## ADR-009: Separación Frontend/Backend
**Decisión:** API REST estricta
**Contexto:** React Native y Web no acceden a MongoDB.
**Seleccionada:** Toda comunicación vía /api/v1/
**Motivo:** Seguridad, escalabilidad.

## ADR-010: TypeScript Compartido
**Decisión:** packages/types para contratos
**Contexto:** Tipos compartidos entre frontend y backend.
**Seleccionada:** Paquete @erp/types
**Motivo:** Evitar desalineación de tipos, single source of truth.
