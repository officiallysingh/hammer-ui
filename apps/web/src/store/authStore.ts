import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { UserInfo } from '@repo/api';

export interface UserRole {
  authority: string;
}

export interface AuthUser {
  username: string;
  roles?: UserRole[];
  authenticated: boolean;
}

interface AuthState {
  user: AuthUser | null;
  userInfo: UserInfo | null;
  setUser: (user: AuthUser) => void;
  setUserInfo: (info: UserInfo | null) => void;
  clearUser: () => void;
  isAdmin: () => boolean;
  needsChangePassword: () => boolean;
  needsVerification: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        userInfo: null,
        setUser: (user) => set({ user }),
        setUserInfo: (userInfo) => set({ userInfo }),
        clearUser: () => set({ user: null, userInfo: null }),
        isAdmin: () => {
          const info = get().userInfo;
          if (info?.authorities) {
            return info.authorities.some((a) => a === 'superadmin' || a === 'ROLE_SUPERADMIN');
          }
          const user = get().user;
          return !!user?.roles?.some((r) => r.authority === 'superadmin');
        },
        needsChangePassword: () => get().userInfo?.promptChangePassword === true,
        needsVerification: () => {
          const info = get().userInfo;
          return !!(info && (!info.emailIdVerified || !info.mobileNoVerified));
        },
      }),
      { name: 'auth-store' },
    ),
    { name: 'auth-store' },
  ),
);
