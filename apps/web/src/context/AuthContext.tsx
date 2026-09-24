// ============================================
// Context de Autenticación
// ============================================

import React, { createContext, useContext, useState, useCallback } from 'react';
import { apiClient } from '@erp/api-client';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  permissions: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user: userData } = response.data;
      setToken(accessToken);
      setUser(userData);
      // Almacenar token de forma segura
      try {
        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
      } catch {
        // Si AsyncStorage no está disponible, continuar en memoria
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignorar errores en logout
    } finally {
      setToken(null);
      setUser(null);
      try {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      } catch {
        // Ignorar
      }
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        const response = await apiClient.post('/auth/refresh', { refreshToken });
        setToken(response.data.accessToken);
      }
    } catch {
      await logout();
    }
  }, [logout]);

  // Restaurar sesión al iniciar
  React.useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('accessToken');
        const storedUser = await AsyncStorage.getItem('user');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {
        // No hay sesión almacenada
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, [logout]);

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
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Stub para AsyncStorage (se reemplazará con implementación nativa)
const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // Implementación placeholder
      return null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    // Implementación placeholder
  },
  multiRemove: async (keys: string[]): Promise<void> => {
    // Implementación placeholder
  },
};
