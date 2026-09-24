# ERP Empresarial - Documentación Principal

## Descripción

Sistema ERP empresarial modular, escalable, seguro y preparado para crecimiento. Construido con React Native, Node.js, Express y MongoDB Atlas.

## Arquitectura

```
ERP/
├── apps/
│   ├── mobile/     # React Native (Android/iOS)
│   └── web/        # React Native Web
├── backend/         # Node.js + Express + TypeScript
├── packages/        # Paquetes compartidos
│   ├── types/       # Tipos TypeScript
│   ├── ui/          # Componentes UI
│   ├── api-client/  # Cliente API
│   ├── validation/  # Validadores
│   ├── constants/   # Constantes
│   └── config/      # Configuraciones
├── native/          # Kotlin (Android nativo)
├── docs/            # Documentación completa
└── tests/           # Pruebas unitarias, integración, E2E
```

## Stack Tecnológico

- **Frontend**: React Native + React Native Web + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Base de Datos**: MongoDB Atlas + Mongoose
- **API**: REST versionada en `/api/v1/`
- **Auth**: JWT + bcrypt + RBAC
- **Testing**: Jest + Supertest + React Native Testing Library + Playwright

## Requisitos

- Node.js >= 18
- npm >= 9
- MongoDB Atlas (o MongoDB local)
- Git

## Instalación

1. Clonar el repositorio:
```bash
git clone <repo-url> ERP
cd ERP
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```

4. Editar `.env` con credenciales de MongoDB Atlas

5. Ejecutar seed (opcional):
```bash
npm run db:seed
```

6. Iniciar backend:
```bash
npm run dev:backend
# o
cd backend && npm run dev
```

7. Iniciar web:
```bash
cd apps/web && npm run dev
```

8. Iniciar mobile:
```bash
cd apps/mobile && npm run android
```

## Scripts Disponibles

Desde la raíz:
- `npm run build` - Compilar todo
- `npm run dev` - Iniciar backend en modo desarrollo
- `npm run test` - Ejecutar todas las pruebas
- `npm run test:unit` - Solo tests unitarios
- `npm run test:integration` - Solo tests de integración
- `npm run lint` - Ejecutar ESLint
- `npm run lint:fix` - Corregir ESLint
- `npm run format` - Formatear con Prettier

Desde backend:
- `npm run build` - Compilar TypeScript
- `npm run dev` - Modo desarrollo con ts-node-dev
- `npm run start` - Producción
- `npm run test` - Tests
- `npm run db:seed` - Seed de desarrollo

## Variables de Entorno

Ver `.env.example` para todas las variables necesarias.

**NUNCA** subas credenciales reales al repositorio.

## Estructura de Módulos Backend

| Módulo | Ruta API | Descripción |
|--------|----------|-------------|
| Auth | /api/v1/auth | Autenticación |
| Users | /api/v1/users | Gestión de usuarios |
| Companies | /api/v1/companies | Empresas |
| Customers | /api/v1/customers | Clientes |
| Suppliers | /api/v1/suppliers | Proveedores |
| Products | /api/v1/products | Productos |
| Inventory | /api/v1/inventory | Inventario |
| Sales | /api/v1/sales | Ventas |
| Purchases | /api/v1/purchases | Compras |
| Finance | /api/v1/finance | Finanzas |
| Reports | /api/v1/reports | Reportes |
| HR | /api/v1/hr | Recursos Humanos |
| Projects | /api/v1/projects | Proyectos |
| Audit | /api/v1/audit | Auditoría |

## Seguridad

- JWT con access + refresh tokens
- bcrypt para hash de contraseñas
- RBAC completo
- Rate limiting
- Helmet + CORS
- Validación de entrada en backend
- Auditoría de acciones
- Multiempresa con companyId
- Eliminación lógica de registros

## Estado de Desarrollo

Ver `docs/DEVELOPMENT-STATUS.md` para el estado actual de cada módulo.

## Documentación

- `docs/architecture/ARCHITECTURE.md` - Arquitectura del sistema
- `docs/architecture/API.md` - Documentación de API
- `docs/architecture/DECISIONS.md` - Decisiones arquitectónicas (ADR)
- `docs/requirements/REQUIREMENTS.md` - Requisitos funcionales
- `docs/database/DATABASE.md` - Modelo de datos
- `docs/security/SECURITY.md` - Política de seguridad
- `docs/qa/QA-STRATEGY.md` - Estrategia de QA
- `docs/NEXT-STEPS.md` - Próximos pasos de desarrollo

## Licencia

Propiedad de la empresa. Todos los derechos reservados.
