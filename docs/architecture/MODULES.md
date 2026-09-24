# Estructura de Módulos del ERP

## Resumen de Implementación

| Módulo | Modelos | Controladores | Servicios | Rutas | Tests | Estado |
|--------|---------|---------------|-----------|-------|-------|--------|
| Auth | User | Auth | AuthService | auth.routes | ✅ | COMPLETO |
| Users | User | User | - | user.routes | ✅ | COMPLETO |
| Roles | Role | - | - | - | ✅ | COMPLETO |
| Companies | Company | Company | - | company.module | ✅ | COMPLETO |
| Branches | Branch | - | - | - | ✅ | COMPLETO |
| Customers | Customer | Customer | - | customer.module | ✅ | COMPLETO |
| Suppliers | Supplier | Supplier | - | supplier.module | ✅ | COMPLETO |
| Products | Product | Product | - | product.module | ✅ | COMPLETO |
| Categories | Category | Category | - | categories.module | ✅ | COMPLETO |
| Units | Unit | - | - | - | ✅ | COMPLETO |
| Warehouses | Warehouse | Warehouse | - | warehouses.module | ✅ | COMPLETO |
| Inventory | InventoryMovement | Inventory | AuditService | inventory.module | ✅ | COMPLETO |
| Sales | SalesOrder | Sale | - | sales.module | ✅ | COMPLETO |
| Purchases | PurchaseOrder | Purchase | - | purchase.module | ✅ | COMPLETO |
| Finance | Invoice, Payment, AR, AP | Finance | - | finance.module | ✅ | COMPLETO |
| HR | Employee | HR | - | hr.module | ✅ | COMPLETO |
| Projects | Project | Project | - | project.module | ✅ | COMPLETO |
| Audit | AuditLog | - | AuditService | - | ✅ | COMPLETO |
| Notifications | Notification | - | - | - | ✅ | COMPLETO |
| Settings | SystemSetting | - | - | - | ✅ | COMPLETO |
| Reports | - | Report | - | report.module | ✅ | COMPLETO |
| Dashboard | - | Report | - | report.module | ✅ | COMPLETO |
| CRM | Lead (pendiente) | - | - | - | ⏳ | PENDIENTE |
| Facturación | Invoice | - | - | finance.module | ✅ | COMPLETO |

## Paquetes Compartidos

| Paquete | Archivos | Propósito |
|---------|----------|-----------|
| @erp/types | types/src/index.ts | Tipos TypeScript compartidos |
| @erp/ui | ui/src/components/ | 13 componentes UI |
| @erp/api-client | api-client/src/index.ts | Cliente API con interceptores |
| @erp/validation | validation/src/index.ts | Validadores compartidos |
| @erp/constants | constants/src/index.ts | Constantes del sistema |
| @erp/config | config/src/index.ts | Configuración de entorno |

## Frontend Web

| Componente | Archivo | Propósito |
|------------|---------|-----------|
| LoginScreen | src/screens/LoginScreen.tsx | Autenticación |
| DashboardScreen | src/screens/DashboardScreen.tsx | Dashboard principal |
| UsersScreen | src/screens/UsersScreen.tsx | Gestión de usuarios |
| ProductsScreen | src/screens/ProductsScreen.tsx | Lista de productos |
| AppNavigator | src/navigation/AppNavigator.tsx | Navegación principal |
| AuthContext | src/context/AuthContext.tsx | Estado de autenticación |
| Theme | src/theme/index.ts | Colores y estilos |
| GlobalStyles | src/styles/global.ts | Estilos globales |
| Endpoints | src/api/endpoints.ts | Endpoints API |

## Frontend Mobile

| Componente | Archivo | Propósito |
|------------|---------|-----------|
| LoginScreen | src/screens/LoginScreen.tsx | Autenticación |
| DashboardScreen | src/screens/DashboardScreen.tsx | Dashboard |
| ProductsScreen | src/screens/ProductsScreen.tsx | Productos |
| SalesScreen | src/screens/SalesScreen.tsx | Ventas |
| InventoryScreen | src/screens/InventoryScreen.tsx | Inventario |
| NotificationsScreen | src/screens/NotificationsScreen.tsx | Notificaciones |
| AppNavigator | src/navigation/AppNavigator.tsx | Navegación |
| StatCard | src/components/StatCard.tsx | Tarjeta de estadísticas |
| useApi | src/hooks/useApi.ts | Hook para API |
| mobileApiClient | src/api/client.ts | Cliente API móvil |

## Modelos de Base de Datos (20+)

- User, Role, Permission
- Company, Branch, Warehouse
- Customer, Supplier
- Product, Category, Unit
- InventoryMovement
- SalesOrder, SalesOrderItem, Quote
- PurchaseOrder, PurchaseOrderItem
- Invoice, Payment
- AccountsReceivable, AccountsPayable
- Employee, Project, Task
- Notification, AuditLog, SystemSetting

## Middlewares

- auth.ts (autenticación JWT, RBAC, rate limiting)
- validators.ts (validación de entrada, sanitización)
- errorHandler.ts (manejo centralizado de errores)
- audit.ts (auditoría de acciones)

## Seguridad Implementada

- JWT con access + refresh tokens
- bcrypt hash de contraseñas (12 rounds)
- RBAC basado en permisos granulares
- Rate limiting
- Helmet + CORS
- Validación y sanitización de entrada
- Multiempresa con companyId
- Eliminación lógica de registros
- Auditoría completa de acciones críticas
- Control de concurrencia en inventario
- HTTPS en producción
- Variables de entorno para secretos
