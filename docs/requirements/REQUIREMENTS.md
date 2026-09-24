# Requisitos del ERP

## 1. Estado actual del repositorio

En la inspección realizada, el repositorio se encuentra vacío. No existen carpetas de aplicación, paquetes, configuraciones, código fuente ni historial de Git disponible en el workspace actual.

Esto implica que el proyecto debe iniciar como greenfield con una base sólida de arquitectura, estándares y disciplina de calidad, sin intentar reutilizar código inexistente.

## 2. Objetivo del sistema

Construir un ERP empresarial modular, multiempresa, multisucursal y preparado para crecimiento, con capacidad de adaptarse a distintos tipos de negocio y módulos que puedan activarse según la necesidad del cliente.

## 3. Alcance funcional esperado

### 3.1 Núcleo del sistema
- Autenticación segura.
- Usuarios, roles y permisos.
- Empresas y sucursales.
- Auditoría y trazabilidad.
- Configuración del sistema.
- Notificaciones básicas.

### 3.2 Catálogos y entidades principales
- Clientes.
- Proveedores.
- Productos.
- Categorías.
- Unidades de medida.
- Almacenes.

### 3.3 Operaciones empresariales
- Inventario con movimientos.
- Ventas.
- Compras.
- Transferencias y devoluciones.
- Gestión de documentos y aprobaciones.

### 3.4 Finanzas
- Facturación.
- Cuentas por cobrar.
- Cuentas por pagar.
- Pagos y conciliación.
- Integración con inventario, ventas y compras.

### 3.5 Administración y operación
- Recursos humanos.
- Proyectos.
- CRM avanzado.
- Dashboard y reportes.

### 3.6 Preparación para evolución
- Integraciones externas.
- Webhooks.
- Automatizaciones.
- IA y analítica.

## 4. Requisitos funcionales principales

### 4.1 Multiempresa y multisucursal
- Un usuario puede pertenecer a una o varias empresas.
- Cada entidad debe aislar datos por companyId.
- Sucursales y almacenes deben quedar asociados a una empresa y, cuando aplique, a una sucursal.
- El acceso a recursos debe validarse en backend.

### 4.2 Seguridad y acceso
- Login, logout, refresh token y expiración de sesión.
- Protected routes y control de sesiones.
- RBAC basado en permisos.
- Contraseñas con hash seguro.
- MFA preparado para implementación futura.
- Auditoría de acciones críticas.

### 4.3 Inventario
- El stock no debe modificarse arbitrariamente.
- Todo movimiento debe estar apoyado por un registro histórico.
- Se deben soportar entradas, salidas, transferencias, ajustes y devoluciones.
- Debe existir trazabilidad completa.

### 4.4 Ventas y compras
- Flujo operativos con estados definidos.
- Validaciones de permisos y disponibilidad en inventario.
- Cálculos importantes hechos en backend.
- Integración con facturación, cuentas por cobrar y por pagar.

### 4.5 Financiero
- Las ventas y compras deben influir en finanzas de manera consistente.
- Los movimientos deben seguir una lógica contable y operativa compatible con la documentación del negocio.

### 4.6 Auditoría y trazabilidad
- Todo cambio relevante debe quedar registrado.
- Debe existir un registro de qué usuario hizo qué, cuándo, desde dónde y qué cambió.
- Los registros no deben eliminarse de forma física cuando representen historial empresarial.

## 5. Requisitos no funcionales

### 5.1 Arquitectura y mantenibilidad
- Arquitectura modular, por capas y por módulos.
- Separación clara entre frontend, backend, servicios, repositorios, base de datos y contratos.
- Estructura monorepo con paquetes compartidos para tipos y utilidades.

### 5.2 Escalabilidad
- Soporte a crecimiento de empresas, sucursales y volumen de transacciones.
- Índices apropiados en MongoDB.
- Paginación y consultas server-side.
- Preparación para integraciones, automatizaciones y analítica avanzada.

### 5.3 Seguridad
- HTTPS.
- Variables de entorno.
- CORS y helmet.
- Rate limiting.
- Validación estricta de entradas.
- Sanitización y control de errores.
- No almacenamiento de secretos en repositorio.

### 5.4 Calidad
- Pruebas unitarias, de integración y E2E.
- Validación de permisos y errores.
- Desarrollo guiado por requisitos verificables.
- Revisión de código y documentación técnica.

### 5.5 Experiencia de usuario
- Diseño claro y consistente.
- Componentes reutilizables entre React Native y React Native Web.
- Interfaz orientada a tareas.
- Accesibilidad y usabilidad.

## 6. Reglas de negocio críticas

- React Native no debe acceder directamente a MongoDB Atlas.
- El frontend únicamente debe comunicarse con la API REST.
- El backend debe validar permisos y empresa/sucursal antes de ejecutar operaciones.
- Ningún cálculo crítico se debe confiar al frontend.
- Los movimientos de inventario deben ser la fuente de verdad para la trazabilidad.
- No se eliminarán registros históricos; se usarán estados como active, inactive, cancelled.
- Toda operación importante debe quedar registrada en auditLogs.

## 7. Fases previstas

### Fase 0: análisis y documentación
- Estado del repositorio.
- Arquitectura base.
- Requisitos.
- Modelo de datos.
- Seguridad.
- Estrategia de QA.

### Fase 1: infraestructura inicial
- Monorepo.
- TypeScript.
- Backend.
- Frontend mobile/web.
- Configuración inicial.
- Entorno y variables.
- ESLint, Prettier, testing base.

### Fase 2: core ERP
- Autenticación.
- Usuarios.
- Roles.
- Permisos.
- Empresas.
- Sucursales.
- Auditoría.
- Configuración.

### Fase 3: catálogos
- Clientes.
- Proveedores.
- Productos.
- Categorías.
- Unidades.
- Almacenes.

### Fase 4: operaciones
- Ventas.
- Compras.
- Inventario.
- Movimientos.
- Transferencias.
- Devoluciones.

### Fase 5: finanzas
- Facturación.
- Cuentas por cobrar.
- Cuentas por pagar.
- Pagos.
- Ingresos y gastos.

### Fase 6: administración
- Recursos humanos.
- Proyectos.
- CRM avanzado.

### Fase 7: analítica
- Dashboard.
- Reportes.
- KPIs.
- Exportaciones.

### Fase 8: IA e integraciones
- APIs externas.
- Webhooks.
- Automatizaciones.
- Predicciones.

## 8. Criterios de aceptación

- El sistema debe estar diseñado para crecer por módulos.
- La arquitectura debe permitir múltiples empresas y sucursales.
- El backend debe ser la única autoridad para permisos, validaciones y cálculos.
- La trazabilidad y auditoría debe ser integral.
- La documentación debe mantenerse sincronizada con cada fase.
- Las pruebas deben formar parte de la entrega del módulo.

## 9. Riesgos de negocio y técnicos

- Complejidad de modelado multiempresa.
- Incremento de reglas de negocio en inventario y finanzas.
- Riesgos de consistencia transaccional en operaciones con varios documentos.
- Reglas de permisos mal implementadas.
- Exposición de datos sensibles por mala sanitización.

## 10. Conclusión

Dado el estado actual del repositorio, la estrategia correcta es definir una arquitectura robusta y un plan de fases antes de comenzar el desarrollo funcional. El foco inicial debe ser el núcleo del ERP y la disciplina de seguridad, auditoría y pruebas.
