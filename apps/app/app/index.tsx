import boat from '../assets/images/paper-boat.jpg';
import { View, Image, useWindowDimensions } from 'react-native';
import { Redirect, router } from 'expo-router';
import { ArrowUpRight } from 'lucide-react-native';
import { Text, Heading, Button, Eyebrow, useDesign } from '@finora/ui';
import { tokens } from '@finora/design-tokens';
import { auth } from '../src/services/client';
import { PublicPage } from '../src/components/layout';

const chapters = [
  ['discoverTitle', 'discoverText'],
  ['costTitle', 'costText'],
  ['planTitle', 'planText'],
] as const;

export default function Welcome() {
  const { data } = auth.useSession();
  const { width } = useWindowDimensions();
  const wide = width >= 840;
  const { colors: c, locale, t } = useDesign();
  const vi = locale === 'vi-VN';
  if (data) return <Redirect href="/home" />;

  return (
    <PublicPage>
      <View
        style={{ paddingTop: wide ? 48 : 30, paddingBottom: wide ? 36 : 24, gap: wide ? 46 : 27 }}
      >
        <View
          style={{
            flexDirection: wide ? 'row' : 'column',
            alignItems: 'stretch',
            gap: wide ? 40 : 27,
          }}
        >
          <View
            style={{
              flex: wide ? 0.96 : undefined,
              minWidth: 0,
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingVertical: wide ? 22 : 0,
              gap: wide ? 24 : 17,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={{ backgroundColor: c.accent, width: 27, height: 2 }} />
              <Eyebrow tone="forest">{t('guide')}</Eyebrow>
            </View>
            <Heading size={wide ? Math.min(78, width * 0.058) : width <= 375 ? 40 : 46}>
              {t('welcome')}
            </Heading>
            <Text
              muted
              style={{
                maxWidth: 410,
                fontSize: wide ? 18 : 16,
                lineHeight: wide ? 29 : 25,
              }}
            >
              {t('intro')}
            </Text>
            <Button
              label={t('start')}
              icon={<ArrowUpRight size={18} color={c.onPrimary} />}
              onPress={() => router.push('/auth')}
            />
          </View>

          <View
            style={{
              flex: wide ? 1.04 : undefined,
              minWidth: 0,
              backgroundColor: c.forest,
              overflow: 'hidden',
              borderRadius: tokens.radius.feature,
            }}
          >
            <Image
              source={boat}
              resizeMode="cover"
              accessible={false}
              style={{ width: '100%', height: wide ? Math.min(420, width * 0.31) : 180 }}
            />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: wide ? 22 : 15,
                paddingVertical: wide ? 13 : 10,
                gap: 12,
              }}
            >
              <Eyebrow tone="onForest">Finora / 01</Eyebrow>
              <Text small style={{ color: c.onForestMuted, textAlign: 'right' }}>
                {vi ? 'Một kế hoạch rõ ràng hơn.' : 'A clearer plan.'}
              </Text>
            </View>
          </View>
        </View>

        <View>
          <Eyebrow tone="forest" style={{ marginBottom: wide ? 12 : 2 }}>
            {vi ? 'Từ lựa chọn đến lịch trả nợ' : 'From choice to repayment'}
          </Eyebrow>
          <View style={{ flexDirection: wide ? 'row' : 'column', columnGap: 24 }}>
            {chapters.map(([title, detail], index) => (
              <View
                key={title}
                style={{
                  flex: wide ? 1 : undefined,
                  flexDirection: 'row',
                  gap: 13,
                  paddingTop: 12,
                  paddingBottom: wide ? 8 : 12,
                  borderColor: c.border,
                  borderTopWidth: 1,
                }}
              >
                <Text
                  small
                  bold
                  style={{ color: c.primary, fontVariant: ['tabular-nums'], paddingTop: 4 }}
                >
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Heading size={23}>{t(title)}</Heading>
                  <Text small muted>
                    {t(detail)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </PublicPage>
  );
}
