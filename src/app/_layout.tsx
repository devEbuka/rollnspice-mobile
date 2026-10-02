import { DefaultTheme, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import { Brand } from '@/constants/brand';
import { AuthProvider } from '@/components/auth-provider';
import { CartProvider } from '@/components/cart-provider';

SplashScreen.preventAutoHideAsync().catch(() => {});
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: Brand.cream, card: Brand.panel, text: Brand.charcoal, primary: Brand.orange } };

export default function TabLayout() {
  const [loaded, error] = useFonts({
    Anton: require('@/assets/fonts/Anton-Regular.ttf'),
    Inter: require('@/assets/fonts/Inter.ttf'),
  });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <ThemeProvider value={theme}>
      <StatusBar style="dark" />
      <AuthProvider><CartProvider><AppTabs /></CartProvider></AuthProvider>
    </ThemeProvider>
  );
}
