import { passkeyClient } from '@better-auth/passkey/client';
import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const nativeModule =
  Platform.OS === 'ios' ? requireOptionalNativeModule('BetterAuthReactNativePasskey') : null;
const associatedDomains = Constants.expoConfig?.ios?.associatedDomains ?? [];

export function passkeySupported(
  config: { rpId: string; origins: string[]; ios: boolean } | null | undefined,
) {
  if (!config) return false;
  if (Platform.OS === 'web')
    return (
      typeof window !== 'undefined' &&
      window.isSecureContext &&
      !!window.PublicKeyCredential &&
      config.origins.includes(window.location.origin)
    );
  if (Platform.OS === 'ios')
    return (
      !!nativeModule && config.ios && associatedDomains.includes('webcredentials:' + config.rpId)
    );
  return false;
}

export function finoraPasskeyClient() {
  if (!nativeModule) return passkeyClient();
  // Native code is loaded only in a dev/release build that actually includes it.
  // Expo Go must still open the existing sign-in screen.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const native = require('expo-better-auth-passkey') as typeof import('expo-better-auth-passkey');
  return native.expoPasskeyClient();
}
