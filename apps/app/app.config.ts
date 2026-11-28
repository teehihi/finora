import type { ExpoConfig } from 'expo/config';
import launch from './src/components/launch-palette.json';
const passkeyDomain = process.env.EXPO_PUBLIC_PASSKEY_RP_ID?.trim();
if (
  passkeyDomain &&
  !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
    passkeyDomain,
  )
)
  throw new Error(
    'EXPO_PUBLIC_PASSKEY_RP_ID must be the HTTPS passkey host, without scheme or port.',
  );

const config: ExpoConfig = {
  name: 'Finora',
  slug: 'finora',
  scheme: 'finora',
  version: '0.1.0',
  orientation: 'default',
  icon: './assets/brand/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'dev.finora.app',
    supportsTablet: true,
    ...(passkeyDomain ? { associatedDomains: [`webcredentials:${passkeyDomain}`] } : {}),
    // The focused native-stack screen owns status bar contrast.
    infoPlist: { UIViewControllerBasedStatusBarAppearance: true },
  },
  android: { package: 'dev.finora.app' },
  web: { bundler: 'metro', output: 'single' },
  plugins: [
    'expo-router',
    './plugins/with-cyl-dock.cjs',
    'expo-secure-store',
    [
      'expo-image-picker',
      {
        photosPermission: 'Cho phép FINORA dùng ảnh bạn chọn làm ảnh đại diện.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/brand/lockup.png',
        imageWidth: launch.markWidth,
        backgroundColor: launch.light,
        // The OS launch cannot read account preferences. Always match the app default.
      },
    ],
  ],
  experiments: { autolinkingModuleResolution: true },
};
export default config;
