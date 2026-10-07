import { configureApiBaseURL, apiClient } from '@erp/api-client';
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
  apiClient: { get: jest.fn().mockResolvedValue({ success: true }) },
}));

const remoteUrl = 'https://repositorio-sistema-erp-backend.onrender.com/api/v1';
const options = { isDev: false, isLocal: false, remoteUrl, platform: 'android' as const };

beforeEach(() => jest.clearAllMocks());

test('debug emulator uses its development host', () => {
  expect(getMobileApiBaseURL({ ...options, isDev: true })).toBe('http://10.0.2.2:3000/api/v1');
});

test('native debug mode keeps settings visible when bundled JS has __DEV__ false', () => {
  expect(isMobileDevelopmentBuild(false, true)).toBe(true);
  expect(isMobileDevelopmentBuild(false, false)).toBe(false);
  expect(
    shouldShowDeveloperApiSettings({ ...options, isDev: isMobileDevelopmentBuild(false, true) }),
  ).toBe(true);
});
test('developer server settings are visible only in Android debug', () => {
  expect(shouldShowDeveloperApiSettings({ ...options, isDev: true })).toBe(true);
  expect(shouldShowDeveloperApiSettings({ ...options, isDev: false, isLocal: true })).toBe(false);
  expect(shouldShowDeveloperApiSettings({ ...options, isDev: false, isLocal: false })).toBe(false);
  expect(shouldShowDeveloperApiSettings({ ...options, isDev: true, isLocal: true })).toBe(false);
});
test('local standalone and release use the configured HTTPS endpoint', () => {
  expect(getMobileApiBaseURL({ ...options, isLocal: true })).toBe(remoteUrl);
  expect(getMobileApiBaseURL(options)).toBe(remoteUrl);
});

test('normalizes trailing slash and appends the API path', () => {
  expect(normalizeMobileApiURL(remoteUrl + '/')).toBe(remoteUrl);
  expect(normalizeMobileApiURL('https://repositorio-sistema-erp-backend.onrender.com')).toBe(
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

test('initialization configures the shared client before use', () => {
  expect(initializeMobileApi({ ...options, isLocal: true })).toBe(remoteUrl);
  expect(configureApiBaseURL).toHaveBeenCalledTimes(1);
  expect(configureApiBaseURL).toHaveBeenCalledWith(remoteUrl);
});

test('health diagnostic uses the shared client at the service root', async () => {
  await checkMobileBackendHealth(remoteUrl);
  expect(apiClient.get).toHaveBeenCalledWith(
    'https://repositorio-sistema-erp-backend.onrender.com/health',
  );
});
