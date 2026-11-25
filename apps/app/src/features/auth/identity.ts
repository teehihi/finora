import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import { base } from '../../services/client';

export const authProviderKey = ['auth-providers'] as const;

export function useIdentityOptions() {
  return useQuery({
    queryKey: authProviderKey,
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetch(`${base}/api/auth/providers`, { signal });
      if (!response.ok) throw new Error('Auth methods unavailable');
      const body: unknown = await response.json();
      if (
        typeof body !== 'object' ||
        !body ||
        !('emailOtp' in body) ||
        !('google' in body) ||
        typeof body.emailOtp !== 'boolean' ||
        typeof body.google !== 'boolean'
      )
        throw new Error('Invalid auth methods response');
      return { emailOtp: body.emailOtp, google: body.google };
    },
  });
}

// Never pass arbitrary query input to either the app router or an OAuth callback.
export const allowedAuthReturn = (value: unknown): string =>
  typeof value === 'string' &&
  value === value.trim() &&
  /^\/(?:home|explore|assistant|loans|profile|(?:saved|simulate)\/[A-Za-z0-9_-]{1,80})$/.test(value)
    ? value
    : '/home';

export const oauthCallback = (path: string) =>
  Platform.OS === 'web' && typeof location !== 'undefined'
    ? new URL(path, location.origin).href
    : path;

// Expo Go cannot return here via the app's finora:// scheme. A development build can.
export const redirectOAuthSupported =
  Platform.OS === 'web' || Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export const normaliseCode = (text: string) => text.replace(/[^0-9]/g, '').slice(0, 6);

export function codeFailure(error: { code?: string; status?: number }) {
  if (error.code === 'TOO_MANY_ATTEMPTS') return 'authCodeAttempts' as const;
  if (error.status === 429) return 'authRateLimited' as const;
  if (
    error.status === 400 ||
    error.status === 401 ||
    error.code === 'INVALID_OTP' ||
    error.code === 'OTP_EXPIRED'
  )
    return 'authCodeInvalid' as const;
  return 'authGenericError' as const;
}
