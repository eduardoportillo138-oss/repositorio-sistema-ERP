# ERP Empresarial

## Descripción y estado actual

Monorepo TypeScript de un ERP con API Express/Mongoose y clientes React Native en desarrollo. El núcleo está en **hardening**. Auth, Users, Roles, Companies y Branches cuentan con operaciones reales, pero requieren pruebas de integración con MongoDB de prueba y migración de datos históricos antes de aprobarse.

Los módulos heredados contienen controladores placeholder. Sus rutas responden **501 NOT_IMPLEMENTED** después de autenticación para evitar éxitos ficticios. Ningún módulo tiene estado QA_APPROVED.

| Módulo | Estado | Límite actual |
| --- | --- | --- |
| Core Infrastructure | IN_PROGRESS | Compila; faltan validación de despliegue y conexión MongoDB real. |
| Auth | IN_TESTING | Login, JWT, refresh rotatorio y logout con sesiones MongoDB. |
| Users | IN_TESTING | CRUD, RBAC, alcance por empresa, desactivación y auditoría. |
| Roles / Permissions | IN_TESTING | Gestión de roles y catálogo compartido de permisos. |
| Companies / Branches | IN_TESTING | Gestión con filtros empresariales; faltan pruebas con MongoDB. |
| Customers / Suppliers / Categories / Products / Warehouses | CORRECTION_REQUIRED | Modelos y controladores heredados sin CRUD verificado; faltan campos de empresa en catálogos. |
| Inventory / Sales / Purchases / Finance | CORRECTION_REQUIRED | Reglas y controladores incompletos. |
| Reports / HR / Projects / CRM | PLANNED | Sin implementación verificada para producción. |
| Web / Mobile | IN_PROGRESS | Estructuras parciales; ejecución Expo/native no verificada. |

## Arquitectura

```text
React Native / React Native Web (en desarrollo)
                    ↓
             REST API /api/v1
                    ↓
             Express routes
                    ↓
        Controllers / Services
                    ↓
              Repositories
                    ↓
                Mongoose
                    ↓
          MongoDB local o Atlas
```

`backend/src/app.ts` crea Express sin abrir puerto ni conectar MongoDB. `backend/src/server.ts` valida configuración, conecta la base e inicia el listener. Esto permite pruebas HTTP con Supertest sin tocar una base productiva.

## Tecnologías y estructura

Node.js, TypeScript, Express, MongoDB, Mongoose, bcrypt, JWT, Jest, Supertest, React Native y React Native Web.

```text
apps/mobile/           cliente móvil en desarrollo
apps/web/              cliente web en desarrollo
backend/src/           API, modelos, servicios y repositorios
backend/tests/         pruebas unitarias y HTTP
packages/types/        tipos y catálogo de permisos
packages/constants/    constantes compartidas
packages/validation/   validadores compartidos heredados
packages/api-client/   cliente API
packages/ui/           componentes UI
packages/config/       configuración compartida heredada
native/                base para integración Android
docs/                  estado y decisiones
```

## Configuración de entorno

Actualmente `.env` funciona como plantilla de configuración del proyecto. No debe contener credenciales reales. En una fase posterior deberá migrarse a `.env.example` y mantenerse `.env` real fuera de Git.

Para ejecutar localmente, proporciona valores reales mediante variables de entorno o modifica tu copia local de `.env` **sin incluir esos cambios en ningún commit**. En producción son obligatorios `MONGODB_URI`, `JWT_SECRET` y `JWT_REFRESH_SECRET`; los secretos JWT deben tener al menos 32 caracteres y no pueden ser los ejemplos.

Formato de URI de Atlas, sin credenciales reales:

```dotenv
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.example.mongodb.net/erp
MONGODB_DB_NAME=erp_dev
JWT_SECRET=change_me_in_local_env
JWT_REFRESH_SECRET=change_me_in_local_env
```

El servidor usa un pool MongoDB de 0 a 10 conexiones. No se ha verificado una conexión a Atlas en esta ejecución.

## Instalación y desarrollo

