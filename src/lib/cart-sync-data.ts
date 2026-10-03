import { restoreCart, type CartLine } from './cart-store';

export type CartAction = 'add' | 'decrement' | 'remove' | 'merge';
export type CartOperation = { id: string; action: CartAction; lines: CartLine[]; revision?: number };
export type AccountCart = { version: 1; owner: string; revision: number; lines: CartLine[]; queue: CartOperation[] };
export type CartStorage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };
export type CartRpc = (name: 'get_cart' | 'mutate_cart', args: Record<string, unknown>, owner: string) => Promise<{ data?: unknown; error?: { code?: string; message: string } | null }>;
export const CLAIM_KEY = 'rollnspice:guest-merge:v1';
export const accountKey = (owner: string) => `rollnspice:account-cart:v1:${owner}`;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const validId = (value: string) => uuid.test(value);
export const parseLines = (lines: unknown): CartLine[] => restoreCart(JSON.stringify({ version: 1, lines }));
export function readAccount(raw: string | null, owner: string): AccountCart {
  if (!raw) return { version: 1, owner, revision: 0, lines: [], queue: [] };
  const data = JSON.parse(raw);
  if (data.version !== 1 || data.owner !== owner || !Number.isSafeInteger(data.revision) || data.revision < 0 || !Array.isArray(data.queue)) throw new Error('Invalid saved cart');
  const queue = data.queue.map((op: CartOperation) => {
    if (!validId(op.id) || !['add', 'decrement', 'remove', 'merge'].includes(op.action) || !Array.isArray(op.lines)) throw new Error('Invalid saved request');
    if (op.action === 'remove') {
      if (op.lines.length !== 1 || !validId(op.lines[0].productId) || op.lines[0].quantity !== 0 || !Number.isSafeInteger(op.revision) || op.revision! < 0) throw new Error('Invalid removal');
    } else parseLines(op.lines);
    return op;
  });
  return { version: 1, owner, revision: data.revision, lines: parseLines(data.lines), queue };
}
export function remoteSnapshot(value: unknown) {
  const data = value as { revision: number; items: { product_id: string; quantity: number }[] };
  if (!Number.isSafeInteger(data?.revision) || data.revision < 0 || !Array.isArray(data.items)) throw new Error('Invalid remote cart');
  return { revision: data.revision, lines: parseLines(data.items.map((p) => ({ productId: p.product_id, quantity: p.quantity }))) };
}
export function optimisticLines(account: AccountCart): CartLine[] {
  const lines = new Map(account.lines.map((line) => [line.productId, line.quantity]));
  for (const op of account.queue) for (const line of op.lines) {
    const old = lines.get(line.productId) ?? 0;
    const next = op.action === 'remove' ? 0 : op.action === 'decrement' ? Math.max(0, old - line.quantity) : Math.min(99, old + line.quantity);
    if (next) lines.set(line.productId, next); else lines.delete(line.productId);
  }
  return [...lines].map(([productId, quantity]) => ({ productId, quantity }));
}
