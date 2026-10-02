import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useSyncExternalStore, type PropsWithChildren } from 'react';
import { CartStore } from '@/lib/cart-store';
import { useProducts } from '@/hooks/use-products';

const store = new CartStore(AsyncStorage);
function useCartValue() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const menu = useProducts();
  useEffect(() => { void store.initialize(); }, []);
  return { ...state, menu, setQuantity: store.setQuantity, retrySave: store.save,
    count: state.lines.reduce((count, line) => count + line.quantity, 0) };
}
const CartContext = createContext<ReturnType<typeof useCartValue> | null>(null);
export function CartProvider({ children }: PropsWithChildren) {
  const value = useCartValue();
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error('CartProvider is required');
  return cart;
}
