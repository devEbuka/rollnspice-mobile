import { Platform, Pressable, ScrollView, StyleSheet, View, type PressableProps } from 'react-native';
import type { PropsWithChildren } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand } from '@/constants/brand';
import { BottomTabInset } from '@/constants/theme';
import { ThemedText } from './themed-text';

export function OrderScreen({ children, tabs = false }: PropsWithChildren<{ tabs?: boolean }>) {
  const insets = useSafeAreaInsets();
  return <ScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: Brand.cream }} contentContainerStyle={[orderStyles.content, {
    paddingTop: tabs ? Platform.OS === 'web' ? 100 : insets.top + 24 : 24,
    paddingBottom: insets.bottom + (tabs ? BottomTabInset : 0) + 24,
    paddingLeft: insets.left + 24, paddingRight: insets.right + 24,
  }]}>{children}</ScrollView>;
}
export function OrderPanel({ children }: PropsWithChildren) { return <View style={orderStyles.card}>{children}</View>; }
export function OrderButton({ label, disabled, ...props }: PressableProps & { label: string }) {
  return <Pressable {...props} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: Boolean(disabled) }}
    style={({ pressed }) => [orderStyles.button, (pressed || disabled) && { opacity: 0.5 }]}>
    <ThemedText style={{ color: Brand.panel, fontWeight: '700', textAlign: 'center' }}>{label}</ThemedText>
  </Pressable>;
}
export const orderStyles = StyleSheet.create({
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 20, flexGrow: 1 },
  card: { backgroundColor: Brand.panel, borderRadius: 20, padding: 20, gap: 16, borderWidth: 1, borderColor: '#dfd1b9' },
  button: { backgroundColor: Brand.orange, minHeight: 52, borderRadius: 12, padding: 16, justifyContent: 'center', alignItems: 'center' },
});
