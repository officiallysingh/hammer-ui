import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User } from './authStore';

export interface UserState {
  // State
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUsers: () => Promise<void>;
  createUser: (userData: Partial<User>) => Promise<void>;
  updateUser: (id: string, userData: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  clearUsers: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        users: [],
        currentUser: null,
        isLoading: false,
        error: null,

        // Actions
        fetchUsers: async () => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users`, {
              headers: {
                Authorization: `Bearer ${get().currentUser?.id || ''}`,
              },
            });

            if (!response.ok) {
              throw new Error('Failed to fetch users');
            }

            const users = await response.json();
            set({ users, isLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to fetch users',
              isLoading: false,
            });
          }
        },

        createUser: async (userData) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${get().currentUser?.id || ''}`,
              },
              body: JSON.stringify(userData),
            });

            if (!response.ok) {
              throw new Error('Failed to create user');
            }

            const newUser = await response.json();
            set((state) => ({
              users: [...state.users, newUser],
              isLoading: false,
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create user',
              isLoading: false,
            });
          }
        },

        updateUser: async (id, userData) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${get().currentUser?.id || ''}`,
              },
              body: JSON.stringify(userData),
            });

            if (!response.ok) {
              throw new Error('Failed to update user');
            }

            const updatedUser = await response.json();
            set((state) => ({
              users: state.users.map((user) => (user.id === id ? updatedUser : user)),
              currentUser: state.currentUser?.id === id ? updatedUser : state.currentUser,
              isLoading: false,
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update user',
              isLoading: false,
            });
          }
        },

        deleteUser: async (id) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users/${id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${get().currentUser?.id || ''}`,
              },
            });

            if (!response.ok) {
              throw new Error('Failed to delete user');
            }

            set((state) => ({
              users: state.users.filter((user) => user.id !== id),
              currentUser: state.currentUser?.id === id ? null : state.currentUser,
              isLoading: false,
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delete user',
              isLoading: false,
            });
          }
        },

        setCurrentUser: (user) => set({ currentUser: user }),

        clearUsers: () => set({ users: [], currentUser: null }),

        clearError: () => set({ error: null }),

        setLoading: (loading) => set({ isLoading: loading }),
      }),
      {
        name: 'user-storage',
        partialize: (state) => ({
          users: state.users,
          currentUser: state.currentUser,
        }),
      },
    ),
    {
      name: 'user-store',
    },
  ),
);
