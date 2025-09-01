import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  login: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  reset: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setInitialized: (initialized) => {
        set({ isInitialized: initialized });
      },

      login: () => {
        window.location.href = 'http://localhost:8080/auth/google';
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          const response = await fetch('http://localhost:8080/auth/logout', {
            method: 'POST',
            credentials: 'include'
          });

          if (response.ok) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
            
            // Redirect to sign-in page
            window.location.href = '/sign-in';
          } else {
            throw new Error('Logout failed');
          }
        } catch (error) {
          console.error('Logout error:', error);
          // Even if logout fails on server, clear local state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          window.location.href = '/sign-in';
        }
      },

      checkAuth: async () => {
        const state = get();
        if (state.isInitialized) return;
        
        set({ isLoading: true });
        
        try {
          const response = await fetch('http://localhost:8080/api/me', {
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            set({
              user: { id: data.user_name, name: data.user_name },
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            // Clear any stale persisted data
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
            });
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          // Clear any stale persisted data
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      refreshAuth: async () => {
        set({ isLoading: true });
        
        try {
          const response = await fetch('http://localhost:8080/api/me', {
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            set({
              user: { id: data.user_name, name: data.user_name },
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
            });
          }
        } catch (error) {
          console.error('Auth refresh failed:', error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'auth-storage',
      // Only persist user data, not loading states
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);