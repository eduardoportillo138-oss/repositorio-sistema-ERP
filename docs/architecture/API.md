# API REST: contrato real

Actualizado: 2026-10-07. Base /api/v1. Las pruebas automatizadas usan MongoDB aislado;
Atlas y despliegue no fueron verificados para los módulos nuevos.

## Autenticación

Login/refresh son públicos y están sujetos al limitador. Logout requiere access válido y refresh actual. Las rutas de negocio requieren Authorization: Bearer <accessToken>. GET /health es público y comprueba HTTP, no readiness de MongoDB.

| Endpoint           | Entrada / resultado                                                                |
| ------------------ | ---------------------------------------------------------------------------------- |
| POST /auth/login   | email, password, companyId opcional; obligatorio para email ambiguo entre empresas |
| POST /auth/refresh | refreshToken actual; rotación de un solo uso                                       |
| POST /auth/logout  | refreshToken actual + access válido; revoca la sesión                              |

Login/refresh retornan {success:true,data:{accessToken,refreshToken,user}}. user es identidad pública con empresa/rol/permisos vigentes, sin hash. Tokens con sid/tipo; la API consulta la sesión activa. Un logout con access vencido debe renovar primero y enviar el refresh recién recibido.

## Core disponible

| Recurso    | Operaciones reales                                      | Scope                                            |
| ---------- | ------------------------------------------------------- | ------------------------------------------------ |
| /users     | GET listado/ID, POST, PUT/PATCH ID, PATCH ID/deactivate | Empresa autenticada                              |
| /roles     | GET listado/ID, POST, PUT/PATCH ID, PATCH ID/deactivate | Empresa; sin platform.* en roles empresariales   |
| /branches  | GET listado/ID, POST, PUT/PATCH ID, PATCH ID/deactivate | Empresa; guardas de referencias/usuarios activos |
| /companies | GET listado/ID, POST, PUT/PATCH ID, PATCH ID/deactivate | Empresa propia; POST requiere plataforma         |

Cada operación valida su permiso específico en backend. IDs son ObjectId. El listado Companies no es un catálogo global; retorna la propia empresa. Aprovisionamiento de plataforma ocurre fuera del CRUD empresarial.

## Catálogo e inventario

`/customers`, `/suppliers`, `/categories`, `/units`, `/products` y
`/warehouses` ofrecen GET listado/ID, POST, PUT/PATCH ID y PATCH
`/:id/deactivate`, con filtro por empresa, permisos y auditoría. Los listados
aceptan `page`, `limit` (máximo 100), `search` y `status`. Productos usan
`priceMinor`, `costMinor` y `taxRateBps` enteros; `stockCurrent` no se escribe.

| Endpoint | Permiso | Resultado |
| --- | --- | --- |
| GET `/inventory` | `inventory.view` | Productos y existencias, con `page`, `limit`, `search`, `warehouseId` |
| GET `/inventory/product/:productId` | `inventory.view` | Total y desglose por almacén |
| GET `/inventory/movements` | `inventory.view` | Historial paginado; filtra `productId`, `warehouseId`, `type` |
| POST `/inventory/adjustments` | `inventory.adjust` | Movimiento `INITIAL`, `ADJUSTMENT_IN` o `ADJUSTMENT_OUT` |
| POST `/inventory/transfers` | `inventory.transfer` | Par atómico `TRANSFER_OUT` + `TRANSFER_IN` |

Los ajustes envían `productId`, `warehouseId`, `direction` (`initial`, `in`,
`out`), `quantityMilli` y `reason`. Las transferencias envían `productId`,
`fromWarehouseId`, `toWarehouseId`, `quantityMilli` y `reason`. Una unidad
equivale a 1000 milésimas. `notes` es opcional. El backend también acepta
`quantity` decimal de hasta tres posiciones como alternativa a
`quantityMilli`. No se permite actualizar un saldo directamente.

Movimientos nuevos se confirman dentro de una transacción MongoDB con auditoría.
Una salida insuficiente devuelve 409 con código `INVENTORY_INSUFFICIENT`.
Datos históricos ambiguos devuelven 409 hasta su conciliación; véase
[diseño de inventario](INVENTORY.md).

Listado: {success:true,data:[],pagination:{page,limit,total,pages}}. Recurso individual: {success:true,data:resource}. No interpretar una página vacía como placeholder: el Core consulta datos reales.

## Errores

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Descripción segura" } }
```

HTTP 400 validación/JSON inválido, 401 autenticación/sesión, 403 permiso, 404 recurso inexistente/fuera de empresa, 409 duplicados, 413 cuerpo demasiado grande, 429 límite y 500 interno sin stack. La información detallada de DB no se devuelve.

## Negocio pendiente

`/sales`, `/purchases`, `/finance`, `/reports`, `/hr`, `/projects`, `/crm`,
`/notifications` y `/settings` aún responden 501 tras autenticación.

```json
{ "success": false, "error": { "code": "NOT_IMPLEMENTED", "message": "Módulo en desarrollo" } }
```

HTTP 501 no es CRUD ni éxito. [Estado actual](../DEVELOPMENT-STATUS.md).
