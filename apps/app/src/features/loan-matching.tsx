import { Linking, View } from 'react-native';
import { ArrowUpRight, CircleAlert, ShieldCheck } from 'lucide-react-native';
import type { LoanMatchResult, MatchReason } from '@finora/contracts';
import { date, matchingText, numeric, type MatchingCopyKey } from '@finora/i18n';
import { Action, Heading, Text, useDesign } from '@finora/ui';

const reasonKeys: Record<MatchReason, MatchingCopyKey> = {
  amount_outside: 'amountOutside',
  term_outside: 'termOutside',
  purpose_outside: 'purposeOutside',
  purpose_unknown: 'purposeUnknown',
  amount_unknown: 'amountUnknown',
  term_unknown: 'termUnknown',
  eligibility_unverified: 'eligibilityUnverified',
  rate_unknown: 'rateUnknown',
  method_unknown: 'methodUnknown',
  fees_unknown: 'feesUnknown',
  insurance_unknown: 'insuranceUnknown',
  profile_missing: 'missingProfile',
  budget_exceeded: 'budgetExceeded',
  reserve_unknown: 'reserveUnknown',
  reserve_shortfall: 'reserveShortfall',
  stress_pressure: 'stressPressure',
  cost_higher: 'costHigher',
  transparency_lower: 'transparencyLower',
  matching_terms: 'matchingTerms',
};
const scoreKeys = {
  monthlyAffordability: 'affordability',
  totalCost: 'cost',
  resilience: 'resilience',
  termSuitability: 'term',
  transparency: 'transparency',
} as const;

