// ============================================
// API Client - Manejo de Tokens
// ============================================
// Actualización del paquete @erp/api-client
// para soporte de almacenamiento de tokens

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

// Store de tokens (en memoria para web/mobile)
const tokenStore = {
  accessToken: '',
  refreshToken: '',
  user: null as any,
};

export function setTokens(accessToken: string, refreshToken: string, user?: any): void {
  tokenStore.accessToken = accessToken;
  tokenStore.refreshToken = refreshToken;
  if (user) tokenStore.user = user;
}

export function getAccessToken(): string {
  return tokenStore.accessToken;
}

export function getRefreshToken(): string {
  return tokenStore.refreshToken;
}

export function clearTokens(): void {
  tokenStore.accessToken = '';
  tokenStore.refreshToken = '';
  tokenStore.user = null;
}

export function getStoredUser(): any {
  return tokenStore.user;
}

interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
}

class ApiClient {
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor(config: ApiClientConfig = {}) {
    this.client = axios.create({
      baseURL: config.baseURL || API_BASE_URL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const newToken = await this.refreshAccessToken();
            return this.client(originalRequest);
          } catch {
            clearTokens();
            throw error;
          }
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');
    // La implementación real llama al endpoint /auth/refresh
    throw new Error('Refresh token - implementar en la aplicación');
  }

  private handleError(error: AxiosError): Error {
    if (error.response?.data) {
      const { code, message } = error.response.data;
      return new Error(message || code || 'Error desconocido');
    }
    return new Error(error.message || 'Error de conexión');
  }

  async get<T = any>(url: string, config?: any): Promise<T> {
    return (await this.client.get(url, config)).data;
  }
  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return (await this.client.post(url, data, config)).data;
  }
  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return (await this.client.put(url, data, config)).data;
  }
  async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return (await this.client.patch(url, data, config)).data;
  }
  async delete<T = any>(url: string, config?: any): Promise<T> {
    return (await this.client.delete(url, config)).data;
  }
}

let instance: ApiClient | null = null;
export function getApiClient(config?: ApiClientConfig): ApiClient {
  if (!instance) instance = new ApiClient(config);
  return instance;
}
export const apiClient = getApiClient();
export type { ApiClientConfig };
