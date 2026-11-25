import type { ExpoConfig } from 'expo/config';
const config: ExpoConfig = {
  name: 'Finora',
  slug: 'finora',
  scheme: 'finora',
  version: '0.1.0',
  orientation: 'default',
  icon: '../../Resource/appIcon.png',
  userInterfaceStyle: 'automatic',
  ios: { bundleIdentifier: 'dev.finora.app', supportsTablet: true },
  android: { package: 'dev.finora.app' },
  web: { bundler: 'metro', output: 'single' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      { image: './assets/brand/lockup.png', imageWidth: 160, backgroundColor: '#F7F5EF' },
    ],
  ],
  experiments: { autolinkingModuleResolution: true },
};
export default config;
