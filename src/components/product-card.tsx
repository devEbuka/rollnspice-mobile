import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { formatPrice, type Product } from '@/lib/products';
import { Brand, productImage } from '@/constants/brand';

export function ProductCard({ product }: { product: Product }) {
  return (
    <ThemedView type="backgroundElement" style={[styles.card, product.featured && styles.featured]}>
      {productImage(product.name) ? <Image source={productImage(product.name)} style={styles.photo} contentFit="cover" accessible={false} recyclingKey={product.id} /> : null}
      <View style={styles.copy}>
      <ThemedText type="smallBold" style={styles.label}>{product.featured ? 'HOUSE FAVOURITE' : product.category.toUpperCase()}</ThemedText>
      <ThemedText style={styles.name}>{product.name}</ThemedText>
      {product.description ? <ThemedText themeColor="textSecondary">{product.description}</ThemedText> : null}
      <ThemedText style={styles.price}>{formatPrice(product.price)}</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#dfd1b9' },
  featured: { borderColor: Brand.orange, borderWidth: 2 },
  photo: { width: '100%', aspectRatio: 1.5 },
  copy: { padding: 20, gap: 10 },
  label: { color: Brand.orange, letterSpacing: 1 },
  name: { fontSize: 28, lineHeight: 36, fontFamily: Brand.display, fontWeight: '400' },
  price: { fontFamily: Brand.display, fontSize: 26, lineHeight: 34, color: Brand.orange },
});
