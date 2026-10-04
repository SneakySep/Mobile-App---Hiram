/**
 * Token persistence.
 *
 * expo-secure-store has no web implementation, and the primary target during
 * development is `npm run web`, so this picks the right backend at runtime:
 *  - native  -> SecureStore (keychain / keystore)
 *  - web     -> localStorage
 *
 * `readToken` is synchronous after the first load so the API client can attach
 * the header without awaiting anything.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'hiram.auth.token';

let cachedToken: string | null | undefined;

function webStorage(): Storage | null {
  if (typeof globalThis === 'undefined') return null;
  const candidate = (globalThis as { localStorage?: Storage }).localStorage;
  return candidate ?? null;
}

export async function loadToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;

  try {
    if (Platform.OS === 'web') {
      cachedToken = webStorage()?.getItem(TOKEN_KEY) ?? null;
    } else {
      cachedToken = (await SecureStore.getItemAsync(TOKEN_KEY)) ?? null;
    }
  } catch {
    cachedToken = null;
  }

  return cachedToken;
}

export function peekToken(): string | null {
  // The API client calls this synchronously; before bootstrap finishes we
  // simply report "no token" and the auth gate is still showing its splash.
  return cachedToken ?? null;
}

export async function saveToken(token: string): Promise<void> {
  cachedToken = token;
  if (Platform.OS === 'web') {
    webStorage()?.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  if (Platform.OS === 'web') {
    webStorage()?.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
