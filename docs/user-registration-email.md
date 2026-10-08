# Aviso por correo al crear usuarios

El alta sigue en `POST /api/v1/users`, con autenticación y permiso `users.create`. El backend intenta enviar un aviso al administrador una sola vez después de que la transacción de usuario y auditoría termina. El correo incluye nombre, correo, empresa, sucursal (si existe), rol, fecha y nombre del administrador (si está disponible). No incluye contraseñas ni credenciales.

Para activar en el servicio **repositorio-sistema-ERP-backend** de Render, configurar:

- `RESEND_API_KEY`: clave secreta de Resend.
- `EMAIL_FROM`: remitente verificado en Resend.
- `ADMIN_ALERT_EMAIL`: destinatario administrador.
- `USER_CREATED_EMAIL_NOTIFICATIONS=true`.

Con el flag en `false` no se requieren las otras tres variables. Al activarlo, el arranque valida que estén presentes. El Worker y las aplicaciones cliente no necesitan estas variables.

Si Resend falla, se registra `USER_CREATED_EMAIL_NOTIFICATION_FAILED` con el ID del usuario, sin datos del proveedor ni secretos, y la API conserva su respuesta `201`. El intento tiene un tiempo límite de cinco segundos. Para verificar la entrega real en producción, crear un usuario autorizado y revisar el buzón del administrador y los eventos de Resend.
