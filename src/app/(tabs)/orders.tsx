import { ActivityIndicator } from 'react-native';
import { useAuth } from '@/components/auth-provider';
import { AccountPanel } from '@/components/account-panel';
import { OrderButton, OrderPanel, OrderScreen } from '@/components/order-ui';
import { OrderCard } from '@/components/order-card';
import { ThemedText } from '@/components/themed-text';
import { useOrders } from '@/hooks/use-orders';
import { Brand } from '@/constants/brand';

export default function OrdersScreen() {
  const { session, loading } = useAuth();
  const history = useOrders(loading ? null : session?.user.id ?? null);
  return <OrderScreen tabs>
    <ThemedText type="smallBold" style={{ color: Brand.orange }}>ROLL N SPICE.</ThemedText>
    <ThemedText type="title">YOUR ORDERS</ThemedText>
    {loading ? <ActivityIndicator color={Brand.orange} accessibilityLabel="Restoring account" /> : !session ? <AccountPanel /> : <>
      {history.busy ? <ActivityIndicator color={Brand.orange} accessibilityLabel="Loading order history" /> : null}
      {history.error ? <ThemedText accessibilityLiveRegion="polite">{history.error}</ThemedText> : null}
      <OrderButton label="Refresh orders" disabled={history.busy} onPress={() => { void history.load(); }} />
      {history.data?.orders.length === 0 ? <OrderPanel><ThemedText type="subtitle">{history.data.page === 1 ? 'NO ORDERS YET' : 'NO ORDERS ON THIS PAGE'}</ThemedText><ThemedText>Your orders will appear here.</ThemedText></OrderPanel> : null}
      {history.data?.orders.map((order) => <OrderCard key={order.id} order={order} />)}
      {history.data ? <>
        <ThemedText type="small">Page {history.data.page}</ThemedText>
        {history.data.page > 1 ? <OrderButton label="Newer orders" disabled={history.busy} onPress={() => { void history.load(history.data!.page - 1); }} /> : null}
        {history.data.hasNext ? <OrderButton label="Older orders" disabled={history.busy} onPress={() => { void history.load(history.data!.page + 1); }} /> : null}
      </> : null}
    </>}
  </OrderScreen>;
}
