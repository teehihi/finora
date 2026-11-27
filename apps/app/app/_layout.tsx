import '../global.css';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { dark } from '@finora/design-tokens';
import * as SplashScreen from 'expo-splash-screen';
import { LaunchScene } from '../src/components/LaunchScene';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_700Bold } from '@expo-google-fonts/geist/700Bold';
import { Providers } from '../src/providers/AppProviders';
import { useDesign } from '@finora/ui';
// The OS owns the static first frame. Release it after the first real JS layout,
// whether that layout contains a route or the font-loading scene.
if (Platform.OS !== 'web') void SplashScreen.preventAutoHideAsync().catch(() => {});
function releaseNativeSplash() {
  if (Platform.OS !== 'web') void SplashScreen.hideAsync().catch(() => {});
}
function AppStatusBar() {
  const { colors } = useDesign();
  return <StatusBar style={colors === dark ? 'light' : 'dark'} />;
}
function Routes() {
  const { colors } = useDesign();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        statusBarStyle: Platform.OS === 'ios' ? (colors === dark ? 'light' : 'dark') : undefined,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
export default function Layout() {
  const [loaded, error] = useFonts({
    Geist: Geist_400Regular,
    GeistMedium: Geist_500Medium,
    GeistBold: Geist_700Bold,
  });
  return (
    <GestureHandlerRootView onLayout={releaseNativeSplash} style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Providers>
          {Platform.OS !== 'ios' || !(loaded || error) ? <AppStatusBar /> : null}
          {loaded || error ? <Routes /> : <LaunchScene />}
        </Providers>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
