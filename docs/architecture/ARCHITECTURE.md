# Arquitectura del ERP

## 1. Estado actual

El repositorio está vacío. No existe ningún proyecto previo, ni aplicación web, ni backend, ni configuración de entorno. Por este motivo, la solución debe construirse como base verde (greenfield) con una arquitectura modular, clara y escalable.

## 2. Objetivo arquitectónico

Diseñar una solución ERP con una separación estricta entre capas y responsabilidades:

- Frontend móvil: React Native.
- Frontend web: React Native Web.
- Backend: Node.js + Express + TypeScript.
- Capa de negocio: services.
- Capa de persistencia: repositories.
- Base de datos: MongoDB Atlas.
- Native Android: Kotlin solo para accesos nativos específicos.
- Documentación, QA y estándares: Markdown, tests y procedimientos.

## 3. Principio arquitectónico obligatorio

La aplicación frontend no puede acceder directamente a MongoDB Atlas.

El flujo requerido es:

React Native / React Native Web
↓
REST API
↓
Node.js + Express
↓
Services
↓
Repositories
↓
Mongoose
↓
MongoDB Atlas

Esto impone una arquitectura orientada a servicios y a contratos API bien definidos.

## 4. Estructura propuesta del monorepo

ERP/
├── apps/
│   ├── mobile/
│   └── web/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── validators/
│   │   ├── integrations/
│   │   ├── jobs/
│   │   ├── errors/
│   │   ├── utils/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── companies/
│   │   │   ├── customers/
│   │   │   ├── suppliers/
│   │   │   ├── products/
│   │   │   ├── inventory/
│   │   │   ├── sales/
│   │   │   ├── purchases/
│   │   │   ├── finance/
│   │   │   ├── hr/
│   │   │   ├── projects/
│   │   │   └── reports/
│   │   ├── app.ts
│   │   └── server.ts
│   └── tests/
├── packages/
│   ├── types/
│   ├── ui/
│   ├── api-client/
│   ├── validation/
│   ├── constants/
│   └── config/
├── native/
│   └── android/
│       └── kotlin/
├── docs/
├── tests/
├── .env.example
├── .gitignore
├── package.json
└── README.md

## 5. Arquitectura de capas

### 5.1 Frontend
- React Native para mobile.
- React Native Web para navegador.
- Componentes compartidos en packages/ui.
- Estado global con Zustand o Redux Toolkit; se recomienda Zustand por simplicidad y bajo boilerplate, salvo que el proyecto demande mayor estructura y estándares transversales.
- El frontend debe consumir una API REST versionada en /api/v1.

### 5.2 Backend
- Node.js con Express y TypeScript.
- Routing modular por dominio.
- Controladores finos y de responsabilidad limitada.
- Services para reglas de negocio.
- Repositories para persistencia y consultas.
- Mongoose para acceso a MongoDB Atlas.

### 5.3 Business logic
- Dedicada a validaciones complejas, permisos, transacciones y reglas del negocio.
- No debe mezclarse con código de presentación ni con acceso directo a base de datos.

### 5.4 Persistence
- Repositories encapsulan consultas, agregaciones y persistencia.
- Se evita lógica de negocio dentro del modelo.
- Se preparan interfaces para tests y refactorización.

### 5.5 Database
- MongoDB Atlas como base principal.
- Modelo multiempresa con companyId obligatorio en entidades relevantes.
- Indexación por companyId, branchId, warehouseId, status, createdAt, updatedAt y referencias relevantes.

## 6. Principios de diseño

### 6.1 Modularidad
Cada módulo debe encapsular dominio, rutas, servicios y validaciones. Debe existir una clara separación de responsabilidades.

### 6.2 Seguridad por defecto
- Validación en backend.
- Verificación de permisos.
- Control de sesiones y tokens.
- Auditoría de acciones críticas.
- Manejo centralizado de errores.

