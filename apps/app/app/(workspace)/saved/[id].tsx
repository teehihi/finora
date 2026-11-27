import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Badge, Heading, SourceAttribution, Text, useDesign } from '@finora/ui';
import { date, documentStrings, intelligenceDecision, percent } from '@finora/i18n';
import { reviewedDocumentSource, savedStressAnalysisSchema } from '@finora/contracts';
import { api, auth } from '../../../src/services/client';
import { Page, Data, backTo } from '../../../src/components/layout';
import { Breakdown } from '../../../src/features/breakdown';
import { TrackRepaymentCta } from '../../../src/features/repayments';
import { MarketPanel, ProductIcon } from '../../../src/features/market-ui';
import { AnalysisLedger } from '../../../src/features/intelligence/presentation';
export default function Saved() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { locale, t, money, colors: c } = useDesign();
  const user = auth.useSession();
  const q = useQuery({
    queryKey: ['savedOne', user.data?.user.id, id],
    queryFn: () => api.detail(id),
    enabled: !!user.data?.user.id && !!id,
  });
  return (
    <Data
      q={q}
      pendingDetail={{ title: t('saved'), onBack: () => backTo('/loans?pane=simulations') }}
    >
      {(s) => (
        <Page
          title={locale === 'vi-VN' ? s.product.name : s.product.nameEn}
          description={t('savedDate') + ' ' + date(s.createdAt, locale)}
          detail={{ onBack: () => backTo('/loans?pane=simulations') }}
        >
          <MarketPanel style={{ borderRadius: 22, gap: 15 }}>
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
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                flexWrap: 'wrap',
                borderTopWidth: 1,
                borderColor: c.border,
                paddingTop: 12,
              }}
            >
              <View style={{ flex: 1.4, minWidth: 0 }}>
                <Text muted small>
                  {t('amount')}
                </Text>
                <Text
                  bold
                  style={{ fontVariant: ['tabular-nums'], color: c.primary, fontSize: 17 }}
                >
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
          <SavedStress value={s.result.stressAnalysis} />
          <Breakdown
            input={s.input}
            result={s.result}
            actions={
              <Button
                label={t('intelligenceSavedAnalysis')}
                onPress={() =>
                  router.push({ pathname: '/intelligence', params: { simulationId: s.id } })
                }
              />
            }
          />
          <TrackRepaymentCta key={s.id} simulation={s} />
        </Page>
      )}
    </Data>
  );
}

function SavedStress({ value }: { value: unknown }) {
  const { locale, money, colors: c } = useDesign();
  const parsed = savedStressAnalysisSchema.safeParse(value);
  if (!parsed.success) return null;
  const stress = parsed.data;
  const words = intelligenceDecision(locale);
  return (
    <MarketPanel style={{ backgroundColor: c.elevated }}>
      <Heading size={20}>{words.stressTitle}</Heading>
      <AnalysisLedger
        rows={[
          {
            label:
              words.incomeLoss +
              (stress.incomeReductionPercent === null
                ? ''
                : ' · ' + percent(stress.incomeReductionPercent, locale)),
            value: money(stress.monthlyIncomeLoss),
          },
          {
            label:
              words.expenseIncrease +
              (stress.expenseIncreasePercent === null
                ? ''
                : ' · ' + percent(stress.expenseIncreasePercent, locale)),
            value: money(stress.monthlyExpenseIncrease),
          },
          { label: words.baseCash, value: money(stress.remainingCash) },
          {
            label: words.stressedCash,
            value: money(stress.stressRemainingCash),
            warning: stress.stressRemainingCash <= 0,
          },
        ]}
      />
      <Text small muted>
        {words.planningRule}
      </Text>
    </MarketPanel>
  );
}
