import { configureApiBaseURL, apiClient } from '@erp/api-client';
import { authAPI } from '../src/api/client';
import {
  checkMobileBackendHealth,
  getMobileApiBaseURL,
  initializeMobileApi,
  isMobileDevelopmentBuild,
  normalizeMobileApiURL,
  shouldShowDeveloperApiSettings,
} from '../src/config/api';

jest.mock('@erp/api-client', () => ({
  configureApiBaseURL: jest.fn(),
  apiClient: {
    get: jest.fn().mockResolvedValue({ success: true }),
    login: jest.fn().mockResolvedValue({ success: true }),
  },
}));

const remoteUrl = 'https://erp-api-gateway.eduardoportillo138.workers.dev/api/v1';
const options = { isDev: false, isLocal: false, remoteUrl, platform: 'android' as const };

beforeEach(() => jest.clearAllMocks());

test('debug, local standalone and release default to the Cloudflare gateway', () => {
  expect(getMobileApiBaseURL({ ...options, isDev: true })).toBe(remoteUrl);
  expect(getMobileApiBaseURL({ ...options, isLocal: true })).toBe(remoteUrl);
  expect(getMobileApiBaseURL(options)).toBe(remoteUrl);
});

test('10.0.2.2 requires an explicit Android debug flag', () => {
  expect(getMobileApiBaseURL({ ...options, isDev: true, useLocalEmulatorApi: true })).toBe(
    'http://10.0.2.2:3000/api/v1',
  );
  expect(
    getMobileApiBaseURL({ ...options, isDev: true, isLocal: true, useLocalEmulatorApi: true }),
  ).toBe(remoteUrl);
  expect(getMobileApiBaseURL({ ...options, useLocalEmulatorApi: true })).toBe(remoteUrl);
  expect(
    getMobileApiBaseURL({ ...options, isDev: true, platform: 'ios', useLocalEmulatorApi: true }),
  ).toBe(remoteUrl);
});

test('developer settings stay hidden unless explicitly enabled in Android debug', () => {
  const bundledDebug = isMobileDevelopmentBuild(false, true);
  expect(bundledDebug).toBe(true);
  expect(shouldShowDeveloperApiSettings({ ...options, isDev: bundledDebug })).toBe(false);
  expect(
    shouldShowDeveloperApiSettings({
      ...options,
      isDev: bundledDebug,
      showDeveloperApiSettings: true,
    }),
  ).toBe(true);
  expect(
    shouldShowDeveloperApiSettings({
      ...options,
      isDev: true,
      isLocal: true,
      showDeveloperApiSettings: true,
    }),
  ).toBe(false);
  expect(shouldShowDeveloperApiSettings({ ...options, showDeveloperApiSettings: true })).toBe(
    false,
  );
  expect(
    shouldShowDeveloperApiSettings({
      ...options,
      isDev: true,
      platform: 'ios',
      showDeveloperApiSettings: true,
    }),
  ).toBe(false);
});

test('normalizes trailing slash and appends the API path', () => {
  expect(normalizeMobileApiURL(remoteUrl + '/')).toBe(remoteUrl);
  expect(normalizeMobileApiURL('https://erp-api-gateway.eduardoportillo138.workers.dev')).toBe(
    remoteUrl,
  );
});

test('rejects placeholders, relative paths and remote HTTP', () => {
  expect(() => normalizeMobileApiURL('https://api.example.invalid/api/v1')).toThrow();
  expect(() => normalizeMobileApiURL('/api/v1')).toThrow();
  expect(() =>
    normalizeMobileApiURL('http://repositorio-sistema-erp-backend.onrender.com/api/v1', true),
  ).toThrow();
  expect(() => getMobileApiBaseURL({ ...options, remoteUrl: '' })).toThrow('mobileApiBaseUrl');
});

test('allows private LAN HTTP only in development settings', () => {
  expect(normalizeMobileApiURL('http://192.168.1.25:3000/api/v1', true)).toBe(
    'http://192.168.1.25:3000/api/v1',
  );
  expect(() => normalizeMobileApiURL('http://192.168.1.25:3000/api/v1')).toThrow();
  expect(() => normalizeMobileApiURL('https://localhost:3000/api/v1')).toThrow();
});

test('initialization configures gateway on debug and standalone before use', () => {
  expect(initializeMobileApi({ ...options, isDev: true })).toBe(remoteUrl);
  expect(initializeMobileApi({ ...options, isLocal: true })).toBe(remoteUrl);
  expect(configureApiBaseURL).toHaveBeenCalledTimes(2);
  expect(configureApiBaseURL).toHaveBeenNthCalledWith(1, remoteUrl);
  expect(configureApiBaseURL).toHaveBeenNthCalledWith(2, remoteUrl);
});

test('health diagnostic uses the shared client at the service root', async () => {
  await checkMobileBackendHealth(remoteUrl);
  expect(apiClient.get).toHaveBeenCalledWith(
    'https://erp-api-gateway.eduardoportillo138.workers.dev/health',
  );
});

test('mobile login uses the initialized remote client', async () => {
  initializeMobileApi(options);
  await authAPI.login('person@example.com', 'private');
  expect(configureApiBaseURL).toHaveBeenCalledWith(remoteUrl);
  expect(apiClient.login).toHaveBeenCalledTimes(1);
  expect(apiClient.login).toHaveBeenCalledWith({
    email: 'person@example.com',
    password: 'private',
    companyId: undefined,
  });
});
