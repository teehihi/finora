import type { ReactNode } from 'react';
import { View } from 'react-native';
import { CalendarClock, ChartNoAxesColumnIncreasing, Wallet } from 'lucide-react-native';
import type { Estimate } from '@finora/contracts';
import { tokens } from '@finora/design-tokens';
import { Heading, Text, useDesign } from '@finora/ui';
import { SignatureIcon, SignatureSweep } from '../components/signature';

export function PlanningSnapshot({
  heading,
  label,
  amount,
  children,
  live = false,
}: {
  heading: string;
  label: string;
  amount?: number;
  children?: ReactNode;
  live?: boolean;
}) {
  const { colors: c, locale, money } = useDesign();
  return (
    <View
      style={{
        backgroundColor: c.forest,
        borderRadius: tokens.signature.radius,
        overflow: 'hidden',
        padding: tokens.signature.inset,
        gap: 14,
      }}
      accessibilityLiveRegion={live ? 'polite' : undefined}
    >
      <SignatureSweep name={live ? 'simulator-preview' : 'simulator-result'} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <SignatureIcon icon={live ? Wallet : CalendarClock} tone="lime" size={40} />
        <View style={{ flex: 1, minWidth: 0, gap: 0 }}>
          <Text
            small
            bold
            style={{ color: c.signatureLime, letterSpacing: 1.25, fontSize: 11, lineHeight: 16 }}
          >
            {locale === 'vi-VN' ? 'KẾ HOẠCH TRẢ NỢ' : 'REPAYMENT PLAN'}
          </Text>
          <Heading size={18} style={{ color: c.onForest }}>
            {heading}
          </Heading>
        </View>
      </View>
      {amount !== undefined ? (
        <View style={{ gap: 1 }}>
          <Text small style={{ color: c.onForestMuted }}>
            {label}
          </Text>
          <Text
            bold
            style={{
              color: c.onForest,
              fontSize: amount >= 1_000_000_000 ? 32 : 39,
              lineHeight: amount >= 1_000_000_000 ? 38 : 45,
              letterSpacing: -1.15,
              fontVariant: ['tabular-nums'],
            }}
          >
            {money(amount)}
          </Text>
        </View>
      ) : null}
      {children ? (
        <View style={{ paddingTop: 11, borderTopWidth: 1, borderColor: c.signatureEdge, gap: 5 }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

// At most twelve equal-length buckets; maxima preserve a late larger payment.
export function PaymentRhythm({ rows }: { rows: Estimate['schedule'] }) {
  const { colors: c, locale, money } = useDesign();
  if (rows.length < 2) return null;
  const chunk = Math.ceil(rows.length / 12);
  const bins: number[] = [];
  for (let from = 0; from < rows.length; from += chunk) {
    bins.push(Math.max(...rows.slice(from, from + chunk).map((row) => row.payment)));
  }
  const maximum = Math.max(...bins, 1);
  return (
    <View
      style={{ backgroundColor: c.elevated, borderRadius: 16, padding: 14, gap: 7 }}
      accessible={false}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <ChartNoAxesColumnIncreasing size={16} color={c.primary} />
        <Text small bold>
          {locale === 'vi-VN' ? 'Nhịp trả nợ' : 'Payment pattern'}
        </Text>
      </View>
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{
          height: 44,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 4,
          borderBottomWidth: 1,
          borderColor: c.borderStrong,
          paddingBottom: 3,
        }}
      >
        {bins.map((value, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height: (value / maximum) * 40,
              borderRadius: 4,
              backgroundColor: value === maximum ? c.primary : c.chartPrincipal,
              opacity: value === maximum ? 1 : 0.72,
            }}
          />
        ))}
      </View>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}
      >
        <Text small muted>
          {locale === 'vi-VN' ? 'Kỳ đầu' : 'First payment'} · {money(rows[0].payment)}
        </Text>
        <Text small muted>
          {locale === 'vi-VN' ? 'Kỳ cuối' : 'Final payment'} ·{' '}
          {money(rows[rows.length - 1].payment)}
        </Text>
      </View>
      {chunk > 1 ? (
        <Text small muted>
          {locale === 'vi-VN'
            ? 'Mỗi cột là mức trả cao nhất trong nhóm kỳ, không gồm phí một lần.'
            : 'Each bar shows the largest payment in its group, excluding one-time fees.'}
        </Text>
      ) : (
        <Text small muted>
          {locale === 'vi-VN' ? 'Chưa gồm phí một lần.' : 'Excludes one-time fees.'}
        </Text>
      )}
    </View>
  );
}