### 6.3 Trazabilidad
- Todos los cambios relevantes deben registrarse en auditLogs.
- El inventario se maneja con movimientos históricos.
- Los estados de procesos se registran y validan.

### 6.4 Multiempresa y multisucursal
- La arquitectura debe soportar varios tenants empresariales.
- Los documentos deben incluir companyId y, según corresponda, branchId y warehouseId.
- Los permisos deben validarse no solo por rol, sino por contexto de empresa.

## 7. Delimitación funcional por módulos

Los módulos definidos en la estructura del ERP deben implementarse por fases, comenzando por el core y luego catalogos, operaciones, finanzas, administración y analítica.

Se prioriza:
1. Core.
2. Catálogos.
3. Operaciones.
4. Finanzas.
5. Administración.
6. Analítica.
7. IA e integraciones.

## 8. Decisiones técnicas relevantes

### 8.1 Estado global
Se recomienda Zustand por su sencillez y su menor complejidad en un ERP con varios módulos. Redux Toolkit sigue siendo válido si el equipo requiere un flujo más formal y centralizado. La decisión final debe documentarse al iniciar la implementación.

### 8.2 Tipado
TypeScript es obligatorio. Los contratos compartidos entre frontend y backend deben mantenerse en packages/types o un paquete de contratos API para evitar desalineación.

### 8.3 Native Android
Kotlin solo se usará para acceso nativo específico como cámara, impresoras, escáneres, NFC, biometría o Bluetooth. La lógica de negocio sigue en Node.js.

### 8.4 Testing
La estrategia debe incluir pruebas unitarias, de integración y E2E con Jest, Supertest, Testing Library y Playwright; Detox solo si la aplicación móvil lo requiere.

## 9. Seguridad de la arquitectura

- HTTPS obligatorio en producción.
- JWT con refresh token.
- Rate limiting y CORS limitado.
- Helmet y sanitización.
- Validación de entrada en el backend.
- Un solo punto de exposición de API.
- Auditoría de acciones administrativas.

## 10. Modelo de flujo de datos

En el ERP, el flujo de datos debe ser:

- Usuario interactúa con frontend.
- Frontend realiza llamadas a /api/v1/.
- Backend valida autenticación, autorización, tenant y entradas.
- Services ejecutan la lógica de negocio.
- Repositories consultan o escriben MongoDB Atlas.
- Audit logs y eventos de negocio quedan registrados.
- Respuestas se normalizan con estructura success/error.

## 11. Gestión de transacciones y concurrencia

Se debe analizar MongoDB transactions únicamente para escenarios de múltiples documentos y dependencias estrictas, como ventas con inventario, factura y cuenta por cobrar. No se usarán transacciones indiscriminadamente.

La concurrencia debe manejarse con validaciones del backend, actualizaciones atómicas y control de stock por movimientos, evitando que dos usuarios vendan el mismo stock final.

## 12. Migración y arranque del proyecto

Como el repositorio está vacío, la migración no aplica en el sentido de repositorio heredado. La estrategia debe ser:

1. Crear monorepo base.
2. Definir paquetes compartidos.
3. Configurar backend y frontend.
4. Implementar core.
5. Añadir módulos por fases.
6. Mantener documentación por fase.

## 13. Riesgos arquitectónicos

- Acoplamiento entre frontend y backend si existe lógica de negocio en el cliente.
- Uso improvisado de transacciones o validaciones del lado del cliente.
- Falta de aislamiento multiempresa.
- Desarrollo de módulos sin evaluar dependencias ni impactos.
- Falta de política clara de auditoría y eliminación lógica.

## 14. Recomendación final

La arquitectura propuesta es modular, segura, escalable y compatible con la exigencia de un ERP empresarial. Se recomienda mantener la disciplina de capas, versionar la API, usar MongoDB Atlas con modelos multiempresa, y no iniciar el desarrollo de módulos operativos antes de consolidar el core y los patrones de seguridad y pruebas.
