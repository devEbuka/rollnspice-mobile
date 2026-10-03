import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { Brand } from '@/constants/brand';
import { useCart } from './cart-provider';

export default function AppTabs() {
  const { count } = useCart();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={Brand.lime}
      iconColor={{ default: Brand.muted, selected: Brand.orange }}
      labelStyle={{ selected: { color: Brand.orange } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cart">
        <NativeTabs.Trigger.Label>Cart</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="cart.fill" md="shopping_cart" />
        {count > 0 ? <NativeTabs.Trigger.Badge>{String(count)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <NativeTabs.Trigger.Label>Orders</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet.rectangle" md="receipt_long" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
