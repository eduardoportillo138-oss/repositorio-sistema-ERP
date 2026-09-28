# Seguridad del ERP

Actualizado: 2026-09-28. Estado global CORRECTION_REQUIRED; véase [informe](../ERP-SOFTWARE-AUDIT-REPORT.md).

## Exposición histórica: acción externa requerida

.env salió del tracking y permanece local/ignorado. .env.example es ficticio. Revisiones cec3053 y d8a63aa contienen credenciales MongoDB de apariencia real. No se reproducen aquí.

Rotar las credenciales afectadas, revisar accesos y permisos Atlas y las copias donde se distribuyeron. Rotar también cualquier otro secreto que se confirme expuesto. La validez actual de esos valores no fue comprobada. Quitar .env del estado actual no borra Git ni revoca credenciales. La limpieza coordinada del historial ocurre después de la rotación; no se realizó en esta ejecución.

## Controles implementados y probados

- Login bcrypt con usuario/rol/empresa activos; costo configurable 10–15.
- Política API: mínimo 8 caracteres, mayúsculas/minúsculas/números y máximo 72 bytes UTF-8; seed requiere además mínimo 12.
- Access/refresh JWT HS256, tipo explícito, sid/jti y secretos independientes.
- Refresh almacenado solo como hash SHA-256 y rotado mediante CAS atómico.
- Toda petición valida sesión/identidad actual; logout y desactivaciones revocan sesiones.
- RBAC backend por rol vigente. isPlatformAdmin inmutable + permiso platform.* para acciones de plataforma; la API empresarial no aprovisiona esa marca.
- Queries Core scoped por empresa y referencias de rol/sucursal del mismo tenant.
- Validación de IDs/campos/paginación, errores normalizados y duplicados 409.
- Helmet, rate limiting y CORS con origen configurado.
- Logs y auditoría redactan secretos, URI MongoDB, JWT y Bearer recursivamente.
- Server/seed/conexión no imprimen errores completos con credenciales.
- Producción exige secretos >=32 caracteres y rechaza ejemplos; autoIndex desactivado.

Los tokens se devuelven únicamente en las respuestas de autenticación autorizadas para establecer/renovar la sesión. Ninguna respuesta devuelve passwordHash. No confundir la emisión legítima de tokens con filtrarlos en logs o respuestas de negocio.

## Sesión frontend

Tokens y usuario se guardan solo en memoria, sin localStorage/AsyncStorage simulado. Recargar o reiniciar requiere login. Refresh comparte una promesa concurrente y solo reintenta una vez. Una respuesta de una generación antigua no restaura una sesión cerrada.

Logout intenta revocar remotamente; con access vencido obtiene un nuevo refresh y revoca el actual. Si falla la red, se borra la sesión local y se informa el error, sin prometer revocación remota. Almacenamiento seguro Keychain/Keystore es trabajo futuro.

## Auditoría

Se registran eventos del Core con empresa, actor, acción y entidad; se redactan valores sensibles antes de persistir. Consultas exigen companyId. La escritura es best effort: si falla, la operación puede continuar sin evento. Este riesgo impide una declaración de auditabilidad productiva. Requiere outbox/transacción, recuperación y pruebas de fallo.

## Módulos y migración

Dieciséis schemas empresariales aún carecen de companyId efectivo. Están contenidos por endpoints 501 y no deben habilitarse hasta migrar y probar aislamiento. Datos históricos del Core e índices globales tampoco fueron migrados.

No existe un control completo de alcance por sucursal/almacén, recuperación de contraseña ni MFA funcional; los flags de configuración no acreditan implementación.

## Dependencias y operación

npm audit: 7 moderadas, 0 altas/críticas; detalle en [DEPENDENCY-AUDIT](../qa/DEPENDENCY-AUDIT.md). Parche Metro/image-size instalado y probado. Requiere seguimiento y migración de React Native compatible.

No se verificaron TLS del despliegue, redes/roles de Atlas, backups, restauración, pentest, HA ni secretos del entorno productivo. Antes de desplegar: rotación histórica, migración controlada, auditoría durable, índices y configuración del entorno. Nunca adjuntar URI completa, .env ni tokens a incidencias.
