import { Platform } from 'react-native';
import * as ExpoCrypto from 'expo-crypto';

// Supabase's PKCE implementation expects these two WebCrypto primitives.
// Keep the browser implementation; supply native secure randomness and SHA-256.
if (Platform.OS !== 'web') {
  const crypto = globalThis.crypto ?? ({} as Crypto);
  if (!crypto.getRandomValues) {
    Object.defineProperty(crypto, 'getRandomValues', { value: ExpoCrypto.getRandomValues });
  }
  if (!crypto.subtle) {
    Object.defineProperty(crypto, 'subtle', { value: {
      digest(algorithm: AlgorithmIdentifier, data: BufferSource) {
        const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
        if (name !== 'SHA-256') throw new Error('Unsupported auth digest.');
        return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
      },
    } });
  }
  if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: crypto });
}
