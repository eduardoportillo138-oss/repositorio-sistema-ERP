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

export interface CustomerResponse {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  taxId?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
  branchId?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}
export type CreateCustomerRequest = Pick<CustomerResponse, 'name'> &
  Partial<Pick<CustomerResponse, 'email' | 'phone' | 'taxId' | 'address' | 'city' |
    'country' | 'postalCode' | 'notes' | 'branchId'>>;
export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;
export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
export type CustomerListResponse = ApiEnvelope<CustomerResponse[]> & {
  pagination: PaginationResponse;
};
export interface SupplierResponse {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  taxId?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
  contactName?: string;
  paymentTerms?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}
export type CreateSupplierRequest = Pick<SupplierResponse, 'name'> &
  Partial<Pick<SupplierResponse, 'email' | 'phone' | 'taxId' | 'address' | 'city' |
    'country' | 'postalCode' | 'notes' | 'contactName' | 'paymentTerms'>>;
export type UpdateSupplierRequest = Partial<CreateSupplierRequest>;
export type SupplierListResponse = ApiEnvelope<SupplierResponse[]> & {
  pagination: PaginationResponse;
};
export interface CategoryResponse {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}
export type CreateCategoryRequest = Pick<CategoryResponse, 'name' | 'code'> &
  Partial<Pick<CategoryResponse, 'description'>>;
export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;
export type CategoryListResponse = ApiEnvelope<CategoryResponse[]> & {
  pagination: PaginationResponse;
};
export interface UnitResponse {
  id: string;
  name: string;
  code: string;
  symbol: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}
export type CreateUnitRequest = Pick<UnitResponse, 'name' | 'code' | 'symbol'> &
  Partial<Pick<UnitResponse, 'description'>>;
export type UpdateUnitRequest = Partial<CreateUnitRequest>;
export type UnitListResponse = ApiEnvelope<UnitResponse[]> & {
  pagination: PaginationResponse;
};
export interface WarehouseResponse {
  id: string;
  name: string;
  code: string;
  branchId?: string;
  address?: string;
  location?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}
export type CreateWarehouseRequest = Pick<WarehouseResponse, 'name' | 'code'> & {
  branchId: string;
  address?: string;
  location?: string;
};
export type UpdateWarehouseRequest = Partial<CreateWarehouseRequest>;
export type WarehouseListResponse = ApiEnvelope<WarehouseResponse[]> & {
  pagination: PaginationResponse;
};
export interface ProductResponse {
  id: string;
  code: string;
  name: string;
  description?: string;
  barcode?: string;
  categoryId: string;
  unitId: string;
  priceMinor?: number;
  costMinor?: number;
  taxRateBps: number;
  stockMinimum: number;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}
export type CreateProductRequest = Pick<ProductResponse,
  'code' | 'name' | 'categoryId' | 'unitId' | 'priceMinor'> &
  Partial<Pick<ProductResponse,
    'description' | 'barcode' | 'costMinor' | 'taxRateBps' | 'stockMinimum'>>;
