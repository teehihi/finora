import { useState } from 'react';
import { View } from 'react-native';
import { Text, Heading, Button, RiskIndicator, useDesign } from '@finora/ui';
import { date } from '@finora/i18n';
import type { Estimate, LoanInput } from '@finora/contracts';
import { CalendarDays, ChartPie } from 'lucide-react-native';
import { SignatureIcon } from '../components/signature';
import { PaymentRhythm, PlanningSnapshot } from './simulator-signature';
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
  const last = result.schedule.at(-1);
  const highest = Math.max(0, ...result.schedule.map((row) => row.payment));
  const largerFinalPayment =
    last && last.payment === highest && last.payment > result.firstPayment * 1.25;
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
        <PlanningSnapshot
          heading={t('breakdown')}
          label={t('firstPayment')}
          amount={result.firstPayment}
          children={
            highest > result.firstPayment || largerFinalPayment ? (
              <>
                {highest > result.firstPayment ? (
                  <Text small style={{ color: c.onForestMuted }}>
                    {local('Kỳ cao nhất theo lịch', 'Highest scheduled payment')}: {money(highest)}
                  </Text>
                ) : null}
                {largerFinalPayment ? (
                  <Text small style={{ color: c.onForestMuted }}>
                    {local(
                      'Kỳ cuối cao hơn kỳ đầu đáng kể. Hãy kiểm tra lịch trước khi dùng phương án này.',
                      'The last payment is substantially larger than the first. Review the schedule before using this estimate.',
                    )}
                  </Text>
                ) : null}
              </>
            ) : undefined
          }
        />
        <MarketPanel style={{ padding: 17, borderRadius: 22, gap: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <SignatureIcon icon={ChartPie} size={36} tone="amber" />
            <Heading size={19}>{local('Cơ cấu chi phí', 'Cost breakdown')}</Heading>
          </View>
          <View
            accessible={false}
            style={{
              height: 12,
              borderRadius: 6,
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
                    height: 12,
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
                  paddingVertical: i === ledger.length - 1 ? 10 : 5,
                  paddingHorizontal: i === ledger.length - 1 ? 8 : 0,
                  borderRadius: 8,
                  backgroundColor: i === ledger.length - 1 ? c.elevated : undefined,
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
                <Text
                  small
                  bold
                  style={{
                    fontVariant: ['tabular-nums'],
                    textAlign: 'right',
                    ...(i === ledger.length - 1 ? { color: c.primary, fontSize: 15 } : {}),
                  }}
                >
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
      <MarketPanel style={{ gap: 13, padding: 17, borderRadius: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <SignatureIcon icon={CalendarDays} size={36} tone="blue" />
          <Heading size={20}>{t('schedule')}</Heading>
        </View>
        <PaymentRhythm rows={result.schedule} />
        <View>
          {result.schedule.slice(0, limit).map((row) => (
            <View
              key={row.period}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 9,
                backgroundColor: row.period === 1 ? c.secondary : undefined,
                padding: 10,
                borderRadius: row.period === 1 ? 12 : 0,
                borderBottomWidth: row.period === 1 ? 0 : 1,
                borderBottomColor: c.border,
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
