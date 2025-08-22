export interface User {
  id: string;
  name: string;
}

export const authAPI = {
  // Check if user is authenticated
  checkAuth: async (): Promise<User | null> => {
    try {
      const response = await fetch('http://localhost:8080/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.user;
      }
      return null;
    } catch (error) {
      console.error('Auth check failed:', error);
      return null;
    }
  },

  // Logout user
  logout: async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8080/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      return response.ok;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  },

  // Login with GitHub (redirects to backend)
  loginWithGitHub: () => {
    window.location.href = 'http://localhost:8080/auth/github';
  }
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
      // Unauthorized, clear auth state and redirect to login
      useAuthStore.getState().reset();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
};