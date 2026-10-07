# Manual de la interfaz disponible

Actualizado: 2026-10-07. Este manual describe web y la interfaz compartida;
el APK Android todavía requiere verificación de compilación y dispositivo.

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

## Catálogo e inventario

Clientes, proveedores, categorías, unidades, productos y almacenes permiten
listar, buscar, crear, consultar detalle, editar y desactivar según permisos.
Cada lista muestra estados de carga, error y ausencia de datos. La
desactivación solicita confirmación.

Inventario muestra existencias por producto y almacén, y los movimientos
recientes. Abre un producto para ver su desglose. Con `inventory.adjust`
puedes registrar existencia inicial, entrada o salida; con
`inventory.transfer`, mover cantidad entre dos almacenes. Los saldos se
obtienen del historial de movimientos y una salida sin existencias se
rechaza. Una existencia histórica pendiente de conciliación se informa como
error; solicita revisión administrativa antes de registrar movimientos.

## Ventas y compras

En Ventas crea un borrador, selecciona cliente y almacén, agrega productos
con cantidades y guarda. El servidor calcula precios e impuestos. Abre el
detalle para editar el borrador, confirmar la venta o cancelarla según tus
permisos. Al confirmar se descuenta stock; si es insuficiente, la operación
no se confirma. Cancelar una venta confirmada restaura las existencias y
conserva el historial.

En Compras crea un borrador con proveedor, almacén, productos, cantidades y
costo unitario. Al recibir la compra entra stock. Puedes cancelar una compra
recibida solo si aún hay existencias suficientes para revertirla; en caso
contrario solicita revisión de negocio. Los importes se muestran en centavos
convertidos a dos decimales.

## Negocio pendiente

Finanzas, reportes, HR, proyectos y CRM aún no tienen flujos
operativos. La interfaz informa disponibilidad y la API responde 501.

Consulta [estado por módulo](../DEVELOPMENT-STATUS.md) y [capturas](../qa/screenshots/README.md).
