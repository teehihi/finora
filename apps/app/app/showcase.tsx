import { useState } from 'react';
import { Image, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowRight, Calculator, CalendarDays, FileSearch, ShieldCheck } from 'lucide-react-native';
import { Action, Button, Eyebrow, Heading, Text, useDesign } from '@finora/ui';
import { simulate } from '@finora/financial-engine';
import { getAccessStrings, showcaseStrings } from '@finora/i18n';
import { Language, Logo } from '../src/components/layout';
import mascot from '../assets/brand/fin-assistant.png';
import { BrandLines } from '../src/features/auth/BrandLines';

const samplePrincipal = 20_000_000;
const terms = [12, 24] as const;
const sampleEstimates = terms.map((months) =>
  simulate({
    principal: samplePrincipal,
    annualRate: 12,
    months,
    method: 'annuity',
    fee: null,
    // Only the amounts are displayed; the schedule's anchor is deliberately fixed in the demo.
    firstDue: '2026-01-01',
  }),
);
const benefits = [Calculator, FileSearch, CalendarDays] as const;

function ProductPreview() {
  const { colors: c, locale, money } = useDesign();
  const copy = getAccessStrings(locale);
  const [choice, setChoice] = useState(0);
  const estimate = sampleEstimates[choice];

  return (
    <View
      style={{ width: '100%', backgroundColor: c.surface, borderRadius: 24, overflow: 'hidden' }}
    >
      <View style={{ backgroundColor: c.forest, padding: 19, gap: 8, overflow: 'hidden' }}>
        <BrandLines />
        <Eyebrow tone="onForest">{copy.sample}</Eyebrow>
        <Text style={{ color: c.onForestMuted }}>{copy.sampleTitle}</Text>
        <Heading size={31} style={{ color: c.onForest, fontVariant: ['tabular-nums'] }}>
          {money(samplePrincipal)}
        </Heading>
      </View>
      <View
        style={{
          borderColor: c.border,
          borderWidth: 1,
          borderTopWidth: 0,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          padding: 17,
          gap: 13,
        }}
      >
        <View style={{ gap: 7 }}>
          <Text small bold>
            {copy.term}
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={copy.term}
            style={{
              flexDirection: 'row',
              backgroundColor: c.elevated,
              borderRadius: 13,
              padding: 3,
              gap: 4,
            }}
          >
            {terms.map((term, index) => {
              const label = copy.months.replace('{count}', String(term));
              const selected = choice === index;
              return (
                <Action
                  key={term}
                  label={label}
                  role="radio"
                  selected={selected}
                  onPress={() => setChoice(index)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: selected ? c.borderStrong : 'transparent',
                    backgroundColor: selected ? c.surface : 'transparent',
                    paddingHorizontal: 4,
                    paddingVertical: 7,
                    minHeight: 44,
                  }}
                >
                  <Text
                    bold={selected}
                    style={{ textAlign: 'center', color: selected ? c.primary : c.muted }}
                  >
                    {label}
                  </Text>
                </Action>
              );
            })}
          </View>
        </View>
        <View accessibilityLiveRegion="polite" aria-live="polite" style={{ gap: 10 }}>
          <View
            style={{
              borderBottomColor: c.border,
              borderBottomWidth: 1,
              paddingBottom: 10,
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Text muted>{copy.firstPayment}</Text>
            <View testID="showcase-first-payment">
              <Text bold style={{ color: c.primary, fontSize: 18, fontVariant: ['tabular-nums'] }}>
                {money(estimate.firstPayment)}
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: 6,
            }}
          >
            <Text small muted>
              {copy.interest}
            </Text>
            <Text small style={{ fontVariant: ['tabular-nums'] }}>
              {money(estimate.interest)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: 6,
            }}
          >
            <Text bold>{copy.total}</Text>
            <Text bold style={{ fontVariant: ['tabular-nums'] }}>
              {money(estimate.repayment)}
            </Text>
          </View>
        </View>
        {choice === 1 ? (
          <Text small style={{ color: c.primary }}>
            {copy.longerTerm}
          </Text>
        ) : null}
        <Text small muted>
          {copy.sampleNotes}
        </Text>
      </View>
    </View>
  );
}

export default function Showcase() {
  const { colors: c, locale, t } = useDesign();
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const copy = getAccessStrings(locale);
  const legacy = showcaseStrings[locale === 'en-US' ? 'en-US' : 'vi-VN'];
  const signIn = () => router.push('/auth');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={{ alignItems: 'center', paddingHorizontal: wide ? 44 : 19 }}
      >
        <View style={{ width: '100%', maxWidth: 1100, paddingBottom: 38 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 9,
              minHeight: wide ? 75 : 57,
              borderBottomWidth: 1,
              borderColor: c.border,
            }}
          >
            <Logo small={!wide} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Language />
              <Button label={t('signIn')} variant="text" onPress={signIn} />
            </View>
          </View>
          <View
            style={{
              marginTop: wide ? 43 : 24,
              flexDirection: wide ? 'row' : 'column',
              alignItems: wide ? 'center' : 'stretch',
              gap: wide ? 52 : 22,
            }}
          >
            <View style={{ flex: wide ? 1 : undefined, minWidth: 0, gap: 12 }}>
              <Eyebrow tone="forest">{legacy.tagline}</Eyebrow>
              <Heading size={wide ? 47 : 33} style={{ maxWidth: 410 }}>
                {wide ? copy.previewHeadingWide : copy.previewHeading}
              </Heading>
              <Text muted style={{ maxWidth: 398, lineHeight: 24 }}>
                {copy.previewBody}
              </Text>
              <View style={{ alignSelf: wide ? 'flex-start' : 'stretch', marginTop: 3 }}>
                <Button
                  label={legacy.start}
                  onPress={signIn}
                  icon={<ArrowRight size={18} color={c.onPrimary} />}
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 420 }}>
                <Image
                  source={mascot}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                  style={{ width: 32, height: 33 }}
                />
                <Text small muted>
                  {copy.privateSample}
                </Text>
              </View>
            </View>
            <View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>
              <ProductPreview />
            </View>
          </View>
          <View style={{ marginTop: wide ? 42 : 29, gap: 11 }}>
            <Heading size={23}>{copy.toolsHeading}</Heading>
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 24 : 0 }}>
              {copy.tools.map(([title, description], i) => {
                const Icon = benefits[i];
                return (
                  <View
                    key={title}
                    style={{
                      flex: wide ? 1 : undefined,
                      minWidth: 0,
                      borderTopWidth: 1,
                      borderColor: c.border,
                      paddingVertical: 11,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: c.secondary,
                        borderRadius: 11,
                        width: 36,
                        height: 36,
                      }}
                    >
                      <Icon size={18} color={c.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
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
          <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 11 }}>
            <ShieldCheck size={16} color={c.primary} />
            <Text small muted>
              {copy.privacy}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
