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
  await expect(page.getByText('Estamos preparando este espacio')).toBeVisible();
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
