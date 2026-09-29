import { Platform } from 'react-native';

/** Local URLs are only selected in debug builds. Release API configuration is pending. */
export function getMobileApiBaseURL(isDev: boolean): string {
  if (isDev) {
    return Platform.OS === 'android'
      ? 'http://10.0.2.2:3000/api/v1'
      : 'http://localhost:3000/api/v1';
  }
  return 'https://api.example.invalid/api/v1';
}
