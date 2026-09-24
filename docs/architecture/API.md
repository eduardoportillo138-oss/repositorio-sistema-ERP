# API REST Documentation

## Base URL

```
/api/v1
```

## Autenticación

Todos los endpoints requieren autenticación excepto `/auth/login` y `/auth/refresh`.

### Header

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Estructura de Respuesta Exitosa

```json
{
  "success": true,
  "data": {},
  "message": "Operación realizada correctamente"
}
```

## Estructura de Respuesta de Error

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción del error"
  }
}
```

## Endpoints Principales

### Auth
- `POST /api/v1/auth/login` - Iniciar sesión
- `POST /api/v1/auth/logout` - Cerrar sesión
- `POST /api/v1/auth/refresh` - Renovar token

### Usuarios
- `GET /api/v1/users` - Listar usuarios
- `GET /api/v1/users/:id` - Obtener usuario
- `POST /api/v1/users` - Crear usuario
- `PUT /api/v1/users/:id` - Actualizar usuario

### Empresas
- `GET /api/v1/companies` - Listar empresas
- `POST /api/v1/companies` - Crear empresa

### Clientes
- `GET /api/v1/customers` - Listar clientes
- `POST /api/v1/customers` - Crear cliente

### Productos
- `GET /api/v1/products` - Listar productos
- `POST /api/v1/products` - Crear producto

### Inventario
- `GET /api/v1/inventory` - Ver inventario
- `POST /api/v1/inventory/movements` - Crear movimiento

### Ventas
- `GET /api/v1/sales` - Listar ventas
- `POST /api/v1/sales` - Crear venta

### Compras
- `GET /api/v1/purchases` - Listar compras
- `POST /api/v1/purchases` - Crear compra

### Finanzas
- `GET /api/v1/finance/accounts-receivable` - Cuentas por cobrar
- `GET /api/v1/finance/accounts-payable` - Cuentas por pagar
- `GET /api/v1/finance/invoices` - Facturas
- `POST /api/v1/finance/invoices` - Crear factura

### Reportes
- `GET /api/v1/reports/dashboard` - Dashboard
- `GET /api/v1/reports/sales` - Reporte de ventas
- `GET /api/v1/reports/inventory` - Reporte de inventario
- `GET /api/v1/reports/finance` - Reporte financiero

---

*Documentación generada como parte de FASE 0*
