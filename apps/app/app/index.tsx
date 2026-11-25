import boat from '../assets/images/paper-boat.jpg';
import { View, Image, useWindowDimensions } from 'react-native';
import { Redirect, router } from 'expo-router';
import { ArrowUpRight, BookOpen, Calculator, CalendarDays, Compass } from 'lucide-react-native';
import { Text, Heading, Button, useDesign } from '@finora/ui';
import { auth } from '../src/services/client';
import { PublicPage } from '../src/components/layout';
export default function Welcome() {
  const { data } = auth.useSession();
  const { width } = useWindowDimensions();
  const wide = width >= 840;
  const { colors: c, t } = useDesign();
  if (data) return <Redirect href="/home" />;
  const items = [
    [Compass, 'discoverTitle', 'discoverText'],
    [Calculator, 'costTitle', 'costText'],
    [CalendarDays, 'planTitle', 'planText'],
  ] as const;
  return (
    <PublicPage>
      <View style={{ paddingVertical: wide ? 48 : 24, gap: wide ? 38 : 24 }}>
        <View
          style={{
            flexDirection: wide ? 'row' : 'column',
            backgroundColor: c.forest,
            borderRadius: 24,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              flex: wide ? 1 : undefined,
              padding: wide ? 44 : 24,
              justifyContent: 'space-between',
              gap: wide ? 34 : 18,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}>
              <BookOpen size={18} color={c.onForestMuted} />
              <Text small bold style={{ color: c.onForestMuted, letterSpacing: 1 }}>
                {t('guide').toLocaleUpperCase()}
              </Text>
            </View>
            <View style={{ gap: 16 }}>
              <Heading size={wide ? Math.min(66, width * 0.048) : 39} style={{ color: c.onForest }}>
                {t('welcome')}
              </Heading>
              <Text
                style={{
                  maxWidth: 410,
                  color: c.onForestMuted,
                  fontSize: wide ? 18 : 16,
                  lineHeight: wide ? 28 : 24,
                }}
              >
                {t('intro')}
              </Text>
            </View>
            <View style={{ alignSelf: 'flex-start' }}>
              <Button
                label={t('start')}
                variant="onForest"
                icon={<ArrowUpRight size={18} color={c.forest} />}
                onPress={() => router.push('/auth?mode=signup')}
              />
            </View>
          </View>
          <Image
            source={boat}
            resizeMode="cover"
            accessible={false}
            style={
              wide ? { flex: 1.08, height: '100%', minHeight: 420 } : { width: '100%', height: 180 }
            }
          />
        </View>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 32 : 18 }}>
          {items.map(([Icon, title, desc]) => (
            <View
              key={title}
              style={{ flex: 1, gap: 8, borderTopWidth: 1, borderColor: c.border, paddingTop: 18 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon size={21} color={c.primary} />
                <Heading size={24}>{t(title)}</Heading>
              </View>
              <Text muted>{t(desc)}</Text>
            </View>
          ))}
        </View>
      </View>
    </PublicPage>
  );
}
