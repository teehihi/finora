import { ImageBackground, View } from 'react-native';
import { tokens } from '@finora/design-tokens';
import loginHero from '../../../assets/brand/login-hero.png';

export function AuthArtwork({ wide }: { wide: boolean }) {
  if (!wide) return null;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        flex: 1,
        minWidth: 0,
        height: 500,
        maxHeight: 500,
        maxWidth: 500,
        borderRadius: tokens.radius.card,
        overflow: 'hidden',
        backgroundColor: '#0B3027',
        alignSelf: 'center',
      }}
    >
      <ImageBackground
        source={loginHero}
        resizeMode="cover"
        imageStyle={{ opacity: 0.98 }}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
    </View>
  );
}
