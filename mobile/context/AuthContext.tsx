import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { StorageService } from '../services/storage';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUser: (updatedUser: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await StorageService.getToken();
      const storedUser = await StorageService.getUser();
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        // Refresh profile in background
        refreshProfile();
      }
    } catch (e) {
      console.warn('Failed to load stored auth', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data;
    setToken(receivedToken);
    setUser(receivedUser);
    await StorageService.saveAuth(receivedToken, receivedUser);
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await api.post('/auth/register', { username, email, password });
    const { token: receivedToken, user: receivedUser } = res.data;
    setToken(receivedToken);
    setUser(receivedUser);
    await StorageService.saveAuth(receivedToken, receivedUser);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await StorageService.clearAuth();
  };

  const updateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    const storedToken = await StorageService.getToken();
    if (storedToken) {
      await StorageService.saveAuth(storedToken, updatedUser);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.user) {
        setUser(res.data.user);
        const storedToken = await StorageService.getToken();
        if (storedToken) {
          await StorageService.saveAuth(storedToken, res.data.user);
        }
      }
    } catch (e) {
      console.warn('Could not refresh profile from server', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
