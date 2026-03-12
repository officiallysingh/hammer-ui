import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

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
  // State
  items: CartItem[];
  isOpen: boolean;
  totalItems: number;
  totalPrice: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;

  // Computed values
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemQuantity: (id: string) => number;
  isInCart: (id: string) => boolean;
}

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        items: [],
        isOpen: false,
        totalItems: 0,
        totalPrice: 0,
        isLoading: false,
        error: null,

        // Actions
        addItem: (item) => {
          const existingItem = get().items.find((cartItem) => cartItem.id === item.id);

          if (existingItem) {
            // Update quantity if item exists
            set((state) => ({
              items: state.items.map((cartItem) =>
                cartItem.id === item.id
                  ? { ...cartItem, quantity: cartItem.quantity + 1 }
                  : cartItem,
              ),
            }));
          } else {
            // Add new item
            set((state) => ({
              items: [...state.items, { ...item, quantity: 1 }],
            }));
          }
        },

        removeItem: (id) => {
          set((state) => ({
            items: state.items.filter((item) => item.id !== id),
          }));
        },

        updateQuantity: (id, quantity) => {
          if (quantity <= 0) {
            get().removeItem(id);
            return;
          }

          set((state) => ({
            items: state.items.map((item) => (item.id === id ? { ...item, quantity } : item)),
          }));
        },

        clearCart: () => {
          set({
            items: [],
            isOpen: false,
          });
        },

        toggleCart: () => {
          set((state) => ({ isOpen: !state.isOpen }));
        },

        openCart: () => {
          set({ isOpen: true });
        },

        closeCart: () => {
          set({ isOpen: false });
        },

        // Computed values
        getTotalItems: () => {
          return get().items.reduce((total, item) => total + item.quantity, 0);
        },

        getTotalPrice: () => {
          return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
        },

        getItemQuantity: (id) => {
          const item = get().items.find((item) => item.id === id);
          return item?.quantity || 0;
        },

        isInCart: (id) => {
          return get().items.some((item) => item.id === id);
        },
      }),
      {
        name: 'cart-storage',
      },
    ),
    {
      name: 'cart-store',
    },
  ),
);
