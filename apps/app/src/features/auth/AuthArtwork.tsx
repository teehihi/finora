import { Image, View } from 'react-native';
import { CalendarDays, Calculator, FileSearch } from 'lucide-react-native';
import { Heading, Text, useDesign } from '@finora/ui';
import { getAccessStrings } from '@finora/i18n';
import mascot from '../../../assets/brand/fin-assistant.png';
import { BrandLines } from './BrandLines';

export function AuthArtwork({ wide }: { wide: boolean }) {
  const { colors: c, locale } = useDesign();
  const copy = getAccessStrings(locale);
  return (
    <View
      style={{
        flex: wide ? 1 : undefined,
        minWidth: 0,
        minHeight: wide ? 510 : 107,
        backgroundColor: c.forest,
        borderRadius: wide ? 30 : 23,
        overflow: 'hidden',
        justifyContent: 'space-between',
        padding: wide ? 30 : 14,
        paddingBottom: wide ? 24 : 14,
        gap: wide ? 21 : 0,
      }}
    >
      <BrandLines />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          {wide ? (
            <Text bold small style={{ color: '#BDEF9B' }}>
              Finora
            </Text>
          ) : null}
          <Heading size={wide ? 37 : 23} style={{ color: c.onForest }}>
            {wide ? copy.welcome : copy.welcome.replace('. ', '.\n')}
          </Heading>
          {wide ? <Text style={{ color: c.onForestMuted }}>{copy.intro}</Text> : null}
        </View>
        {!wide ? (
          <Image
            source={mascot}
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            style={{ width: 74, height: 74 }}
          />
        ) : null}
      </View>
      {wide ? (
        <>
          <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <Image
              source={mascot}
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              style={{ width: 178, height: 158 }}
            />
          </View>
          <View accessibilityRole="list" style={{ gap: 8 }}>
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
                  borderColor: '#FFFFFF33',
                  paddingVertical: 9,
                }}
              >
                <Icon size={18} color="#BDEF9B" />
                <Text small bold style={{ color: c.onForest }}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}
