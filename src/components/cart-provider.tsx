import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { SyncedCartStore } from '@/lib/cart-sync-store';
import { cartRpc, watchCart } from '@/lib/cart-sync-api';
import { useProducts } from '@/hooks/use-products';
import { useAuth } from './auth-provider';

const store = new SyncedCartStore(AsyncStorage, cartRpc, randomUUID);
function useCartValue() {
  const { session, loading } = useAuth();
  const owner = session?.user.id ?? null;
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const menu = useProducts();
  useEffect(() => {
    if (loading) return;
    void store.identify(owner);
    const refresh = () => { if (AppState.currentState === 'active' || AppState.currentState === null) void store.refresh(); };
    const stop = owner ? watchCart(owner, refresh) : () => {};
    const lifecycle = AppState.addEventListener('change', (next) => { if (next === 'active') refresh(); });
    const timer = setInterval(refresh, 15000);
    return () => { stop(); lifecycle.remove(); clearInterval(timer); };
  }, [owner, loading]);
  const visible = loading || state.owner !== owner ? { ...state, owner, lines: [], ready: false, error: '', message: '', pending: 0, syncing: false } : state;
  return { ...visible, menu, retrySave: store.refresh, refreshCart: store.refresh, checkoutSnapshot: store.checkoutSnapshot,
    addItem: (id: string) => { void store.edit('add', id); },
    decrementItem: (id: string) => { void store.edit('decrement', id); },
    removeItem: (id: string) => { void store.edit('remove', id); },
    count: visible.lines.reduce((count, line) => count + line.quantity, 0) };
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
