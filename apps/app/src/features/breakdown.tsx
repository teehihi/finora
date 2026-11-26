import { useState } from 'react';
import { View } from 'react-native';
import { Text, Heading, Button, RiskIndicator, useDesign } from '@finora/ui';
import { date } from '@finora/i18n';
import type { Estimate, LoanInput } from '@finora/contracts';
import { CalendarDays } from 'lucide-react-native';
import { MarketPanel } from './market-ui';

export function Breakdown({
  input,
  result,
  actions,
  budget,
}: {
  input: LoanInput;
  result: Estimate;
  actions?: React.ReactNode;
  budget?: number;
}) {
  const { t, money, colors: c, locale } = useDesign();
  const local = (vi: string, en: string) => (locale === 'vi-VN' ? vi : en);
  const [limit, more] = useState(6);
  const chartTotal = result.total ?? result.repayment;
  const costParts = [
    { color: c.chartPrincipal, value: input.principal },
    { color: c.chartInterest, value: result.interest },
    ...(input.fee === null ? [] : [{ color: c.chartFee, value: input.fee }]),
  ];
  const highest = Math.max(0, ...result.schedule.map((row) => row.payment));
  const ledger = [
    [t('principal'), money(input.principal)],
    [t('interest'), money(result.interest)],
    [t('repayment'), money(result.repayment)],
    [t('fee'), input.fee === null ? t('unknown') : money(input.fee)],
    [t('total'), result.total === null ? t('unknown') : money(result.total)],
  ];
  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 12 }} accessibilityLiveRegion="polite">
        <View style={{ backgroundColor: c.forest, borderRadius: 20, padding: 18, gap: 8 }}>
          <Heading size={21} style={{ color: c.onForest }}>
            {t('breakdown')}
          </Heading>
          <Text small style={{ color: c.onForestMuted }}>
            {t('firstPayment')}
          </Text>
          <Text
            bold
            style={{
              color: c.onForest,
              fontSize: 34,
              lineHeight: 43,
              fontVariant: ['tabular-nums'],
            }}
          >
            {money(result.firstPayment)}
          </Text>
          {highest > result.firstPayment + 1000 ? (
            <Text small style={{ color: c.onForestMuted }}>
              {local('Kỳ cao nhất theo lịch', 'Highest scheduled payment')}: {money(highest)}
            </Text>
          ) : null}
        </View>
        <MarketPanel>
          <Heading size={17}>{local('Cơ cấu chi phí', 'Cost breakdown')}</Heading>
          <View
            accessible={false}
            style={{
              height: 10,
              borderRadius: 5,
              overflow: 'hidden',
              flexDirection: 'row',
              gap: 2,
            }}
          >
            {costParts
              .filter((part) => part.value > 0)
              .map((part) => (
                <View
                  key={part.color}
                  style={{
                    flexGrow: chartTotal > 0 ? part.value / chartTotal : 0,
                    flexBasis: 0,
                    height: 10,
                    backgroundColor: part.color,
                  }}
                />
              ))}
          </View>
          <View style={{ gap: 5 }}>
            {ledger.map(([label, value], i) => (
              <View
                key={label}
                style={{
                  paddingVertical: i === 5 ? 9 : 4,
                  paddingHorizontal: i === 5 ? 8 : 0,
                  borderRadius: 8,
                  backgroundColor: i === 5 ? c.elevated : undefined,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }}>
                  {i < 2 || (i === 3 && input.fee !== null) ? (
                    <View
                      style={{
                        height: 8,
                        width: 8,
                        borderRadius: 3,
                        backgroundColor: costParts[i === 3 ? 2 : i].color,
                      }}
                    />
                  ) : null}
                  <Text small muted>
                    {label}
                  </Text>
                </View>
                <Text small bold style={{ fontVariant: ['tabular-nums'], textAlign: 'right' }}>
                  {value}
                </Text>
              </View>
            ))}
          </View>
        </MarketPanel>
        {input.fee === null ? <RiskIndicator>{t('unknownFee')}</RiskIndicator> : null}
        {budget !== undefined ? (
          <Text small muted>
            {local('So với hồ sơ: kỳ cao nhất', 'Against your profile: largest payment')}{' '}
            {money(highest)} · {local('khả năng trả thêm ước tính', 'estimated repayment room')}{' '}
            {money(budget)}.
          </Text>
        ) : null}
        {actions}
      </View>
      <MarketPanel style={{ gap: 11 }}>
        <Heading size={20}>{t('schedule')}</Heading>
        <View style={{ gap: 3 }}>
          {result.schedule.slice(0, limit).map((row) => (
            <View
              key={row.period}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 9,
                backgroundColor: row.period === 1 ? c.secondary : c.elevated,
                padding: 10,
                borderRadius: 10,
              }}
            >
              <CalendarDays size={16} color={c.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: 5,
                  }}
                >
                  <Text bold small>
                    {t('period')} {row.period} · {date(row.date, locale)}
                  </Text>
                  <Text bold small style={{ fontVariant: ['tabular-nums'] }}>
                    {money(row.payment)}
                  </Text>
                </View>
                <Text small muted style={{ fontVariant: ['tabular-nums'] }}>
                  {t('principal')} {money(row.principal)} · {t('interest')} {money(row.interest)} ·{' '}
                  {t('balance')} {money(row.balance)}
                </Text>
              </View>
            </View>
          ))}
        </View>
        {limit < result.schedule.length ? (
          <Button label={t('more')} variant="soft" onPress={() => more((n) => n + 12)} />
        ) : null}
      </MarketPanel>
    </View>
  );
}
