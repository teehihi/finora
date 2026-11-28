import { ActivityIndicator, Image, Platform, Text } from 'react-native';
import { useFonts } from 'expo-font';
import { Action } from '@finora/ui';
import googleSans from './assets/GoogleSansMedium-FinoraAuth.ttf';
import googleG from './assets/google-g.png';

export function GoogleMark() {
  return (
    <Image
      source={googleG}
      resizeMode="contain"
      accessible={false}
      style={{ width: 18, height: 18 }}
    />
  );
}

export function GoogleAction({
  label,
  onPress,
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  busy: boolean;
  disabled: boolean;
}) {
  const [fontLoaded] = useFonts({ AuthGoogleSans: googleSans });
  return (
    <Action
      onPress={onPress}
      label={label}
      disabled={disabled || busy}
      style={{
        minHeight: 48,
        backgroundColor: '#FFFFFF',
        opacity: disabled && !busy ? 0.64 : 1,
        borderWidth: 1,
        borderColor: '#747775',
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Platform.OS === 'ios' ? 12 : 10,
        paddingHorizontal: Platform.OS === 'ios' ? 16 : 12,
        paddingVertical: 9,
      }}
    >
      {busy ? <ActivityIndicator color="#1F1F1F" /> : <GoogleMark />}
      <Text
        style={{
          color: '#1F1F1F',
          fontFamily: fontLoaded ? 'AuthGoogleSans' : 'GeistMedium',
          fontSize: 14,
          lineHeight: 20,
          flexShrink: 1,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Action>
  );
}
