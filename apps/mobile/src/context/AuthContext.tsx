import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// DEV: Auth bypass requires explicit environment variable
// Set EXPO_PUBLIC_DEV_SKIP_AUTH=true in .env.local to enable
// Security: This prevents accidental auth bypass in distributed dev builds
const DEV_SKIP_AUTH = __DEV__ && process.env.EXPO_PUBLIC_DEV_SKIP_AUTH === 'true';

const MOCK_USER: User = {
  id: 999999, // Use high ID that won't conflict with real users
  name: 'Dev Test User',
  email: 'dev-test@localhost',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: DEV_SKIP_AUTH ? MOCK_USER : null,
    isLoading: !DEV_SKIP_AUTH,
    isAuthenticated: DEV_SKIP_AUTH,
  });

  // Check for existing session on mount
  useEffect(() => {
    if (!DEV_SKIP_AUTH) {
      checkAuth();
    }
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const { user } = await api.getMe();
        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState(s => ({ ...s, isLoading: false }));
      }
    } catch (error) {
      await api.clearToken();
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const login = async (email: string, password: string) => {
    const { user } = await api.login(email, password);
    setState({
      user,
      isLoading: false,
      isAuthenticated: true,
    });
  };

  const register = async (name: string, email: string, password: string) => {
    const { user } = await api.register(name, email, password);
    setState({
      user,
      isLoading: false,
      isAuthenticated: true,
    });
  };

  const logout = async () => {
    await api.clearToken();
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
