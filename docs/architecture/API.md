# API REST: contrato real

Actualizado: 2026-09-28. Base /api/v1. Atlas y despliegue no fueron verificados.

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

Listado: {success:true,data:[],pagination:{page,limit,total,pages}}. Recurso individual: {success:true,data:resource}. No interpretar una página vacía como placeholder: el Core consulta datos reales.

## Errores

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Descripción segura" } }
```

HTTP 400 validación/JSON inválido, 401 autenticación/sesión, 403 permiso, 404 recurso inexistente/fuera de empresa, 409 duplicados, 413 cuerpo demasiado grande, 429 límite y 500 interno sin stack. La información detallada de DB no se devuelve.

## Negocio pendiente

/customers, /suppliers, /categories, /units, /products, /warehouses, /inventory, /sales, /purchases, /finance, /reports, /hr, /projects, /crm, /notifications y /settings están bloqueados para cualquier método después de autenticación.

```json
{ "success": false, "error": { "code": "NOT_IMPLEMENTED", "message": "Módulo en desarrollo" } }
```

HTTP 501 no es CRUD ni éxito. No existe un endpoint operativo de movimientos de stock, facturación o reporte por aparecer en documentación antigua. [Estado actual](../DEVELOPMENT-STATUS.md).
