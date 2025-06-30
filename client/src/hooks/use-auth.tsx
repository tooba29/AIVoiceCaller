import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../lib/auth';
import { User } from '@shared/schema';
import { queryClient } from '../lib/queryClient';

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
      const newUser = status.authenticated ? status.user || null : null;
      
      // If user changed (different user ID or logged out), clear cache
      if (user?.id !== newUser?.id) {
        await queryClient.clear();
        console.log('🔒 Cache cleared due to user change - data isolation secured');
      }
      
      setUser(newUser);
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setUser(null);
      // Clear cache on auth error to prevent stale data
      await queryClient.clear();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Clear all cached data before logging in to prevent data leakage
      await queryClient.clear();
      const response = await authService.login(email, password);
      setUser(response.user || null);
      // Clear cache again after login to ensure fresh data for new user
      await queryClient.clear();
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, confirmPassword: string) => {
    try {
      // Clear all cached data before registering to prevent data leakage
      await queryClient.clear();
      const response = await authService.register(email, password, confirmPassword);
      setUser(response.user || null);
      // Clear cache again after registration to ensure fresh data for new user
      await queryClient.clear();
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      // CRITICAL: Clear all React Query cache to prevent data leakage between users
      await queryClient.clear();
      console.log('🔒 Cache cleared on logout - user data secured');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user state and cache even if logout fails
      setUser(null);
      await queryClient.clear();
      console.log('🔒 Cache cleared on logout error - user data secured');
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