import { apiClient, configureApiBaseURL } from '@erp/api-client';

export interface MobileApiOptions {
  isDev: boolean;
  isLocal: boolean;
  useLocalEmulatorApi?: boolean;
  remoteUrl?: string;
  platform: 'android' | 'ios' | 'web';
}

function isLocalHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '10.0.2.2') return true;
  const octets = hostname.split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  )
    return false;
  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

/** Validate and normalize a public API endpoint or an explicitly permitted development host. */
export function normalizeMobileApiURL(value: string, allowLocalHttp = false): string {
  const input = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error('Configura una URL absoluta para la API móvil.');
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname ||
    hostname.endsWith('.invalid') ||
    hostname.includes('example') ||
    hostname.includes('your-backend') ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('La URL de la API móvil es inválida o contiene un placeholder.');
  }
  if (isLocalHost(hostname) && !allowLocalHttp) {
    throw new Error('La API standalone debe usar un backend remoto HTTPS.');
  }
  if (
    parsed.protocol !== 'https:' &&
    !(allowLocalHttp && parsed.protocol === 'http:' && isLocalHost(hostname))
  ) {
    throw new Error('La API remota debe usar HTTPS; HTTP solo se permite para desarrollo local.');
  }
  const path = parsed.pathname.replace(/\/+$/, '');
  if (path !== '' && path !== '/api/v1') {
    throw new Error('La URL de la API móvil debe terminar en /api/v1.');
  }
  parsed.pathname = '/api/v1';
  return parsed.toString();
}

export function getMobileApiBaseURL({
  isDev,
  isLocal,
  useLocalEmulatorApi,
  remoteUrl,
  platform,
}: MobileApiOptions): string {
  if (isDev && !isLocal && useLocalEmulatorApi === true && platform === 'android') {
    return normalizeMobileApiURL('http://10.0.2.2:3000/api/v1', true);
  }
  if (!remoteUrl?.trim()) {
    throw new Error('Falta mobileApiBaseUrl para la API móvil.');
  }
  // Standalone/local and release both start against the configured HTTPS backend.
  return normalizeMobileApiURL(remoteUrl, false);
}

/** A bundled Android debug APK can have __DEV__ false; use its native build type too. */
export function isMobileDevelopmentBuild(jsDev: boolean, nativeDebug: boolean): boolean {
  return jsDev || nativeDebug;
}
/** Server switching requires an explicit build flag and a true Android debug session. */
export function shouldShowDeveloperApiSettings({
  isDev,
  isLocal,
  platform,
  showDeveloperApiSettings,
}: Pick<MobileApiOptions, 'isDev' | 'isLocal' | 'platform'> & {
  showDeveloperApiSettings?: boolean;
}): boolean {
  return showDeveloperApiSettings === true && isDev && !isLocal && platform === 'android';
}
/** Runs while App.tsx is imported, before ERPApplication can issue requests. */
export function initializeMobileApi(options: MobileApiOptions): string {
  const url = getMobileApiBaseURL(options);
  configureApiBaseURL(url);
  return url;
}

/** Optional pre-login diagnostic using the shared API client and public liveness route. */
export function checkMobileBackendHealth(baseUrl: string): Promise<unknown> {
  const healthUrl = new URL('/health', normalizeMobileApiURL(baseUrl)).toString();
  return apiClient.get(healthUrl);
}
