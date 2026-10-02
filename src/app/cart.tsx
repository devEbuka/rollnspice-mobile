import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '@/components/cart-provider';
import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { BottomTabInset } from '@/constants/theme';
import { cartTotal, MAX_QUANTITY } from '@/lib/cart-store';
import { formatPrice } from '@/lib/products';

export default function CartScreen() {
  const { lines, ready, error, count, setQuantity, retrySave, menu } = useCart();
  const insets = useSafeAreaInsets();
  const retryMenu = menu.retry;
  useFocusEffect(useCallback(() => { retryMenu(); }, [retryMenu]));
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, {
      paddingTop: Platform.OS === 'web' ? 100 : insets.top + 24,
      paddingBottom: insets.bottom + BottomTabInset + 24,
      paddingLeft: insets.left + 24, paddingRight: insets.right + 24,
    }]}>
      <ThemedText type="smallBold" style={{ color: Brand.orange }}>ROLL N SPICE.</ThemedText>
      <ThemedText type="title">YOUR CART</ThemedText>
      <ThemedText themeColor="textSecondary">Saved on this device. Checkout is coming next.</ThemedText>
      {error ? <View style={styles.card} accessibilityLiveRegion="polite">
        <ThemedText>{error}</ThemedText>
        <CartButton label="Retry saving or restoring cart" onPress={() => { void retrySave(); }}>Retry</CartButton>
      </View> : null}
      {!ready ? <ActivityIndicator color={Brand.orange} accessibilityLabel="Restoring cart" />
        : lines.length === 0 ? <View style={styles.card}>
          <ThemedText type="subtitle">YOUR CART IS EMPTY</ThemedText>
          <ThemedText>Add your favourites from the menu.</ThemedText>
          <Link href="/" asChild><Pressable accessibilityRole="link" style={styles.button}><ThemedText>Explore the menu</ThemedText></Pressable></Link>
        </View> : <>
          {menu.status === 'loading' ? <View style={styles.notice}><ActivityIndicator color={Brand.orange} /><ThemedText>Checking current prices…</ThemedText></View> : null}
          {menu.status === 'error' ? <View style={styles.card}>
            <ThemedText>Prices couldn’t load. Your saved quantities are safe.</ThemedText>
            <CartButton label="Retry loading prices" onPress={menu.retry}>Retry menu</CartButton>
          </View> : null}
          {lines.map((line) => {
            const product = menu.products.find((item) => item.id === line.productId);
            const priced = product && Number.isSafeInteger(product.price) && product.price >= 0;
            const unavailable = menu.status === 'ready' && !priced;
            const name = product?.name ?? (unavailable ? 'Unavailable item' : 'Saved item');
            return <View key={line.productId} style={styles.card}>
              <ThemedText style={styles.name}>{name}</ThemedText>
              <ThemedText themeColor="textSecondary">{unavailable ? 'This item is no longer available. Remove it from your cart.' : menu.status === 'ready' && priced ? `${formatPrice(product.price)} each · ${formatPrice(product.price * line.quantity)}` : 'Price unavailable until the menu loads.'}</ThemedText>
              <View style={styles.controls}>
                <CartButton label={line.quantity === 1 ? `Remove ${name} from cart` : `Decrease quantity of ${name}`} onPress={() => setQuantity(line.productId, line.quantity - 1)}>−</CartButton>
                <ThemedText accessibilityLabel={`Quantity ${line.quantity}`} style={styles.quantity}>{line.quantity}</ThemedText>
                <CartButton label={`Increase quantity of ${name}`} disabled={menu.status !== 'ready' || unavailable || line.quantity >= MAX_QUANTITY} onPress={() => setQuantity(line.productId, line.quantity + 1)}>+</CartButton>
                <CartButton label={`Remove ${name} from cart`} onPress={() => setQuantity(line.productId, 0)}>Remove</CartButton>
              </View>
            </View>;
          })}
          <View style={styles.card}>
            <ThemedText>{count} {count === 1 ? 'item' : 'items'}</ThemedText>
            <ThemedText type="subtitle">{menu.status === 'ready' ? `AVAILABLE ITEMS: ${formatPrice(cartTotal(lines, menu.products))}` : 'TOTAL UNAVAILABLE'}</ThemedText>
            <ThemedText themeColor="textSecondary">Menu items only. Unavailable items are excluded. Delivery charges are not included.</ThemedText>
          </View>
        </>}
    </ScrollView>
  );
}

function CartButton({ children, label, disabled = false, onPress }: { children: string; label: string; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.button, (pressed || disabled) && { opacity: 0.5 }]}>
    <ThemedText type="smallBold">{children}</ThemedText>
  </Pressable>;
}
const styles = StyleSheet.create({
  screen: { backgroundColor: Brand.cream },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 20, flexGrow: 1 },
  card: { backgroundColor: Brand.panel, borderRadius: 20, padding: 20, gap: 16, borderWidth: 1, borderColor: '#dfd1b9' },
  name: { fontFamily: Brand.display, fontSize: 26, lineHeight: 34 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  button: { minHeight: 48, minWidth: 48, borderWidth: 1, borderColor: Brand.orange, borderRadius: 12, padding: 12, justifyContent: 'center', alignItems: 'center' },
  quantity: { minWidth: 32, textAlign: 'center' },
  notice: { flexDirection: 'row', gap: 12, alignItems: 'center' },
});
