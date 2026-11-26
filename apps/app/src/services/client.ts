import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { fetch as expoFetch } from 'expo/fetch';
import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';
import { expoClient } from '@better-auth/expo/client';
import { createApi } from '@finora/api-client';
import { resolveApiBase } from './api-base';

const sourceCode = __DEV__ && Platform.OS !== 'web' ? NativeModules.SourceCode : undefined;
export const base = resolveApiBase({
  configured: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  development: __DEV__,
  webLocation: Platform.OS === 'web' && typeof location !== 'undefined' ? location : undefined,
  bundleUrl: sourceCode?.getConstants?.()?.scriptURL ?? sourceCode?.scriptURL,
  hostUri: Constants.expoConfig?.hostUri,
});
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
    emailOTPClient(),
  ],
  fetchOptions: {
    credentials: Platform.OS === 'web' ? 'include' : 'omit',
    // Never leave the auth screen waiting indefinitely when the API host is down.
    timeout: 8_000,
    onError: ({ error }) =>
      console.warn('[Finora auth] request failed', {
        status: error.status,
        code: error.code,
      }),
  },
});
const headers = (): Record<string, string> =>
  Platform.OS === 'web' ? {} : { cookie: auth.getCookie() };
export const api = createApi(
  base,
  headers,
  Platform.OS === 'web' ? fetch : (expoFetch as typeof fetch),
);
