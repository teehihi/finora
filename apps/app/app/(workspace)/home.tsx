import { View } from 'react-native';
import { router } from 'expo-router';
import { Wallet, Compass, Sparkles, BookOpen, ArrowUpRight } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Text, Heading, Button, Card, Divider, useDesign } from '@finora/ui';
import { api, auth } from '../../src/services/client';
import { useAccount } from '../../src/providers/AppProviders';
import { Page, Data, Columns, LinkRow } from '../../src/components/layout';
import { percent } from '@finora/i18n';
export default function Home() {
  const { t, colors: c, money, locale } = useDesign();
  const session = auth.useSession();
  const account = useAccount();
  const saved = useQuery({ queryKey: ['saved', session.data?.user.id], queryFn: api.saved });
  return (
    <Page
      title={t('greet') + ', ' + (session.data?.user.name ?? '') + '.'}
      description={t('overview')}
    >
      <Columns>
        <View style={{ flex: 1.35 }}>
          <Data q={account}>
            {(a) => (
              <Card
                style={{
                  backgroundColor: c.forest,
                  borderColor: c.forest,
                  padding: 26,
                  flex: 1,
                  justifyContent: 'space-between',
                  gap: 20,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Wallet size={20} color={c.onForestMuted} />
                  <Text small bold style={{ color: c.onForestMuted }}>
                    {t('readiness').toLocaleUpperCase()}
                  </Text>
                </View>
                <Heading size={32} style={{ color: c.onForest }}>
                  {a.readiness ? money(a.readiness.monthlyBudget) : t('addProfile')}
                </Heading>
                <Text style={{ color: c.onForestMuted }}>
                  {a.readiness
                    ? t('affNote') +
                      ' ' +
                      t('ratio') +
                      ' ' +
                      percent(a.readiness.debtToIncome, locale)
                    : t('readinessHint')}
                </Text>
                <View style={{ alignSelf: 'flex-start' }}>
                  <Button
                    variant="onForest"
                    label={t('editProfile')}
                    onPress={() => router.navigate('/profile')}
                    icon={<ArrowUpRight size={16} color={c.forest} />}
                  />
                </View>
              </Card>
            )}
          </Data>
        </View>
        <Card style={{ flex: 1 }}>
          <Heading size={25}>{t('quick')}</Heading>
          <LinkRow
            title={t('learn')}
            icon={<Compass color={c.primary} />}
            onPress={() => router.navigate('/explore')}
          />
          <Divider />
          <LinkRow
            title={t('ai')}
            body={t('assistantTitle')}
            icon={<Sparkles color={c.primary} />}
            onPress={() => router.navigate('/assistant')}
          />
        </Card>
      </Columns>
      <Heading size={26}>{t('saved')}</Heading>
      <Data q={saved}>
        {(rows) => (
          <Card>
            {rows.length ? (
              rows
                .slice(0, 3)
                .map((r) => (
                  <LinkRow
                    key={r.id}
                    title={locale === 'vi-VN' ? r.product.name : r.product.nameEn}
                    body={money(r.input.principal)}
                    icon={<BookOpen size={20} color={c.primary} />}
                    onPress={() => router.push('/saved/' + r.id)}
                  />
                ))
            ) : (
              <LinkRow
                title={t('emptySaved')}
                body={t('emptySavedText')}
                icon={<BookOpen color={c.primary} />}
                onPress={() => router.navigate('/explore')}
              />
            )}
          </Card>
        )}
      </Data>
      <View style={{ gap: 6 }}>
        <Heading size={24}>{t('upcoming')}</Heading>
        <Text muted>{t('noDue')}</Text>
      </View>
    </Page>
  );
}
