import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  emailId: string;
  firstName: string;
  lastName: string;
  mobileNo?: string;
  authorities: string[];
  enabled: boolean;
  accountNonLocked: boolean;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: { username: string; token: string }) => Promise<void>;
  loginWithOTT: (username: string, token: string) => Promise<void>;
  generateOTT: (username: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Actions
        login: async (credentials) => {
          set({ isLoading: true, error: null });
          try {
            // API call would go here
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/login/ott`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams(credentials),
            });

            if (!response.ok) {
              throw new Error('Login failed');
            }

            const data = await response.json();

            set({
              user: data.user,
              token: data.token,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Login failed',
              isLoading: false,
            });
          }
        },

        loginWithOTT: async (username, token) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/login/ott`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({ username, token }),
            });

            if (!response.ok) {
              throw new Error('Login failed');
            }

            const data = await response.json();

            set({
              user: data.user,
              token: data.token,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Login failed',
              isLoading: false,
            });
          }
        },

        generateOTT: async (username) => {
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/ott/generate`, {
              method: 'POST',
              body: new FormData(),
            });

            const formData = new FormData();
            formData.append('username', username);

            const responseWithFormData = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/ott/generate`,
              {
                method: 'POST',
                body: formData,
              },
            );

            if (!responseWithFormData.ok) {
              return { success: false, message: 'Failed to generate OTT' };
            }

            return { success: true };
          } catch (error) {
            return {
              success: false,
              message: error instanceof Error ? error.message : 'Failed to generate OTT',
            };
          }
        },

        logout: () => {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
          });
        },

        refreshToken: async () => {
          const { token } = get();
          if (!token) return;

          try {
            // API call to refresh token would go here
            // For now, we'll just keep the existing token
            console.log('Token refresh logic would go here');
          } catch (error) {
            // If refresh fails, logout
            get().logout();
          }
        },

        clearError: () => set({ error: null }),

        setLoading: (loading) => set({ isLoading: loading }),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        }),
      },
    ),
    {
      name: 'auth-store',
    },
  ),
);
