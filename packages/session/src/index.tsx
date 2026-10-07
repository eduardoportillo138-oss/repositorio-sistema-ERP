import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  apiClient,
  AuthUser,
  ApiEnvelope,
  TokenResponse,
  setTokens,
  getAccessToken,
  getStoredUser,
  subscribeSession,
  endSession,
} from '@erp/api-client';

interface AuthContextType {
  user: AuthUser | null;
  token: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, companyId?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(getStoredUser),
    [token, setToken] = useState(getAccessToken),
    [isLoading, setLoading] = useState(false);
  useEffect(
    () =>
      subscribeSession(() => {
        setUser(getStoredUser());
        setToken(getAccessToken());
      }),
    [],
  );
  const login = useCallback(async (email: string, password: string, companyId?: string) => {
    setLoading(true);
    try {
      // Render Free can take about a minute to wake; extend only the login request.
      const envelope = await apiClient.post<ApiEnvelope<TokenResponse>>(
        '/auth/login',
        {
          email: email.trim().toLowerCase(),
          password,
          ...(companyId?.trim() ? { companyId: companyId.trim() } : {}),
        },
        { timeout: 90000 },
      );
      const pair = envelope.data;
      if (!envelope.success || !pair?.user || !pair.accessToken || !pair.refreshToken)
        throw new Error('Respuesta de sesión inválida');
      setTokens(pair.accessToken, pair.refreshToken, pair.user);
    } finally {
      setLoading(false);
    }
  }, []);
  const logout = useCallback(async () => {
    await endSession();
  }, []);
  const refreshSession = useCallback(async () => {
    await apiClient.refreshAccessToken();
  }, []);
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth requiere AuthProvider');
  return context;
}
export type { AuthUser };
