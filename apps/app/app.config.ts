import type { ExpoConfig } from 'expo/config';
import launch from './src/components/launch-palette.json';
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
    './plugins/with-cyl-dock.cjs',
    'expo-secure-store',
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
