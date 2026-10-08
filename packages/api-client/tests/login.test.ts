import axios, { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { ApiClient, ApiError } from '../src';

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
