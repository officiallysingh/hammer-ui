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
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { username: string; token: string }) => Promise<void>;
  loginWithOTT: (username: string, token: string) => Promise<void>;
  generateOTT: (username: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}
export declare const useAuthStore: import('zustand').UseBoundStore<
  Omit<
    Omit<import('zustand').StoreApi<AuthState>, 'setState' | 'devtools'> & {
      setState(
        partial:
          | AuthState
          | Partial<AuthState>
          | ((state: AuthState) => AuthState | Partial<AuthState>),
        replace?: false | undefined,
        action?:
          | (
              | string
              | {
                  [x: string]: unknown;
                  [x: number]: unknown;
                  [x: symbol]: unknown;
                  type: string;
                }
            )
          | undefined,
      ): void;
      setState(
        state: AuthState | ((state: AuthState) => AuthState),
        replace: true,
        action?:
          | (
              | string
              | {
                  [x: string]: unknown;
                  [x: number]: unknown;
                  [x: symbol]: unknown;
                  type: string;
                }
            )
          | undefined,
      ): void;
      devtools: {
        cleanup: () => void;
      };
    },
    'setState' | 'persist'
  > & {
    setState(
      partial:
        | AuthState
        | Partial<AuthState>
        | ((state: AuthState) => AuthState | Partial<AuthState>),
      replace?: false | undefined,
      action?:
        | (
            | string
            | {
                [x: string]: unknown;
                [x: number]: unknown;
                [x: symbol]: unknown;
                type: string;
              }
          )
        | undefined,
    ): unknown;
    setState(
      state: AuthState | ((state: AuthState) => AuthState),
      replace: true,
      action?:
        | (
            | string
            | {
                [x: string]: unknown;
                [x: number]: unknown;
                [x: symbol]: unknown;
                type: string;
              }
          )
        | undefined,
    ): unknown;
    persist: {
      setOptions: (
        options: Partial<
          import('zustand/middleware').PersistOptions<
            AuthState,
            {
              user: User | null;
              token: string | null;
              isAuthenticated: boolean;
            },
            unknown
          >
        >,
      ) => void;
      clearStorage: () => void;
      rehydrate: () => Promise<void> | void;
      hasHydrated: () => boolean;
      onHydrate: (fn: (state: AuthState) => void) => () => void;
      onFinishHydration: (fn: (state: AuthState) => void) => () => void;
      getOptions: () => Partial<
        import('zustand/middleware').PersistOptions<
          AuthState,
          {
            user: User | null;
            token: string | null;
            isAuthenticated: boolean;
          },
          unknown
        >
      >;
    };
  }
>;
//# sourceMappingURL=authStore.d.ts.map
