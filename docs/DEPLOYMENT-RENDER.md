# Despliegue en Render

## 1. Requisitos y alcance

El primer servicio del Blueprint es **erp-backend**. Usa el repositorio completo para resolver los npm workspaces y publica la API Express compilada. MongoDB permanece en Atlas. El sitio web Vite se configura después de conocer la URL pública de la API.

Antes de desplegar, rota el usuario y la contraseña de Atlas que aparecieron en el historial del repositorio y en una versión anterior de `.env.example`. Revoca la credencial anterior. Un commit nuevo no borra el historial. Revisa también los accesos al repositorio y cualquier copia de la URI. Nunca pegues secretos en Git, incidencias o logs.

Se necesita acceso al repositorio GitHub, al proyecto Atlas y al workspace de Render. El build usa Node **24.21.0** desde `.node-version` y npm workspaces. No requiere PostgreSQL ni disco persistente en Render.

## 2. Arquitectura

`GitHub (main) → Render (Node/Express) → MongoDB Atlas`. La API vive bajo `/api/v1`. `GET /health` devuelve liveness del proceso; `GET /ready` devuelve 200 solo cuando Mongoose está conectado y 503 si se desconecta. El proceso solo empieza a escuchar después de conectar a la base. Las escrituras Core requieren transacciones MongoDB.

## 3. Variables

Render solicita al crear el Blueprint los valores marcados `sync: false` en `render.yaml`:

| Variable             | Valor que debes configurar                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `MONGODB_URI`        | URI del **nuevo** usuario de aplicación de Atlas, con contraseña codificada como URL si procede.      |
| `MONGODB_DB_NAME`    | Nombre de la base ERP de Atlas.                                                                       |
| `JWT_SECRET`         | Cadena aleatoria de al menos 32 caracteres.                                                           |
| `JWT_REFRESH_SECRET` | Otra cadena aleatoria, distinta de la anterior, de al menos 32 caracteres.                            |
| `CORS_ORIGIN`        | Origen HTTPS exacto del sitio web, sin ruta ni `/` final; admite varios orígenes separados por comas. |

`NODE_ENV=production`, vencimientos JWT y banderas de módulos están definidos sin secretos en el Blueprint. Render define `PORT`; no fijes otro puerto. Al sincronizar un Blueprint ya existente, Render **no** vuelve a pedir las variables `sync: false`: configúralas o rótalas en el panel del servicio y vuelve a desplegar. Cambiar secretos JWT invalida sesiones existentes.

`.env.example` es solo una plantilla. `.env` y `.env.local` están ignorados por Git. Nunca configures `MONGODB_URI` ni secretos JWT en Vite: sus variables públicas quedan en el bundle.

## 4. Atlas

1. En **Database Access**, crea un usuario de aplicación nuevo con permisos limitados a la base ERP. Sustituye la credencial expuesta y revoca la antigua.
2. Copia la cadena de conexión SRV desde Atlas y coloca el nombre de base en `MONGODB_DB_NAME`.
3. En Render, abre **erp-backend → Connect → Outbound** y copia todos los rangos CIDR de salida del servicio. En Atlas **Network Access**, permite esos rangos para el proyecto. Evita `0.0.0.0/0` si los rangos están disponibles. Si los rangos cambian, actualiza Atlas.
4. Verifica que el cluster esté disponible y que el usuario pueda conectarse. Esta guía no afirma una conexión real hasta observar un arranque exitoso de Render.

## 5. Render: primer despliegue

1. Publica la revisión en `main` según el flujo del proyecto. Antes de activar un despliegue con acceso a Atlas, rota y revoca la credencial histórica.
2. En Render, crea **New → Blueprint**, conecta el repositorio `eduardoportillo138-oss/repositorio-sistema-ERP` y usa `render.yaml` de la raíz. Si ya existe un servicio conectado, comprueba si vas a importar o vincularlo para evitar un duplicado.
3. Proporciona las cinco variables solicitadas. Si aún no existe el sitio web, usa temporalmente un origen HTTPS propio y actualiza `CORS_ORIGIN` al crear el sitio. No uses `*` con credenciales.
4. Confirma el servicio y revisa su log. El comando de build es `npm ci --include=dev && npm run build:packages && npm run backend:build`; el inicio es `npm run backend:start`. La raíz de trabajo es el repositorio, no `backend/`. `--include=dev` instala `patch-package`, TypeScript y herramientas de build incluso con `NODE_ENV=production`.
5. Render debe informar estado saludable mediante `/health`. El arranque fallará si falta una variable requerida o si Atlas no está accesible; eso evita publicar una API sin base.

