# Estrategia de QA para el ERP

## 1. Objetivo

Garantizar que cada módulo del ERP no solo compile, sino que funcione correctamente, sea seguro, esté validado y tenga trazabilidad en requisitos, pruebas y resultados.

## 2. Política de calidad

El estado de un módulo no será considerado terminado solo por compilación. Debe cumplirse lo siguiente:
- requiere funcionalidad validada,
- permisos verificados,
- manejo de errores implementado,
- pruebas ejecutadas,
- documentación actualizada,
- impacto en otros módulos revisado.

## 3. Niveles de prueba

### 3.1 Pruebas unitarias
- Validan lógica de negocio aislada.
- Se usan en servicios, utilidades y validadores.
- Herramientas: Jest.

### 3.2 Pruebas de integración
- Validan interacción entre componentes del backend.
- Se revisa API + servicios + repositorios.
- Herramientas: Jest + Supertest.

### 3.3 Pruebas E2E
- Validan flujos reales del usuario.
- Se aplican en web y, cuando corresponde, en mobile.
- Herramientas: Playwright, Detox si es necesario.

### 3.4 Pruebas de frontend
- React Native Testing Library.
- Validación visual y de flujo de interacción.

## 4. Matriz de pruebas

La matriz debe incluir:
- ID
- Módulo
- Requisito
- Precondición
- Pasos
- Datos
- Resultado esperado
- Resultado obtenido
- Estado
- Severidad

Estados permitidos:
- PASS
- FAIL
- BLOCKED
- NOT TESTED

Severidades:
- CRITICAL
- HIGH
- MEDIUM
- LOW

## 5. Casos negativos obligatorios

Se deben probar escenarios de error y riesgo, no solo casos exitosos:
- usuario sin permisos,
- datos incompletos,
- IDs inexistentes,
- producto inexistente,
- cliente inexistente,
- inventario insuficiente,
- cantidades negativas,
- precios negativos,
- tokens expirados,
- tokens inválidos,
- empresa incorrecta,
- sucursal incorrecta,
- doble envío de solicitud,
- errores de red,
- datos duplicados.

## 6. Validación por módulo

Cada módulo debe contar con:
1. Requisitos claros.
2. Casos de uso.
3. Casos de prueba.
4. Pruebas unitarias.
5. Pruebas de integración.
6. E2E cuando corresponda.
7. Validación de permisos.
8. Validación de errores.
9. Revisión de UX.
10. Documentación.

## 7. Validaciones críticas del ERP

### 7.1 Autenticación
- login correcto
- login con usuario inexistente
- password incorrecto
- refresh token válido/inválido
- sesión expirada

### 7.2 Permisos y RBAC
- usuario sin acceso a módulo
- usuario con acceso limitado a empresa
- rol con permisos incompletos
- operación no autorizada

### 7.3 Inventario
- saldo insuficiente
- movimiento no permitido
- registro histórico completo
- cantidades inválidas
- transferencias con almacenes incorrectos

### 7.4 Ventas y compras
- flujo completo validado
- estados no permitidos rechazados
- pedidos con inventario insuficiente bloqueados
- facturas y cuentas por pagar/cobrar correctas

### 7.5 Finanzas
- cálculo de totales en backend
- consistencia entre ventas, cuentas por cobrar y pagos
- diferencia entre ingresos/gastos/cancelaciones

## 8. Calidad de entregables

Cada entrega debe revisar:
- compilación
- tipado
- linter
- pruebas unitarias
- pruebas de integración
- build
- E2E cuando aplique
- documentación actualizada

## 9. Criterio de aprobación QA

Un módulo solo puede pasar a aprobado QA si:
- cumple con requisitos,
- responde correctamente a casos negativos,
- valida permisos,
- maneja errores esperables,
- tiene pruebas automatizadas,
- mantiene seguridad y trazabilidad,
- no introduce regresiones conocidas.

## 10. Conclusión

La estrategia de QA del ERP debe estar alineada con la arquitectura modular y con el enfoque de negocio. La clave no es solo validar lo correcto, sino asegurar que el sistema se comporte de forma segura y consistente ante errores, permisos insuficientes y operaciones críticas.
