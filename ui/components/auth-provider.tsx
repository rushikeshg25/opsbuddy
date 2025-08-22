"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { checkAuth, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      checkAuth();
    }
  }, [checkAuth, isInitialized]);

  return <>{children}</>;
};