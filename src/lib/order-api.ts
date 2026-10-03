import { getSupabase } from './supabase';
import { orderPage, type OrderTransport } from './order-data';

export const ORDER_API = 'https://rollnspice.vercel.app/api/orders';
export const orderRequest: OrderTransport = async (owner, method, body, page = 1) => {
  const { data, error } = await getSupabase().auth.getSession();
  if (error || !data.session || data.session.user.id !== owner) throw new Error('Sign in to the original account before retrying this order.');
  const token = data.session.access_token;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(method === 'GET' ? `${ORDER_API}?page=${page}` : ORDER_API, {
      method, signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'X-Cart-Account': owner, 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  } finally { clearTimeout(timeout); }
};
export async function loadOrders(owner: string, page: number) {
  const response = await orderRequest(owner, 'GET', undefined, page);
  if (response.status !== 200) throw new Error(response.status === 401 ? 'Sign in again to view your orders.' : 'Order history could not load. Check your connection and retry.');
  const result = orderPage(response.body);
  if (result.page !== page) throw new Error('Unexpected history page. Please retry.');
  return result;
}
