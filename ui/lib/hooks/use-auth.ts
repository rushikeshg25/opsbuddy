import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    setUser,
    setLoading,
    login,
    logout,
    checkAuth,
    refreshAuth,
  } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      checkAuth();
    }
  }, [isInitialized, checkAuth]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    login,
    logout,
    checkAuth,
    refreshAuth,
    setUser,
    setLoading,
  };
};

// Hook for protected routes
export const useRequireAuth = () => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isInitialized, logout } = useAuth();

  useEffect(() => {
    if (isInitialized && !isLoading && !isAuthenticated) {
      router.push('/sign-in');
    }
  }, [isAuthenticated, isLoading, isInitialized, router]);

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    logout,
  };
};

export const useRequireGuest = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading, isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized && !isLoading && isAuthenticated) {
      router.push('/services');
    }
  }, [isAuthenticated, isLoading, isInitialized, router]);

  return {
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
  };
};
