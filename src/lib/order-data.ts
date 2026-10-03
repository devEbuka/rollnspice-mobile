import { validId } from './cart-sync-data';

export type CheckoutRequest = { cart_operation_id: string; cart_revision: number; special_instructions: string };
export type PlacedOrder = { id: string; subtotal: number; status: string };
export type Confirmation = { order: PlacedOrder; email: { status: string }; replayed: boolean };
export type SavedCheckout = { version: 1; owner: string; request: CheckoutRequest | null; confirmation: Confirmation | null };
export type Order = PlacedOrder & { created_at: string; special_instructions: string | null; order_items: { id: string; quantity: number; unit_price: number; products: { name: string } | null }[] };
export type OrderPage = { orders: Order[]; page: number; hasNext: boolean };
export type OrderTransport = (owner: string, method: 'GET' | 'POST', body?: CheckoutRequest, page?: number) => Promise<{ status: number; body: unknown }>;
export const checkoutKey = (owner: string) => `rollnspice:checkout:v1:${owner}`;
const money = (n: unknown) => Number.isSafeInteger(n) && (n as number) >= 0;
export function confirmation(value: unknown): Confirmation {
  const data = value as Confirmation;
  if (!validId(data?.order?.id ?? '') || !money(data.order.subtotal) || typeof data.order.status !== 'string' || typeof data.replayed !== 'boolean') throw new Error('Invalid order reply');
  return { order: { id: data.order.id, subtotal: data.order.subtotal, status: data.order.status }, email: { status: typeof data.email?.status === 'string' ? data.email.status : 'unavailable' }, replayed: data.replayed };
}
export function savedCheckout(raw: string | null, owner: string): SavedCheckout {
  if (!raw) return { version: 1, owner, request: null, confirmation: null };
  const data = JSON.parse(raw) as SavedCheckout;
  const request = data.request;
  if (data.version !== 1 || data.owner !== owner || (request !== null && (!validId(request.cart_operation_id) || !money(request.cart_revision) || typeof request.special_instructions !== 'string' || request.special_instructions.length > 250))) throw new Error('Invalid saved checkout');
  return { version: 1, owner, request, confirmation: data.confirmation ? confirmation(data.confirmation) : null };
}
export function orderPage(value: unknown): OrderPage {
  const data = value as OrderPage;
  if (!Array.isArray(data?.orders) || data.orders.length > 20 || !Number.isSafeInteger(data.page) || data.page < 1 || data.page > 10000 || typeof data.hasNext !== 'boolean') throw new Error('Invalid order history');
  for (const order of data.orders) {
    if (!validId(order.id) || !money(order.subtotal) || typeof order.status !== 'string' || !Number.isFinite(Date.parse(order.created_at)) || !Array.isArray(order.order_items) || (order.special_instructions !== null && typeof order.special_instructions !== 'string')) throw new Error('Invalid order');
    for (const line of order.order_items) if (!validId(line.id) || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || !money(line.unit_price) || (line.products !== null && typeof line.products?.name !== 'string')) throw new Error('Invalid order line');
  }
  return data;
}
