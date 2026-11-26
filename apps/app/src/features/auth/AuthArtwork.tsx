import { Image, View, useWindowDimensions } from 'react-native';
import { CalendarDays, Calculator, FileSearch } from 'lucide-react-native';
import { Heading, Text, useDesign } from '@finora/ui';
import { getAccessStrings } from '@finora/i18n';
import { tokens } from '@finora/design-tokens';
import { SignatureIcon, SignatureSweep } from '../../components/signature';
import mascot from '../../../assets/brand/fin-assistant.png';

export function AuthArtwork({ wide }: { wide: boolean }) {
  const { colors: c, locale } = useDesign();
  const { fontScale } = useWindowDimensions();
  const copy = getAccessStrings(locale);
  if (!wide) {
    const image = fontScale >= 1.25 ? 46 : 65;
    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          borderBottomWidth: 1,
          borderColor: c.border,
          paddingBottom: 14,
        }}
      >
        <View style={{ minWidth: 0, flex: 1, gap: 3 }}>
          <Text
            small
            bold
            style={{ color: c.primary, fontSize: 11, lineHeight: 16, letterSpacing: 1.15 }}
          >
            FINORA
          </Text>
          <Text bold style={{ fontSize: 19, lineHeight: 24, letterSpacing: -0.32 }}>
            {copy.welcome}
          </Text>
        </View>
        <View
          style={{
            width: image + 5,
            height: image + 5,
            borderRadius: tokens.signature.radius,
            backgroundColor: c.secondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            source={mascot}
            accessible={false}
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            style={{ width: image, height: image }}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 510,
        backgroundColor: c.signatureStart,
        overflow: 'hidden',
        justifyContent: 'space-between',
        padding: 32,
        gap: 22,
      }}
    >
      <SignatureSweep name="finora-auth-signature" />
      <View style={{ gap: 10 }}>
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 8,
            backgroundColor: c.signatureLime,
            paddingHorizontal: 9,
            paddingVertical: 4,
          }}
        >
          <Text bold small style={{ color: c.signatureInk, letterSpacing: 1.2, fontSize: 11 }}>
            FINORA
          </Text>
        </View>
        <Heading size={38} style={{ color: c.onForest }}>
          {copy.welcome.replace('. ', '.\n')}
        </Heading>
        <Text style={{ color: c.onForestMuted }}>{copy.intro}</Text>
      </View>
      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Image
          source={mascot}
          accessible={false}
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          style={{ width: 186, height: 157 }}
        />
      </View>
      <View accessibilityRole="list">
        {(
          [
            [Calculator, copy.cost],
            [FileSearch, copy.terms],
            [CalendarDays, copy.schedule],
          ] as const
        ).map(([Icon, label]) => (
          <View
            key={label}
            accessibilityRole="listitem"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11,
              borderTopWidth: 1,
              borderColor: c.signatureEdge,
              paddingVertical: 7,
            }}
          >
            <SignatureIcon icon={Icon} tone="lime" size={30} />
            <Text small bold style={{ color: c.onForest }}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
