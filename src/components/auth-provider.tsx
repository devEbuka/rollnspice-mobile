import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { completeGoogleSignIn, signInWithGoogle } from '@/lib/google-auth';
import { MOBILE_AUTH_REDIRECT } from '@/lib/auth-callback';

type AuthValue = {
  session: Session | null; loading: boolean; busy: boolean; message: string;
  signIn: () => Promise<void>; signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthValue | null>(null);
const configured = Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(configured ? '' : 'Account connection is not configured.');
  useEffect(() => {
    let active = true;
    if (!configured) return;
    const client = getSupabase();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => {
      if (active) { setSession(next); setLoading(false); }
    });
    async function verifyUser() {
      const { data: { session: stored } } = await client.auth.getSession();
      if (!stored || !active) return;
      const { error } = await client.auth.getUser(stored.access_token);
      if (!active) return;
      const { data: { session: current } } = await client.auth.getSession();
      if (!active || current?.access_token !== stored.access_token) return;
      if (error?.status === 401 || error?.status === 403) {
        await client.auth.signOut({ scope: 'local' });
        if (active) setMessage('Your session expired. Please sign in again.');
      } else if (error) {
        setMessage('Unable to verify your account right now. Check your connection.');
      }
    }
    client.auth.getSession().then(({ data, error }) => {
      if (active) {
        setSession(data.session); setLoading(false);
        if (error) setMessage('Unable to restore sign-in. Please try again.');
      }
      return verifyUser();
    }).catch(() => { if (active) { setLoading(false); setMessage('Unable to restore sign-in.'); } });
    async function handleUrl(url: string) {
      if (!url.startsWith(MOBILE_AUTH_REDIRECT + '?')) return;
      try {
        await completeGoogleSignIn(url);
        if (active) { setMessage('Signed in successfully.'); router.replace('/explore'); }
      } catch { if (active) setMessage('Sign-in could not finish. Please try again.'); }
    }
    const link = Linking.addEventListener('url', ({ url }) => { void handleUrl(url); });
    Linking.getInitialURL().then((url) => { if (url && active) void handleUrl(url); }).catch(() => {});
    function changeState(state: string) {
      if (Platform.OS === 'web') return;
      if (state === 'active') {
        client.auth.startAutoRefresh();
        void verifyUser().catch(() => { if (active) setMessage('Unable to verify your account right now.'); });
      } else client.auth.stopAutoRefresh();
    }
    changeState(AppState.currentState);
    const lifecycle = AppState.addEventListener('change', changeState);
    return () => { active = false; subscription.unsubscribe(); link.remove(); lifecycle.remove(); if (Platform.OS !== 'web') client.auth.stopAutoRefresh(); };
  }, []);

  async function signIn() {
    if (busy) return;
    setBusy(true); setMessage('');
    try { setMessage(await signInWithGoogle() ? 'Signed in successfully.' : 'Sign-in cancelled.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to sign in.'); }
    finally { setBusy(false); }
  }
  async function signOut() {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const { error } = await getSupabase().auth.signOut({ scope: 'local' });
      if (error) throw error;
      setSession(null); setMessage('Signed out on this device.');
    } catch { setMessage('Unable to sign out. Please try again.'); }
    finally { setBusy(false); }
  }
  return <AuthContext.Provider value={{ session, loading, busy, message, signIn, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider is required.');
  return auth;
}
