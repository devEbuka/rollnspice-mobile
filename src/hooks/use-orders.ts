import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { loadOrders } from '@/lib/order-api';
import type { OrderPage } from '@/lib/order-data';

export function useOrders(owner: string | null) {
  const [state, setState] = useState<{ owner: string | null; data: OrderPage | null; busy: boolean; error: string }>({ owner: null, data: null, busy: false, error: '' });
  const sequence = useRef(0); const page = useRef(1);
  const load = useCallback(async (number = 1) => {
    if (!owner) return;
    const attempt = ++sequence.current;
    setState({ owner, data: null, busy: true, error: '' });
    try {
      const data = await loadOrders(owner, number);
      if (sequence.current === attempt) { page.current = number; setState({ owner, data, busy: false, error: '' }); }
    } catch (error) {
      if (sequence.current === attempt) setState({ owner, data: null, busy: false, error: error instanceof Error ? error.message : 'Order history could not load. Please retry.' });
    }
  }, [owner]);
  useFocusEffect(useCallback(() => {
    page.current = 1; void load();
    const listener = AppState.addEventListener('change', (next) => { if (next === 'active') void load(page.current); });
    return () => { sequence.current++; listener.remove(); };
  }, [load]));
  return { ...(state.owner === owner ? state : { data: null, busy: Boolean(owner), error: '' }), load };
}
