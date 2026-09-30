# RENDER DEPLOYMENT REPORT

Fecha: 2026-09-30. Rama: `codex/render-deployment`.

| Área             | Estado verificado                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend          | Compila y arranca desde `dist` con MongoDB temporal; `PORT` dinámico y `/health` 200 verificados. Pendiente Atlas/Render reales.                               |
| Frontend         | Build Vite y 15 pruebas E2E aprobadas en escritorio, tablet y móvil. Aún no publicado.                                                                         |
| Database         | Mongoose conecta a una instancia desechable de QA. **Atlas no verificado**.                                                                                    |
| Render Blueprint | `render.yaml` se analiza como YAML y usa campos documentados de Render. **No validado ni sincronizado en una cuenta Render**.                                  |
| Security         | La credencial expuesta se retiró de la plantilla versionada actual. Sigue en el historial de Git: **rotación y revocación obligatorias antes del despliegue**. |
| Tests            | 69/69 Jest y 15/15 Playwright aprobadas. Lint: 0 errores, 163 advertencias existentes.                                                                         |

## Trabajo realizado

- Se sustituyó la URI real de `.env.example` por placeholders. `.env` y variantes locales permanecen ignorados; `git ls-files` solo incluye `.env.example`.
- Producción exige `MONGODB_URI`, `MONGODB_DB_NAME`, dos secretos JWT distintos y `CORS_ORIGIN` HTTPS válido. Se corrigió la comprobación de longitud para aplicarla solo a secretos JWT.
- El logger de producción envía eventos sanitizados a stdout para que Render pueda recogerlos.
- Se fijó Node 24.21.0 y se creó el Blueprint de backend con build desde la raíz, `npm ci`, `npm run backend:start`, `/health`, auto deploy y variables sensibles `sync: false`.
- Se documentaron Atlas, despliegue, validación, errores, rollback, redeploy y la segunda etapa estática de la web. El logo oficial y la interfaz adaptable ya estaban integrados y fueron verificados visualmente y en E2E; se conservaron.

## Comandos y resultados

| Comando                                                 | Resultado                                                                                                                                                |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --cache .\\tmp\\npm-cache --no-audit --no-fund` | Aprobado con acceso a npm. El primer intento aislado falló por permisos sobre la caché global; el segundo intento aislado falló al descargar un paquete. |
| `npm run build`                                         | Aprobado fuera de la restricción de lectura local que impedía a Vite cargar su configuración. Incluye paquetes, backend, web y preview móvil.            |
| `npm run backend:build`                                 | Aprobado después de corregir la validación de entorno.                                                                                                   |
| `node tmp/check-production.cjs`                         | Aprobado: servidor compilado, MongoDB temporal, `PORT` dinámico, `/health` 200 y CORS permitido/denegado. El script está en `tmp/` e ignorado por Git.   |
| `npm run lint`                                          | Salida 0; 163 advertencias, 0 errores.                                                                                                                   |
| `npm run test -- --runInBand --silent`                  | 8 suites, 69 pruebas aprobadas.                                                                                                                          |
| `npm run test:e2e`                                      | 15 pruebas aprobadas tras instalar Chromium de Playwright en caché ignorada. Las pruebas iniciales fallaron por falta de ese binario.                    |
| Parseo local de `render.yaml` con `js-yaml`             | Aprobado. No sustituye la validación de Blueprint en Render.                                                                                             |

## Archivos creados y modificados

Nuevos: `.node-version`, `render.yaml`, `docs/DEPLOYMENT-RENDER.md`, este reporte. Modificados: `.env.example`, `README.md`, `backend/src/config/env.ts`, `backend/src/utils/logger.ts`.

## Configuración manual y próxima fase

1. Rotar y revocar la credencial Atlas expuesta históricamente. Crear un usuario de aplicación de alcance mínimo y comprobar los rangos CIDR de salida de Render en Atlas Network Access.
2. Revisar y fusionar esta rama en `main`. En Render, importar o sincronizar el Blueprint; proporcionar `MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_SECRET`, `JWT_REFRESH_SECRET` y `CORS_ORIGIN`. Si el Blueprint ya existe, introducir los valores `sync: false` manualmente en el servicio.
3. Confirmar URL real, build, arranque y `/health` 200 en Render. Probar login con cuenta de prueba y verificar MongoDB y CORS sin publicar secretos.
4. Crear el sitio estático web con la URL real del backend en `VITE_API_BASE_URL`, actualizar `CORS_ORIGIN` y repetir E2E/post deploy.

**URL del servicio:** aún no existe una URL verificada. **Health check remoto:** pendiente. **Errores pendientes:** ninguno reproducido en código local; la conexión Atlas y la validación/despliegue en Render siguen sin evidencia.
