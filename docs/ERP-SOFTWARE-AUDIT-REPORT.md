# ERP SOFTWARE AUDIT REPORT

Fecha: 2026-09-28. Repositorio inspeccionado: [repositorio-sistema-ERP](https://github.com/eduardoportillo138-oss/repositorio-sistema-ERP). Base inicial local: b7a8264. Las correcciones están en el checkout local; este informe no acredita publicación ni despliegue.

## 1. Estado general

El ERP contiene un núcleo funcional en endurecimiento y módulos empresariales incompletos. Se inspeccionaron código, modelos Mongoose, consultas, contratos, scripts, dependencias, configuración, historial de .env, documentación y pruebas antes de modificar el sistema. Se corrigieron fallos de seguridad, autenticación, compilación y respuestas ficticias; se incorporó la identidad visual compartida y se ejecutaron pruebas reales.

**CURRENT PHASE: CORE HARDENING. NEXT PHASE: MASTER DATA HARDENING.**

El Core pasó las pruebas automatizadas de esta ejecución, incluida persistencia MongoDB. La promoción de fase sigue pendiente de la rotación de credenciales históricas, migración de datos e índices y una garantía durable de auditoría. No existe aprobación productiva ni de módulos empresariales.

IMPLEMENTED describe código presente. VERIFIED describe exclusivamente el alcance ejecutado: MongoDB temporal limpio, Chromium y builds web. No se probó Atlas, datos históricos, despliegue, Android, iOS ni recuperación ante desastre.

## 2. Arquitectura

Workspaces npm: backend, apps/web, apps/mobile y paquetes types, constants, config, validation, api-client, session y ui. TypeScript y React Native Web ahora compilan en ambas apps. Vite aporta entradas HTML, resolución web de React Native, proxy API y bundles productivos de navegador.

La separación app.ts/server.ts permite probar HTTP sin arrancar una base productiva. Auth y Users usan servicios y repositorios; Roles, Companies y Branches conservan acceso directo a modelos en controladores. La arquitectura por capas está parcialmente aplicada y debe consolidarse gradualmente.

Se añadió BaseRepository con empresa obligatoria y rechazo de modelos sin companyId. Las lecturas, escrituras y conteos fuerzan el contexto empresarial; las actualizaciones rechazan cambio de tenant y operadores peligrosos. Es una salvaguarda preparada para nuevos catálogos, no una declaración de que todos los modelos heredados ya están corregidos.

El frontend comparte la aplicación y presentación en packages/ui, el contexto de sesión en packages/session y el transporte en packages/api-client. No accede a MongoDB. Los controladores pendientes se sustituyeron por errores explícitos, incluidos los controladores antiguos que actualmente no se montan.

Se retiraron dependencias de navegación/estado y herramientas nativas sin consumidores o harness real. Se dejaron de versionar artefactos TypeScript y .env. Se preservó package-lock.json y se normalizó el formato mediante Prettier.

## 3. MongoDB

dotenv carga la configuración desde la raíz del repo. connectDatabase utiliza dbName explícito, pool 0–10, selección de servidor de 5 s, conexión de 10 s y socket de 45 s. En producción autoIndex está desactivado: los índices deben gestionarse con una migración revisada. Errores de conexión y de arranque no imprimen URI ni stack. El cierre espera HTTP/Mongoose y dispone de un plazo de 10 s.

Se ejecutó MongoDB 7.0.24 real, temporal y restringido a loopback mediante mongodb-memory-server. Se comprobaron persistencia e índices únicos de email+companyId, nombre de rol+companyId, código de sucursal+companyId y TTL de sesiones. La prueba de expiración valida el rechazo de sesiones vencidas; no espera ni acredita el tiempo de limpieza del monitor TTL.

**Atlas no fue conectado ni verificado.** Tampoco se aplicó una migración sobre datos existentes. El seed se restringió a desarrollo y al Core; eliminar la creación de catálogos inseguros evita documentos sin tenant.

Pendiente: inventariar documentos históricos sin companyId, referencias cruzadas, duplicados e índice global de email. Preparar respaldo, ensayo sobre copia, migración idempotente, índices y verificación de rollback. No usar syncIndexes indiscriminadamente en producción.

## 4. Seguridad

.env estaba versionado. La copia actual contenía ejemplos, pero dos revisiones históricas (cec3053 y d8a63aa) contenían URIs MongoDB con credenciales de apariencia real. La inspección registró solo indicadores booleanos; ningún secreto se reprodujo en el informe ni en salidas de herramientas.

Se eliminó .env del tracking manteniendo la copia local, se amplió .gitignore y se creó .env.example ficticio. **La exposición histórica sigue abierta: rotar las credenciales afectadas y revisar accesos.** No se reescribió el historial ni se cambió una cuenta externa. Eliminar el archivo del último commit no elimina copias anteriores.

Se corrigieron escalada a permisos de plataforma, revocación de sesiones, secretos en arrays/logs, mensajes de error y configuración de contraseñas. bcrypt utiliza costo configurable 10–15; se rechazan contraseñas superiores a 72 bytes UTF-8 para evitar truncamiento. JWT de acceso/refresh usan claves distintas, algoritmos y tipos explícitos. Helmet, CORS y rate limiting siguen activos.

npm audit final: siete alertas moderadas, cero altas y cero críticas. La cadena pendiente procede del tooling React Native/fast-xml-parser; requiere una migración compatible del stack nativo. Se corrigió image-size con versión 2.0.4 y parche probado de Metro. Véase [auditoría de dependencias](qa/DEPENDENCY-AUDIT.md).

No se acredita un pentest, configuración TLS del despliegue, MFA, recuperación de contraseña, evaluación completa de cargas ni política de backups.

## 5. Auth

Login consulta usuario/empresa/rol activos, verifica bcrypt, persiste únicamente el hash SHA-256 del refresh y emite tokens con sid, tipo y jti aleatorio. Si hay el mismo email en varias empresas, se exige el identificador empresarial para evitar selección arbitraria. La identidad pública incluye empresa y permisos vigentes, sin passwordHash.

El middleware valida firma HS256, tipo, IDs, sesión activa/no vencida y estado actual de usuario, empresa y rol. Logout revoca la sesión persistida, por lo que el access token también deja de funcionar inmediatamente. Desactivar un usuario o empresa y cambiar un rol asignado revoca las sesiones correspondientes; reactivar el usuario no revive sesiones antiguas.

Refresh consume el hash anterior mediante compare-and-swap en el mismo documento Session. Dos solicitudes concurrentes con el mismo refresh producen un único éxito. Se evita la secuencia revocar/crear que podía dejar una sesión nueva inaccesible ante fallos intermedios. La atomicidad de una escritura de documento y la condición de búsqueda corresponden a las garantías de [MongoDB](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/) y [Mongoose findOneAndUpdate](https://mongoosejs.com/docs/tutorials/findoneandupdate.html).

El cliente implementa refresh real, deduplicación concurrente, un solo reintento y protección frente a respuestas de una sesión anterior. Logout con access vencido renueva primero y envía el refresh nuevo al servidor. El contexto compartido escucha la sesión; ya no usa un almacenamiento AsyncStorage ficticio. Los tokens permanecen solo en memoria.

Límites: sin almacenamiento seguro persistente nativo, sin recuperación/MFA y sin transacción conjunta de sesión/lastLogin/auditoría. Una falla de red al cerrar sesión limpia el estado local, pero la revocación remota depende de que el servidor reciba la petición.

## 6. RBAC

La autoridad es backend: User → Role → Permissions consultados en cada petición. Los permisos incluidos en la identidad frontend sirven para presentar controles, no para autorizar escrituras.

Se detectó que un administrador empresarial podía crear un rol con platform.company.create. Ahora un permiso platform.* exige también isPlatformAdmin, marca inmutable que no acepta la API empresarial. Roles empresariales no pueden recibir permisos de plataforma y no se pueden asignar roles de plataforma a usuarios desde ese CRUD. El seed excluye platform.*. Las cuentas de plataforma se aprovisionan por un procedimiento externo controlado que aún debe documentarse para operación.

Se probaron denegaciones por falta de permiso, cambios de rol vigentes, protección de roles de sistema y permisos históricos de plataforma sin marca. No se ofrece una consola global de administración de todas las empresas.

## 7. Multiempresa

Users, Roles y Branches filtran companyId del actor autenticado; validan referencias empresariales de rol y sucursal. Company es la raíz del tenant: consultar/modificar otra empresa se rechaza antes de escribir. Sessions y AuditLog llevan companyId. Las pruebas siembran empresas A/B y verifican lecturas, escrituras y referencias cruzadas denegadas.

**Dieciséis modelos heredados declaran índices empresariales sin tener companyId en su schema efectivo:** AccountsPayable, AccountsReceivable, Category, Customer, Employee, Invoice, Payment, Product, Project, PurchaseOrder, Quote, SalesOrder, Supplier, SystemSetting, Unit y Warehouse. Warehouse también tiene un índice de branchId sin el campo correspondiente. Un índice no agrega campos al schema; Mongoose puede descartar valores desconocidos.

Estos modelos no se habilitaron. Las rutas de negocio quedan autenticadas y bloqueadas con 501; los controladores antiguos también fallan de forma explícita. Notification conserva una estructura por userId que deberá revisarse para tenant antes de habilitarla.

Multisucursal significa aquí pertenencia validada a empresa y guardas sobre usuarios activos al desactivar. No hay políticas completas de visibilidad por sucursal/almacén ni operaciones multiempresa simultáneas en la UI.

## 8. Auditoría

Login/logout, creación, edición y desactivación del Core generan eventos; las modificaciones de rol/empresa se incluyen. Se redactan recursivamente passwords, hashes, tokens, JWT, claves, secretos y credenciales, incluyendo arrays y cadenas con Mongo URI/Bearer/JWT. Se añaden valores desconocidos explícitos para IP/device ausentes. getLogs exige empresa válida y no admite lectura global por omisión.

Se comprobó persistencia de eventos y redacción con MongoDB temporal. No hay una UI ni ruta pública nueva de consulta de auditoría.

**Riesgo abierto:** auditService captura errores de persistencia y permite que la operación de negocio continúe. No garantiza que cada cambio tenga su evento. Antes de declarar el ERP auditable en producción, implementar transacción en replica set u outbox durable, reintentos/alertas y pruebas de fallos. Añadir un UUID o identificador idempotente a eventos cuando se diseñe esa garantía.

## 9. Backend

Users tiene listado, lectura individual, creación, edición y desactivación reales; Roles y Branches tienen operaciones equivalentes. Companies permite la gestión de la propia empresa y creación solo para plataforma autorizada. Validación ObjectId, paginación limitada, campos permitidos, estados y referencias protegen el Core.

Se reforzaron errores normalizados: 400 para validación/JSON inválido, 401 autenticación, 403 permisos, 404 recurso fuera de alcance, 409 duplicados y 413 exceso de tamaño. Errores internos no retornan stack ni detalles de MongoDB.

Customers, Suppliers, Categories, Units, Products, Warehouses, Inventory, Sales, Purchases, Finance, Reports, HR, Projects y CRM no tienen flujos funcionales habilitados. También Settings/Notifications retornan 501. La respuesta es:

```json
{ "success": false, "error": { "code": "NOT_IMPLEMENTED", "message": "Módulo en desarrollo" } }
```

El bloqueo evita “CRUD exitoso” sin persistencia. Su prueba valida el bloqueo, no aprueba el negocio. Inventory aún no cuenta con un libro fiable de movimientos; Sales/Purchases/Finance no pueden considerarse operativos por existir modelos.

## 10. Frontend Web

La entrada React Native Web con Vite ahora compila y se ejecutó en Chromium. Se añadieron tokens comunes, logo optimizado, favicon, login, header, sidebar, navegación responsive y dashboard. Usuarios consume la API real, permite crear/editar nombre/desactivar con validación backend, roles filtrados y confirmación.

Branding: #602CF5, tarjetas blancas, fondo claro, radios/espaciado y estados semánticos. Sidebar desktop de 252 px; compacta de 88 px en tablet; navegación inferior en móvil. Navegación y accesos del dashboard se filtran por permisos.

Siete KPI preparados: ventas, gastos, utilidad neta, proveedores, facturas de venta, leads y stock bajo. Cinco categorías de gráficas: ventas, compras, finanzas, inventario y CRM. El componente puede recibir series; hoy el backend no las proporciona y muestra indisponibilidad, sin números inventados.

Accesibilidad observada: labels en inputs, roles/nombres de controles, foco visible, teclado en login, objetivos principales de 44–48 px, modales y alternativas de texto. Contraste sobre blanco calculado: primary 6.61:1, texto principal 15.67:1, secundario 5.65:1; estados success/warning/danger superiores a 5:1. Esta revisión no equivale a certificación WCAG ni validación completa con lector de pantalla.

Se verificaron overflow horizontal, formularios, tablas/cards, modales, cierre de sesión y estados 501 en 1440×1000, 900×1100 y 390×844. Al ampliar el CRUD E2E se detectó y corrigió una fila no interactiva que heredaba estado deshabilitado a los botones de editar/desactivar en web. La repetición verificó creación, edición y desactivación reales en los tres tamaños. Las [capturas](qa/screenshots/README.md) usan datos ficticios de QA.

## 11. Frontend Mobile

La app móvil usa la misma identidad, AuthProvider, componentes, login, dashboard y usuarios. Productos, Inventory y Customers muestran estados honestos mientras sus APIs están pendientes. El preview web móvil tiene build propio y se probó en los tres viewports.

Se añadió entrada React Native registrada como ERP y configuración API para Android emulator. Una máquina/dispositivo físico requiere URL de backend alcanzable; el loopback del dispositivo no es el servidor del ordenador. La sesión en memoria exige un nuevo login al reiniciar.

**No se generó ni ejecutó APK/IPA.** No existen proyectos nativos completos Android/iOS, firma, splash/icono nativo instalado, integración de Keychain/Keystore ni pruebas en dispositivo. El scaffold Kotlin existente no demuestra esos flujos. El favicon corresponde al navegador.

## 12. Testing

Resultados ejecutados, después de las correcciones. Los comandos unit/integration son subconjuntos de Jest y no se suman al total de 69.

| Comando                                          | Resultado observado   | Alcance                                                   |
| ------------------------------------------------ | --------------------- | --------------------------------------------------------- |
| npm install                                      | PASS, exit 0          | Lockfile y postinstall de Metro; requiere red             |
| npm run build                                    | PASS, exit 0          | Paquetes, backend, TypeScript y bundles web de ambas apps |
| npm run lint                                     | PASS con advertencias | 0 errores, 163 warnings; deuda de any/no usados           |
| npm run format:check                             | PASS, exit 0          | Todos los archivos coinciden con Prettier                 |
| npm run test -- --runInBand --silent             | PASS                  | 8 suites, 69 tests                                        |
| npm run test:unit -- --runInBand --silent        | PASS                  | 5 suites, 34 tests                                        |
| npm run test:integration -- --runInBand --silent | PASS                  | 3 suites, 35 tests; 31 usan MongoDB real                  |
| npm run test:e2e                                 | PASS                  | 15 tests Chromium, 5 flujos × 3 viewports                 |
| npm audit --json                                 | EXIT 1, pendiente     | 7 moderadas, 0 altas/críticas                             |

Prettier detectó inicialmente deuda de formato; se normalizó el repositorio y el resultado final se registra en [QA-VERIFICATION](QA-VERIFICATION.md). Vite emite avisos heredados por directivas “use client” de React Native Web; no impiden generar los bundles.

La suite MongoDB cubre login persistido, hash de sesión, refresh concurrente/replay, logout, expiración, estados inactivos, CRUD Core, índices, aislamiento, inyección, duplicados, RBAC y auditoría. Las unitarias agregan refresh del cliente, errores, sesiones obsoletas, redacción, límite bcrypt y carga real del asset en Metro.

E2E arranca API compilada con MongoDB desechable y ambos servidores Vite, hace login real, creación/edición/desactivación de usuario y revocación comprobada por HTTP. No utiliza mocks como backend principal. Las credenciales de fixture pertenecen solo a tests. No se ejecutó cobertura global ni se acredita el umbral declarado en Jest.

## 13. Hallazgos críticos

| ID      | Severidad | Hallazgo / efecto                                                                      | Resolución y estado                                                    |
| ------- | --------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| SEC-01  | CRITICAL  | Credenciales MongoDB de apariencia real en historial .env                              | Tracking corregido; exposición OPEN hasta rotación/revisión de accesos |
| SEC-02  | HIGH      | Permisos empresariales podían elevarse a plataforma                                    | CORREGIDO: marca externa obligatoria, guardas y pruebas negativas      |
| AUTH-01 | HIGH      | Access seguía usable tras logout; sesiones revivían al reactivar usuario               | CORREGIDO: sid/sesión por petición y revocación persistida             |
| AUTH-02 | HIGH      | Refresh concurrente podía consumir/crear sesiones de forma inconsistente               | CORREGIDO: CAS de un documento, prueba concurrente real                |
| TEN-01  | HIGH      | 16 schemas de negocio sin companyId efectivo                                           | CONTENIDO por 501; corrección/migración pendiente antes de habilitar   |
| AUD-01  | HIGH      | Cambios pueden quedar sin evento si Mongo falla al auditar                             | OPEN: transacción/outbox y pruebas de fallo                            |
| DATA-01 | HIGH      | Migraciones históricas e índices de instalaciones existentes desconocidos              | OPEN: ensayo y migración controlada antes de desplegar                 |
| API-01  | HIGH      | Controladores heredados anunciaban éxito sin persistencia                              | CORREGIDO: 501 explícito en rutas y controladores                      |
| LOG-01  | MEDIUM    | Arrays/cadenas podían filtrar credenciales; errores de seed/arranque exponían detalles | CORREGIDO: redacción recursiva y mensajes restringidos                 |
| CLI-01  | MEDIUM    | Cliente sin refresh real ni sincronización de tokens                                   | CORREGIDO y verificado con integración de UI y unitarias               |
| DEP-01  | MEDIUM    | Siete alertas en cadena React Native/fast-xml-parser                                   | OPEN: actualización compatible del stack nativo                        |
| UI-01   | MEDIUM    | Apps no compilaban y datos/estados de interfaz eran engañosos                          | CORREGIDO en web/preview; release nativo sigue sin verificar           |
| ARCH-01 | LOW       | Capas inconsistentes, tipos any y código heredado                                      | PARCIAL: repositorio seguro; refactor/deuda de lint pendientes         |

La severidad describe el impacto sobre un ERP productivo. “Contenido” significa que el endpoint permanece deshabilitado, no que el modelo esté listo.

## Matriz de estado

| Área                | Estado              | Evidencia                                               | Acción                                                |
| ------------------- | ------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| Architecture        | IN_PROGRESS         | Workspaces/build completo; capas parcialmente aplicadas | Consolidar servicios/repositorios                     |
| MongoDB             | IN_TESTING          | 31 tests con Mongo 7.0.24 e índices reales              | Migrar históricos y verificar entorno objetivo        |
| Auth                | IN_TESTING          | Login, CAS, sesión activa y revocación probados         | Resolver garantías ante fallos y despliegue           |
| Users               | IN_TESTING          | CRUD HTTP/Mongo y UI real                               | Completar escenarios productivos y migración          |
| RBAC                | IN_TESTING          | Permisos vigentes/tenant/plataforma negativos           | Formalizar provisioning de plataforma                 |
| Companies           | IN_TESTING          | Scope, creación protegida y desactivación probados      | Migración/operación productiva                        |
| Branches            | IN_TESTING          | Scope, referencias y guardas probadas                   | Política de alcance por sucursal                      |
| Audit               | CORRECTION_REQUIRED | Eventos/redacción probados; persistencia best effort    | Outbox/transacción durable                            |
| Master Data         | CORRECTION_REQUIRED | Schemas incompletos, endpoints 501                      | Endurecer seis catálogos en orden                     |
| Inventory           | CORRECTION_REQUIRED | Flujo no habilitado                                     | Movimientos después de Products/Warehouses            |
| Sales               | CORRECTION_REQUIRED | Endpoints 501                                           | Flujo documental tras Inventory                       |
| Purchases           | CORRECTION_REQUIRED | Endpoints 501                                           | Flujo de compras tras catálogos/Inventory             |
| Finance             | CORRECTION_REQUIRED | Endpoints 501                                           | Consistencia AR/AP/pagos y dinero                     |
| Reports             | PLANNED             | Dashboard sin datos muestra indisponibilidad            | Agregaciones aisladas sobre datos fiables             |
| HR / Projects / CRM | PLANNED             | Sin flujo verificado, 501                               | Definir modelos/tenant y requisitos                   |
| Web                 | IN_TESTING          | Bundle + E2E 3 tamaños + capturas                       | Completar accesibilidad y flujos al habilitar negocio |
| Mobile preview      | IN_TESTING          | Bundle compartido y E2E navegador                       | Continuar preview coherente                           |
| Mobile native       | IN_PROGRESS         | Sin harness/proyectos completos ni dispositivo probado  | Configurar plataforma, SDK, firma y prueba real       |
| Testing             | IN_PROGRESS         | 69 Jest, 15 E2E                                         | Fallos audit/migración/native/CI y cobertura          |
| Security            | CORRECTION_REQUIRED | Guardas/logs probados; historial vulnerable             | Rotación, revisión de acceso y dependencias           |

Ningún módulo aparece QA_APPROVED. Las pruebas del Core permiten continuar su cierre; las pruebas de bloqueo de negocio no justifican adelantar fases.

## Fase siguiente y condiciones

CURRENT PHASE: CORE HARDENING. NEXT PHASE: MASTER DATA HARDENING.

Bloqueos restantes: rotación de credenciales históricas, migración probada sobre copia de datos, garantía durable de auditoría y validación de configuración/índices del entorno de despliegue. Las pruebas MongoDB/tenant básicas e índices sobre base limpia ya pasaron.

Tras cerrar esos puntos, implementar Categories → Units → Customers → Suppliers → Warehouses → Products con companyId requerido, referencias de empresa/sucursal/almacén, índices, validación, CRUD real, RBAC, eventos y pruebas A/B. Habilitar cada endpoint únicamente cuando el módulo esté verificado. No arrancar Sales antes de Inventory ni Inventory antes de Products/Warehouses.

El [plan de continuación](NEXT-STEPS.md) describe todas las fases y sus dependencias.
