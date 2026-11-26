import { Image, View } from 'react-native';
import { CalendarDays, Calculator, FileSearch } from 'lucide-react-native';
import { Heading, Text, useDesign } from '@finora/ui';
import { getAccessStrings } from '@finora/i18n';
import mascot from '../../../assets/brand/fin-assistant.png';

export function AuthArtwork({ wide }: { wide: boolean }) {
  const { colors: c, locale } = useDesign();
  const copy = getAccessStrings(locale);
  return (
    <View
      style={{
        flex: wide ? 1 : undefined,
        minWidth: 0,
        minHeight: wide ? 540 : 134,
        backgroundColor: c.forest,
        borderRadius: wide ? 30 : 23,
        overflow: 'hidden',
        justifyContent: 'space-between',
        padding: wide ? 30 : 17,
        paddingBottom: wide ? 24 : 17,
        gap: wide ? 21 : 0,
      }}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute',
          width: wide ? 300 : 190,
          height: wide ? 300 : 190,
          right: wide ? -52 : -55,
          top: -108,
          borderWidth: 34,
          borderColor: '#B7F68E1A',
          borderRadius: 200,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <Text bold small style={{ color: '#BDEF9B' }}>
            Finora
          </Text>
          <Heading size={wide ? 37 : 23} style={{ color: c.onForest }}>
            {copy.welcome}
          </Heading>
          {wide ? <Text style={{ color: c.onForestMuted }}>{copy.intro}</Text> : null}
        </View>
        {!wide ? (
          <Image
            source={mascot}
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            style={{ width: 91, height: 95 }}
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
              style={{ width: 208, height: 180 }}
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
                  borderRadius: 13,
                  backgroundColor: '#FFFFFF14',
                  padding: 11,
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
