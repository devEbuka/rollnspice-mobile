import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { CartLine } from '@/lib/cart-store';

type Review = { revision: number; lines: CartLine[] };
export function useCheckoutReview(owner: string | null, ready: boolean, snapshot: (owner: string) => Promise<Review>) {
  const [state, setState] = useState<{ owner: string | null; review: Review | null; loading: boolean; error: string }>({ owner: null, review: null, loading: false, error: '' });
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!owner || !ready) return;
    const attempt = ++sequence.current;
    setState({ owner, review: null, loading: true, error: '' });
    try {
      const review = await snapshot(owner);
      if (sequence.current === attempt) setState({ owner, review, loading: false, error: '' });
    } catch {
      if (sequence.current === attempt) setState({ owner, review: null, loading: false, error: 'Your cart isn’t ready. Check your items and try again.' });
    }
  }, [owner, ready, snapshot]);
  useFocusEffect(useCallback(() => { void refresh(); return () => { sequence.current++; }; }, [refresh]));
  return { ...(state.owner === owner ? state : { review: null, loading: Boolean(owner), error: '' }), refresh };
}
