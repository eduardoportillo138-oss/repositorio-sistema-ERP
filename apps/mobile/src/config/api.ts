import { Platform } from 'react-native';

/** Local HTTP is available only in debug and the separately signed local build. */
export function getMobileApiBaseURL(isDev: boolean, isLocal = false): string {
  if (isDev || isLocal) {
    return Platform.OS === 'android'
      ? 'http://10.0.2.2:3000/api/v1'
      : 'http://localhost:3000/api/v1';
  }
  return 'https://api.example.invalid/api/v1';
}
