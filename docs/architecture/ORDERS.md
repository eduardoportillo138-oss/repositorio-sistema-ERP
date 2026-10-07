# Ventas y compras

Actualizado: 2026-10-07. Implementación local probada con MongoDB temporal;
no se ha activado en Atlas.

## Dinero

Los precios, costos, descuentos, impuestos y totales se guardan en centavos
enteros. Las cantidades se guardan en milésimas de unidad. El backend
redondea cada subtotal de línea al centavo más cercano (mitades hacia
arriba), aplica el descuento y redondea el impuesto de esa línea. Luego suma
líneas con `BigInt` y comprueba que el resultado cabe en un entero seguro.
No acepta subtotales ni totales del cliente. El precio de venta y la tasa de
impuesto quedan fijados al guardar el borrador desde el catálogo vigente;
el costo de compra puede ser negociado y se valida como centavos enteros.

## Estados y efectos

Venta: `draft → confirmed → cancelled` o `draft → cancelled`. Confirmar
comprueba cliente, almacén y productos activos del mismo tenant, bloquea
productos en orden estable, comprueba stock en ese mismo almacén y escribe
movimientos `SALE`. Cancelar una venta confirmada agrega movimientos
`RETURN`; no borra la venta ni sus salidas. Solo se edita un borrador.

Compra: `draft → received → cancelled` o `draft → cancelled`. Confirmar
recepción valida proveedor, almacén y productos activos y escribe movimientos
`PURCHASE`. Cancelar una compra recibida exige saldo suficiente para retirar
las cantidades originales; registra `ADJUSTMENT_OUT` referenciado a la
compra. Si la mercancía ya se consumió, devuelve 409 y conserva la compra
recibida para un procedimiento manual. Solo se edita un borrador.

Cada transición y sus movimientos se guardan en una transacción MongoDB con
auditoría. `companyId` se deriva de la sesión. Dos confirmaciones
concurrentes del mismo producto usan el bloqueo `stockRevision`; la segunda
venta con saldo insuficiente falla sin escribir movimientos.

`BUSINESS_RULE_PENDING`: una compra recibida cuya mercancía ya fue vendida
necesita una política empresarial explícita de devolución, nota de crédito o
corrección. Esta versión bloquea su cancelación para evitar stock negativo.
El tratamiento fiscal y contable de documentos confirmados requiere reglas
locales específicas antes de emitir comprobantes oficiales.
