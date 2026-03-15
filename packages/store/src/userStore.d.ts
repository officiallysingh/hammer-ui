import type { User } from './authStore';
export interface UserState {
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  createUser: (userData: Partial<User>) => Promise<void>;
  updateUser: (id: string, userData: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  clearUsers: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}
export declare const useUserStore: import('zustand').UseBoundStore<
  Omit<
    Omit<import('zustand').StoreApi<UserState>, 'setState' | 'devtools'> & {
      setState(
        partial:
          | UserState
          | Partial<UserState>
          | ((state: UserState) => UserState | Partial<UserState>),
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
        state: UserState | ((state: UserState) => UserState),
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
        | UserState
        | Partial<UserState>
        | ((state: UserState) => UserState | Partial<UserState>),
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
      state: UserState | ((state: UserState) => UserState),
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
            UserState,
            {
              users: User[];
              currentUser: User | null;
            },
            unknown
          >
        >,
      ) => void;
      clearStorage: () => void;
      rehydrate: () => Promise<void> | void;
      hasHydrated: () => boolean;
      onHydrate: (fn: (state: UserState) => void) => () => void;
      onFinishHydration: (fn: (state: UserState) => void) => () => void;
      getOptions: () => Partial<
        import('zustand/middleware').PersistOptions<
          UserState,
          {
            users: User[];
            currentUser: User | null;
          },
          unknown
        >
      >;
    };
  }
>;
//# sourceMappingURL=userStore.d.ts.map