## 6. Validación

Con la URL **real** que muestre Render, solicita `GET <URL>/health` y confirma HTTP 200 con `success: true` y `data.status: ok`. Solicita también `GET <URL>/ready` y confirma 200 y `data.database: connected`. Después comprueba `POST <URL>/api/v1/auth/login` con una cuenta válida, sin guardar la contraseña en el repositorio. Una instalación vacía requiere el [bootstrap explícito](CORE-HARDENING-OPERATIONS.md) antes del login. Valida la respuesta con un origen permitido y uno no permitido; consulta los logs para confirmar conexión a MongoDB sin revelar la URI.

`/health` por sí solo no prueba que login, RBAC, CORS o Atlas sigan sanos. Un 501 en módulos empresariales pendientes es esperado; no significa que el core esté caído.

## 7. Sitio web, segunda etapa

La app web usa React Native Web y Vite. Después de confirmar el backend, crea un **Static Site** desde el mismo repositorio, con raíz del repositorio, build `npm ci --include=dev && npm run build:packages && npm run web:build` y publish path `apps/web/dist`. Define `VITE_API_BASE_URL=https://erp-api-gateway.eduardoportillo138.workers.dev/api/v1` en Render. En Cloudflare conserva `RENDER_ORIGIN=https://repositorio-sistema-erp-backend.onrender.com` y `WEB_ORIGINS=https://repositorio-sistema-erp-web.onrender.com`; `RENDER_ORIGIN` no lleva `/api/v1`. Vite la incorpora durante el build: tras cambiarla, ejecuta un rebuild/redeploy completo del frontend. Configura un rewrite `/* → /index.html` si usas rutas de navegador. Anota la URL real del sitio, actualiza `CORS_ORIGIN` en el backend y vuelve a desplegar ambos servicios. Comprueba login, refresh de sesión, dashboard y diseño en desktop, tablet y móvil. El dashboard indica módulos sin endpoint real como pendientes; no ofrece métricas ficticias.

## 8. Diagnóstico

| Síntoma            | Comprobación                                                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INSTALL            | Ejecuta `npm ci --include=dev` desde la raíz; comprueba la versión de Node y el lockfile. En Windows/OneDrive, usa una caché npm local si hay `EPERM`; en Render examina el error exacto de red o dependencias. |
| BUILD              | Ejecuta `npm run build:packages` y `npm run backend:build` desde la raíz. No establezcas `rootDir: backend`.                                                                                                    |
| START / ENV        | Comprueba variables obligatorias, que los dos secretos JWT sean distintos y que el log no revele valores.                                                                                                       |
| PORT / HEALTHCHECK | Render aporta `PORT`; usa `/health` sin JWT. La conexión Atlas se realiza antes de escuchar.                                                                                                                    |
| MONGODB            | Comprueba usuario nuevo, URI, nombre de base, estado del cluster y CIDR de salida de Render en Atlas.                                                                                                           |
| CORS               | Comprueba el esquema HTTPS y el origen exacto del sitio, sin ruta ni barra final.                                                                                                                               |
| RUNTIME            | `.node-version` fija Node 24.21.0; revisa que Render lo esté usando.                                                                                                                                            |

## 9. Rollback y redeploy

En Render, abre el historial de despliegues del servicio y vuelve a desplegar una revisión anterior conocida si una actualización falla. Si el cambio afectó a credenciales, conserva la **credencial rotada**; no restaures el secreto comprometido. Corrige la causa, publica un commit nuevo en `main` para el despliegue automático (`autoDeployTrigger: commit`) o usa **Manual Deploy → Deploy latest commit**. Verifica de nuevo `/health`, login y CORS.
