import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  roleId: string;
  branchId?: string;
}
/** Safe user representation returned by the API; credential fields are omitted. */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  companyId: string;
  roleId: string;
  branchId?: string;
  phone?: string;
  status: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  companyId: string;
  companyName?: string;
  roleId: string;
  permissions: string[];
}
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
const store = { accessToken: '', refreshToken: '', user: null as AuthUser | null, generation: 0 };
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((listener) => listener());
}
export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function setTokens(accessToken: string, refreshToken: string, user?: AuthUser): void {
  store.accessToken = accessToken;
  store.refreshToken = refreshToken;
  if (user) store.user = user;
  store.generation += 1;
  emit();
}
export const getAccessToken = () => store.accessToken;
export const getRefreshToken = () => store.refreshToken;
export const getStoredUser = () => store.user;
export function clearTokens(): void {
  store.accessToken = '';
  store.refreshToken = '';
  store.user = null;
  store.generation += 1;
  emit();
}

export class ApiClient {
  private client: AxiosInstance;
  private refreshClient: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;
  constructor(config: ApiClientConfig = {}) {
    const settings = { baseURL: config.baseURL || '/api/v1', timeout: config.timeout || 30000 };
    this.client = axios.create(settings);
    this.refreshClient = axios.create(settings);
    this.client.interceptors.request.use((request: InternalAxiosRequestConfig) => {
      if (getAccessToken()) request.headers.Authorization = 'Bearer ' + getAccessToken();
      return request;
    });
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const original = error.config as
          (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
        const isAuth = /^\/auth\/(login|refresh|logout)(?:\?|$)/.test(original?.url || '');
        if (
          error.response?.status === 401 &&
          original &&
          !original._retry &&
          !isAuth &&
          getRefreshToken()
        ) {
          original._retry = true;
          try {
            await this.refreshAccessToken();
            return await this.client(original);
          } catch (refreshError) {
            throw refreshError instanceof ApiError ? refreshError : this.handleError(error);
          }
        }
        if (error.response?.status === 401 && original?._retry) clearTokens();
        throw this.handleError(error);
      },
    );
  }
  setBaseURL(baseURL: string) {
    this.client.defaults.baseURL = baseURL;
    this.refreshClient.defaults.baseURL = baseURL;
  }
  refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) return this.refreshPromise;
    const refreshToken = getRefreshToken(),
      generation = store.generation;
    if (!refreshToken)
      return Promise.reject(new ApiError('Inicia sesión nuevamente', 401, 'SESSION_EXPIRED'));
    this.refreshPromise = this.refreshClient
      .post<ApiEnvelope<TokenResponse>>('/auth/refresh', { refreshToken })
      .then(({ data: envelope }) => {
        if (generation !== store.generation)
          throw new ApiError('La sesión cambió', 401, 'SESSION_CHANGED');
        const pair = envelope?.data;
        if (!envelope.success || !pair?.accessToken || !pair.refreshToken || !pair.user)
          throw new ApiError('Respuesta de sesión inválida', 502);
        setTokens(pair.accessToken, pair.refreshToken, pair.user);
        return pair.accessToken;
      })
      .catch((error: AxiosError | ApiError) => {
        if (generation === store.generation) clearTokens();
        throw error instanceof ApiError ? error : this.handleError(error);
      })
      .finally(() => {
        this.refreshPromise = null;
      });
    return this.refreshPromise;
  }
  private handleError(error: AxiosError): ApiError {
    const body = error.response?.data as
      { error?: { code?: string; message?: string } } | undefined;
    return new ApiError(
      body?.error?.message ||
        (error.response
          ? 'No se pudo completar la solicitud'
          : 'No se pudo conectar con el servidor'),
      error.response?.status,
      body?.error?.code,
    );
  }
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return (await this.client.get<T>(url, config)).data;
  }
  async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return (await this.client.post<T>(url, data, config)).data;
  }
  async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return (await this.client.put<T>(url, data, config)).data;
  }
  async patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return (await this.client.patch<T>(url, data, config)).data;
  }
  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return (await this.client.delete<T>(url, config)).data;
  }
  createUser(request: CreateUserRequest): Promise<ApiEnvelope<UserResponse>> {
    return this.post<ApiEnvelope<UserResponse>>('/users', request);
  }
  listUsers(
    page = 1,
    limit = 20,
  ): Promise<
    ApiEnvelope<UserResponse[]> & {
      pagination: { page: number; limit: number; total: number; pages: number };
    }
  > {
    return this.get('/users', { params: { page, limit } });
  }
}
export const apiClient = new ApiClient();
export function getApiClient(config?: ApiClientConfig): ApiClient {
  return config ? new ApiClient(config) : apiClient;
}
export const configureApiBaseURL = (url: string) => apiClient.setBaseURL(url);
export async function endSession(client: ApiClient = apiClient): Promise<void> {
  try {
    if (!getRefreshToken()) return;
    try {
      await client.post('/auth/logout', { refreshToken: getRefreshToken() });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      await client.refreshAccessToken();
      await client.post('/auth/logout', { refreshToken: getRefreshToken() });
    }
  } finally {
    clearTokens();
  }
}
