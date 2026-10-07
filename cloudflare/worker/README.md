# Cloudflare API gateway

Este paquete ejecuta un reverse proxy limitado para la API del ERP. La guía de operación está en [CLOUDFLARE-API-GATEWAY.md](../../docs/cloudflare/CLOUDFLARE-API-GATEWAY.md).

Desde la raíz del monorepo:

- `npm.cmd run cloudflare:typecheck`
- `npm.cmd run cloudflare:test`
- `npm.cmd run cloudflare:build`
- `npm.cmd run cloudflare:dev`
- `npm.cmd run cloudflare:deploy`

`cloudflare:build` es un dry run local; no publica el Worker. La URL de Render y los orígenes web permitidos se configuran en `wrangler.jsonc` mediante `RENDER_ORIGIN` y `WEB_ORIGINS`. Ambas variables contienen URLs públicas, no credenciales. El token de Cloudflare se proporciona solo mediante `wrangler login` o una variable de entorno privada en CI.
