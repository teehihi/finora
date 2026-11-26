import { Image, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowRight,
  Calculator,
  CalendarDays,
  FileSearch,
  LockKeyhole,
  Search,
  ShieldCheck,
} from 'lucide-react-native';
import { Button, Heading, Text, useDesign } from '@finora/ui';
import { showcaseStrings } from '@finora/i18n';
import { Language, Logo } from '../src/components/layout';
import mascot from '../assets/brand/fin-assistant.png';

const icons = [Search, Calculator, FileSearch, CalendarDays] as const;

function ProductPreview() {
  const { colors: c, locale, money } = useDesign();
  const copy = showcaseStrings[locale];
  return (
    <View
      style={{
        width: '100%',
        maxWidth: 430,
        alignSelf: 'center',
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 28,
        padding: 16,
        gap: 14,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 7,
        }}
      >
        <Heading size={19}>{copy.preview}</Heading>
        <Text bold small style={{ color: c.primary, fontSize: 11 }}>
          {copy.sample}
        </Text>
      </View>
      <View
        style={{
          padding: 15,
          borderRadius: 19,
          backgroundColor: c.forest,
          overflow: 'hidden',
          gap: 6,
        }}
      >
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            borderWidth: 22,
            borderRadius: 92,
            width: 162,
            height: 162,
            borderColor: '#B7F68E19',
            top: -61,
            right: -50,
          }}
        />
        <Text small style={{ color: c.onForestMuted }}>
          {copy.capacity}
        </Text>
        <Heading size={30} style={{ color: c.onForest, fontVariant: ['tabular-nums'] }}>
          {money(5500000)}
        </Heading>
        <Text small style={{ color: c.onForestMuted }}>
          {copy.basis}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
        {icons.map((Icon, i) => (
          <View key={copy.actions[i]} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 39,
                height: 39,
                borderRadius: 12,
                backgroundColor: c.secondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={18} color={c.primary} />
            </View>
            <Text small bold style={{ textAlign: 'center', fontSize: 10, lineHeight: 15 }}>
              {copy.actions[i]}
            </Text>
          </View>
        ))}
      </View>
      <View
        style={{
          borderRadius: 17,
          backgroundColor: c.secondary,
          padding: 12,
          gap: 6,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text bold style={{ color: c.primary, fontSize: 12, lineHeight: 17 }}>
            Finora AI
          </Text>
          <Text bold small>
            {copy.banner}
          </Text>
          <Text muted small>
            {copy.assistant}
          </Text>
        </View>
        <Image
          source={mascot}
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          style={{ width: 61, height: 64 }}
        />
      </View>
    </View>
  );
}

export default function Showcase() {
  const { colors: c, locale, t } = useDesign();
  const { width } = useWindowDimensions();
  const wide = width >= 1024;
  const copy = showcaseStrings[locale];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={{ alignItems: 'center', paddingHorizontal: wide ? 44 : 18 }}
      >
        <View style={{ width: '100%', maxWidth: 1180, paddingBottom: 46 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              minHeight: wide ? 80 : 63,
            }}
          >
            <Logo small={!wide} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Language />
              <Button label={t('signIn')} variant="outline" onPress={() => router.push('/auth')} />
            </View>
          </View>
          <View
            style={{
              borderRadius: 29,
              backgroundColor: c.secondary,
              gap: wide ? 30 : 21,
              padding: wide ? 42 : 18,
              flexDirection: wide ? 'row' : 'column',
              alignItems: wide ? 'center' : undefined,
            }}
          >
            <View style={{ flex: wide ? 1 : undefined, minWidth: 0, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={17} color={c.primary} />
                <Text small bold style={{ color: c.primary }}>
                  {copy.tagline}
                </Text>
              </View>
              <Heading size={wide ? 47 : 34}>{copy.title}</Heading>
              <Text muted style={{ maxWidth: 450 }}>
                {copy.intro}
              </Text>
              <View style={{ alignSelf: wide ? 'flex-start' : 'stretch', marginTop: 5 }}>
                <Button
                  label={copy.start}
                  onPress={() => router.push('/auth')}
                  icon={<ArrowRight size={18} color={c.onPrimary} />}
                />
              </View>
            </View>
            <View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>
              <ProductPreview />
            </View>
          </View>
          <View style={{ marginTop: wide ? 42 : 26, gap: 13 }}>
            <Heading size={25}>{copy.benefits}</Heading>
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: 10 }}>
              {copy.explain.map(([title, description], i) => {
                const Icon = icons[i + 1];
                return (
                  <View
                    key={title}
                    style={{
                      flex: wide ? 1 : undefined,
                      minWidth: 0,
                      borderRadius: 17,
                      backgroundColor: c.surface,
                      borderWidth: 1,
                      borderColor: c.border,
                      padding: 13,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 11,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: c.secondary,
                        borderRadius: 11,
                        width: 37,
                        height: 37,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={19} color={c.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text bold>{title}</Text>
                      <Text small muted>
                        {description}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 18 }}>
            <LockKeyhole size={15} color={c.primary} />
            <Text small muted>
              {copy.privacy}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
