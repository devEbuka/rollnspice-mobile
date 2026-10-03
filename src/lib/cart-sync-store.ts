import { CartStore, type CartLine } from './cart-store';
import { accountKey, CLAIM_KEY, optimisticLines, readAccount, remoteSnapshot, validId,
  type AccountCart, type CartAction, type CartOperation, type CartRpc, type CartStorage } from './cart-sync-data';

type State = { lines: CartLine[]; owner: string | null; ready: boolean; pending: number; syncing: boolean; error: string; message: string };
export class SyncedCartStore {
  private state: State = { lines: [], owner: null, ready: false, pending: 0, syncing: false, error: '', message: '' };
  private listeners = new Set<() => void>();
  private accounts = new Map<string, AccountCart>();
  private local: Promise<unknown> = Promise.resolve();
  private epoch = 0;
  private running?: { epoch: number; again: boolean; promise: Promise<void> };
  readonly guest: CartStore;
  constructor(private storage: CartStorage, private rpc: CartRpc, private uuid: () => string) {
    this.guest = new CartStore(storage);
    this.guest.subscribe(() => { if (!this.state.owner && this.state.ready) this.publish({ ...this.guest.getSnapshot() }); });
  }
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private publish(patch: Partial<State>) { this.state = { ...this.state, ...patch }; this.listeners.forEach((fn) => fn()); }
  private serialize<T>(work: () => Promise<T>): Promise<T> {
    const result = this.local.then(work); this.local = result.catch(() => {}); return result;
  }
  private async account(owner: string) {
    const found = this.accounts.get(owner);
    if (found) return found;
    const data = readAccount(await this.storage.getItem(accountKey(owner)), owner); this.accounts.set(owner, data); return data;
  }
  private async commit(data: AccountCart) {
    await this.storage.setItem(accountKey(data.owner), JSON.stringify(data)); this.accounts.set(data.owner, data);
    if (this.state.owner === data.owner) this.publish({ lines: optimisticLines(data), pending: data.queue.length });
  }
  private failure() { this.publish({ syncing: false, error: 'Your cart couldn’t update. Check your connection and tap Retry.' }); }
  // Called immediately on auth changes, before any asynchronous storage/network work.
  identify = async (owner: string | null): Promise<void> => {
    if (this.state.ready && this.state.owner === owner) return this.refresh();
    const previous = this.state.owner; const epoch = ++this.epoch;
    this.publish({ owner, lines: [], ready: false, pending: 0, syncing: false, error: '', message: '' });
    try {
      await this.guest.initialize(); if (epoch !== this.epoch) return;
      if (!owner) {
        if (previous) { await this.guest.clear(); if (!this.guest.getSnapshot().error) await this.storage.removeItem(CLAIM_KEY); }
        if (epoch === this.epoch) this.publish({ ...this.guest.getSnapshot() }); return;
      }
      await this.serialize(async () => {
        if (epoch !== this.epoch) return;
        let account = await this.account(owner);
        const claimRaw = await this.storage.getItem(CLAIM_KEY);
        const claim = claimRaw ? JSON.parse(claimRaw) as { owner: string; operation: CartOperation } : null;
        if (!this.guest.getSnapshot().ready) throw new Error('Guest storage unavailable');
        const guest = this.guest.getSnapshot().lines;
        const operation = claim?.owner === owner ? claim.operation : !claim && guest.length
          ? { id: this.uuid(), action: 'merge' as const, lines: guest.map((p) => ({ ...p })) } : null;
        if (operation) {
          if (!claim) await this.storage.setItem(CLAIM_KEY, JSON.stringify({ owner, operation }));
          if (!account.queue.some((op) => op.id === operation.id)) account = { ...account, queue: [...account.queue, operation] };
        }
        await this.commit(account);
        if (epoch === this.epoch) this.publish({ ready: true, message: claim && claim.owner !== owner ? 'Some items belong to another account. Sign in to that account to restore them.' : '' });
      });
      if (epoch === this.epoch) await this.refresh();
    } catch { if (epoch === this.epoch) this.failure(); }
  };
  edit = (action: Exclude<CartAction, 'merge'>, productId: string) => {
    if (!this.state.ready || !validId(productId)) return Promise.resolve();
    const owner = this.state.owner; const epoch = this.epoch;
    if (!owner) {
      const old = this.guest.getSnapshot().lines.find((p) => p.productId === productId)?.quantity ?? 0;
      this.guest.setQuantity(productId, action === 'remove' ? 0 : action === 'add' ? Math.min(99, old + 1) : Math.max(0, old - 1));
      return this.guest.save();
    }
    return this.serialize(async () => {
      if (epoch !== this.epoch) return;
      const data = await this.account(owner);
      if (action === 'remove' && data.queue.length) { this.publish({ message: 'Your cart is updating. Try removing the item again shortly.' }); return; }
      const op: CartOperation = { id: this.uuid(), action, lines: [{ productId, quantity: action === 'remove' ? 0 : 1 }], ...(action === 'remove' ? { revision: data.revision } : {}) };
      const next = { ...data, queue: [...data.queue, op] };
      if (optimisticLines(next).length > 100) { this.publish({ message: 'Choose up to 100 different items.' }); return; }
      await this.commit(next); if (epoch === this.epoch) this.publish({ error: '' });
    }).then(() => { if (epoch === this.epoch) void this.refresh(); }).catch(() => { if (epoch === this.epoch) this.failure(); });
  };
  refresh = async (): Promise<void> => {
    const owner = this.state.owner; const epoch = this.epoch;
    if (!this.state.ready) return this.identify(owner);
    if (!owner) return this.guest.save();
    if (this.running?.epoch === epoch) { this.running.again = true; return this.running.promise; }
    const run = { epoch, again: false, promise: Promise.resolve() }; this.running = run;
    run.promise = (async () => {
      this.publish({ syncing: true });
      try {
        do {
          run.again = false;
          const data = await this.serialize(() => this.account(owner));
          for (const op of data.queue) {
            if (epoch !== this.epoch) return;
            const result = await this.rpc('mutate_cart', { p_operation_id: op.id, p_action: op.action,
              p_items: op.lines.map((p) => ({ product_id: p.productId, quantity: p.quantity })), p_expected_revision: op.revision ?? null }, owner);
            if (epoch !== this.epoch) return;
            if (result.error && !(op.action !== 'merge' && (result.error.message === 'CART_CONFLICT' || result.error.code === '22023'))) throw result.error;
            await this.serialize(async () => {
              if (epoch !== this.epoch) return;
              if (!result.error && op.action === 'merge') {
                const claim = JSON.parse(await this.storage.getItem(CLAIM_KEY) ?? 'null');
                if (claim?.owner === owner && claim.operation.id === op.id) {
                  await this.guest.clear(); if (this.guest.getSnapshot().error) throw new Error('Guest clear failed');
                  await this.storage.removeItem(CLAIM_KEY);
                }
              }
              const current = await this.account(owner);
              const acknowledged = !result.error && !(result.data as { replayed?: boolean })?.replayed ? remoteSnapshot(result.data) : {};
              await this.commit({ ...current, ...acknowledged, queue: current.queue.filter((p) => p.id !== op.id) });
              const adjusted = (result.data as { adjustments?: unknown[] } | undefined)?.adjustments?.length;
              if (!result.error && op.action === 'merge' && !adjusted) this.publish({ message: 'Your items were added to your cart.' });
              if (result.error || adjusted) this.publish({ message: result.error?.message === 'CART_CONFLICT'
                ? 'Your cart changed elsewhere. Review it before removing that item again.' : 'Review your cart: an item was unavailable, a limit was reached, or a change could not be applied.' });
            });
          }
          const fetched = await this.rpc('get_cart', {}, owner);
          if (epoch !== this.epoch) return; if (fetched.error) throw fetched.error;
          const snapshot = remoteSnapshot(fetched.data);
          await this.serialize(async () => {
            if (epoch !== this.epoch) return;
            const current = await this.account(owner); await this.commit({ ...current, ...snapshot });
            if (current.queue.length) run.again = true;
          });
        } while (run.again && epoch === this.epoch);
        if (epoch === this.epoch) this.publish({ error: '' });
      } catch { if (epoch === this.epoch) this.failure(); }
      finally { if (this.running === run) this.running = undefined; if (epoch === this.epoch) this.publish({ syncing: false }); }
    })(); return run.promise;
  };
  checkoutSnapshot = async (owner: string) => {
    const epoch = this.epoch;
    if (owner !== this.state.owner) throw new Error('Account changed');
    await this.refresh();
    return this.serialize(async () => {
      if (epoch !== this.epoch || owner !== this.state.owner || !this.state.ready || this.state.error) throw new Error('Sync your cart before checking out.');
      const data = await this.account(owner);
      if (data.queue.length || !data.lines.length) throw new Error('Sync pending changes and add items before checking out.');
      return { revision: data.revision, lines: data.lines.map((line) => ({ ...line })) };
    });
  };
}
