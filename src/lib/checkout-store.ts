import type { CartStorage } from './cart-sync-data';
import { checkoutKey, confirmation, savedCheckout, type CheckoutRequest, type Confirmation, type OrderTransport, type SavedCheckout } from './order-data';

type State = { owner: string | null; ready: boolean; busy: boolean; request: CheckoutRequest | null; confirmation: Confirmation | null; error: string; conflict: boolean };
export class CheckoutStore {
  private state: State = { owner: null, ready: false, busy: false, request: null, confirmation: null, error: '', conflict: false };
  private epoch = 0;
  private listeners = new Set<() => void>();
  private writes: Promise<unknown> = Promise.resolve();
  constructor(private storage: CartStorage, private transport: OrderTransport, private uuid: () => string) {}
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private publish(patch: Partial<State>) { this.state = { ...this.state, ...patch }; this.listeners.forEach((fn) => fn()); }
  private save(data: SavedCheckout) {
    const result = this.writes.then(() => this.storage.setItem(checkoutKey(data.owner), JSON.stringify(data)));
    this.writes = result.catch(() => {}); return result;
  }
  identify = async (owner: string | null) => {
    const epoch = ++this.epoch;
    this.publish({ owner, ready: false, busy: false, request: null, confirmation: null, error: '', conflict: false });
    if (!owner) { this.publish({ ready: true }); return; }
    try {
      await this.writes;
      const saved = savedCheckout(await this.storage.getItem(checkoutKey(owner)), owner);
      if (epoch === this.epoch) this.publish({ ready: true, request: saved.request, confirmation: saved.confirmation });
    } catch { if (epoch === this.epoch) this.publish({ error: 'Checkout couldn’t load. Please try again.' }); }
  };
  submit = async (owner: string, revision: number | null, instructions: string): Promise<void> => {
    if (this.state.owner !== owner || !this.state.ready || this.state.busy) return;
    if (!this.state.request && this.state.confirmation) return;
    const epoch = this.epoch;
    this.publish({ busy: true, error: '', conflict: false });
    let placed: Confirmation | null = null;
    try {
      let request = this.state.request;
      if (!request) {
        if (!Number.isSafeInteger(revision) || revision! < 0 || instructions.length > 250) throw new Error('Review your cart and instructions before ordering.');
        request = { cart_operation_id: this.uuid(), cart_revision: revision!, special_instructions: instructions.trim() };
        await this.save({ version: 1, owner, request, confirmation: null });
        if (epoch !== this.epoch) return;
        this.publish({ request });
      }
      const response = await this.transport(owner, 'POST', request);
      if (epoch !== this.epoch) return;
      if (response.status === 201) {
        placed = confirmation(response.body);
        await this.save({ version: 1, owner, request: null, confirmation: placed });
        if (epoch === this.epoch) this.publish({ request: null, confirmation: placed });
      } else {
        const conflict = response.status === 409;
        if ([400, 403, 409].includes(response.status)) {
          await this.save({ version: 1, owner, request: null, confirmation: null });
          if (epoch === this.epoch) this.publish({ request: null, conflict });
        }
        if (epoch === this.epoch) this.publish({ error: response.status === 401 ? 'Please sign in again to check your order.' : conflict ? 'Your cart changed. Refresh it before ordering.' : response.status === 400 || response.status === 403 ? 'Order was rejected. Review your cart and instructions before trying again.' : 'We couldn’t confirm your order. Check its status before ordering again.' });
      }
    } catch {
      if (epoch === this.epoch) this.publish({ ...(placed ? { confirmation: placed } : {}), error: placed ? 'Your order was placed. Tap Check order status to finish.' : 'Checkout couldn’t finish. Please try again.' });
    } finally { if (epoch === this.epoch) this.publish({ busy: false }); }
  };
  startNew = async () => {
    const { owner, ready, request, busy } = this.state;
    if (!owner || !ready || request || busy) return;
    const epoch = this.epoch; this.publish({ busy: true });
    try {
      await this.save({ version: 1, owner, request: null, confirmation: null });
      if (epoch === this.epoch) this.publish({ confirmation: null, error: '', conflict: false });
    } catch { if (epoch === this.epoch) this.publish({ error: 'Couldn’t start a new order. Please try again.' }); }
    finally { if (epoch === this.epoch) this.publish({ busy: false }); }
  };
}
