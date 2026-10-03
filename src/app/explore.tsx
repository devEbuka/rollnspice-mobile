import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { BottomTabInset } from '@/constants/theme';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: Platform.OS === 'web' ? 100 : insets.top + 24, paddingBottom: insets.bottom + BottomTabInset + 24 }]}>
      <ThemedText style={styles.wordmark}>ROLL N SPICE.</ThemedText>
      <ThemedText type="smallBold" style={styles.eyebrow}>LAGOS MADE. FLAME GRILLED.</ThemedText>
      <ThemedText type="title">BIG FLAVOUR.{'\n'}NO SHORTCUTS.</ThemedText>
      <ThemedText themeColor="textSecondary">Hand-rolled shawarma. Charcoal-grilled meat. Made fresh, every time.</ThemedText>
      <View style={styles.panel}>
        <ThemedText type="subtitle">YOUR FAVOURITES, ON THE GO.</ThemedText>
        <ThemedText themeColor="textSecondary">Explore the menu, find your favourites and place your order.</ThemedText>
        <ExternalLink href="https://rollnspice.vercel.app" asChild>
          <Pressable accessibilityRole="link" style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
            <ThemedText style={styles.buttonText}>Visit our website ↗</ThemedText>
          </Pressable>
        </ExternalLink>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { backgroundColor: Brand.cream },
  content: { paddingHorizontal: 24, gap: 24, width: '100%', maxWidth: 720, alignSelf: 'center' },
  wordmark: { fontFamily: Brand.display, fontSize: 28, lineHeight: 38, color: Brand.orange },
  eyebrow: { color: Brand.orange, letterSpacing: 1 },
  panel: { backgroundColor: Brand.panel, borderRadius: 24, padding: 24, gap: 20 },
  button: { backgroundColor: Brand.orange, minHeight: 52, padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: Brand.panel, fontWeight: '700' },
});
