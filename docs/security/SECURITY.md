# Política de seguridad del ERP

## 1. Objetivo

Diseñar un ERP con seguridad desde el primer nivel de arquitectura, garantizando confidencialidad, integridad, control de acceso y trazabilidad. La seguridad no es un add-on; es parte esencial del diseño.

## 2. Principios base

- Nunca confiar en el frontend para permisos o cálculos críticos.
- Never store secrets in code.
- Toda entrada del cliente debe validarse en backend.
- Los permisos deben evaluarse por empresa, sucursal y rol.
- Los datos sensibles nunca deben devolverse en respuesta ni registrarse sin control.

## 3. Autenticación

### Requisitos mínimos
- Login con email/usuario y contraseña.
- JWT para acceso principal.
- Refresh token para renovaciones seguras.
- Expiración de sesiones.
- Logout con invalidación de sesiones.
- Recuperación de contraseña segura.
- Preparación para MFA futuro.

### Contraseñas
- Se debe guardar un hash seguro, nunca texto plano.
- Se recomienda bcrypt, scrypt o PBKDF2 con costo configurable.
- No se deben devolver hashes ni tokens en respuestas.

## 4. Autorización RBAC

El sistema debe seguir el modelo:

Usuario
↓
Rol
↓
Permisos

Ejemplos de permisos:
- ventas.ver
- ventas.crear
- ventas.editar
- ventas.eliminar
- ventas.aprobar
- inventario.ver
- inventario.ajustar
- finanzas.ver

Reglas:
- El cliente no decide permisos.
- El backend debe validar cada acción.
- El contexto empresarial debe validarse junto con el permiso.

## 5. Multiempresa y aislamiento

Cada operación debe validar:
- que el usuario esté autenticado,
- que tenga permiso para la empresa,
- que la empresa exista,
- que la sucursal o almacén asociado sea válido,
- que la entidad pertenezca a la empresa correcta.

Esto previene fugas de datos entre compañías o sucursales.

## 6. Protección de API

### 6.1 HTTP y transporte
- HTTPS obligatorio en producción.
- CORS configurado con políticas cerradas por origen.
- Helmet para cabeceras de seguridad.
- Rate limiting para evitar abuso.

### 6.2 Validación
- Esquemas de entrada con validación estricta.
- Rechazo de IDs inválidos, cantidades negativas y datos malformados.
- Sanitización de campos de texto.
- Validación de tipos y formatos.

### 6.3 Errores
- Manejo centralizado de errores.
- No exponer stack traces ni detalles internos al frontend.
- Respuestas normalizadas con código de error.

## 7. Auditoría y trazabilidad

Se debe registrar en auditLogs:
- usuario
- empresa
- módulo
- acción
- entidad
- identificador
- valores antiguos y nuevos
- fecha
- IP
- dispositivo

Eventos prioritarios:
- login / logout
- cambios de permisos
- creación y modificación de usuarios
- ventas, compras e inventario
- finanzas
- cancelaciones
- cambios de configuración

Los registros de auditoría no deben poder ser eliminados por usuarios normales.

## 8. Seguridad del frontend

- El frontend no debe almacenar información sensible innecesaria.
- Debe separar estado de autenticación, empresa, usuario y configuración.
- No debe guardar tokens o secretos en almacenamiento local sin estrategia segura.
- Debe usar comunicación únicamente con la API REST del backend.

## 9. Seguridad de MongoDB

- Las credenciales deben estar en variables de entorno.
- Usar MongoDB Atlas con roles mínimos según necesidad.
- Usar conexiones con TLS habilitado.
- Cerrar accesos innecesarios.
- Mantener auditoría de accesos y conexiones.

## 10. Seguridad de entorno y despliegue

- Variables de entorno en .env y .env.example.
- No subir secretos al repositorio.
- Separación entre entornos: desarrollo, pruebas, staging, producción.
- Revisión de dependencias y vulnerabilidades.
- Manejo de secretos por gestor propio del entorno.

## 11. MFA y preparación futura

El diseño debe ser compatible con MFA, o bien con soporte para autenticación de segunda factor. Sin embargo, no se debe implementar de forma improvisada ni como una dependencia crítica del core inicial si no está justificado.

## 12. Registro y monitoreo

- Logs estructurados con niveles INFO, WARN, ERROR y DEBUG.
- Evitar loggear contraseñas, tokens, secretos o contenido sensible.
- Monitorear fallas, intentos de acceso no autorizado y errores repetidos.

## 13. Recomendación final

La seguridad debe implementarse como una capa transversal. Las decisiones clave son: validación centralizada en backend, permisos por empresa, JWT con refresh token, auditoría fuerte, control de sesiones y política estricta sobre secretos y datos sensibles.
