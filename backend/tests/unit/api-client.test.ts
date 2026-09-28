import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  ApiClient,
  ApiError,
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  AuthUser,
  endSession,
} from '../../../packages/api-client/src';

const user: AuthUser = {
  id: 'test-user',
  name: 'Test',
  email: 'test@example.test',
  companyId: 'test-company',
  companyName: 'Empresa de prueba',
  roleId: 'test-role',
  permissions: ['users.view'],
};
let mock: MockAdapter, client: ApiClient;
beforeEach(() => {
  mock = new MockAdapter(axios, { delayResponse: 10 });
  client = new ApiClient({ baseURL: 'http://test.invalid/api/v1' });
  clearTokens();
});
afterEach(() => {
  mock.restore();
  clearTokens();
});

test('dos solicitudes concurrentes comparten un refresh y conservan el token rotado', async () => {
  setTokens('old-access', 'old-refresh', user);
  mock
    .onGet('/protected')
    .reply((config) =>
      config.headers?.Authorization === 'Bearer new-access'
        ? [200, { success: true, data: 'allowed' }]
        : [401, { error: { message: 'expired' } }],
    );
  mock.onPost('/auth/refresh').reply((config) => {
    expect(JSON.parse(config.data).refreshToken).toBe('old-refresh');
    return [
      200,
      {
        success: true,
        data: {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          user: { ...user, name: 'Current identity' },
        },
      },
    ];
  });
  expect(await Promise.all([client.get('/protected'), client.get('/protected')])).toEqual([
    { success: true, data: 'allowed' },
    { success: true, data: 'allowed' },
  ]);
  expect(mock.history.post).toHaveLength(1);
  expect(getAccessToken()).toBe('new-access');
  expect(getRefreshToken()).toBe('new-refresh');
  expect(getStoredUser()?.name).toBe('Current identity');
});
test('refresh rechazado limpia sesión y entrega error de API', async () => {
  setTokens('old-access', 'old-refresh', user);
  mock.onGet('/protected').reply(401);
  mock.onPost('/auth/refresh').reply(401, {
    success: false,
    error: { code: 'AUTHENTICATION_ERROR', message: 'Sesión revocada' },
  });
  await expect(client.get('/protected')).rejects.toMatchObject({
    message: 'Sesión revocada',
    status: 401,
  });
  expect(getStoredUser()).toBeNull();
  expect(getRefreshToken()).toBe('');
  expect(mock.history.post).toHaveLength(1);
});
test('login incorrecto no inicia ciclos de refresh y lee el envelope de error', async () => {
  mock
    .onPost('/auth/login')
    .reply(401, { error: { code: 'AUTHENTICATION_ERROR', message: 'Credenciales inválidas' } });
  await expect(client.post('/auth/login', {})).rejects.toMatchObject({
    message: 'Credenciales inválidas',
    status: 401,
  });
  expect(mock.history.post.map((request) => request.url)).toEqual(['/auth/login']);
});
test('una renovación pendiente no reabre ni borra una sesión posterior', async () => {
  setTokens('old-access', 'old-refresh', user);
  mock.onPost('/auth/refresh').reply(200, {
    success: true,
    data: { accessToken: 'stale-access', refreshToken: 'stale-refresh', user },
  });
  const pending = client.refreshAccessToken();
  clearTokens();
  setTokens('current-access', 'current-refresh', user);
  await expect(pending).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
  expect(getAccessToken()).toBe('current-access');
});
test('501 mantiene código y estado para mostrar disponibilidad en UI', async () => {
  mock
    .onGet('/products')
    .reply(501, { error: { code: 'NOT_IMPLEMENTED', message: 'Módulo en desarrollo' } });
  await expect(client.get('/products')).rejects.toMatchObject({
    status: 501,
    code: 'NOT_IMPLEMENTED',
  });
});
test('errores de red tienen mensaje útil y no dependen de error.config', async () => {
  mock.onGet('/protected').networkError();
  await expect(client.get('/protected')).rejects.toBeInstanceOf(ApiError);
});
test('logout con access expirado renueva y revoca usando el refresh token actual', async () => {
  setTokens('old-access', 'old-refresh', user);
  mock
    .onPost('/auth/logout')
    .reply((config) =>
      JSON.parse(config.data).refreshToken === 'new-refresh' ? [200, { success: true }] : [401],
    );
  mock.onPost('/auth/refresh').reply(200, {
    success: true,
    data: { accessToken: 'new-access', refreshToken: 'new-refresh', user },
  });
  await endSession(client);
  expect(mock.history.post.map((config) => config.url)).toEqual([
    '/auth/logout',
    '/auth/refresh',
    '/auth/logout',
  ]);
  expect(getAccessToken()).toBe('');
  expect(getStoredUser()).toBeNull();
});
