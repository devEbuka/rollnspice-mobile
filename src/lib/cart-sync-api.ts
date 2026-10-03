import { getSupabase } from './supabase';
import type { CartRpc } from './cart-sync-data';

export const cartRpc: CartRpc = async (name, args, owner) => {
  const client = getSupabase();
  const { data } = await client.auth.getSession();
  if (data.session?.user.id !== owner) return { error: { message: 'Account changed' } };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await client.rpc(name, args).setHeader('Authorization', `Bearer ${data.session.access_token}`).abortSignal(controller.signal);
  } finally { clearTimeout(timer); }
};

export function watchCart(owner: string, refresh: () => void) {
  const client = getSupabase();
  const channel = client.channel(`mobile-cart:${owner}`).on('postgres_changes', {
    event: '*', schema: 'public', table: 'carts', filter: `user_id=eq.${owner}`,
  }, refresh).subscribe((status) => { if (status === 'SUBSCRIBED') refresh(); });
  return () => { void client.removeChannel(channel); };
}
