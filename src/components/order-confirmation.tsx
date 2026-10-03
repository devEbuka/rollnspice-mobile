import { Link } from 'expo-router';
import { ThemedText } from './themed-text';
import { OrderButton, OrderPanel } from './order-ui';
import { formatPrice } from '@/lib/products';
import type { Confirmation } from '@/lib/order-data';

export function OrderConfirmation({ result }: { result: Confirmation }) {
  return <OrderPanel>
    <ThemedText type="subtitle" accessibilityRole="header" accessibilityLiveRegion="polite">ORDER PLACED</ThemedText>
    <ThemedText selectable>Reference: {result.order.id}</ThemedText>
    <ThemedText>Total: {formatPrice(result.order.subtotal)}</ThemedText>
    <ThemedText>Status: {result.order.status}</ThemedText>
    {result.email.status !== 'already_processed' ? <ThemedText type="small">{result.email.status === 'queued' ? 'Confirmation email sent.' : 'We couldn’t send your confirmation email. You can view your order below.'}</ThemedText> : null}
    <Link href="/orders" asChild><OrderButton label="View your orders" /></Link>
    <Link href="/" asChild><OrderButton label="Back to the menu" /></Link>
  </OrderPanel>;
}
