import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { createContext, useContext, useEffect, useSyncExternalStore, type PropsWithChildren } from 'react';
import { CheckoutStore } from '@/lib/checkout-store';
import { orderRequest } from '@/lib/order-api';
import { useAuth } from './auth-provider';

const store = new CheckoutStore(AsyncStorage, orderRequest, randomUUID);
function useCheckoutValue() {
  const { session, loading } = useAuth();
  const owner = session?.user.id ?? null;
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => { if (!loading) void store.identify(owner); }, [owner, loading]);
  const visible = loading || state.owner !== owner ? { ...state, owner, ready: false, busy: false, request: null, confirmation: null, error: '', conflict: false } : state;
  return { ...visible, submit: store.submit, retryLoad: () => { if (!loading) void store.identify(owner); },
    startNew: () => { if (store.getSnapshot().owner === owner) void store.startNew(); } };
}
const CheckoutContext = createContext<ReturnType<typeof useCheckoutValue> | null>(null);
export function CheckoutProvider({ children }: PropsWithChildren) {
  const value = useCheckoutValue();
  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}
export function useCheckout() {
  const checkout = useContext(CheckoutContext);
  if (!checkout) throw new Error('CheckoutProvider is required');
  return checkout;
}
