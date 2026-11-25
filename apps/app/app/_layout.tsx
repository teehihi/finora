import '../global.css';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { SourceSerif4_400Regular } from '@expo-google-fonts/source-serif-4/400Regular';
import { Providers } from '../src/providers/AppProviders';
import { LoadingState, useDesign } from '@finora/ui';
function Routes() {
  const { colors } = useDesign();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
export default function Layout() {
  const [loaded, error] = useFonts({
    Geist: Geist_400Regular,
    GeistMedium: Geist_500Medium,
    InstrumentSerif: InstrumentSerif_400Regular,
    SourceSerif: SourceSerif4_400Regular,
  });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Providers>
          {loaded || error ? (
            <Routes />
          ) : (
            <View className="flex-1 justify-center">
              <LoadingState />
            </View>
          )}
        </Providers>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