export function LoanMatchingResults({
  result,
  productIds,
  compact = false,
}: {
  result: LoanMatchResult;
  productIds?: readonly string[];
  compact?: boolean;
}) {
  const { colors: c, locale, money } = useDesign();
  const t = (key: MatchingCopyKey) => matchingText(key, locale);
  const shown = (
    productIds
      ? result.ranked.filter((entry) => productIds.includes(entry.productId))
      : result.ranked
  ).slice(0, compact ? 3 : undefined);
  const signed = (value: number | null) =>
    value === null ? t('unknown') : (value < 0 ? '−' : '') + money(Math.abs(value));
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 5 }}>
        <Heading size={20}>{t('title')}</Heading>
        <Text small muted>
          {t('intro')}
        </Text>
        {result.outcome === 'no_suitable_loan' ? (
          <View style={{ flexDirection: 'row', gap: 7, alignItems: 'flex-start' }}>
            <CircleAlert size={17} color={c.warning} />
            <Text small style={{ flex: 1, color: c.warning }}>
              {t('noSuitable')}. {t('noSuitableHint')}
            </Text>
          </View>
        ) : null}
      </View>
      {shown.map((entry) => {
        const status =
          entry.suitability === 'suitable'
            ? 'suitable'
            : entry.suitability === 'unsuitable'
              ? 'unsuitable'
              : 'insufficient';
        return (
          <View
            key={entry.productId}
            style={{
              backgroundColor: c.surface,
              borderColor: c.border,
              borderWidth: 1,
              borderRadius: 18,
              padding: 15,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text bold>{locale === 'vi-VN' ? entry.name : entry.nameEn}</Text>
                <Text small muted>
                  {entry.institution} · {t(entry.classification)}
                </Text>
              </View>
              <Text
                bold
                style={{ color: entry.suitability === 'suitable' ? c.primary : c.warning }}
              >
                {numeric(entry.score, locale)}/100
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {entry.suitability === 'suitable' ? (
                <ShieldCheck size={16} color={c.primary} />
              ) : (
                <CircleAlert size={16} color={c.warning} />
              )}
              <Text
                bold
                small
                style={{ color: entry.suitability === 'suitable' ? c.primary : c.warning }}
              >
                {t(status)} ·{' '}
                {t(
                  entry.eligibility === 'meets_known_conditions'
                    ? 'eligibilityMet'
                    : entry.eligibility === 'does_not_meet_known_conditions'
                      ? 'eligibilityNotMet'
                      : 'eligibilityUnknown',
                )}
              </Text>
            </View>
            <View style={{ gap: 3 }}>
              {entry.conditions.map((condition) => (
                <Text small muted key={condition.key}>
                  {t(
                    condition.key === 'amount'
                      ? 'conditionAmount'
                      : condition.key === 'term'
                        ? 'conditionTerm'
                        : condition.key === 'purpose'
                          ? 'conditionPurpose'
                          : 'conditionEligibility',
                  )}
                  :{' '}
                  {t(
                    condition.status === 'met'
                      ? 'conditionMet'
                      : condition.status === 'not_met'
                        ? 'conditionNotMet'
                        : 'conditionUnknown',
                  )}
                </Text>
              ))}
            </View>
            <Text small muted>
              {entry.suitability === 'suitable' ? t('score') : t('provisionalScore')}
            </Text>
            <View style={{ gap: 4 }}>
              {(Object.keys(scoreKeys) as (keyof typeof scoreKeys)[]).map((key) => (
                <View
                  key={key}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 9 }}
                >
                  <Text small muted style={{ flex: 1 }}>
                    {t(scoreKeys[key])} · {result.weights[key]}%
                  </Text>
                  <Text small>{numeric(entry.componentScores[key], locale)}/100</Text>
                </View>
              ))}
            </View>
            {entry.repayment ? (
              <View style={{ gap: 4, borderTopWidth: 1, borderColor: c.border, paddingTop: 9 }}>
                <Text small>
                  {t('monthlyPeak')}: {money(entry.repayment.peakPayment)}
                </Text>
                <Text small>
                  {t('monthlyBudget')}: {signed(entry.repayment.monthlyBudget)}
                </Text>
                <Text small>
                  {t('totalKnown')}: {money(entry.repayment.totalKnown)}
                </Text>
                <Text small>
                  {t('totalWithFees')}:{' '}
                  {entry.repayment.totalWithFees === null
                    ? t('unknown')
                    : money(entry.repayment.totalWithFees)}
                </Text>
                <Text small>
                  {t('existingDebt')}: {signed(entry.repayment.existingDebt)}
                </Text>
                <Text small>
                  {t('baselineResidual')}: {signed(entry.repayment.baselineResidual)}
                </Text>
                <Text small>
                  {t('stressedResidual')} ({result.incomeStressPercent}%):{' '}
                  {signed(entry.repayment.stressedResidual)}
                </Text>
                <Text small muted>
                  {t('repaymentAssumption')}
                </Text>
              </View>
            ) : null}
            <View style={{ gap: 3 }}>
              {entry.reasons.slice(0, compact ? 4 : 8).map((reason) => (
                <Text key={reason} small muted>
                  • {t(reasonKeys[reason])}
                </Text>
              ))}
            </View>
            {entry.alternatives.length ? (
              <View style={{ gap: 3 }}>
                {entry.alternatives.map((option) => (
                  <Text key={option.kind} small>
                    {t(option.kind === 'lower_amount' ? 'alternativeLower' : 'alternativeLonger')}:{' '}
                    {money(option.amount)} · {numeric(option.months, locale)} {t('months')} ·{' '}
                    {t('monthlyPeak')} {money(option.peakPayment)}
                  </Text>
                ))}
                <Text small muted>
                  {t('alternativeHint')}
                </Text>
              </View>
            ) : null}
            {entry.sourceUrl ? (
              <Action
                label={t('source') + ': ' + entry.institution}
                onPress={() => void Linking.openURL(entry.sourceUrl!)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 40 }}
              >
                <Text small bold style={{ color: c.primary, flex: 1 }}>
                  {t('source')} ·{' '}
                  {entry.verifiedAt
                    ? t('verified') + ' ' + date(entry.verifiedAt + 'T00:00:00Z', locale)
                    : t('unknown')}
                </Text>
                <ArrowUpRight size={15} color={c.primary} />
              </Action>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
