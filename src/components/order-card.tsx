import { memo } from 'react';
import { OrderPanel } from './order-ui';
import { ThemedText } from './themed-text';
import { formatPrice } from '@/lib/products';
import type { Order } from '@/lib/order-data';

export const OrderCard = memo(function OrderCard({ order }: { order: Order }) {
  return <OrderPanel>
    <ThemedText type="smallBold" selectable>Order {order.id}</ThemedText>
    <ThemedText type="small">{new Date(order.created_at).toLocaleString()} · {order.status}</ThemedText>
    {order.order_items.map((line) => <ThemedText key={line.id}>{line.quantity} × {line.products?.name ?? 'Menu item'} · {formatPrice(line.quantity * line.unit_price)}</ThemedText>)}
    <ThemedText type="smallBold">Total: {formatPrice(order.subtotal)}</ThemedText>
    {order.special_instructions ? <ThemedText type="small">Instructions: {order.special_instructions}</ThemedText> : null}
  </OrderPanel>;
});
