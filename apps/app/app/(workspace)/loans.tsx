import { View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Calculator, Landmark } from 'lucide-react-native';
import { Action, Heading, Text, Button, useDesign } from '@finora/ui';
import { date, numeric } from '@finora/i18n';
import { api, auth } from '../../src/services/client';
import { Page, Data } from '../../src/components/layout';
import { RepaymentsSummary } from '../../src/features/repayments';
import { MarketNotice, MarketPanel, ProductIcon } from '../../src/features/market-ui';

export default function Loans() {
  const { t, colors: c, locale, money } = useDesign();
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const user = auth.useSession();
  const q = useQuery({
    queryKey: ['saved', user.data?.user.id],
    queryFn: api.saved,
    enabled: !!user.data?.user.id,
  });

  return (
    <Page title={t('loans')} description={t('loansIntro')}>
      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: desktop ? 28 : 22 }}>
        <View
          style={{
            width: desktop ? 270 : undefined,
            alignSelf: desktop ? 'flex-start' : 'stretch',
          }}
        >
          <RepaymentsSummary />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <Calculator size={20} color={c.primary} />
            <Heading size={22}>{t('saved')}</Heading>
          </View>
          <MarketNotice>{t('savedOnlyNote')}</MarketNotice>
          <Data q={q}>
            {(rows) =>
              rows.length ? (
                <MarketPanel style={{ padding: 9, gap: 4 }}>
                  {rows.map((r) => {
                    const name = locale === 'vi-VN' ? r.product.name : r.product.nameEn;
                    return (
                      <Action
                        key={r.id}
                        label={name}
                        onPress={() => router.push('/saved/' + r.id)}
                        style={{
                          borderRadius: 11,
                          backgroundColor: c.elevated,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          padding: 9,
                        }}
                      >
                        <ProductIcon category={r.product.category} />
                        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                          <Text bold>{name}</Text>
                          <Text small muted>
                            {t('savedDate')} {date(r.createdAt, locale)}
                          </Text>
                        </View>
                        <View style={{ flex: 0.85, minWidth: 0, alignItems: 'flex-end', gap: 3 }}>
                          <Text
                            small
                            bold
                            style={{ fontVariant: ['tabular-nums'], textAlign: 'right' }}
                          >
                            {money(r.input.principal)}
                          </Text>
                          <Text small muted>
                            {numeric(r.input.months, locale)} {t('months')}
                          </Text>
                        </View>
                        <ArrowUpRight size={17} color={c.primary} />
                      </Action>
                    );
                  })}
                </MarketPanel>
              ) : (
                <MarketPanel style={{ alignItems: 'flex-start', padding: 17 }}>
                  <Landmark size={22} color={c.primary} />
                  <Text bold>{t('emptySaved')}</Text>
                  <Text small muted>
                    {t('emptySavedText')}
                  </Text>
                  <Button
                    label={t('learn')}
                    variant="outline"
                    onPress={() => router.navigate('/explore?mode=sample')}
                  />
                </MarketPanel>
              )
            }
          </Data>
        </View>
      </View>
    </Page>
  );
}
