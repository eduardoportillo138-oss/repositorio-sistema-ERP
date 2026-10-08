# Verificación QA actual

## Cierre de dashboard — 2026-10-07

En `main` basado en `4d90e82`, el harness `node scripts/run-e2e.cjs` compiló
paquetes, backend, web y preview móvil y pasó **51 E2E** en Chromium para
desktop, tablet y móvil. Tras el ajuste final de distribución de tarjetas,
`node scripts/run-e2e.cjs -g "dashboard real|Mobile Preview"` volvió a compilar
y pasó **6 E2E**. El dashboard ahora muestra solo las métricas y series que
devuelve el API. La compilación conserva las advertencias habituales de
directivas `use client` de React Native Web y del bundle web mayor a 500 kB.

## Evidencia histórica — 2026-10-02

**Verified at:** 2026-10-02 10:34 America/Mexico_City. **Commit:** `868518619e030976d4f6fe4131eb6df28ccf5b45` (base; las pruebas se ejecutaron sobre los cambios del working tree de esta fase). **Environment:** Windows/OneDrive, Node 24.21.0, npm 11.19.0, MongoDB 7.0.24 temporal en replica set, Chromium de Playwright. Ninguna prueba usa Atlas ni la URI del `.env` local.

| Comando / verificación                                               |     Exit code | Resultado actual                                                                                                                                   |
| -------------------------------------------------------------------- | ------------: | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`                                                      |             0 | Siete paquetes, backend, web y preview móvil compilaron. No genera APK.                                                                            |
| `npm run lint`                                                       |             0 | 0 errores, 175 advertencias.                                                                                                                       |
| `npm run format:check`                                               |             0 | Todos los archivos cubiertos por Prettier cumplen formato.                                                                                         |
| `npm run test -- --runInBand --silent`                               |             0 | 9 suites, 77 tests.                                                                                                                                |
| `npm run test:unit -- --runInBand --silent`                          |             0 | 6 suites, 37 tests; subconjunto del total.                                                                                                         |
| `npm run test:integration -- --runInBand --silent`                   |             0 | 3 suites, 40 tests; subconjunto del total.                                                                                                         |
| `npm run test:e2e`                                                   |             0 | 15 pruebas Chromium: escritorio, tableta y móvil; login, usuarios, logout y preview.                                                               |
| Web build con `VITE_API_BASE_URL=https://api.example.invalid/api/v1` |             0 | La URL ficticia apareció en el bundle Vite.                                                                                                        |
| `git check-ignore .env` / `git ls-files .env`                        |             0 | `.env` ignorado y sin tracking.                                                                                                                    |
| `npm audit`                                                          | 1 / rechazado | Endpoint inaccesible en sandbox; la revisión automática rechazó la consulta externa por divulgación de metadatos. Conteos actuales no verificados. |

El total Jest es **77**: no sumar los 37 unitarios y 40 de integración. MongoDB temporal confirmó rollback de negocio si falla auditoría, retry sin duplicación, `eventId` único, aislamiento por tenant, bootstrap inicial/transacción/segunda ejecución, migración dry-run/apply idempotente, RBAC desde Role y rutas 501. `/ready` respondió 200 conectado y 503 desconectado. E2E usa bundles de producción y backend temporal aislado; el harness detiene los procesos de QA al salir.

**Dependency audit:** critical **no verificado**, high **no verificado**, moderate **no verificado**, low **no verificado**. La cifra de siete moderadas del [informe anterior](qa/DEPENDENCY-AUDIT.md) es `HISTORICAL RESULT (2026-09-28)`. No se ejecutó `npm audit fix --force` ni se actualizó React Native 0.73.11.

**Límites:** no hubo conexión, backup ni migración en Atlas; no se desplegó Render ni se observó el workflow GitHub Actions aún. La evidencia reciente aportada reporta APK debug/Metro verificados, pero este checkout no conserva el APK y aquí no se ejecutó Gradle/AVD/login Android. Release e iOS siguen sin verificar. `npm ci --include=dev` está configurado en Render y CI; esta ejecución local usó las dependencias ya instaladas y no repitió una instalación limpia.

Los resultados de 2026-09-28/29 en el [informe histórico](ERP-SOFTWARE-AUDIT-REPORT.md) no sustituyen esta ejecución. Los primeros intentos de esta fase fallaron por falta de binario MongoDB/Chromium y por la carga de configuración de Vite en OneDrive; tras preparar el entorno y corregir el harness, los comandos finales de la tabla concluyeron con los exit codes indicados.
