import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from './auth-provider';
import { ThemedText } from './themed-text';
import { ExternalLink } from './external-link';
import { Brand } from '@/constants/brand';

export function AccountPanel() {
  const { session, loading, busy, message, signIn, signOut } = useAuth();
  return (
    <View style={styles.panel}>
      <ThemedText type="subtitle">YOUR ACCOUNT</ThemedText>
      {loading ? <ActivityIndicator accessibilityLabel="Restoring your account" color={Brand.orange} /> : (
        <>
          <ThemedText themeColor="textSecondary">{session ? `Signed in as ${session.user.email ?? 'your Google account'}` : 'Sign in with the same Google account you use on our website.'}</ThemedText>
          {Platform.OS === 'web' && !session ? (
            <ExternalLink href="https://rollnspice.vercel.app" asChild>
              <Pressable accessibilityRole="link" style={styles.button}><ThemedText style={styles.label}>Sign in on our website ↗</ThemedText></Pressable>
            </ExternalLink>
          ) : (
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy}
              onPress={() => { void (session ? signOut() : signIn()); }}
              style={({ pressed }) => [styles.button, (pressed || busy) && { opacity: 0.7 }]}>
              <ThemedText style={styles.label}>{busy ? 'Please wait…' : session ? 'Sign out' : 'Continue with Google'}</ThemedText>
            </Pressable>
          )}
        </>
      )}
      {message ? <ThemedText type="small" accessibilityLiveRegion="polite">{message}</ThemedText> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  panel: { padding: 24, gap: 16, borderRadius: 24, backgroundColor: Brand.panel },
  button: { backgroundColor: Brand.orange, minHeight: 52, borderRadius: 12, padding: 16, alignItems: 'center' },
  label: { color: Brand.panel, fontWeight: '700' },
});