Requisitos: Node.js 18+, npm 9+ y MongoDB de desarrollo. Desde la raíz:

```bash
npm install
npm run build
npm run dev
```

`npm run dev` y `npm run backend:dev` inician el backend. La API escucha en `PORT` (3000 por defecto). `GET /health` comprueba Express, no la base de datos.

Para crear la primera cuenta en una base de **desarrollo**, configura `MONGODB_URI`, `SEED_ADMIN_EMAIL` y una `SEED_ADMIN_PASSWORD` propia de al menos 12 caracteres; después ejecuta `npm run db:seed -w backend`. El seed no trae credenciales fijas y Mongoose aplica el hash al guardar el usuario. No se probó contra MongoDB en esta ejecución.

`npm run web:dev` y `npm run mobile:android` están definidos, pero sus clientes aún no tienen una configuración Expo/native verificada; no se consideran comandos listos para uso.

| Script raíz | Función |
| --- | --- |
| `npm run build` | Compila los paquetes compartidos y backend. |
| `npm run lint` | Ejecuta ESLint sobre TypeScript/TSX. |
| `npm run test` | Ejecuta Jest. |
| `npm run test:unit` | Pruebas unitarias. |
| `npm run test:integration` | Pruebas HTTP. |

Los resultados de verificación están en `docs/DEVELOPMENT-STATUS.md`. El build raíz no compila web/mobile. El lint termina con 0 errores y 235 advertencias heredadas; las 27 pruebas pasan con persistencia simulada.

## API

Base: `/api/v1`. Los listados devuelven `{success, data: [], pagination: {page, limit, total, pages}}`. Los IDs son ObjectId de MongoDB.

| Recurso | Rutas implementadas |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| Users | `GET /users`, `GET /users/:id`, `POST /users`, `PUT/PATCH /users/:id`, `PATCH /users/:id/deactivate` |
| Roles | `GET /roles`, `GET /roles/:id`, `POST /roles`, `PUT/PATCH /roles/:id`, `PATCH /roles/:id/deactivate` |
| Companies | `GET /companies`, `GET /companies/:id`, `POST /companies`, `PUT/PATCH /companies/:id`, `PATCH /companies/:id/deactivate` |
| Branches | `GET /branches`, `GET /branches/:id`, `POST /branches`, `PUT/PATCH /branches/:id`, `PATCH /branches/:id/deactivate` |

Las rutas de módulos heredados devuelven 501 hasta su revisión.

## Seguridad

El access token incluye solo `userId`, `companyId` y `roleId`. Cada solicitud autenticada vuelve a consultar usuario, rol y empresa activos; los permisos provienen del rol vigente. Los refresh tokens se guardan como hash SHA-256 en una colección de sesiones, se rotan y se revocan al cerrar sesión. El modelo User hashea la contraseña al guardar; la API no devuelve `passwordHash`.

Las consultas del núcleo usan el `companyId` del usuario autenticado. Crear empresas requiere `platform.company.create`, reservado a una cuenta de plataforma aprovisionada fuera de la API pública. La auditoría redacta valores sensibles. Su escritura es de mejor esfuerzo: una falla del registro no revierte la operación de negocio.

**Migración pendiente:** instalaciones existentes pueden tener índices globales de email y documentos Role/Branch sin `companyId`. Deben migrarse antes de usar este código con datos históricos.

## Testing

```bash
npm run test
npm run test:unit
npm run test:integration
```

Las pruebas del núcleo usan mocks para evitar una base productiva. Cubren validación, login, refresh/logout y filtros empresariales. Falta una suite con MongoDB de prueba para CRUD completo, índices, migración y aislamiento de Customers, Products y Warehouses.

## Roadmap

Core Hardening → Master Data → Inventory → Sales → Purchases → Finance → Dashboard & Reports → HR / Projects / CRM → Mobile & Native Integrations.

Consulta [estado de desarrollo](docs/DEVELOPMENT-STATUS.md) y [próximos pasos](docs/NEXT-STEPS.md).
