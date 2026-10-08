import axios, { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { ApiClient, ApiError, clearTokens, getAccessToken, setTokens } from '../src';

test('login sends one POST to the gateway path with only the expected fields', async () => {
  const client = new ApiClient({ baseURL: 'https://gateway.example/api/v1' });
  const transport = (client as unknown as { client: AxiosInstance }).client;
  const mock = new MockAdapter(transport);
  let calls = 0;
  mock.onPost('/auth/login').reply((config) => {
    calls += 1;
    expect(axios.getUri(config)).toBe('https://gateway.example/api/v1/auth/login');
    expect(axios.getUri(config)).not.toContain('/api/v1/api/v1/');
    expect(JSON.parse(config.data)).toEqual({
      email: 'person@example.com',
      password: 'private',
    });
    expect(config.headers?.['Content-Type']).toContain('application/json');
    expect(config.headers?.Accept).toBe('application/json');
    expect(config.headers?.Authorization).toBeUndefined();
    return [200, { success: true, data: { accessToken: 'a', refreshToken: 'b', user: {} } }];
  });
  await client.login({ email: ' Person@Example.com ', password: 'private' });
  expect(calls).toBe(1);
});

test.each([
  [404, 'No se encontró la ruta de autenticación configurada.'],
  [401, 'Credenciales inválidas.'],
])('login maps HTTP %i to a safe message', async (status, message) => {
  const client = new ApiClient({ baseURL: 'https://gateway.example/api/v1' });
  new MockAdapter((client as unknown as { client: AxiosInstance }).client)
    .onPost('/auth/login')
    .reply(status, {
      success: false,
      error: { code: 'ERROR', message: 'private upstream detail' },
    });
  await expect(
    client.login({ email: 'person@example.com', password: 'private' }),
  ).rejects.toMatchObject({ message, status });
});

test('login maps transport failures to a safe message', async () => {
  const client = new ApiClient({ baseURL: 'https://gateway.example/api/v1' });
  new MockAdapter((client as unknown as { client: AxiosInstance }).client)
    .onPost('/auth/login')
    .networkError();
  await expect(
    client.login({ email: 'person@example.com', password: 'private' }),
  ).rejects.toMatchObject({ message: 'No se pudo conectar con el servidor.' } as ApiError);
});

test('login omits bearer authorization even with an old session', async () => {
  const client = new ApiClient({ baseURL: 'https://gateway.example/api/v1' });
  const mock = new MockAdapter((client as unknown as { client: AxiosInstance }).client);
  setTokens('old-access', 'old-refresh');
  try {
    mock.onPost('/auth/login').reply((config) => {
      expect(config.headers?.Authorization).toBeUndefined();
      return [200, { success: true, data: { accessToken: 'new', refreshToken: 'next', user: {} } }];
    });
    await client.login({ email: 'person@example.com', password: 'private' });
  } finally {
    clearTokens();
  }
});

test('anonymous health uses the Worker root and checks the response shape', async () => {
  const client = new ApiClient({ baseURL: 'https://gateway.example/api/v1' });
  const transport = (client as unknown as { refreshClient: AxiosInstance }).refreshClient;
  const mock = new MockAdapter(transport);
  mock.onGet('https://gateway.example/health').reply((config) => {
    expect(axios.getUri(config)).toBe('https://gateway.example/health');
    expect(config.headers?.Authorization).toBeUndefined();
    return [200, { success: true }];
  });
  await expect(client.checkHealth('https://gateway.example/health')).resolves.toEqual({
    status: 200,
    success: true,
  });
  mock.reset();
  mock.onGet('https://gateway.example/health').reply(200, { success: false });
  await expect(client.checkHealth('https://gateway.example/health')).resolves.toEqual({
    status: 200,
    success: false,
    errorCode: 'INVALID_HEALTH_RESPONSE',
  });
});

test.each([
  ['networkError', 'NETWORK_ERROR'],
  ['timeout', 'TIMEOUT'],
] as const)('login retains %s diagnostic code', async (failure, code) => {
  const client = new ApiClient({ baseURL: 'https://gateway.example/api/v1' });
  const mock = new MockAdapter((client as unknown as { client: AxiosInstance }).client);
  if (failure === 'timeout') mock.onPost('/auth/login').timeout();
  else mock.onPost('/auth/login').networkError();
  await expect(client.login({ email: 'person@example.com', password: 'private' })).rejects.toMatchObject({
    message: 'No se pudo conectar con el servidor.',
    code,
  } as ApiError);
});

test('health reports upstream unavailability without throwing', async () => {
  const client = new ApiClient({ baseURL: 'https://gateway.example/api/v1' });
  const transport = (client as unknown as { refreshClient: AxiosInstance }).refreshClient;
  new MockAdapter(transport).onGet('https://gateway.example/health').reply(503);
  await expect(client.checkHealth('https://gateway.example/health')).resolves.toEqual({
    status: 503,
    success: false,
    errorCode: 'UPSTREAM_UNAVAILABLE',
  });
});

test('a protected request refreshes once and retries with the new access token', async () => {
  const client = new ApiClient({ baseURL: 'https://gateway.example/api/v1' });
  const transport = (client as unknown as { client: AxiosInstance }).client;
  const refreshTransport = (client as unknown as { refreshClient: AxiosInstance }).refreshClient;
  const requests = new MockAdapter(transport);
  const refresh = new MockAdapter(refreshTransport);
  const seen: string[] = [];
  setTokens('old-access', 'old-refresh');
  try {
    requests.onGet('/customers').reply((config) => {
      seen.push(String(config.headers?.Authorization));
      return seen.length === 1
        ? [401, { success: false }]
        : [200, { success: true, data: [] }];
    });
    refresh.onPost('/auth/refresh').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ refreshToken: 'old-refresh' });
      expect(config.headers?.Authorization).toBeUndefined();
      return [200, {
        success: true,
        data: {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          user: { id: 'u1', email: 'person@example.com' },
        },
      }];
    });
    await expect(client.get('/customers')).resolves.toMatchObject({ success: true });
    expect(seen).toEqual(['Bearer old-access', 'Bearer new-access']);
    expect(refresh.history.post).toHaveLength(1);
    expect(getAccessToken()).toBe('new-access');
  } finally {
    clearTokens();
  }
});
