import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { formatPrice, type Product } from '@/lib/products';
import { Brand, productImage } from '@/constants/brand';
import { useCart } from './cart-provider';
import { MAX_QUANTITY } from '@/lib/cart-store';

export function ProductCard({ product }: { product: Product }) {
  const { lines, ready, setQuantity } = useCart();
  const quantity = lines.find((line) => line.productId === product.id)?.quantity ?? 0;
  const disabled = !ready || quantity >= MAX_QUANTITY || !Number.isSafeInteger(product.price) || product.price < 0;
  return (
    <ThemedView type="backgroundElement" style={[styles.card, product.featured && styles.featured]}>
      {productImage(product.name) ? <Image source={productImage(product.name)} style={styles.photo} contentFit="cover" accessible={false} recyclingKey={product.id} /> : null}
      <View style={styles.copy}>
      <ThemedText type="smallBold" style={styles.label}>{product.featured ? 'HOUSE FAVOURITE' : product.category.toUpperCase()}</ThemedText>
      <ThemedText style={styles.name}>{product.name}</ThemedText>
      {product.description ? <ThemedText themeColor="textSecondary">{product.description}</ThemedText> : null}
      <ThemedText style={styles.price}>{formatPrice(product.price)}</ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel={`Add ${product.name} to cart`}
        accessibilityState={{ disabled }} disabled={disabled} onPress={() => setQuantity(product.id, quantity + 1)}
        style={({ pressed }) => [styles.add, (disabled || pressed) && { opacity: 0.6 }]}>
        <ThemedText style={{ color: Brand.panel, fontWeight: '700' }}>{!ready ? 'Restoring cart…' : quantity >= MAX_QUANTITY ? 'Quantity limit reached' : quantity ? `Add another · ${quantity} in cart` : 'Add to cart'}</ThemedText>
      </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  add: { minHeight: 48, backgroundColor: Brand.orange, borderRadius: 12, padding: 14, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 24, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#dfd1b9' },
  featured: { borderColor: Brand.orange, borderWidth: 2 },
  photo: { width: '100%', aspectRatio: 1.5 },
  copy: { padding: 20, gap: 10 },
  label: { color: Brand.orange, letterSpacing: 1 },
  name: { fontSize: 28, lineHeight: 36, fontFamily: Brand.display, fontWeight: '400' },
  price: { fontFamily: Brand.display, fontSize: 26, lineHeight: 34, color: Brand.orange },
});
