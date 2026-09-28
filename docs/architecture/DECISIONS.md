# Decisiones de arquitectura

Actualizado: 2026-09-28. Decisiones implementadas y propuestas identificadas por separado.

## ADR-001: sesión compartida en React Context — IMPLEMENTED

AuthProvider de packages/session y store en memoria del cliente HTTP. Se retiró Zustand al no existir consumidores reales. Un state manager de negocio puede evaluarse cuando haya necesidad concreta. Recargar implica nuevo login.

## ADR-002: JWT con sesión MongoDB — IMPLEMENTED

Access y refresh identifican Session por sid/tipo. Se consulta identidad, permisos y sesión en backend; el sistema no es stateless. Logout/desactivación revocan y refresh rota mediante CAS en un documento. No requiere Redis para este alcance.

## ADR-003: repositorio empresarial con contexto obligatorio — IMPLEMENTED

BaseRepository exige companyId y schema adecuado. Impone filtro de tenant y protege actualizaciones. Auth/Users tienen repositorios; otros controladores Core aún acceden directamente a Mongoose.

## ADR-004: transacciones/outbox para integridad — PLANNED

Auditoría actual es best effort. Antes de producción debe garantizarse la escritura durable del evento junto con el cambio. Transacciones multidocumento necesitan replica set y pruebas de fallo; las suites actuales no prueban ese diseño futuro.

## ADR-005: stock por movimientos — PLANNED

ENTRY/EXIT/TRANSFER/ADJUSTMENT/RETURN serán la fuente de cambios. No hay libro operativo aprobado; no se acredita inventario por existir InventoryMovement.

## ADR-006: monorepo npm workspaces — IMPLEMENTED

Paquetes compartidos, un lockfile y build que incluye backend y bundles web de ambas apps. Native Android/iOS sigue pendiente.

## ADR-007: precisión monetaria — PLANNED

La documentación anterior decía Decimal128 y a la vez Number: era contradictoria. Los modelos heredados usan Number y no son un motor financiero aprobado. La fase Finance debe decidir representación decimal o unidades menores, moneda, redondeo y serialización; probar exactitud. No atribuir precisión decimal a Number.

## ADR-008: desactivación en vez de borrado físico — IMPLEMENTED EN CORE

Estados y operaciones de desactivación preservan datos; la desactivación de identidad revoca sesiones. Las reglas de conservación fiscal del negocio aún requieren definición.

## ADR-009: frontend consume REST — IMPLEMENTED

La interfaz solo consume /api/v1; no recibe URI/credenciales MongoDB. Se comparten UI, sesión y transporte. Los permisos del frontend son presentación, la autorización vive en API.

## ADR-010: contratos compartidos — IN_PROGRESS

packages/types tiene catálogo/tipos; api-client define envelope, sesión y errores del transporte actual. Persisten tipos heredados y any. Consolidar contratos antes de ampliar negocio.

## ADR-011: Metro/image-size — IMPLEMENTED Y VERIFIED EN ASSET

Override image-size 2.0.4 y parche versionado de Metro 0.80.12 aplicado por postinstall. Prueba carga el logo con Metro. Revisar el parche al actualizar stack nativo.
