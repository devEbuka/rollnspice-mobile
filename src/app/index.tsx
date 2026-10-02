import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/product-card';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset } from '@/constants/theme';
import { useProducts } from '@/hooks/use-products';
import { useTheme } from '@/hooks/use-theme';
import { MenuHero } from '@/components/menu-hero';
import { Brand } from '@/constants/brand';
import type { Product } from '@/lib/products';

export default function HomeScreen() {
  const { status, products, retry } = useProducts();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const list = useRef<FlatList<Product>>(null);
  const heroHeight = useRef(0);
  return (
    <FlatList
      ref={list}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, {
        paddingTop: Platform.OS === 'web' ? 100 : insets.top + 24,
        paddingBottom: insets.bottom + BottomTabInset + 24,
        paddingLeft: insets.left + 24,
        paddingRight: insets.right + 24,
      }]}
      data={products}
      keyExtractor={(product) => product.id}
      renderItem={({ item }) => <ProductCard product={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <View onLayout={(event) => { heroHeight.current = event.nativeEvent.layout.height; }}>
            <MenuHero onExplore={() => list.current?.scrollToOffset({ offset: heroHeight.current, animated: false })} />
          </View>
          <ThemedText type="smallBold" style={{ color: Brand.orange, letterSpacing: 2 }}>THE GOOD STUFF</ThemedText>
          <ThemedText type="title">OUR MENU</ThemedText>
          <ThemedText themeColor="textSecondary">Pick your flavour. Ordering is coming next.</ThemedText>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.state} accessibilityLiveRegion="polite">
          {status === 'loading' ? (
            <>
              <ActivityIndicator color={theme.text} accessibilityLabel="Loading menu" />
              <ThemedText>Loading the menu…</ThemedText>
            </>
          ) : status === 'error' ? (
            <>
              <ThemedText style={styles.stateTitle}>The menu couldn’t load</ThemedText>
              <ThemedText themeColor="textSecondary">Check your connection and try again.</ThemedText>
              <Pressable accessibilityRole="button" onPress={retry}
                style={({ pressed }) => [styles.retry, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                <ThemedText type="smallBold">Try again</ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <ThemedText style={styles.stateTitle}>No items on the menu yet</ThemedText>
              <ThemedText themeColor="textSecondary">Please check back soon.</ThemedText>
              <Pressable accessibilityRole="button" onPress={retry} style={[styles.retry, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">Refresh menu</ThemedText>
              </Pressable>
            </>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', flexGrow: 1 },
  header: { gap: 12, marginBottom: 28 },
  state: { paddingVertical: 40, gap: 16, alignItems: 'center' },
  stateTitle: { fontSize: 20, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  retry: { minHeight: 48, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, justifyContent: 'center', borderWidth: 1, borderColor: Brand.orange },
  pressed: { opacity: 0.7 },
});
