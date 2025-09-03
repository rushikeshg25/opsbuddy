export const SESSION_COOKIE = 'opsbuddy_session';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
}

export const authAPI = {
  checkAuth: async (): Promise<User | null> => {
    try {
      const response = await fetch('http://localhost:8080/api/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        return { id: data.user_name, name: data.user_name };
      }
      return null;
    } catch (error) {
      console.error('Auth check failed:', error);
      return null;
    }
  },

  logout: async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8080/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      return response.ok;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  },

  loginWithGoogle: () => {
    window.location.href = 'http://localhost:8080/auth/google';
  },
};

import { useAuthStore } from './store/auth-store';

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`http://localhost:8080/api${endpoint}`, {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      useAuthStore.getState().reset();
      window.location.href = '/sign-in';
      throw new Error('Unauthorized');
    }
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
};
