import { useEffect, useState } from 'react';

import { loadProducts, type Product } from '@/lib/products';

type MenuState = { status: 'loading' | 'ready' | 'error'; products: Product[] };

export function useProducts() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<MenuState>({ status: 'loading', products: [] });

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;
    loadProducts(controller.signal)
      .then((products) => { if (active) setState({ status: 'ready', products }); })
      .catch(() => { if (active) setState({ status: 'error', products: [] }); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);

  function retry() {
    setState({ status: 'loading', products: [] });
    setAttempt((value) => value + 1);
  }
  return { ...state, retry };
}
