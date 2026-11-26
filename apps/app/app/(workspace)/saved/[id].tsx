import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Badge, SourceAttribution, Text, useDesign } from '@finora/ui';
import { date, documentStrings, percent } from '@finora/i18n';
import { reviewedDocumentSource } from '@finora/contracts';
import { api, auth } from '../../../src/services/client';
import { Page, Data, Back } from '../../../src/components/layout';
import { Breakdown } from '../../../src/features/breakdown';
import { TrackRepaymentCta } from '../../../src/features/repayments';
import { MarketPanel, ProductIcon } from '../../../src/features/market-ui';
export default function Saved() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { locale, t, money } = useDesign();
  const user = auth.useSession();
  const q = useQuery({
    queryKey: ['savedOne', user.data?.user.id, id],
    queryFn: () => api.detail(id),
    enabled: !!user.data?.user.id && !!id,
  });
  return (
    <Data q={q}>
      {(s) => (
        <Page
          title={locale === 'vi-VN' ? s.product.name : s.product.nameEn}
          description={t('savedDate') + ' ' + date(s.createdAt, locale)}
          top={<Back to={() => router.navigate('/loans')} />}
        >
          <MarketPanel>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <ProductIcon category={s.product.category} />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Badge>
                  {s.product.source === reviewedDocumentSource
                    ? documentStrings[locale].fileSource
                    : s.product.source === 'FINORA_USER_SCENARIO'
                      ? documentStrings[locale].userScenario
                      : t('sample')}
                </Badge>
                <Text small muted>
                  {t('method')}: {t(s.input.method)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <View style={{ flex: 1.4, minWidth: 0 }}>
                <Text muted small>
                  {t('amount')}
                </Text>
                <Text bold style={{ fontVariant: ['tabular-nums'] }}>
                  {money(s.input.principal)}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text muted small>
                  {t('term')}
                </Text>
                <Text bold style={{ fontVariant: ['tabular-nums'] }}>
                  {s.input.months} {t('months')}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text muted small>
                  {t('yearRate')}
                </Text>
                <Text bold style={{ fontVariant: ['tabular-nums'] }}>
                  {percent(s.input.annualRate, locale)}
                </Text>
              </View>
            </View>
            {s.product.source !== reviewedDocumentSource &&
            s.product.source !== 'FINORA_USER_SCENARIO' ? (
              <SourceAttribution source={s.product.source} />
            ) : null}
          </MarketPanel>
          <Breakdown
            input={s.input}
            result={s.result}
            actions={
              <View style={{ gap: 8 }}>
                <Button
                  label={t('explain')}
                  onPress={() =>
                    router.push({ pathname: '/assistant', params: { simulationId: s.id } })
                  }
                />
                <Button
                  label={t('intelligenceSavedAnalysis')}
                  variant="outline"
                  onPress={() =>
                    router.push({ pathname: '/intelligence', params: { simulationId: s.id } })
                  }
                />
              </View>
            }
          />
          <TrackRepaymentCta key={s.id} simulation={s} />
        </Page>
      )}
    </Data>
  );
}
