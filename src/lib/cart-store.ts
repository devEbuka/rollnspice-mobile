export type CartLine = { productId: string; quantity: number };
type Storage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };
export const CART_KEY = 'rollnspice:guest-cart:v1';
export const MAX_QUANTITY = 99;
const validId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export function restoreCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (data.version !== 1 || !Array.isArray(data.lines) || data.lines.length > 100) throw new Error('Invalid cart');
  const seen = new Set<string>();
  return data.lines.map((line: CartLine) => {
    if (!line || !validId(line.productId) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY || seen.has(line.productId)) throw new Error('Invalid cart');
    seen.add(line.productId);
    return { productId: line.productId, quantity: line.quantity };
  });
}
export function cartTotal(lines: CartLine[], products: { id: string; price: number }[]) {
  return lines.reduce((total, line) => {
    const product = products.find((item) => item.id === line.productId);
    return product && Number.isSafeInteger(product.price) && product.price >= 0 ? total + product.price * line.quantity : total;
  }, 0);
}

export class CartStore {
  private state = { lines: [] as CartLine[], ready: false, error: '' };
  private listeners = new Set<() => void>();
  private initializing: Promise<void> | undefined;
  private writes: Promise<void> = Promise.resolve();
  private revision = 0;
  constructor(private storage: Storage) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(next: typeof this.state) { this.state = next; this.listeners.forEach((listener) => listener()); }
  initialize = () => {
    if (this.state.ready) return Promise.resolve();
    if (this.initializing) return this.initializing;
    this.initializing = this.storage.getItem(CART_KEY).then((raw) => {
      let lines: CartLine[];
      try { lines = restoreCart(raw); }
      catch { this.publish({ lines: [], ready: true, error: 'Saved cart could not be restored. Start a new cart.' }); return; }
      this.publish({ lines, ready: true, error: '' });
    }).catch(() => { this.publish({ ...this.state, error: 'Saved cart could not be read. Tap Retry before adding items.' }); })
      .finally(() => { this.initializing = undefined; });
    return this.initializing;
  };
  setQuantity = (productId: string, quantity: number) => {
    if (!this.state.ready || !validId(productId) || !Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY) return;
    const exists = this.state.lines.some((line) => line.productId === productId);
    if (!exists && (quantity === 0 || this.state.lines.length >= 100)) return;
    const lines = quantity === 0 ? this.state.lines.filter((line) => line.productId !== productId)
      : exists ? this.state.lines.map((line) => line.productId === productId ? { productId, quantity } : line)
        : [...this.state.lines, { productId, quantity }];
    this.publish({ lines, ready: true, error: '' });
    this.save();
  };
  save = () => {
    if (!this.state.ready) return this.initialize();
    const revision = ++this.revision;
    const payload = JSON.stringify({ version: 1, lines: this.state.lines });
    this.writes = this.writes.then(() => this.storage.setItem(CART_KEY, payload)).then(() => {
      if (revision === this.revision) this.publish({ ...this.state, error: '' });
    }).catch(() => {
      if (revision === this.revision) this.publish({ ...this.state, error: 'Cart changes could not be saved. Tap Retry before closing the app.' });
    });
    return this.writes;
  };
}
