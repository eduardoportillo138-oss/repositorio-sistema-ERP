import { test, expect, Page } from '@playwright/test';
import path from 'node:path';
const captures = path.resolve(__dirname, '../../../../docs/qa/screenshots');

async function login(page: Page, base = '/') {
  await page.goto(base);
  await page.getByLabel('Correo electrónico', { exact: true }).fill('qa@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('E2ETestPassword123!');
  const response = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/v1/auth/login') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  return (await (await response).json()).data;
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
}
async function openUsers(page: Page) {
  if ((page.viewportSize()?.width || 0) < 768)
    await page.getByRole('button', { name: 'Más módulos' }).click();
  await page.getByRole('button', { name: 'Usuarios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Usuarios', exact: true })).toBeVisible();
}
test('login: logo, proporción, teclado, errores y responsive', async ({ page }, info) => {
  await page.goto('/');
  const logo = page.getByRole('img', { name: 'ERP Empresarial: castor en un baúl' }).last();
  await expect(logo).toBeVisible();
  const box = await logo.boundingBox();
  expect(box!.width).toBe(box!.height);
  await page.getByLabel('Correo electrónico', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Contraseña', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByText('Escribe tu correo y contraseña.')).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: path.join(captures, 'login-' + info.project.name + '.png'),
    fullPage: true,
  });
});
test('dashboard real muestra disponibilidad sin inventar métricas', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await expect(page.getByText('Empresa de prueba A', { exact: true })).toBeVisible();
  await expect(page.getByText('Próximamente', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Tu información, pronto aquí', { exact: true })).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: path.join(captures, 'dashboard-' + info.project.name + '.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Productos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Productos', exact: true })).toBeVisible();
  await noOverflow(page);
});
test('Usuarios: lista persistida, modal, crear usuario y RBAC visible', async ({ page }, info) => {
  await login(page);
  await openUsers(page);
  await expect(page.getByText('qa@example.test', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nuevo usuario', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('QA Worker ' + info.project.name);
  await page
    .getByLabel('Correo electrónico', { exact: true })
    .fill('worker-' + info.project.name + '@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('E2ETestPassword123!');
  await page.getByRole('button', { name: 'Selecciona un rol', exact: true }).click();
  await page.getByRole('button', { name: 'Administrador QA', exact: true }).click();
  await noOverflow(page);
  await page.getByRole('button', { name: 'Guardar usuario', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(captures, 'user-form-' + info.project.name + '.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Guardar usuario', exact: true }).click();
  await expect(page.getByText('QA Worker ' + info.project.name, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar modal' })).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({
    path: path.join(captures, 'users-' + info.project.name + '.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
  const updatedName = 'QA Worker ' + info.project.name + ' editado';
  await page.getByLabel('Nombre', { exact: true }).fill(updatedName);
  await page.getByRole('button', { name: 'Guardar usuario', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cerrar modal' })).toHaveCount(0);
  await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Desactivar', exact: true }).first().click();
  const deactivated = page.waitForResponse(
    (response) => response.url().endsWith('/deactivate') && response.request().method() === 'PATCH',
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Desactivar', exact: true }).click();
  expect((await (await deactivated).json()).data.status).toBe('inactive');
  await expect(page.getByRole('button', { name: 'Cerrar modal' })).toHaveCount(0);
  await expect(page.getByText('Inactivo', { exact: true }).first()).toBeVisible();
  await noOverflow(page);
});
test('Clientes: crear, buscar, editar y desactivar desde web y vista móvil', async ({ page }, info) => {
  await login(page);
  await page.getByRole('button', { name: 'Clientes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible();
  const name = 'Cliente QA ' + info.project.name;
  await page.getByRole('button', { name: 'Nuevo cliente' }).click();
  await page.getByLabel('Nombre', { exact: true }).fill(name);
  await page.getByLabel('Correo electrónico', { exact: true })
    .fill('cliente-' + info.project.name + '@example.test');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Cliente creado.')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar modal' }).first().click();
  await page.getByLabel('Buscar clientes').fill(name);
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Ver detalle' }).first().click();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill(name + ' editado');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Cliente actualizado.')).toBeVisible();
  await page.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await expect(page.getByText('El cliente permanecerá en el historial. ¿Confirmas la desactivación?'))
    .toBeVisible();
  await page.getByRole('button', { name: 'Desactivar', exact: true }).last().click();
  await expect(page.getByText('Cliente desactivado.')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar modal' }).first().click();
  await page.getByRole('button', { name: 'Inactivos', exact: true }).click();
  await expect(page.getByText(name + ' editado', { exact: true }).first()).toBeVisible();
  await noOverflow(page);
});
test('Proveedores: crear, editar y desactivar desde web y vista móvil', async ({ page }, info) => {
  await login(page);
  if ((page.viewportSize()?.width || 0) < 768)
    await page.getByRole('button', { name: 'Más módulos' }).click();
  await page.getByRole('button', { name: 'Proveedores', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Proveedores', exact: true })).toBeVisible();
  const name = 'Proveedor QA ' + info.project.name;
  await page.getByRole('button', { name: 'Nuevo proveedor' }).click();
  await page.getByLabel('Nombre', { exact: true }).fill(name);
  await page.getByLabel('Persona de contacto').fill('Contacto QA');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Proveedor creado.')).toBeVisible();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill(name + ' editado');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Proveedor actualizado.')).toBeVisible();
  await page.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await page.getByRole('button', { name: 'Desactivar', exact: true }).last().click();
  await expect(page.getByText('Proveedor desactivado.')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar modal' }).first().click();
  await page.getByRole('button', { name: 'Inactivos', exact: true }).click();
  await expect(page.getByText(name + ' editado', { exact: true }).first()).toBeVisible();
  await noOverflow(page);
});
test('Categorías: crear, editar y desactivar desde web y vista móvil', async ({ page }, info) => {
  await login(page);
  if ((page.viewportSize()?.width || 0) < 768)
    await page.getByRole('button', { name: 'Más módulos' }).click();
  await page.getByRole('button', { name: 'Categorías', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Categorías', exact: true })).toBeVisible();
  const name = 'Categoría QA ' + info.project.name;
  await page.getByRole('button', { name: 'Nueva categoría' }).click();
  await page.getByLabel('Nombre', { exact: true }).fill(name);
  await page.getByLabel('Código', { exact: true }).fill('CAT_' + info.project.name.toUpperCase());
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Categoría creada.')).toBeVisible();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Descripción', { exact: true }).fill('Descripción QA');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Categoría actualizada.')).toBeVisible();
  await page.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await page.getByRole('button', { name: 'Desactivar', exact: true }).last().click();
  await expect(page.getByText('Categoría desactivada.')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar modal' }).first().click();
  await page.getByRole('button', { name: 'Inactivos', exact: true }).click();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await noOverflow(page);
});
test('Unidades: crear, editar y desactivar desde web y vista móvil', async ({ page }, info) => {
  await login(page);
  if ((page.viewportSize()?.width || 0) < 768)
    await page.getByRole('button', { name: 'Más módulos' }).click();
  await page.getByRole('button', { name: 'Unidades', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Unidades', exact: true })).toBeVisible();
  const name = 'Unidad QA ' + info.project.name;
  await page.getByRole('button', { name: 'Nueva unidad' }).click();
  await page.getByLabel('Nombre', { exact: true }).fill(name);
  await page.getByLabel('Código', { exact: true }).fill('UNT_' + info.project.name.toUpperCase());
  await page.getByLabel('Símbolo', { exact: true }).fill('u');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Unidad creada.')).toBeVisible();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Descripción', { exact: true }).fill('Unidad de prueba');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Unidad actualizada.')).toBeVisible();
  await page.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await page.getByRole('button', { name: 'Desactivar', exact: true }).last().click();
  await expect(page.getByText('Unidad desactivada.')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar modal' }).first().click();
  await page.getByRole('button', { name: 'Inactivos', exact: true }).click();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await noOverflow(page);
});
test('Almacenes: crear con sucursal, editar y desactivar', async ({ page, request }, info) => {
  const pair = await login(page);
  const branchName = 'Sucursal QA ' + info.project.name;
  const branch = await request.post('http://127.0.0.1:3081/api/v1/branches', {
    headers: { Authorization: 'Bearer ' + pair.accessToken },
    data: { name: branchName, code: 'QA_' + info.project.name.toUpperCase(),
      address: 'Calle QA', city: 'CDMX', country: 'MX' },
  });
  expect(branch.status()).toBe(201);
  if ((page.viewportSize()?.width || 0) < 768)
    await page.getByRole('button', { name: 'Más módulos' }).click();
  await page.getByRole('button', { name: 'Almacenes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Almacenes', exact: true })).toBeVisible();
  const name = 'Almacén QA ' + info.project.name;
  await page.getByRole('button', { name: 'Nuevo almacén' }).click();
  await page.getByLabel('Nombre', { exact: true }).fill(name);
  await page.getByLabel('Código', { exact: true }).fill('ALM_' + info.project.name.toUpperCase());
  await page.getByRole('button', { name: 'Selecciona una sucursal' }).click();
  await page.getByRole('button', { name: branchName }).click();
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Almacén creado.')).toBeVisible();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Dirección', { exact: true }).fill('Nave QA');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Almacén actualizado.')).toBeVisible();
  await page.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await page.getByRole('button', { name: 'Desactivar', exact: true }).last().click();
  await expect(page.getByText('Almacén desactivado.')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar modal' }).first().click();
  await page.getByRole('button', { name: 'Inactivos', exact: true }).click();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await noOverflow(page);
});
test('Productos: crear con categoría y unidad, editar y desactivar', async ({ page, request }, info) => {
  const pair = await login(page);
  const headers = { Authorization: 'Bearer ' + pair.accessToken };
  const suffix = info.project.name.toUpperCase();
  const categoryName = 'Categoría Producto ' + info.project.name;
  const unitName = 'Unidad Producto ' + info.project.name;
  const category = await request.post('http://127.0.0.1:3081/api/v1/categories', {
    headers, data: { name: categoryName, code: 'PCAT_' + suffix },
  });
  const unit = await request.post('http://127.0.0.1:3081/api/v1/units', {
    headers, data: { name: unitName, code: 'PUNIT_' + suffix, symbol: 'u' },
  });
  expect(category.status()).toBe(201);
  expect(unit.status()).toBe(201);
  await page.getByRole('button', { name: 'Productos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Productos', exact: true })).toBeVisible();
  const name = 'Producto QA ' + info.project.name;
  await page.getByRole('button', { name: 'Nuevo producto' }).click();
  await page.getByLabel('Código', { exact: true }).fill('PROD_' + suffix);
  await page.getByLabel('Nombre', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Selecciona una categoría' }).click();
  await page.getByRole('button', { name: categoryName }).click();
  await page.getByRole('button', { name: 'Selecciona una unidad' }).click();
  await page.getByRole('button', { name: unitName }).click();
  await page.getByLabel('Precio de venta').fill('123.45');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Producto creado.')).toBeVisible();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Precio de venta').fill('150.25');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Producto actualizado.')).toBeVisible();
  await expect(page.getByText(/Precio: 150\.25/)).toBeVisible();
  await page.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await page.getByRole('button', { name: 'Desactivar', exact: true }).last().click();
  await expect(page.getByText('Producto desactivado.')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar modal' }).first().click();
  await page.getByRole('button', { name: 'Inactivos', exact: true }).click();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await noOverflow(page);
});
test('Inventario: existencia inicial y transferencia conservan el total', async ({ page, request }, info) => {
  const pair = await login(page);
  const headers = { Authorization: 'Bearer ' + pair.accessToken };
  const suffix = info.project.name.toUpperCase();
  const api = 'http://127.0.0.1:3081/api/v1';
  const branch = await request.post(api + '/branches', { headers,
    data: { name: 'Sucursal Stock ' + suffix, code: 'STBR_' + suffix,
      address: 'QA', city: 'CDMX', country: 'MX' } });
  expect(branch.status()).toBe(201);
  const branchId = (await branch.json()).data._id as string;
  const warehouse1 = await request.post(api + '/warehouses', { headers,
    data: { name: 'Origen Stock ' + suffix, code: 'STO_' + suffix, branchId } });
  const warehouse2 = await request.post(api + '/warehouses', { headers,
    data: { name: 'Destino Stock ' + suffix, code: 'STD_' + suffix, branchId } });
  const category = await request.post(api + '/categories', { headers,
    data: { name: 'Stock Cat ' + suffix, code: 'STC_' + suffix } });
  const unit = await request.post(api + '/units', { headers,
    data: { name: 'Stock Unit ' + suffix, code: 'STU_' + suffix, symbol: 'u' } });
  for (const result of [warehouse1, warehouse2, category, unit]) expect(result.status()).toBe(201);
  const productName = 'Inventario QA ' + info.project.name;
  const product = await request.post(api + '/products', { headers,
    data: { name: productName, code: 'STP_' + suffix,
      categoryId: (await category.json()).data.id,
      unitId: (await unit.json()).data.id, priceMinor: 1000 } });
  expect(product.status()).toBe(201);
  const inventoryNav = page.getByRole('button', { name: 'Inventario', exact: true });
  await ((page.viewportSize()?.width || 0) < 768 ? inventoryNav.last() : inventoryNav.first()).click();
  await expect(page.getByRole('heading', { name: 'Inventario', exact: true })).toBeVisible();
  await page.getByLabel('Buscar productos en inventario').fill(productName);
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByText(productName, { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Ver existencias' }).click();
  await page.getByRole('button', { name: 'Ajustar', exact: true }).click();
  await page.getByRole('button', { name: 'Selecciona un almacén' }).click();
  await page.getByRole('button', { name: 'Origen Stock ' + suffix }).click();
  await page.getByRole('button', { name: 'Entrada' }).click();
  await page.getByRole('button', { name: 'Existencia inicial' }).click();
  await page.getByLabel('Cantidad').fill('10.250');
  await page.getByLabel('Motivo').fill('Conteo QA');
  await page.getByRole('button', { name: 'Registrar' }).click();
  await expect(page.getByText('Ajuste registrado.')).toBeVisible();
  await page.getByRole('button', { name: 'Transferir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Origen Stock ' + suffix })).toBeVisible();
  await page.getByRole('button', { name: 'Selecciona el destino' }).click();
  await page.getByRole('button', { name: 'Destino Stock ' + suffix }).click();
  await page.getByLabel('Cantidad').fill('3');
  await page.getByLabel('Motivo').fill('Reponer QA');
  await page.getByRole('button', { name: 'Registrar' }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByText('Transferencia registrada.')).toBeVisible();
  await expect(page.getByText('Total: 10.25')).toBeVisible();
  await expect(page.getByText('Origen Stock ' + suffix + ': 7.25')).toBeVisible();
  await expect(page.getByText('Destino Stock ' + suffix + ': 3')).toBeVisible();
  await noOverflow(page);
});
test('Compra recibida aumenta stock; venta y cancelación lo revierten', async ({ page, request }, info) => {
  const pair = await login(page);
  const headers = { Authorization: 'Bearer ' + pair.accessToken };
  const suffix = info.project.name.toUpperCase();
  const api = 'http://127.0.0.1:3081/api/v1';
  const branch = await request.post(api + '/branches', { headers,
    data: { name: 'Sucursal Orden ' + suffix, code: 'OBR_' + suffix,
      address: 'QA', city: 'CDMX', country: 'MX' } });
  expect(branch.status()).toBe(201);
  const branchId = (await branch.json()).data._id as string;
  const warehouseName = 'Almacén Orden ' + suffix;
  const warehouse = await request.post(api + '/warehouses', { headers,
    data: { name: warehouseName, code: 'OW_' + suffix, branchId } });
  const category = await request.post(api + '/categories', { headers,
    data: { name: 'Orden Cat ' + suffix, code: 'OC_' + suffix } });
  const unit = await request.post(api + '/units', { headers,
    data: { name: 'Orden Unit ' + suffix, code: 'OU_' + suffix, symbol: 'u' } });
  const supplierName = 'Proveedor Orden ' + suffix;
  const customerName = 'Cliente Orden ' + suffix;
  const supplier = await request.post(api + '/suppliers', { headers,
    data: { name: supplierName } });
  const customer = await request.post(api + '/customers', { headers,
    data: { name: customerName } });
  for (const result of [warehouse, category, unit, supplier, customer])
    expect(result.status()).toBe(201);
  const productName = 'Producto Orden ' + suffix;
  const product = await request.post(api + '/products', { headers,
    data: { name: productName, code: 'OP_' + suffix,
      categoryId: (await category.json()).data.id,
      unitId: (await unit.json()).data.id, priceMinor: 1500, taxRateBps: 1600 } });
  expect(product.status()).toBe(201);
  const productId = (await product.json()).data.id as string;
  const warehouseId = (await warehouse.json()).data.id as string;

  if ((page.viewportSize()?.width || 0) < 768)
    await page.getByRole('button', { name: 'Más módulos' }).click();
  const purchasesNav = page.getByRole('button', { name: 'Compras', exact: true });
  await ((page.viewportSize()?.width || 0) < 768 ? purchasesNav.last() : purchasesNav.first()).click();
  await expect(page.getByRole('heading', { name: 'Compras', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nueva compra' }).click();
  await page.getByRole('button', { name: 'Selecciona proveedor' }).click();
  await page.getByRole('button', { name: supplierName }).click();
  await page.getByRole('button', { name: 'Selecciona un almacén' }).click();
  await page.getByRole('button', { name: warehouseName }).click();
  await page.getByRole('button', { name: 'Selecciona un producto' }).click();
  await page.getByRole('button', { name: productName + ' (OP_' + suffix + ')' }).click();
  await page.getByLabel('Cantidad').fill('2');
  await page.getByLabel('Costo unitario').fill('10.00');
  await page.getByRole('button', { name: 'Agregar producto' }).click();
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByText('Compra guardada como borrador.')).toBeVisible();
  await page.getByRole('button', { name: 'Recibir compra' }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByText('Compra recibida.')).toBeVisible();
  const stockAfterPurchase = await request.get(api + '/inventory/product/' + productId, { headers });
  expect((await stockAfterPurchase.json()).data.quantityMilli).toBe(2000);
  await page.getByRole('button', { name: 'Cerrar modal' }).first().click();

  if ((page.viewportSize()?.width || 0) < 768)
    await page.getByRole('button', { name: 'Más módulos' }).click();
  const salesNav = page.getByRole('button', { name: 'Ventas', exact: true });
  await ((page.viewportSize()?.width || 0) < 768 ? salesNav.last() : salesNav.first()).click();
  await expect(page.getByRole('heading', { name: 'Ventas', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nueva venta' }).click();
  await page.getByRole('button', { name: 'Selecciona cliente' }).click();
  await page.getByRole('button', { name: customerName }).click();
  await page.getByRole('button', { name: 'Selecciona un almacén' }).click();
  await page.getByRole('button', { name: warehouseName }).click();
  await page.getByRole('button', { name: 'Selecciona un producto' }).click();
  await page.getByRole('button', { name: productName + ' (OP_' + suffix + ')' }).click();
  await page.getByLabel('Cantidad').fill('1');
  await page.getByRole('button', { name: 'Agregar producto' }).click();
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByText('Venta guardada como borrador.')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar venta' }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByText('Venta confirmada.')).toBeVisible();
  const stockAfterSale = await request.get(api + '/inventory/product/' + productId, { headers });
  expect((await stockAfterSale.json()).data.quantityMilli).toBe(1000);
  await page.getByRole('button', { name: 'Cancelar operación', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar operación ahora' }).click();
  await expect(page.getByText('Venta cancelada.')).toBeVisible();
  const stockRestored = await request.get(api + '/inventory/product/' + productId, { headers });
  expect((await stockRestored.json()).data.quantityMilli).toBe(2000);
  await page.getByRole('button', { name: 'Cerrar modal' }).first().click();
  if ((page.viewportSize()?.width || 0) < 768)
    await page.getByRole('button', { name: 'Más módulos' }).click();
  const financeNav = page.getByRole('button', { name: 'Finanzas', exact: true });
  await ((page.viewportSize()?.width || 0) < 768 ? financeNav.last() : financeNav.first()).click();
  await expect(page.getByRole('heading', { name: 'Finanzas', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cuentas por pagar' }).click();
  await page.getByRole('button', { name: 'pending' }).click();
  await expect(page.getByRole('button', { name: 'Ver detalle' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Ver detalle' }).first().click();
  await page.getByRole('button', { name: 'Nuevo pago' }).click();
  await page.getByLabel('Monto del pago').fill('1.00');
  await page.getByLabel('Método de pago').fill('transferencia');
  await page.getByRole('button', { name: 'Registrar pago' }).click();
  await expect(page.getByText('Pago registrado.')).toBeVisible();
  await page.getByRole('button', { name: 'Pagos', exact: true }).click();
  await expect(page.getByText('transferencia · Sin referencia').first()).toBeVisible();
  expect(warehouseId).toBeTruthy();
  await noOverflow(page);
});
test('Empleados: alta, edición y desactivación desde interfaz compartida', async ({ page, request }, info) => {
  const pair = await login(page);
  const headers = { Authorization: 'Bearer ' + pair.accessToken };
  const suffix = info.project.name.toUpperCase();
  const branch = await request.post('http://127.0.0.1:3081/api/v1/branches', { headers,
    data: { name: 'Sucursal HR ' + suffix, code: 'HR_' + suffix,
      address: 'QA', city: 'CDMX', country: 'MX' } });
  expect(branch.status()).toBe(201);
  if ((page.viewportSize()?.width || 0) < 768)
    await page.getByRole('button', { name: 'Más módulos' }).click();
  const hrNav = page.getByRole('button', { name: 'Empleados', exact: true });
  await ((page.viewportSize()?.width || 0) < 768 ? hrNav.last() : hrNav.first()).click();
  await expect(page.getByRole('heading', { name: 'Empleados', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nuevo empleado' }).click();
  await page.getByLabel('Número de empleado').fill('HR-' + suffix);
  await page.getByLabel('Nombre', { exact: true }).fill('Empleado QA ' + suffix);
  await page.getByLabel('Correo electrónico').fill('hr-' + info.project.name + '@example.test');
  await page.getByLabel('Puesto').fill('Analista');
  await page.getByLabel('Departamento').fill('Operaciones');
  await page.getByLabel('Fecha de ingreso (AAAA-MM-DD)').fill('2026-10-01');
  await page.getByRole('button', { name: 'Selecciona sucursal' }).click();
  await page.getByRole('button', { name: 'Sucursal HR ' + suffix }).click();
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Empleado creado.')).toBeVisible();
  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Puesto').fill('Gerente');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Empleado actualizado.')).toBeVisible();
  await page.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar desactivación' }).click();
  await expect(page.getByText('Empleado desactivado.')).toBeVisible();
  await noOverflow(page);
});
test('Proyectos: borrador, edición, activación y cierre desde interfaz compartida', async ({ page }, info) => {
  await login(page);
  if ((page.viewportSize()?.width || 0) < 768)
    await page.getByRole('button', { name: 'Más módulos' }).click();
  const nav = page.getByRole('button', { name: 'Proyectos', exact: true });
  await ((page.viewportSize()?.width || 0) < 768 ? nav.last() : nav.first()).click();
  await expect(page.getByRole('heading', { name: 'Proyectos', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nuevo proyecto' }).click();
  await page.getByLabel('Código', { exact: true }).fill('PROJ-' + info.project.name.toUpperCase());
  await page.getByLabel('Nombre', { exact: true }).fill('Proyecto QA ' + info.project.name);
  await page.getByLabel('Inicio (AAAA-MM-DD)').fill('2026-10-01');
  await page.getByLabel('Presupuesto').fill('1234.56');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Proyecto creado.')).toBeVisible();
  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Descripción').fill('Entrega de prueba');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Proyecto actualizado.')).toBeVisible();
  await page.getByRole('button', { name: 'Activar' }).click();
  await page.getByRole('button', { name: 'Confirmar cambio' }).click();
  await expect(page.getByText('Proyecto activado.')).toBeVisible();
  await page.getByRole('button', { name: 'Completar' }).click();
  await page.getByRole('button', { name: 'Confirmar cambio' }).click();
  await expect(page.getByText('Proyecto completado.')).toBeVisible();
  await noOverflow(page);
});
test('logout revoca también la sesión en el servidor', async ({ page, request }) => {
  const pair = await login(page);
  if ((page.viewportSize()?.width || 0) < 768)
    await page.getByRole('button', { name: 'Más módulos' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
  const protectedResponse = await request.get('http://127.0.0.1:3081/api/v1/users', {
    headers: { Authorization: 'Bearer ' + pair.accessToken },
  });
  expect(protectedResponse.status()).toBe(401);
  const renewal = await request.post('http://127.0.0.1:3081/api/v1/auth/refresh', {
    data: { refreshToken: pair.refreshToken },
  });
  expect(renewal.status()).toBe(401);
});
test('entrada de Mobile Preview comparte identidad y navegación', async ({ page }, info) => {
  await login(page, 'http://127.0.0.1:4174');
  await expect(page.getByText('Próximamente', { exact: true }).first()).toBeVisible();
  if (info.project.name === 'mobile')
    await expect(page.getByRole('button', { name: 'Más módulos' })).toBeVisible();
  await noOverflow(page);
});
