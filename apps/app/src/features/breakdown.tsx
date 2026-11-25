import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import {
  Text,
  Heading,
  Card,
  Button,
  FinancialMetric,
  RiskIndicator,
  Divider,
  useDesign,
} from '@finora/ui';
import { date } from '@finora/i18n';
import type { Estimate, LoanInput } from '@finora/contracts';
export function Breakdown({
  input,
  result,
  actions,
}: {
  input: LoanInput;
  result: Estimate;
  actions?: React.ReactNode;
}) {
  const { t, money, colors: c, locale } = useDesign();
  const [limit, more] = useState(6);
  const width = (100 * input.principal) / result.repayment;
  return (
    <View style={{ gap: 16 }}>
      <Card>
        <Heading size={25}>{t('breakdown')}</Heading>
        <FinancialMetric label={t('firstPayment')} value={money(result.firstPayment)} />
        <Svg
          width="100%"
          height={12}
          viewBox="0 0 100 12"
          preserveAspectRatio="none"
          accessible={false}
        >
          <Rect width={100} height={12} fill={c.chartInterest} />
          <Rect width={width} height={12} fill={c.chartPrincipal} />
        </Svg>
        {[
          [t('principal'), money(input.principal)],
          [t('interest'), money(result.interest)],
          [t('repayment'), money(result.repayment)],
          [t('fee'), input.fee === null ? t('unknown') : money(input.fee)],
          [t('total'), result.total === null ? t('unknown') : money(result.total)],
        ].map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text small muted>
              {k}
            </Text>
            <Text small bold style={{ fontVariant: ['tabular-nums'] }}>
              {v}
            </Text>
          </View>
        ))}
        {input.fee === null ? <RiskIndicator>{t('unknownFee')}</RiskIndicator> : null}
        {actions}
      </Card>
      <Card>
        <Heading size={24}>{t('schedule')}</Heading>
        {result.schedule.slice(0, limit).map((p) => (
          <View key={p.period} style={{ gap: 6 }}>
            <Divider />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <Text bold>
                {t('period')} {p.period} · {date(p.date, locale)}
              </Text>
              <Text bold>{money(p.payment)}</Text>
            </View>
            <Text small muted>
              {t('principal')} {money(p.principal)} · {t('interest')} {money(p.interest)} ·{' '}
              {t('balance')} {money(p.balance)}
            </Text>
          </View>
        ))}
        {limit < result.schedule.length ? (
          <Button label={t('more')} variant="outline" onPress={() => more((n) => n + 12)} />
        ) : null}
      </Card>
    </View>
  );
}
