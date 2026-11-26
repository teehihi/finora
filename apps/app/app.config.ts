import type { ExpoConfig } from 'expo/config';
const config: ExpoConfig = {
  name: 'Finora',
  slug: 'finora',
  scheme: 'finora',
  version: '0.1.0',
  orientation: 'default',
  icon: './assets/brand/icon.png',
  userInterfaceStyle: 'automatic',
  ios: { bundleIdentifier: 'dev.finora.app', supportsTablet: true },
  android: { package: 'dev.finora.app' },
  web: { bundler: 'metro', output: 'single' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      { image: './assets/brand/lockup.png', imageWidth: 160, backgroundColor: '#F5F7FA' },
    ],
  ],
  experiments: { autolinkingModuleResolution: true },
};
export default config;
