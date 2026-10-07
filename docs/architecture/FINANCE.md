# Finanzas: primera versión

Una venta confirmada genera una cuenta por cobrar y una compra recibida una
cuenta por pagar si el total es mayor que cero. La cuenta, el movimiento de
inventario, la transición de orden y su auditoría se confirman en una sola
transacción. Los importes son enteros en centavos (`*Minor`), y los índices
únicos por empresa y orden evitan cuentas duplicadas.

Un pago actualiza saldo y estado y crea su comprobante y auditoría en la misma
transacción. Un pago mayor al saldo se rechaza. La escritura versionada de la
cuenta evita que dos solicitudes simultáneas gasten el mismo saldo. La UI
compartida permite listar, filtrar, ver detalle y registrar pagos. La API nunca
acepta `companyId` del cliente.

Una cuenta con pagos impide cancelar la orden; una cuenta pendiente sin pagos
se marca `cancelled` junto con la reversión de inventario. Los documentos
históricos de las colecciones heredadas usan importes decimales y carecen de
tenant fiable. Antes de habilitar en una base existente, ejecutar la inspección
de solo lectura:

```powershell
node backend/dist/utils/inspect-finance-legacy.js
```

Si `safeToEnable` es falso, se requiere conciliación supervisada. No se
convierte un monto heredado ni se le atribuye empresa automáticamente.

`BUSINESS_RULE_PENDING`: vencimientos y condiciones de crédito, conciliación
bancaria, devoluciones de pagos, facturación fiscal e integración contable.
Los pagos registrados no se eliminan desde esta versión.
