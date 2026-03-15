export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  description?: string;
  category?: string;
  inStock?: boolean;
}
export interface CartState {
  items: CartItem[];
  isOpen: boolean;
  totalItems: number;
  totalPrice: number;
  isLoading: boolean;
  error: string | null;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemQuantity: (id: string) => number;
  isInCart: (id: string) => boolean;
}
export declare const useCartStore: import('zustand').UseBoundStore<
  Omit<
    Omit<import('zustand').StoreApi<CartState>, 'setState' | 'devtools'> & {
      setState(
        partial:
          | CartState
          | Partial<CartState>
          | ((state: CartState) => CartState | Partial<CartState>),
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
        state: CartState | ((state: CartState) => CartState),
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
        | CartState
        | Partial<CartState>
        | ((state: CartState) => CartState | Partial<CartState>),
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
      state: CartState | ((state: CartState) => CartState),
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
          import('zustand/middleware').PersistOptions<CartState, CartState, unknown>
        >,
      ) => void;
      clearStorage: () => void;
      rehydrate: () => Promise<void> | void;
      hasHydrated: () => boolean;
      onHydrate: (fn: (state: CartState) => void) => () => void;
      onFinishHydration: (fn: (state: CartState) => void) => () => void;
      getOptions: () => Partial<
        import('zustand/middleware').PersistOptions<CartState, CartState, unknown>
      >;
    };
  }
>;
//# sourceMappingURL=cartStore.d.ts.map
