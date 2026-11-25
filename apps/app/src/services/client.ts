import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { fetch as expoFetch } from 'expo/fetch';
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import { createApi } from '@finora/api-client';
const hostUri = Constants.expoConfig?.hostUri;
const developmentHost = hostUri
  ? (() => {
      try {
        return new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname;
      } catch {
        return undefined;
      }
    })()
  : undefined;
export const base =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ||
  (Platform.OS === 'web' && typeof location !== 'undefined'
    ? location.protocol + '//' + location.hostname + ':3000'
    : __DEV__ && developmentHost
      ? `http://${developmentHost}:3000`
      : Platform.OS === 'android'
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000');
export const auth = createAuthClient({
  baseURL: base,
  plugins: [
    expoClient({
      scheme: 'finora',
      storagePrefix: 'finora',
      cookiePrefix: 'finora',
      storage: SecureStore,
      disableCache: true,
    }),
  ],
  fetchOptions: { credentials: Platform.OS === 'web' ? 'include' : 'omit' },
});
const headers = (): Record<string, string> =>
  Platform.OS === 'web' ? {} : { cookie: auth.getCookie() };
export const api = createApi(
  base,
  headers,
  Platform.OS === 'web' ? fetch : (expoFetch as typeof fetch),
);
