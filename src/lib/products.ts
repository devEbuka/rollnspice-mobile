import { getSupabase } from './supabase';

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  featured: boolean;
};

export async function loadProducts(signal: AbortSignal): Promise<Product[]> {
  const { data, error } = await getSupabase()
    .from('products')
    .select('id,name,description,price,category,featured')
    .order('featured', { ascending: false })
    .order('name')
    .abortSignal(signal);
  if (error) throw new Error('Unable to load the menu.');
  return data ?? [];
}

const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 });
export function formatPrice(kobo: number) {
  return naira.format(kobo / 100);
}
