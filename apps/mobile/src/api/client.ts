// ============================================
// API Client para Mobile
// ============================================

import { apiClient, getApiClient, setTokens, getAccessToken, clearTokens } from '@erp/api-client';

const API_BASE_URL = 'http://localhost:3000/api/v1';

export const mobileApiClient = getApiClient({ baseURL: API_BASE_URL });

export const authAPI = {
  login: (email: string, password: string) =>
    mobileApiClient.post('/auth/login', { email, password }),
  logout: () => mobileApiClient.post('/auth/logout'),
  refreshToken: (refreshToken: string) =>
    mobileApiClient.post('/auth/refresh', { refreshToken }),
};

export const setMobileTokens = (accessToken: string, refreshToken: string) => {
  setTokens(accessToken, refreshToken);
};

export const clearMobileTokens = () => {
  clearTokens();
};
