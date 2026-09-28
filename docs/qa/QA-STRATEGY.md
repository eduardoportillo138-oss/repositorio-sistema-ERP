# Estrategia de QA

Actualizado: 2026-09-28. [Resultados ejecutados](../QA-VERIFICATION.md).

## Alcance disponible

Jest unitario y HTTP con Supertest; una suite usa MongoDB 7.0.24 real efímero en loopback. Playwright usa Chromium y API compilada con otra base temporal, más Vite web/mobile. Ninguna suite usa Atlas productivo como base de pruebas.

Las pruebas unitarias incluyen mocks donde corresponde; distinguirlas de persistencia Mongo real. Credenciales y empresas de fixtures son ficticias y no se presentan en la interfaz productiva.

## Ejecución reproducible

```powershell
npm install
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) 'node_modules/.cache/ms-playwright'
npx playwright install chromium
node backend/scripts/cache-test-mongo.cjs
npm run build
npm run lint
npm run format:check
npm run test -- --runInBand --silent
npm run test:unit -- --runInBand --silent
npm run test:integration -- --runInBand --silent
npm run test:e2e
```

La primera descarga de MongoDB/Chromium requiere red. Caches bajo node_modules/.cache están ignoradas. El wrapper E2E fija el directorio de navegador; necesita puertos 3081, 4173 y 4174 libres y no reutiliza un servidor ajeno. serve-qa.cjs genera secretos JWT aleatorios y cierra API/Mongo al terminar.

## Matriz mínima implementada

| Área       | Casos                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Auth       | Password inválido, inactivos, email multiempresa, persistencia/hash y ausencia de hash en identidad                                       |
| Sessions   | Refresh concurrente: un ganador; replay; logout; sesión ajena; access/refresh tipo; expiración; reactivación                              |
| Core CRUD  | Users/Roles/Companies/Branches, referencias empresariales, duplicados, paginación y campos inválidos                                      |
| RBAC       | Permiso faltante/vigente, rol sistema, escalada plataforma histórica y asignación                                                         |
| MongoDB    | Índices únicos por tenant y TTL presente; no se espera la limpieza TTL                                                                    |
| Audit      | Eventos persistidos, arrays/cadenas secretas redactadas, consulta tenant obligatoria                                                      |
| Cliente    | Deduplicación, reintento único, errores/red, generación antigua y logout tras access vencido                                              |
| Assets     | Metro real carga PNG con image-size parcheado                                                                                             |
| Pendientes | POST de 14 módulos devuelve 501, sin éxito ficticio                                                                                       |
| E2E        | Login/teclado/logo, dashboard sin datos inventados, creación/edición/desactivación de usuario y modal, revocación remota y mobile preview |

Viewport: desktop 1440×1000, tablet 900×1100, mobile 390×844. Se verifican overflow horizontal y flujos accesibles por rol/label. Las capturas esperan el cierre real del modal; screenshots desactivan animaciones donde se captura el formulario.

## Qué falta probar

Migración de históricos; fallos de auditoría y recuperación durable; transacciones sobre replica set; carga/concurrencia más allá del refresh; rate limit/orígenes/arranque productivo; respaldo/restauración; accesibilidad completa y lector de pantalla; Android/iOS y dispositivo; cobertura/CI. Inventory/Sales/Purchases/Finance esperan implementación real para pruebas de negocio.

No se ejecutó coverage global; el umbral declarado en Jest no constituye un resultado. No hay Detox ni harness nativo instalado: se retiró esa dependencia sin uso.

## Aprobación y evidencia

Estados de ejecución: PASS, FAIL, BLOCKED y NOT TESTED. Estados de desarrollo: QA_APPROVED, IN_TESTING, IMPLEMENTED, IN_PROGRESS, CORRECTION_REQUIRED, PLANNED y BLOCKED_EXTERNAL_DEPENDENCY.

Un módulo solo puede pasar a QA_APPROVED con requisitos completos, build, pruebas positivas/negativas, aislamiento, RBAC, integridad, errores y documentación, sin funcionalidad TODO/stub. Un módulo que devuelve 501 no está aprobado. El preview navegador tampoco aprueba un release nativo.

Guardar resultados sanitizados en documentación y capturas. Los logs técnicos locales en logs/ están ignorados; no subir secretos para “demostrar” una conexión. Repetir pruebas cuando cambie comportamiento o aparezca un fallo; no sustituir resultados ejecutados por expectativas.
