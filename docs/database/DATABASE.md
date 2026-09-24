# Modelo de datos y base de datos

## 1. Objetivo

Definir la base de datos del ERP como un sistema multiempresa, multisucursal, con trazabilidad, auditoría y operación por movimientos. La base de datos debe soportar crecimiento y complejidad sin sacrificar integridad.

## 2. Motor principal

- MongoDB Atlas
- Mongoose como ODM
- Estructura de documentos orientada a negocio, no a CRUD simple
- Uso de relaciones por referencias y, cuando sea apropiado, embeddings para estructuras pequeñas y estables

## 3. Principios de diseño

- companyId obligatorio en entidades relevantes.
- branchId cuando la entidad pertenece a una sucursal.
- warehouseId cuando el dato tiene relación con almacén.
- status para mantener registros históricos sin eliminación física.
- createdAt, updatedAt, createdBy, updatedBy en entidades relevantes.
- auditLogs centralizados para todos los eventos críticos.

## 4. Colecciones propuestas

### 4.1 Core / seguridad
- users
- roles
- permissions
- companies
- branches
- systemSettings
- auditLogs
- notifications

### 4.2 Catálogos
- customers
- suppliers
- products
- categories
- units
- warehouses

### 4.3 Operaciones
- inventoryMovements
- quotes
- salesOrders
- salesOrderItems
- purchaseOrders
- purchaseOrderItems
- invoices
- payments
- accountsReceivable
- accountsPayable

### 4.4 Administración
- employees
- projects
- tasks

## 5. Modelo multiempresa

Las colecciones empresariales deben implementar aislamiento por tenant.

Ejemplo de patrón:

{
  companyId: "company_123",
  branchId: "branch_456",
  warehouseId: "warehouse_789",
  status: "active",
  createdAt: "ISODate",
  updatedAt: "ISODate"
}

Esto permite:
- Segregar datos por empresa.
- Restricción de acceso por contexto.
- Validación de permisos según empresa y sucursal.

## 6. Relaciones y decisiones importantes

### 6.1 Usuarios y roles
- users: referencia a roles y compañías.
- roles: contienen permisos o referencias a permissions.
- permissions: identificadores de acceso, por ejemplo ventas.ver, inventario.ajustar.

### 6.2 Empresas y sucursales
- companies contiene la compañía matriz.
- branches pertenece a una empresa.
- warehouses pertenece a una empresa y puede derivarse de branch.

### 6.3 Productos e inventario
- products almacena el catálogo base.
- inventoryMovements registra cada movimiento físico.
- El stock no se actualiza como valor único sin historial.

### 6.4 Ventas
- quotes: cotización.
- salesOrders: pedido.
- salesOrderItems: líneas del pedido.
- invoices: factura.
- accountsReceivable: cartera por cobrar.

### 6.5 Compras
- purchaseOrders: orden de compra.
- purchaseOrderItems: líneas de compra.
- accountsPayable: obligaciones por pagar.

## 7. Inventario y trazabilidad

El inventario debe seguir el patrón:

Producto
↓
InventoryMovement
↓
Entrada / Salida / Transferencia / Ajuste / Devolución

Cada movimiento debe registrar:
- productoId
- companyId
- warehouseId
- branchId
- type
- quantity
- unitPrice
- referenceType
- referenceId
- createdBy
- timestamp
- reason

Esto permite reconstruir el historial de existencias y no depender de un stock mutable a ciegas.

## 8. Auditoría

La colección auditLogs debe observarse como una fuente de evidencia administrativa.

Campos mínimos:
- userId
- companyId
- module
- action
- entity
- entityId
- oldValue
- newValue
- timestamp
- ip
- device

Debe capturarse especialmente en:
- Login y logout
- Cambios de permisos
- Creación y modificación de usuarios
- Ventas, compras, inventario y finanzas
- Cancelaciones y cambios de configuración

## 9. Índices recomendados

Se recomienda crear índices para:
- companyId
- branchId
- warehouseId
- status
- createdAt
- updatedAt
- email + companyId en users
- code + companyId en products, customers, suppliers
- productId + warehouseId en inventoryMovements
- referenceType + referenceId en movimientos
- entity + companyId en auditLogs

### Ejemplos
- users: { companyId: 1, email: 1 }
- products: { companyId: 1, code: 1 }
- inventoryMovements: { companyId: 1, productId: 1, createdAt: -1 }
- salesOrders: { companyId: 1, status: 1, createdAt: -1 }

## 10. Integridad y consistencia

### 10.1 Eliminación física
Se evitará la eliminación de registros históricos. Se usarán estados como:
- active
- inactive
- cancelled
- draft

### 10.2 Transacciones
Se evaluarán transacciones de MongoDB cuando se produzcan cambios cruzados entre varias colecciones, por ejemplo:
- Venta con inventario, factura y cuenta por cobrar.
- Compra con recepción, factura y cuenta por pagar.

No se usarán transacciones de forma indiscriminada; solo cuando el negocio requiera consistencia fuerte.

### 10.3 Concurrencia
Se debe proteger la integridad de stock cuando dos usuarios intenten vender el mismo artículo al mismo tiempo. La solución adecuada incluye:
- validación del stock en backend,
- actualizaciones atómicas,
- control de concurrencia a nivel de operación,
- generación de movimientos seguros.

## 11. Consultas frecuentes esperadas

- Listado de productos por empresa y categoría.
- Inventario por almacén.
- Pedidos por estado y cliente.
- Facturas por empresa y rango de fechas.
- Cuentas por cobrar/pagar pendientes.
- Operaciones de auditoría por usuario y fecha.

## 12. Recomendación final

El modelo de datos debe sostener el ERP como un sistema de procesos y trazabilidad, no como un CRUD aislado. La base del diseño es la separación clara por empresa, sucursal, almacén y movimiento histórico, asegurando integridad, auditoría y capacidad de expansión.
