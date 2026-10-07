# Ledger de inventario

Actualizado: 2026-10-07.

El saldo se calcula de `inventoryMovements` confirmados, por producto y almacén.
Los movimientos nuevos guardan cantidades enteras en `quantityMilli` (1000
milésimas por unidad) y conservan `quantity` decimal para compatibilidad con
datos anteriores. `stockCurrent` del producto nunca se actualiza. Un aumento
usa `INITIAL`, `PURCHASE`, `ADJUSTMENT_IN`, `TRANSFER_IN` o `RETURN`; una
disminución usa `SALE`, `ADJUSTMENT_OUT` o `TRANSFER_OUT`.

El servicio bloquea el documento del producto mediante `stockRevision` antes
de calcular y escribir saldo en una transacción MongoDB. Las operaciones
concurrentes sobre un producto se serializan; ante conflicto transitorio el
driver reintenta la transacción. Un ajuste de salida comprueba existencias
en el mismo almacén. La transferencia comprueba origen y escribe salida y
entrada con el mismo `referenceId` en una sola transacción. La auditoría se
confirma junto con esos movimientos. No se permite saldo negativo.

`INITIAL` solo se admite si el producto no tiene movimientos anteriores en
ese almacén. Los productos y almacenes deben estar activos y pertenecer a la
empresa del usuario; cada almacén debe tener sucursal válida. La API deriva
`companyId` de la sesión y rechaza el valor enviado en el cuerpo.

## Conciliación de datos históricos

Los tipos antiguos `entry`, `exit` y `return` tienen dirección inequívoca y
se leen como entrada, salida y entrada. Los tipos `transfer` y `adjustment`
antiguos no indican dirección; el saldo y los movimientos nuevos para el
producto afectado responden 409. También se bloquea un producto cuyo
`stockCurrent` heredado sea distinto de cero, porque no se puede inferir si
ese valor ya está representado en el ledger. No se convierte ese campo a
movimientos automáticamente.

`BUSINESS_RULE_PENDING`: antes de habilitar inventario de esos productos en
Atlas, el negocio debe confirmar almacén de origen, dirección y cantidad de
cada movimiento ambiguo, y si `stockCurrent` representa un saldo inicial o
un valor ya incluido en movimientos. La conciliación debe tener respaldo,
revisión humana y auditoría. La API no inventa existencias ni ejecuta una
migración destructiva.
