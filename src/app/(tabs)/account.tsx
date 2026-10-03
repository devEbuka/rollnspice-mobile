import { Link } from 'expo-router';
import { AccountPanel } from '@/components/account-panel';
import { OrderButton, OrderScreen } from '@/components/order-ui';
import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';

export default function AccountScreen() {
  return <OrderScreen tabs>
    <ThemedText type="smallBold" style={{ color: Brand.orange }}>ROLL N SPICE.</ThemedText>
    <AccountPanel />
    <Link href="/explore" asChild><OrderButton label="About Roll N Spice" /></Link>
  </OrderScreen>;
}
