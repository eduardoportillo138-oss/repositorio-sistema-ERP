# Cloudflare API Gateway para ERP

## Arquitectura

La web alojada en Render y la aplicación Android llaman al Worker. El Worker reenvía únicamente las rutas permitidas al backend Express en Render; Express conserva autenticación JWT, reglas de negocio y acceso a MongoDB Atlas. El Worker no conecta con Atlas ni necesita secretos JWT.

Web Render / Android → Cloudflare Worker → Render backend → MongoDB Atlas

El backend permanece en https://repositorio-sistema-erp-backend.onrender.com y la API directa en https://repositorio-sistema-erp-backend.onrender.com/api/v1. El cambio de clientes no se activa hasta conocer la URL real del Worker desplegado.

## Rutas y comportamiento

- `GET /health`: responde el propio Worker; confirma solo que el gateway funciona.
- `GET /ready`: reenvía a Render `/ready`; confirma la disponibilidad que informa Express y su conexión de base de datos.
- `/api/v1/*`: reenvía método, query string, cuerpo y las cabeceras `Authorization`, `Content-Type`, `Accept` y `X-Request-ID`. Incluye `/api/v1/auth/login`, `/api/v1/users`, `/api/v1/roles` y `/api/v1/branches`.
- Cualquier otra ruta responde 404. No hay parámetro de destino, reintentos automáticos ni cacheo de respuestas dinámicas. Las respuestas se marcan `Cache-Control: no-store`.
- Un fallo de conexión con Render produce 502; el timeout de 27 segundos produce 504. El error expuesto al cliente no incluye información interna.

El backend Render puede tardar en despertar en su plan Free. Un timeout del cliente o del Worker no justifica reintentar automáticamente un POST: podría duplicar una mutación ya procesada.

## Crear cuenta y desplegar

1. Crear una cuenta en Cloudflare y habilitar el subdominio `workers.dev` de la cuenta desde el panel de Workers & Pages.
2. En una terminal local, entrar a la raíz del repositorio y ejecutar `npm.cmd ci --include=dev`.
3. Ejecutar `npx wrangler login` desde `cloudflare/worker`, o configurar `CLOUDFLARE_API_TOKEN` únicamente en el entorno local o CI. No guardar el token en Git.
4. Revisar `cloudflare/worker/wrangler.jsonc`. `RENDER_ORIGIN` debe ser la URL HTTPS pública de Render sin ruta final; `WEB_ORIGINS` contiene los orígenes web exactos separados por comas. No agregar secretos al archivo.
5. Ejecutar `npm.cmd run cloudflare:typecheck`, `npm.cmd run cloudflare:test` y `npm.cmd run cloudflare:build`.
6. Ejecutar `npm.cmd run cloudflare:deploy`. Registrar la URL real que muestre Wrangler. Un dry run no equivale a deploy.
7. Probar `GET <URL_REAL>/health` y `GET <URL_REAL>/ready`. Comparar la segunda respuesta con `GET https://repositorio-sistema-erp-backend.onrender.com/ready`.
8. Probar un preflight con origen `https://repositorio-sistema-erp-web.onrender.com` y una llamada autenticada a la API. Verificar que la ruta de login mantiene el cuerpo original.

No se incluye `account_id`, token de API ni URL `workers.dev` inventada en el repositorio.

## CORS

El Worker permite únicamente los orígenes incluidos en `WEB_ORIGINS`; inicialmente está el frontend de Render: https://repositorio-sistema-erp-web.onrender.com. Responde preflight `OPTIONS` para métodos y cabeceras admitidos y devuelve `Access-Control-Allow-Origin` con el origen exacto. Nunca usa `*` junto con credenciales. La app React Native no está limitada por CORS del navegador. Si se añade un dominio web de Cloudflare, agregar su origen HTTPS exacto a `WEB_ORIGINS` y volver a desplegar. El backend mantiene su propia política `CORS_ORIGIN` para acceso directo durante el rollback.

## Activar clientes de forma controlada

- Web: configurar en el servicio de frontend de Render `VITE_API_BASE_URL=<URL_REAL_DEL_WORKER>/api/v1` y reconstruir/publicar la web. `apps/web/src/index.tsx` ya consume esta variable y conserva el fallback `/api/v1`.
- Android: pasar la URL pública durante el build, por ejemplo `-PmobileApiBaseUrl=<URL_REAL_DEL_WORKER>/api/v1`. `apps/mobile/src/config/api.ts` ya acepta cualquier origen HTTPS válido con ruta `/api/v1`. El valor por defecto actual de Gradle sigue apuntando a Render hasta cambiarlo expresamente.
- La URL del Worker es pública. No introducir secretos de MongoDB, JWT, Render ni Cloudflare en estas configuraciones de cliente.

## Pruebas y rollback

Ejecutar desde la raíz `npm.cmd run cloudflare:test` y `npm.cmd run cloudflare:build`. Después del despliegue, probar login, lectura autorizada, errores de backend y OPTIONS desde el origen web real. Las pruebas automáticas verifican el destino restringido, query string, cuerpo JSON, Authorization, CORS, 404, error 500 y backend inaccesible.

Para volver al acceso directo, configurar `VITE_API_BASE_URL=https://repositorio-sistema-erp-backend.onrender.com/api/v1` en Render y reconstruir la web. Para Android, compilar la app con `-PmobileApiBaseUrl=https://repositorio-sistema-erp-backend.onrender.com/api/v1`. No es necesario mover el backend ni cambiar JWT o MongoDB.

## Límite de tasa antes del cambio

Express aplica un límite global basado en la IP que recibe. Al pasar por el Worker, Render puede ver la IP de salida de Cloudflare y agrupar solicitudes de varios usuarios en una sola cuota. Verificar este comportamiento con tráfico real antes de cambiar las URLs de producción. No habilitar `trust proxy` ni aceptar `X-Forwarded-For` de clientes directos sin un diseño que autentique al proxy; el acceso directo a Render seguirá disponible para rollback.
