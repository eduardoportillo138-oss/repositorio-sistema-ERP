# Manual de la interfaz disponible

Actualizado: 2026-10-07. Este manual describe web y la interfaz compartida;
el APK Android todavía requiere verificación de compilación y dispositivo.

## Entrar y salir

Usa tu correo y contraseña provisionados para una empresa. Si el correo se repite entre empresas, indica el identificador de empresa en el campo opcional. No existen credenciales de producción incluidas en el formulario.

La sesión permanece en memoria. Recargar/reiniciar requiere entrar de nuevo. “Cerrar sesión” solicita revocación al servidor; un error de red se informa y elimina la sesión local. Recuperación de contraseña y MFA todavía no están disponibles.

## Navegación

Desktop muestra sidebar, tablet una barra compacta y móvil navegación inferior con “Más módulos”. Los accesos dependen de tus permisos. El header muestra empresa y usuario de tu sesión; buscar un módulo ayuda a navegar, no busca registros empresariales.

## Dashboard

El dashboard consulta ventas confirmadas y compras recibidas del periodo, así
como conteos de catálogo, CRM y saldos de cartera. Las métricas sin permiso se
ocultan; las que no están disponibles muestran un guion en vez de inventar un
cero. Las series disponibles cubren los últimos seis meses.

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

## Finanzas

Las ventas confirmadas y compras recibidas con importe positivo generan una
cuenta pendiente. En Finanzas consulta cuentas por cobrar, cuentas por pagar
y pagos, filtra por estado y abre una cuenta para ver su saldo e historial.
Con `finances.create` puedes registrar un pago con monto, método y referencia
opcional. El monto no puede exceder el saldo. Una venta o compra con pagos
registrados no puede cancelarse directamente: requiere el procedimiento de
devolución o conciliación definido por la empresa.

## Reportes y preferencias

En Reportes consulta ventas confirmadas por intervalo, existencias derivadas de
movimientos y saldos pendientes de cuentas por cobrar y pagar. Los importes de
la API usan unidades monetarias menores enteras y el dashboard distingue métricas sin datos de
valores reales.

En Configuración puedes ajustar idioma, zona horaria y formato de fecha de la
empresa. Los cambios requieren `settings.edit` y quedan auditados.

El botón de Notificaciones muestra avisos dirigidos a tu usuario; puedes marcar
uno o todos como leídos. Aún no se generan avisos automáticos desde eventos de
ventas, compras o inventario.

Empleados, proyectos y CRM ya tienen flujos web/móvil. La disponibilidad de
acciones depende de permisos RBAC. Consulta [estado por módulo](../DEVELOPMENT-STATUS.md)
y [capturas](../qa/screenshots/README.md).

Consulta [estado por módulo](../DEVELOPMENT-STATUS.md) y [capturas](../qa/screenshots/README.md).
