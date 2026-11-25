import { useState } from 'react';
import { View } from 'react-native';
import { Text, Heading, Button, RiskIndicator, useDesign } from '@finora/ui';
import { date } from '@finora/i18n';
import type { Estimate, LoanInput } from '@finora/contracts';

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
  const principalShare =
    result.repayment > 0 ? Math.max(0, Math.min(1, input.principal / result.repayment)) : 0;
  const highest = Math.max(0, ...result.schedule.map((row) => row.payment));
  const ledger = [
    [t('principal'), money(input.principal)],
    [t('interest'), money(result.interest)],
    [t('repayment'), money(result.repayment)],
    [t('fee'), input.fee === null ? t('unknown') : money(input.fee)],
    [t('total'), result.total === null ? t('unknown') : money(result.total)],
  ];
  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 16 }} accessibilityLiveRegion="polite">
        <View style={{ backgroundColor: c.forest, borderRadius: 18, padding: 22, gap: 9 }}>
          <Text small bold style={{ color: c.onForestMuted, letterSpacing: 1.2 }}>
            {local('02 / KẾT QUẢ MÔ PHỎNG', '02 / SIMULATION RESULTS')}
          </Text>
          <Heading size={27} style={{ color: c.onForest }}>
            {t('breakdown')}
          </Heading>
          <Text small style={{ color: c.onForestMuted }}>
            {t('firstPayment')}
          </Text>
          <Text
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
        <View
          accessible={false}
          style={{
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            flexDirection: 'row',
            backgroundColor: c.chartInterest,
          }}
        >
          <View
            style={{
              width: (100 * principalShare + '%') as `${number}%`,
              height: 8,
              backgroundColor: c.chartPrincipal,
            }}
          />
        </View>
        <View style={{ gap: 0 }}>
          {ledger.map(([label, value], i) => (
            <View
              key={label}
              style={{
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderColor: c.border,
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }}>
                {i <= 1 ? (
                  <View
                    style={{
                      height: 7,
                      width: 7,
                      borderRadius: 2,
                      backgroundColor: i === 0 ? c.chartPrincipal : c.chartInterest,
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
      <View style={{ gap: 11 }}>
        <Heading size={25}>{t('schedule')}</Heading>
        <View style={{ borderTopWidth: 1, borderColor: c.border }}>
          {result.schedule.slice(0, limit).map((row) => (
            <View
              key={row.period}
              style={{ gap: 5, paddingVertical: 11, borderBottomWidth: 1, borderColor: c.border }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <Text bold>
                  {t('period')} {row.period} · {date(row.date, locale)}
                </Text>
                <Text bold style={{ fontVariant: ['tabular-nums'], textAlign: 'right' }}>
                  {money(row.payment)}
                </Text>
              </View>
              <Text small muted style={{ fontVariant: ['tabular-nums'] }}>
                {t('principal')} {money(row.principal)} · {t('interest')} {money(row.interest)} ·{' '}
                {t('balance')} {money(row.balance)}
              </Text>
            </View>
          ))}
        </View>
        {limit < result.schedule.length ? (
          <Button label={t('more')} variant="outline" onPress={() => more((n) => n + 12)} />
        ) : null}
      </View>
    </View>
  );
}
