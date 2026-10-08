import { configureApiBaseURL } from '@erp/api-client';
import { initializeWebApi, resolveWebApiBaseURL } from '../src/config/api';

jest.mock('@erp/api-client', () => ({ configureApiBaseURL: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

test('production configures the gateway once before the app renders', () => {
  const gateway = 'https://erp-api-gateway.eduardoportillo138.workers.dev/api/v1';
  expect(initializeWebApi(gateway, true)).toBe(gateway);
  expect(configureApiBaseURL).toHaveBeenCalledTimes(1);
  expect(configureApiBaseURL).toHaveBeenCalledWith(gateway);
});

test('production without an absolute HTTPS API URL fails before any request', () => {
  expect(() => initializeWebApi(undefined, true)).toThrow('VITE_API_BASE_URL');
  expect(() => initializeWebApi('/api/v1', true)).toThrow('VITE_API_BASE_URL');
  expect(() => initializeWebApi('https://gateway.example/api/v1/api/v1', true)).toThrow();
  expect(configureApiBaseURL).not.toHaveBeenCalled();
});

test('development can use the local Vite proxy', () => {
  expect(resolveWebApiBaseURL(undefined, false)).toBe('/api/v1');
});
