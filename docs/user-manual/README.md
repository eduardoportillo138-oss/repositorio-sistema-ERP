# Manual de la interfaz disponible

Actualizado: 2026-09-28. El ERP está en CORE HARDENING. Este manual describe la base web/preview; no acredita release Android/iOS.

## Entrar y salir

Usa tu correo y contraseña provisionados para una empresa. Si el correo se repite entre empresas, indica el identificador de empresa en el campo opcional. No existen credenciales de producción incluidas en el formulario.

La sesión permanece en memoria. Recargar/reiniciar requiere entrar de nuevo. “Cerrar sesión” solicita revocación al servidor; un error de red se informa y elimina la sesión local. Recuperación de contraseña y MFA todavía no están disponibles.

## Navegación

Desktop muestra sidebar, tablet una barra compacta y móvil navegación inferior con “Más módulos”. Los accesos dependen de tus permisos. El header muestra empresa y usuario de tu sesión; buscar un módulo ayuda a navegar, no busca registros empresariales.

## Dashboard

Las tarjetas y gráficas muestran “Próximamente” mientras el backend correspondiente no exista. Un guion no significa cero ventas ni stock. Notificaciones/configuración aún no ofrecen funcionalidad empresarial completa.

## Usuarios

Con permisos suficientes puedes listar usuarios de tu empresa, crear uno con un rol empresarial activo, editar su nombre y confirmar su desactivación. Errores de validación o permisos se muestran; un fallo no se anuncia como guardado.

La gestión API de roles, empresas y sucursales existe, pero no se añadió una consola completa para esos flujos en esta entrega.

## Negocio pendiente

Clientes, proveedores, categorías, unidades, productos, almacenes, inventario, ventas, compras, finanzas, reportes, HR, proyectos y CRM aún no tienen flujos operativos. La interfaz informa disponibilidad y la API responde 501.

Consulta [estado por módulo](../DEVELOPMENT-STATUS.md) y [capturas](../qa/screenshots/README.md).
