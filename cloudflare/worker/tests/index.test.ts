import worker, { Env } from '../src/index';

const env: Env = {
  RENDER_ORIGIN: 'https://repositorio-sistema-erp-backend.onrender.com',
  WEB_ORIGINS: 'https://repositorio-sistema-erp-web.onrender.com',
};
const webOrigin = 'https://repositorio-sistema-erp-web.onrender.com';

afterEach(() => jest.restoreAllMocks());

test('GET /health reports Worker liveness without contacting Render', async () => {
  const upstream = jest.spyOn(globalThis, 'fetch');
  const response = await worker.fetch(new Request('https://gateway.example/health'), env);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    success: true,
    data: { status: 'ok', service: 'cloudflare-worker' },
  });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(upstream).not.toHaveBeenCalled();
});

test('GET /api/v1/users forwards only the configured origin, query and allowed headers', async () => {
  const upstream = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('{"success":true}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  const response = await worker.fetch(
    new Request('https://gateway.example/api/v1/users?page=2&target=https://evil.example', {
      headers: {
        Authorization: 'Bearer example-token',
        Accept: 'application/json',
        Cookie: 'session=private',
        'X-Request-ID': 'request-1',
        'X-Forwarded-Host': 'evil.example',
      },
    }),
    env,
  );
  const [url, init] = upstream.mock.calls[0];
  expect(String(url)).toBe(
    'https://repositorio-sistema-erp-backend.onrender.com/api/v1/users?page=2&target=https://evil.example',
  );
  const headers = new Headers(init?.headers);
  expect(headers.get('Authorization')).toBe('Bearer example-token');
  expect(headers.get('Accept')).toBe('application/json');
  expect(headers.get('X-Request-ID')).toBe('request-1');
  expect(headers.get('Cookie')).toBeNull();
  expect(headers.get('X-Forwarded-Host')).toBe('gateway.example');
  expect(headers.get('X-Forwarded-Proto')).toBe('https');
  expect(init?.method).toBe('GET');
  expect(init?.redirect).toBe('manual');
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});

test('POST /api/v1/auth/login forwards the exact JSON payload once without logging credentials', async () => {
  const upstream = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('{"success":true,"data":{"accessToken":"private-token"}}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  const logs = [
    jest.spyOn(console, 'log').mockImplementation(),
    jest.spyOn(console, 'warn').mockImplementation(),
    jest.spyOn(console, 'error').mockImplementation(),
  ];
  const body = '{"email":"person@example.com","password":"top-secret"}';
  const response = await worker.fetch(
    new Request('https://gateway.example/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: webOrigin },
      body,
    }),
    env,
  );
  expect(upstream).toHaveBeenCalledTimes(1);
  const [url, init] = upstream.mock.calls[0];
  expect(String(url)).toBe(
    'https://repositorio-sistema-erp-backend.onrender.com/api/v1/auth/login',
  );
  expect(init?.method).toBe('POST');
  expect(await new Response(init?.body).text()).toBe(body);
  expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(webOrigin);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.text()).toContain('private-token');
  for (const log of logs) expect(log).not.toHaveBeenCalled();
});

test('OPTIONS preflight handles the allowed browser origin without contacting Render', async () => {
  const upstream = jest.spyOn(globalThis, 'fetch');
  const response = await worker.fetch(
    new Request('https://gateway.example/api/v1/users', {
      method: 'OPTIONS',
      headers: {
        Origin: webOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type,x-request-id',
      },
    }),
    env,
  );
  expect(response.status).toBe(204);
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(webOrigin);
  expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
  expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  expect(upstream).not.toHaveBeenCalled();
});

test('unknown routes and disallowed origins cannot reach Render', async () => {
  const upstream = jest.spyOn(globalThis, 'fetch');
  const unknown = await worker.fetch(
    new Request('https://gateway.example/private?target=https://evil.example'),
    env,
  );
  expect(unknown.status).toBe(404);
  const denied = await worker.fetch(
    new Request('https://gateway.example/api/v1/users', {
      headers: { Origin: 'https://evil.example' },
    }),
    env,
  );
  expect(denied.status).toBe(403);
  expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();
  expect(upstream).not.toHaveBeenCalled();
});

test('Render 500 is forwarded as an uncached response', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('{"success":false}', {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    }),
  );
  const response = await worker.fetch(
    new Request('https://gateway.example/api/v1/roles', {
      headers: { Origin: webOrigin },
    }),
    env,
  );
  expect(response.status).toBe(500);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(webOrigin);
});

test('unreachable Render returns a safe 502 with no stack trace', async () => {
  jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('private transport detail'));
  const response = await worker.fetch(new Request('https://gateway.example/ready'), env);
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({
    success: false,
    error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Servicio temporalmente no disponible' },
  });
});

test('Render readiness is forwarded and is distinct from Worker health', async () => {
  const upstream = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response('{"success":false}', { status: 503 }));
  const response = await worker.fetch(new Request('https://gateway.example/ready'), env);
  expect(response.status).toBe(503);
  expect(String(upstream.mock.calls[0][0])).toBe(
    'https://repositorio-sistema-erp-backend.onrender.com/ready',
  );
});
