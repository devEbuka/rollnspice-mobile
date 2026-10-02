import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { Brand } from '@/constants/brand';

export function MenuHero({ onExplore }: { onExplore: () => void }) {
  return (
    <View style={styles.hero}>
      <ThemedText style={styles.wordmark}>ROLL N <ThemedText style={[styles.wordmark, styles.spice]}>SPICE</ThemedText><ThemedText style={styles.dot}>.</ThemedText></ThemedText>
      <ThemedText type="smallBold" style={styles.eyebrow}>LAGOS MADE. FLAME GRILLED.</ThemedText>
      <ThemedText style={styles.headline}>BIG FLAVOUR.{'\n'}NO <ThemedText style={[styles.headline, styles.spice]}>SHORTCUTS.</ThemedText></ThemedText>
      <ThemedText themeColor="textSecondary">Hand-rolled shawarma. Charcoal-grilled meat. Made fresh, every time.</ThemedText>
      <View style={styles.visual}>
        <Image source={require('@/assets/food/hero-cutout.webp')} style={styles.photo} contentFit="contain" accessible={false} />
        <View style={styles.sticker} accessible={false}>
          <ThemedText style={styles.stickerText}>ROLLED{'\n'}FRESH ↗</ThemedText>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={onExplore} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
        <ThemedText style={styles.buttonText}>Explore the menu ↗</ThemedText>
      </Pressable>
      <View style={styles.strip}>
        <ThemedText style={styles.stripText}>FLAME GRILLED / HAND ROLLED / LAGOS LOVED</ThemedText>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  hero: { gap: 18, marginBottom: 28 },
  wordmark: { fontFamily: Brand.display, fontSize: 28, lineHeight: 38, marginBottom: 18 },
  spice: { color: Brand.orange, fontFamily: Brand.display },
  dot: { color: Brand.orange, fontSize: 28, fontFamily: Brand.display },
  eyebrow: { color: Brand.orange, letterSpacing: 1.4 },
  headline: { fontFamily: Brand.display, fontSize: 44, lineHeight: 54 },
  visual: { position: 'relative', marginVertical: 4 },
  photo: { width: '100%', aspectRatio: 1.5 },
  sticker: { position: 'absolute', right: 0, top: 0, backgroundColor: Brand.lime, borderRadius: 48, padding: 16, transform: [{ rotate: '10deg' }] },
  stickerText: { fontFamily: Brand.display, fontSize: 18, lineHeight: 24, textAlign: 'center' },
  button: { backgroundColor: Brand.orange, minHeight: 52, borderRadius: 14, padding: 16, alignItems: 'center' },
  buttonText: { color: Brand.panel, fontWeight: '700' },
  strip: { backgroundColor: Brand.charcoal, borderRadius: 12, padding: 16, marginTop: 12 },
  stripText: { color: Brand.cream, fontFamily: Brand.display, fontSize: 15, lineHeight: 24, textAlign: 'center' },
});
