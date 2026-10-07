export interface Env {
  RENDER_ORIGIN: string;
  WEB_ORIGINS: string;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;
const FORWARDED_HEADERS = ['authorization', 'content-type', 'accept', 'x-request-id'] as const;
const CORS_HEADERS = 'Authorization, Content-Type, Accept, X-Request-ID';
const UPSTREAM_TIMEOUT_MS = 27_000;

function isAllowedPath(path: string): boolean {
  return path === '/health' || path === '/ready' || path.startsWith('/api/v1/');
}

function allowedWebOrigin(origin: string | null, env: Env): string | null {
  if (!origin) return null;
  return env.WEB_ORIGINS.split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(origin)
    ? origin
    : null;
}

function corsHeaders(origin: string | null): Headers {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  });
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return headers;
}

function jsonError(status: number, code: string, message: string, origin: string | null): Response {
  const headers = corsHeaders(origin);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers,
  });
}

function renderOrigin(value: string): URL | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

function preflight(request: Request, origin: string, path: string): Response {
  const method = request.headers.get('Access-Control-Request-Method')?.toUpperCase();
  if (!method || !METHODS.includes(method as (typeof METHODS)[number])) {
    return jsonError(405, 'METHOD_NOT_ALLOWED', 'Método no permitido', origin);
  }
  if (path === '/health' && method !== 'GET') {
    return jsonError(405, 'METHOD_NOT_ALLOWED', 'Método no permitido', origin);
  }
  if (path === '/ready' && method !== 'GET') {
    return jsonError(405, 'METHOD_NOT_ALLOWED', 'Método no permitido', origin);
  }
  const requested = request.headers.get('Access-Control-Request-Headers');
  if (
    requested
      ?.split(',')
      .some(
        (header) =>
          !FORWARDED_HEADERS.includes(
            header.trim().toLowerCase() as (typeof FORWARDED_HEADERS)[number],
          ),
      )
  ) {
    return jsonError(403, 'HEADER_NOT_ALLOWED', 'Cabecera no permitida', origin);
  }
  const headers = corsHeaders(origin);
  headers.set(
    'Access-Control-Allow-Methods',
    path.startsWith('/api/v1/') ? METHODS.join(', ') : 'GET',
  );
  headers.set('Access-Control-Allow-Headers', CORS_HEADERS);
  headers.set('Access-Control-Max-Age', '600');
  headers.set('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
  return new Response(null, { status: 204, headers });
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incoming = new URL(request.url);
    if (!isAllowedPath(incoming.pathname)) {
      return jsonError(404, 'NOT_FOUND', 'Ruta no encontrada', null);
    }

    const originHeader = request.headers.get('Origin');
    const webOrigin = allowedWebOrigin(originHeader, env);
    if (originHeader && !webOrigin) {
      return jsonError(403, 'ORIGIN_NOT_ALLOWED', 'Origen no permitido', null);
    }

    if (
      request.method === 'OPTIONS' &&
      webOrigin &&
      request.headers.has('Access-Control-Request-Method')
    ) {
      return preflight(request, webOrigin, incoming.pathname);
    }

    if (
      !METHODS.includes(request.method as (typeof METHODS)[number]) ||
      (incoming.pathname === '/health' && request.method !== 'GET') ||
      (incoming.pathname === '/ready' && request.method !== 'GET')
    ) {
      return jsonError(405, 'METHOD_NOT_ALLOWED', 'Método no permitido', webOrigin);
    }

    if (incoming.pathname === '/health') {
      const headers = corsHeaders(webOrigin);
      headers.set('Content-Type', 'application/json; charset=utf-8');
      return new Response(
        JSON.stringify({ success: true, data: { status: 'ok', service: 'cloudflare-worker' } }),
        {
          status: 200,
          headers,
        },
      );
    }

    const upstreamOrigin = renderOrigin(env.RENDER_ORIGIN);
    if (!upstreamOrigin) {
      return jsonError(
        502,
        'UPSTREAM_UNAVAILABLE',
        'Servicio temporalmente no disponible',
        webOrigin,
      );
    }
    // Construct the destination from a validated origin and the incoming path only.
    const upstreamURL = new URL(incoming.pathname + incoming.search, upstreamOrigin);
    const headers = new Headers();
    for (const name of FORWARDED_HEADERS) {
      const value = request.headers.get(name);
      if (value !== null) headers.set(name, value);
    }
    headers.set('X-Forwarded-Host', incoming.host);
    headers.set('X-Forwarded-Proto', incoming.protocol.slice(0, -1));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const upstream = await fetch(upstreamURL, {
        method: request.method,
        headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'manual',
        signal: controller.signal,
      });
      const responseHeaders = new Headers(upstream.headers);
      // CORS is controlled here, so an upstream policy cannot widen it.
      for (const name of [...responseHeaders.keys()]) {
        if (name.toLowerCase().startsWith('access-control-')) responseHeaders.delete(name);
      }
      responseHeaders.set('Cache-Control', 'no-store');
      responseHeaders.set('Vary', 'Origin');
      if (webOrigin) {
        responseHeaders.set('Access-Control-Allow-Origin', webOrigin);
        responseHeaders.set('Access-Control-Allow-Credentials', 'true');
      }
      return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    } catch (error) {
      const timedOut = controller.signal.aborted;
      return jsonError(
        timedOut ? 504 : 502,
        'UPSTREAM_UNAVAILABLE',
        'Servicio temporalmente no disponible',
        webOrigin,
      );
    } finally {
      clearTimeout(timeout);
    }
  },
};

export default worker;
