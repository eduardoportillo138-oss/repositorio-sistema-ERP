import { apiClient, getRefreshToken, setTokens, clearTokens } from '@erp/api-client';
export const mobileApiClient = apiClient;
export const api = apiClient;
export const authAPI = {
  login: (email: string, password: string, companyId?: string) =>
    apiClient.post('/auth/login', { email, password, companyId }),
  logout: () => apiClient.post('/auth/logout', { refreshToken: getRefreshToken() }),
  refreshToken: (refreshToken: string) => apiClient.post('/auth/refresh', { refreshToken }),
};
export const setMobileTokens = setTokens;
export const clearMobileTokens = clearTokens;
