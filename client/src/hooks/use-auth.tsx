import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../lib/auth';
import { User } from '@shared/schema';

interface AuthContextType {
  user: Omit<User, 'passwordHash'> | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmNewPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<Omit<User, 'passwordHash'> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const status = await authService.checkStatus();
      setUser(status.authenticated ? status.user || null : null);
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      setUser(response.user || null);
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, confirmPassword: string) => {
    try {
      const response = await authService.register(email, password, confirmPassword);
      setUser(response.user || null);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user state even if logout fails
      setUser(null);
    }
  };

  const updateProfile = async (email: string) => {
    try {
      const response = await authService.updateProfile(email);
      setUser(response.user || null);
    } catch (error) {
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmNewPassword: string) => {
    try {
      await authService.changePassword(currentPassword, newPassword, confirmNewPassword);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 