export type UpdateProductRequest = Partial<CreateProductRequest>;
export type ProductListResponse = ApiEnvelope<ProductResponse[]> & {
  pagination: PaginationResponse;
};
export interface InventoryStockResponse {
  productId: string;
  code: string;
  name: string;
  unitId: string;
  stockMinimum: number;
  quantityMilli: number;
  lowStock: boolean;
}
export interface ProductStockResponse extends InventoryStockResponse {
  warehouses: Array<{ warehouseId: string; warehouseName: string; quantityMilli: number }>;
}
export interface InventoryMovementResponse {
  id: string;
  productId: string;
  warehouseId: string;
  branchId?: string;
  type: string;
  quantityMilli: number;
  unitCostMinor?: number;
  referenceType?: string;
  referenceId?: string;
  reason: string;
  notes?: string;
  createdAt: string;
}
export type InventoryListResponse = ApiEnvelope<InventoryStockResponse[]> & {
  pagination: PaginationResponse;
};
export type InventoryMovementListResponse = ApiEnvelope<InventoryMovementResponse[]> & {
  pagination: PaginationResponse;
};
export interface CreateAdjustmentRequest {
  productId: string;
  warehouseId: string;
  direction: 'initial' | 'in' | 'out';
  quantityMilli: number;
  reason: string;
  notes?: string;
  unitCostMinor?: number;
}
export interface CreateTransferRequest {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantityMilli: number;
  reason: string;
  notes?: string;
}
export interface SaleItemResponse {
  productId: string;
  name: string;
  quantityMilli: number;
  unitPriceMinor: number;
  discountMinor: number;
  taxRateBps: number;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
}
export interface SaleResponse {
  id: string;
  folio: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  customerId: string;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  branchId: string;
  notes?: string;
  items: SaleItemResponse[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
}
export interface PurchaseItemResponse extends Omit<SaleItemResponse, 'unitPriceMinor'> {
  unitCostMinor: number;
}
export interface PurchaseResponse extends Omit<SaleResponse,
  'status' | 'customerId' | 'customerName' | 'items' | 'confirmedAt'> {
  status: 'draft' | 'received' | 'cancelled';
  supplierId: string;
  supplierName: string;
  items: PurchaseItemResponse[];
  receivedAt?: string;
}
export interface CreateSaleRequest {
  customerId: string;
  warehouseId: string;
  items: Array<{ productId: string; quantityMilli: number; discountMinor?: number }>;
  notes?: string;
}
export type UpdateSaleRequest = Partial<CreateSaleRequest>;
export interface CreatePurchaseRequest {
  supplierId: string;
  warehouseId: string;
  items: Array<{ productId: string; quantityMilli: number;
    unitCostMinor: number; discountMinor?: number }>;
  notes?: string;
}
export type UpdatePurchaseRequest = Partial<CreatePurchaseRequest>;
export type SaleListResponse = ApiEnvelope<SaleResponse[]> & { pagination: PaginationResponse };
export type PurchaseListResponse = ApiEnvelope<PurchaseResponse[]> & { pagination: PaginationResponse };
export type FinanceAccountKind = 'receivable' | 'payable';
export interface FinanceAccountResponse {
  id: string;
  branchId: string;
  sourceId: string;
  partyId: string;
  amountMinor: number;
  paidMinor: number;
  balanceMinor: number;
  status: 'pending' | 'partial' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}
export interface PaymentResponse {
  id: string;
  accountType: FinanceAccountKind;
  accountId: string;
  branchId: string;
  amountMinor: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}
export interface CreatePaymentRequest {
  accountType: FinanceAccountKind;
  accountId: string;
  amountMinor: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}
export type FinanceAccountListResponse = ApiEnvelope<FinanceAccountResponse[]> &
  { pagination: PaginationResponse };
export type PaymentListResponse = ApiEnvelope<PaymentResponse[]> &
  { pagination: PaginationResponse };
export interface BranchResponse {
  _id: string;
  name: string;
  code: string;
  status: string;
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
    if (!error.response && (globalThis as { __DEV__?: boolean }).__DEV__) {
      // Only transport metadata: never log the request body, headers or tokens.
      console.warn('API connection failed', {
        baseURL: error.config?.baseURL,
        code: error.code,
        timeout: error.config?.timeout,
        kind: error.code === 'ECONNABORTED' ? 'timeout' : 'network',
      });
    }
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
  listCustomers(params: { page?: number; limit?: number; search?: string;
    status?: 'active' | 'inactive' } = {}): Promise<CustomerListResponse> {
    return this.get<CustomerListResponse>('/customers', { params });
  }
  getCustomer(id: string): Promise<ApiEnvelope<CustomerResponse>> {
    return this.get<ApiEnvelope<CustomerResponse>>('/customers/' + encodeURIComponent(id));
  }
  createCustomer(request: CreateCustomerRequest): Promise<ApiEnvelope<CustomerResponse>> {
    return this.post<ApiEnvelope<CustomerResponse>>('/customers', request);
  }
  updateCustomer(id: string, request: UpdateCustomerRequest): Promise<ApiEnvelope<CustomerResponse>> {
    return this.put<ApiEnvelope<CustomerResponse>>('/customers/' + encodeURIComponent(id), request);
  }
  deactivateCustomer(id: string): Promise<ApiEnvelope<CustomerResponse>> {
    return this.patch<ApiEnvelope<CustomerResponse>>('/customers/' + encodeURIComponent(id) + '/deactivate');
  }
  listSuppliers(params: { page?: number; limit?: number; search?: string;
    status?: 'active' | 'inactive' } = {}): Promise<SupplierListResponse> {
    return this.get<SupplierListResponse>('/suppliers', { params });
  }
  getSupplier(id: string): Promise<ApiEnvelope<SupplierResponse>> {
    return this.get<ApiEnvelope<SupplierResponse>>('/suppliers/' + encodeURIComponent(id));
  }
  createSupplier(request: CreateSupplierRequest): Promise<ApiEnvelope<SupplierResponse>> {
    return this.post<ApiEnvelope<SupplierResponse>>('/suppliers', request);
  }
  updateSupplier(id: string, request: UpdateSupplierRequest): Promise<ApiEnvelope<SupplierResponse>> {
    return this.put<ApiEnvelope<SupplierResponse>>('/suppliers/' + encodeURIComponent(id), request);
  }
  deactivateSupplier(id: string): Promise<ApiEnvelope<SupplierResponse>> {
    return this.patch<ApiEnvelope<SupplierResponse>>('/suppliers/' + encodeURIComponent(id) + '/deactivate');
  }
  listCategories(params: { page?: number; limit?: number; search?: string;
    status?: 'active' | 'inactive' } = {}): Promise<CategoryListResponse> {
    return this.get<CategoryListResponse>('/categories', { params });
  }
  getCategory(id: string): Promise<ApiEnvelope<CategoryResponse>> {
    return this.get<ApiEnvelope<CategoryResponse>>('/categories/' + encodeURIComponent(id));
  }
  createCategory(request: CreateCategoryRequest): Promise<ApiEnvelope<CategoryResponse>> {
    return this.post<ApiEnvelope<CategoryResponse>>('/categories', request);
  }
  updateCategory(id: string, request: UpdateCategoryRequest): Promise<ApiEnvelope<CategoryResponse>> {
    return this.put<ApiEnvelope<CategoryResponse>>('/categories/' + encodeURIComponent(id), request);
  }
  deactivateCategory(id: string): Promise<ApiEnvelope<CategoryResponse>> {
    return this.patch<ApiEnvelope<CategoryResponse>>('/categories/' + encodeURIComponent(id) + '/deactivate');
  }
  listUnits(params: { page?: number; limit?: number; search?: string;
    status?: 'active' | 'inactive' } = {}): Promise<UnitListResponse> {
    return this.get<UnitListResponse>('/units', { params });
  }
  getUnit(id: string): Promise<ApiEnvelope<UnitResponse>> {
    return this.get<ApiEnvelope<UnitResponse>>('/units/' + encodeURIComponent(id));
  }
  createUnit(request: CreateUnitRequest): Promise<ApiEnvelope<UnitResponse>> {
    return this.post<ApiEnvelope<UnitResponse>>('/units', request);
  }
  updateUnit(id: string, request: UpdateUnitRequest): Promise<ApiEnvelope<UnitResponse>> {
    return this.put<ApiEnvelope<UnitResponse>>('/units/' + encodeURIComponent(id), request);
  }
  deactivateUnit(id: string): Promise<ApiEnvelope<UnitResponse>> {
    return this.patch<ApiEnvelope<UnitResponse>>('/units/' + encodeURIComponent(id) + '/deactivate');
  }
  listWarehouses(params: { page?: number; limit?: number; search?: string;
    status?: 'active' | 'inactive' } = {}): Promise<WarehouseListResponse> {
    return this.get<WarehouseListResponse>('/warehouses', { params });
  }
  getWarehouse(id: string): Promise<ApiEnvelope<WarehouseResponse>> {
    return this.get<ApiEnvelope<WarehouseResponse>>('/warehouses/' + encodeURIComponent(id));
  }
  createWarehouse(request: CreateWarehouseRequest): Promise<ApiEnvelope<WarehouseResponse>> {
    return this.post<ApiEnvelope<WarehouseResponse>>('/warehouses', request);
  }
  updateWarehouse(id: string, request: UpdateWarehouseRequest): Promise<ApiEnvelope<WarehouseResponse>> {
    return this.put<ApiEnvelope<WarehouseResponse>>('/warehouses/' + encodeURIComponent(id), request);
  }
  deactivateWarehouse(id: string): Promise<ApiEnvelope<WarehouseResponse>> {
    return this.patch<ApiEnvelope<WarehouseResponse>>('/warehouses/' + encodeURIComponent(id) + '/deactivate');
  }
  listProducts(params: { page?: number; limit?: number; search?: string;
    status?: 'active' | 'inactive'; categoryId?: string } = {}): Promise<ProductListResponse> {
    return this.get<ProductListResponse>('/products', { params });
  }
  getProduct(id: string): Promise<ApiEnvelope<ProductResponse>> {
    return this.get<ApiEnvelope<ProductResponse>>('/products/' + encodeURIComponent(id));
  }
  createProduct(request: CreateProductRequest): Promise<ApiEnvelope<ProductResponse>> {
    return this.post<ApiEnvelope<ProductResponse>>('/products', request);
  }
  updateProduct(id: string, request: UpdateProductRequest): Promise<ApiEnvelope<ProductResponse>> {
    return this.put<ApiEnvelope<ProductResponse>>('/products/' + encodeURIComponent(id), request);
  }
  deactivateProduct(id: string): Promise<ApiEnvelope<ProductResponse>> {
    return this.patch<ApiEnvelope<ProductResponse>>('/products/' + encodeURIComponent(id) + '/deactivate');
  }
  listInventory(params: { page?: number; limit?: number; search?: string;
    warehouseId?: string } = {}): Promise<InventoryListResponse> {
    return this.get<InventoryListResponse>('/inventory', { params });
  }
  getProductStock(productId: string): Promise<ApiEnvelope<ProductStockResponse>> {
    return this.get<ApiEnvelope<ProductStockResponse>>('/inventory/product/' + encodeURIComponent(productId));
  }
  listInventoryMovements(params: { page?: number; limit?: number; productId?: string;
    warehouseId?: string; type?: string } = {}): Promise<InventoryMovementListResponse> {
    return this.get<InventoryMovementListResponse>('/inventory/movements', { params });
  }
  createInventoryAdjustment(request: CreateAdjustmentRequest): Promise<
    ApiEnvelope<{ movement: InventoryMovementResponse; quantityMilli: number }>> {
    return this.post('/inventory/adjustments', request);
  }
  createInventoryTransfer(request: CreateTransferRequest): Promise<
    ApiEnvelope<{ transferId: string; outgoing: InventoryMovementResponse;
      incoming: InventoryMovementResponse; sourceStockMilli: number;
      destinationStockMilli: number }>> {
    return this.post('/inventory/transfers', request);
  }
  listSales(params: { page?: number; limit?: number; search?: string;
    status?: SaleResponse['status'] } = {}): Promise<SaleListResponse> {
    return this.get<SaleListResponse>('/sales', { params });
  }
  getSale(id: string): Promise<ApiEnvelope<SaleResponse>> {
    return this.get<ApiEnvelope<SaleResponse>>('/sales/' + encodeURIComponent(id));
  }
  createSale(request: CreateSaleRequest): Promise<ApiEnvelope<SaleResponse>> {
    return this.post<ApiEnvelope<SaleResponse>>('/sales', request);
  }
  updateSale(id: string, request: UpdateSaleRequest): Promise<ApiEnvelope<SaleResponse>> {
    return this.put<ApiEnvelope<SaleResponse>>('/sales/' + encodeURIComponent(id), request);
  }
  confirmSale(id: string): Promise<ApiEnvelope<SaleResponse>> {
    return this.patch<ApiEnvelope<SaleResponse>>('/sales/' + encodeURIComponent(id) + '/confirm');
  }
  cancelSale(id: string): Promise<ApiEnvelope<SaleResponse>> {
    return this.patch<ApiEnvelope<SaleResponse>>('/sales/' + encodeURIComponent(id) + '/cancel');
  }
  listPurchases(params: { page?: number; limit?: number; search?: string;
    status?: PurchaseResponse['status'] } = {}): Promise<PurchaseListResponse> {
    return this.get<PurchaseListResponse>('/purchases', { params });
  }
  getPurchase(id: string): Promise<ApiEnvelope<PurchaseResponse>> {
    return this.get<ApiEnvelope<PurchaseResponse>>('/purchases/' + encodeURIComponent(id));
  }
  createPurchase(request: CreatePurchaseRequest): Promise<ApiEnvelope<PurchaseResponse>> {
    return this.post<ApiEnvelope<PurchaseResponse>>('/purchases', request);
  }
  updatePurchase(id: string, request: UpdatePurchaseRequest): Promise<ApiEnvelope<PurchaseResponse>> {
    return this.put<ApiEnvelope<PurchaseResponse>>('/purchases/' + encodeURIComponent(id), request);
  }
  confirmPurchase(id: string): Promise<ApiEnvelope<PurchaseResponse>> {
    return this.patch<ApiEnvelope<PurchaseResponse>>('/purchases/' + encodeURIComponent(id) + '/confirm');
  }
  cancelPurchase(id: string): Promise<ApiEnvelope<PurchaseResponse>> {
    return this.patch<ApiEnvelope<PurchaseResponse>>('/purchases/' + encodeURIComponent(id) + '/cancel');
  }
  listFinanceAccounts(kind: FinanceAccountKind,
    params: { page?: number; limit?: number; status?: FinanceAccountResponse['status'] } = {}):
    Promise<FinanceAccountListResponse> {
    return this.get<FinanceAccountListResponse>(
      '/finance/' + (kind === 'receivable' ? 'receivables' : 'payables'), { params });
  }
  getFinanceAccount(kind: FinanceAccountKind, id: string): Promise<ApiEnvelope<FinanceAccountResponse>> {
    return this.get<ApiEnvelope<FinanceAccountResponse>>(
      '/finance/' + (kind === 'receivable' ? 'receivables' : 'payables') + '/' + encodeURIComponent(id));
  }
  listPayments(params: { page?: number; limit?: number; accountType?: FinanceAccountKind;
    accountId?: string } = {}): Promise<PaymentListResponse> {
    return this.get<PaymentListResponse>('/finance/payments', { params });
  }
  recordPayment(request: CreatePaymentRequest): Promise<ApiEnvelope<PaymentResponse>> {
    return this.post<ApiEnvelope<PaymentResponse>>('/finance/payments', request);
  }
  listBranches(params: { page?: number; limit?: number } = {}): Promise<
    ApiEnvelope<BranchResponse[]> & { pagination: PaginationResponse }> {
    return this.get('/branches', { params });
  }
  getBranch(id: string): Promise<ApiEnvelope<BranchResponse>> {
    return this.get<ApiEnvelope<BranchResponse>>('/branches/' + encodeURIComponent(id));
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
