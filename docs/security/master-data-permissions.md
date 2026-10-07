# Permisos de datos maestros

Los permisos nuevos son `categories.view/create/edit/disable`,
`units.view/create/edit/disable` y `warehouses.view/create/edit/disable`.
La misma migración concede `inventory.transfer` al administrador empresarial.
También añade `sales.confirm`, `sales.cancel`, `purchases.confirm` y
`purchases.cancel` para los flujos transaccionales, `finances.view` y
`finances.create` para consultar cuentas y registrar pagos, además de los
permisos de HR, proyectos, CRM, reportes, ajustes y notificaciones.
Los roles existentes no los reciben al
desplegar código. El rol administrador empresarial debe actualizarse mediante
la migración explícita, sin ejecutar bootstrap otra vez.

Después de compilar el backend, identificar el `companyId`, el `roleId` del
administrador y el `actorId` de un usuario activo que pertenezca a ese rol.
El rol debe tener `roles.manage` y `users.view`, y no contener `platform.*`.
Revisar primero el informe:

```powershell
node backend/dist/utils/grant-master-data-permissions.js --dry-run COMPANY_ID ROLE_ID ACTOR_ID
```

Si los IDs y los permisos faltantes son correctos, ejecutar:

```powershell
node backend/dist/utils/grant-master-data-permissions.js --apply COMPANY_ID ROLE_ID ACTOR_ID
```

La operación añade únicamente permisos faltantes de categorías, unidades,
almacenes, transferencia de inventario, confirmación/cancelación de órdenes,
finanzas, HR, proyectos, CRM, reportes, ajustes y notificaciones.
usa una transacción con auditoría y puede repetirse sin duplicar permisos.
No crea usuarios ni modifica contraseñas. Las sesiones ya existentes consultan
el rol en cada petición, por lo que los permisos nuevos quedan disponibles sin
reemitir credenciales.

## Índices de productos antes de desplegar el catálogo

La versión anterior declaraba índices únicos globales `sku_1` y `barcode_1`,
y uno `sku_1_companyId_1` que trataba los SKU ausentes como `null`. Esos índices
impiden crear más de un producto sin SKU o código de barras. La API nueva usa
`code` como identificador obligatorio y conserva SKU/código de barras opcionales.
Antes de desplegar la API de productos en una base existente, respaldar la
colección y revisar:

```powershell
node backend/dist/utils/migrate-product-indexes.js --dry-run
```

El reporte debe mostrar `unscoped: 0` y ambos contadores de duplicados en
cero. Revisar los índices que retirará y después ejecutar explícitamente:

```powershell
node backend/dist/utils/migrate-product-indexes.js --apply
```

La migración crea primero índices únicos parciales por empresa para SKU y
código de barras, y después retira únicamente los tres índices únicos
heredados conocidos. Si encuentra productos sin `companyId` o duplicados,
aborta antes de modificar índices. No modifica documentos ni ejecuta bootstrap.

## Índice de preferencias por empresa

El modelo de ajustes exige `companyId` en las nuevas preferencias. Antes de
desplegarlo sobre una base existente, inspecciona documentos heredados y claves
duplicadas con:

```powershell
node backend/dist/utils/migrate-setting-index.js --dry-run
```

Si `unscoped` y `duplicateGroups` son cero, crea el índice único con:

```powershell
node backend/dist/utils/migrate-setting-index.js --apply
```

La migración no asigna empresas a ajustes heredados ni los borra; requiere
revisión manual si encuentra alguno.
