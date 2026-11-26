import { useState } from 'react';
import { View } from 'react-native';
import { ArrowDown, ArrowUpRight, Info } from 'lucide-react-native';
import { Action, Heading, Text, useDesign } from '@finora/ui';
import type { Profile } from '@finora/contracts';
import type { Readiness } from '@finora/api-client';
import { SignatureIcon } from '../components/signature';

export function ProfileInsights({
  profile,
  readiness,
}: {
  profile: Profile;
  readiness: Readiness | null;
}) {
  const { money, colors: c, locale } = useDesign();
  const [expanded, expand] = useState(false);
  const tr = (vi: string, en: string) => (locale === 'vi-VN' ? vi : en);
  const remaining = profile.income - profile.expenses - profile.debt;
  const percent = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(n / 100);
  const explain = tr('Xem cách tính', 'See how it is calculated');
  return (
    <View style={{ backgroundColor: c.elevated, borderRadius: 19, gap: 11, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <SignatureIcon icon={ArrowUpRight} tone={remaining < 0 ? 'amber' : 'emerald'} size={30} />
        <Text small bold style={{ color: c.primary }}>
          {tr('Bức tranh hằng tháng', 'Monthly picture')}
        </Text>
      </View>
      <View style={{ gap: 5 }}>
        <Text small muted>
          {remaining < 0
            ? tr('Tiền còn thiếu sau chi phí và nợ', 'Shortfall after expenses and debt')
            : tr('Tiền còn lại sau chi phí và nợ', 'Cash left after expenses and debt')}
        </Text>
        <Heading
          size={Math.abs(remaining) >= 100_000_000 ? 28 : 34}
          style={{
            color: remaining < 0 ? c.actionAmber : c.foreground,
            fontVariant: ['tabular-nums'],
          }}
        >
          {money(Math.abs(remaining))}
        </Heading>
      </View>
      {readiness ? (
        <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 7, gap: 7 }}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 5,
              justifyContent: 'space-between',
            }}
          >
            <Text small muted>
              {tr('Mức trả thêm tham khảo', 'Estimated room for new repayments')}
            </Text>
            <Text small bold>
              {money(readiness.monthlyBudget)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 5,
              justifyContent: 'space-between',
            }}
          >
            <Text small muted>
              {tr('Tiền trả nợ hiện tại / thu nhập', 'Existing repayments / income')}
            </Text>
            <Text small bold>
              {percent(readiness.debtToIncome)}
            </Text>
          </View>
        </View>
      ) : null}
      <Action
        label={explain}
        onPress={() => expand(!expanded)}
        selected={expanded}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6 }}
      >
        <Info size={15} color={c.primary} />
        <Text small bold style={{ color: c.primary }}>
          {explain}
        </Text>
        <ArrowDown
          size={14}
          color={c.primary}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </Action>
      {expanded ? (
        <>
          <Text small muted>
            {tr(
              'Tiền còn lại = thu nhập − chi phí thiết yếu − tiền đang trả nợ.',
              'Cash left = income − essential expenses − existing debt repayments.',
            )}
          </Text>
          {readiness ? (
            <Text small muted>
              {tr(
                `Mức trả thêm không vượt quá tiền còn lại, và tổng tiền trả nợ theo giả định không vượt ${percent(readiness.target * 100)} thu nhập. Nếu không còn dư, mức trả thêm là 0 ₫. Đây không phải điểm tín dụng hay quyết định duyệt vay.`,
                `New repayments are capped by cash left and a planning limit of ${percent(readiness.target * 100)} of income for total debt payments. The estimate is zero when there is no room. This is not a credit score or lending decision.`,
              )}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
