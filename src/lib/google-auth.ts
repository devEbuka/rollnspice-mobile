import Constants, { ExecutionEnvironment } from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { getSupabase } from './supabase';
import { MOBILE_AUTH_REDIRECT, parseAuthCallback } from './auth-callback';

const exchanges = new Map<string, Promise<void>>();
export async function completeGoogleSignIn(url: string): Promise<void> {
  const { code, flowId } = parseAuthCallback(url);
  const prior = exchanges.get(code);
  if (prior) return prior;
  const exchange = (async () => {
    const { error } = await getSupabase().auth.exchangeCodeForSession(code, { flowId });
    if (error) throw new Error('Sign-in could not finish. Please try again.');
  })();
  // Deduplicate browser-result and cold/warm linking delivery; retain only a few codes.
  if (exchanges.size >= 8) exchanges.delete(exchanges.keys().next().value!);
  exchanges.set(code, exchange);
  return exchange;
}

export async function signInWithGoogle() {
  if (Platform.OS === 'web') throw new Error('Use our website to sign in on the web.');
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new Error('Google sign-in needs the installed Roll N Spice development app.');
  }
  const redirectTo = makeRedirectUri({ native: MOBILE_AUTH_REDIRECT });
  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google', options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw new Error('Unable to start Google sign-in. Check your connection.');
  // Refuse Supabase's plain-PKCE fallback if native crypto support is missing.
  if (new URL(data.url).searchParams.get('code_challenge_method') !== 's256') {
    throw new Error('Secure sign-in is unavailable. Please restart the app.');
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;
  await completeGoogleSignIn(result.url);
  return true;
}
