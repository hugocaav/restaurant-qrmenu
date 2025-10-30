import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type MenuCategory = "nonAlcoholic" | "mixology" | "entradas" | "platosFuertes" | "postres";

export interface MenuItem {
  id: string;
  category: MenuCategory;
  name: string;
  description: string;
  price: number;
  images: string[];
  allergens?: string[];
}

export interface CartLine {
  item: MenuItem;
  quantity: number;
  notes?: string;
}

interface CartState {
  lines: CartLine[];
  addItem: (menuItem: MenuItem, quantity?: number) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clear: () => void;
  getTotal: () => number;
  getCount: () => number;
}

type CartPersistedState = Pick<CartState, "lines">;

const storage =
  typeof window !== "undefined"
    ? createJSONStorage<CartPersistedState>(() => window.localStorage)
    : undefined;

export const useCartStore = create<CartState>()(
  persist<CartState, [], [], CartPersistedState>(
    (set, get) => ({
      lines: [],
      addItem: (menuItem, qty = 1) => {
        set((state) => {
          const existing = state.lines.find((line) => line.item.id === menuItem.id);
          if (existing) {
            return {
              lines: state.lines.map((line) =>
                line.item.id === menuItem.id
                  ? { ...line, quantity: Math.min(line.quantity + qty, 99) }
                  : line,
              ),
            };
          }
          return {
            lines: [...state.lines, { item: menuItem, quantity: Math.min(qty, 99) }],
          };
        });
      },
      updateQuantity: (itemId, quantity) => {
        const safeQuantity = Math.min(Math.max(quantity, 1), 99);
        set((state) => ({
          lines: state.lines.map((line) =>
            line.item.id === itemId ? { ...line, quantity: safeQuantity } : line,
          ),
        }));
      },
      removeItem: (itemId) => {
        set((state) => ({
          lines: state.lines.filter((line) => line.item.id !== itemId),
        }));
      },
      clear: () => set({ lines: [] }),
      getTotal: () => get().lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0),
      getCount: () => get().lines.reduce((sum, line) => sum + line.quantity, 0),
    }),
    {
      name: "mesalink-cart",
      storage,
      partialize: (state): CartPersistedState => ({ lines: state.lines }),
      skipHydration: true,
    },
  ),
);
