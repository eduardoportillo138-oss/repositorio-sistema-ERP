import { configureApiBaseURL } from '@erp/api-client';

export function resolveWebApiBaseURL(baseURL: string | undefined, isProduction: boolean): string {
  const value = baseURL?.trim();
  if (!value) {
    if (isProduction) throw new Error('Falta configurar VITE_API_BASE_URL para la web.');
    return '/api/v1';
  }
  if (isProduction) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error('VITE_API_BASE_URL debe ser una URL HTTPS terminada en /api/v1.');
    }
    if (
      url.protocol !== 'https:' ||
      url.pathname.replace(/\/+$/, '') !== '/api/v1' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error('VITE_API_BASE_URL debe ser una URL HTTPS terminada en /api/v1.');
    }
  }
  return value.replace(/\/+$/, '');
}

export function initializeWebApi(baseURL: string | undefined, isProduction: boolean): string {
  const resolved = resolveWebApiBaseURL(baseURL, isProduction);
  configureApiBaseURL(resolved);
  return resolved;
}
