import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ArrowUpRight, Check, ClipboardList } from 'lucide-react-native';
import { Action, Button, Field, Heading, SourceAttribution, Text, useDesign } from '@finora/ui';
import { date, percent } from '@finora/i18n';
import { compare } from '@finora/financial-engine';
import type { Product } from '@finora/contracts';
import {
  ComparisonGrid,
  MarketFacts,
  MarketNotice,
  MarketPanel,
  MarketRate,
  ProductIcon,
} from './market-ui';
import { SignatureIcon } from '../components/signature';
import {
  clampWithin,
  commonScenarioBounds,
  matchedInputs,
  nextDue,
  normalizeIntegerInput,
  simulatorDefaults,
} from './simulation-model';

type Term = { label: string; value: string };

function useTerms(product: Product): Term[] {
  const { t, locale, money } = useDesign();
  return [
    { label: t('yearRate'), value: rateRange(product, locale) },
    { label: t('amount'), value: money(product.amountMin) + ' – ' + money(product.amountMax) },
    { label: t('term'), value: product.monthsMin + '–' + product.monthsMax + ' ' + t('months') },
    { label: t('method'), value: t(product.method) },
    { label: t('fee'), value: product.fee === null ? t('unknown') : money(product.fee) },
  ];
}

function rateRange(p: Product, locale: ReturnType<typeof useDesign>['locale']) {
  return p.rateMin === p.rateMax
    ? percent(p.rateMin, locale)
    : percent(p.rateMin, locale) + ' – ' + percent(p.rateMax, locale);
}

export function LoanProductTerms({ p }: { p: Product }) {
  const { t, colors: c } = useDesign();
  const rows = useTerms(p);
  return (
    <MarketPanel style={{ borderRadius: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <SignatureIcon icon={ClipboardList} size={37} tone="blue" />
        <Heading size={20}>{t('productTerms')}</Heading>
      </View>
      <View>
        {rows.map(({ label, value }) => (
          <View
            key={label}
            style={{
              paddingVertical: 9,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: 12,
            }}
          >
            <Text small muted style={{ flex: 1 }}>
              {label}
            </Text>
            <Text
              small
              bold
              style={{ flex: 1.5, textAlign: 'right', fontVariant: ['tabular-nums'] }}
            >
              {value}
            </Text>
          </View>
        ))}
      </View>
      <SourceAttribution source={p.source} />
      <Text small muted>
        {t('noLoanApproval')}
      </Text>
    </MarketPanel>
  );
}

export function LoanProductCard({
  p,
  wide = false,
  selected,
  toggleComparison,
  comparisonDisabled = false,
}: {
  p: Product;
  wide?: boolean;
  selected?: boolean;
  toggleComparison?: () => void;
  comparisonDisabled?: boolean;
}) {
  const { t, colors: c, locale, money } = useDesign();
  const productName = locale === 'vi-VN' ? p.name : p.nameEn;
  return (
    <MarketPanel
      style={{
        borderColor: selected ? c.primary : c.border,
        width: wide ? '49%' : undefined,
        borderRadius: 22,
        padding: 16,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start' }}>
        <ProductIcon category={p.category} />
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Text small muted>
            {p.institution} · {t(p.category === 'home' ? 'homeCat' : p.category)}
          </Text>
          <Heading size={20}>{productName}</Heading>
        </View>
      </View>
      <MarketRate label={t('yearRate')} value={rateRange(p, locale)} detail={t(p.method)} />
      <MarketFacts
        facts={[
          [t('amount'), money(p.amountMin) + ' – ' + money(p.amountMax)],
          [t('term'), p.monthsMin + '–' + p.monthsMax + ' ' + t('months')],
        ]}
      />
      <SourceAttribution source={p.source} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        <Action
          label={t('openPlan') + ': ' + productName}
          onPress={() => router.push('/simulate/' + p.id)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingHorizontal: 11,
            borderRadius: 12,
            backgroundColor: c.secondary,
          }}
        >
          <Text bold small style={{ color: c.primary }}>
            {t('openPlan')}
          </Text>
          <ArrowUpRight size={15} color={c.primary} />
        </Action>
        {toggleComparison ? (
          <Action
            label={t('compareChoice') + ': ' + productName}
            role="checkbox"
            selected={selected}
            disabled={comparisonDisabled}
            onPress={toggleComparison}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: selected ? c.primary : c.border,
              backgroundColor: selected ? c.elevated : 'transparent',
            }}
          >
            {selected ? <Check size={15} color={c.primary} /> : null}
            <Text small bold style={{ color: c.primary }}>
              {t(selected ? 'compareSelected' : 'compareChoice')}
            </Text>
          </Action>
        ) : null}
      </View>
    </MarketPanel>
  );
}

export function ProductComparison({
  products,
  onNavigate,
}: {
  products: readonly [Product, Product];
  onNavigate: () => void;
}) {
  const { locale, t } = useDesign();
  const left = useTerms(products[0]);
  const right = useTerms(products[1]);
  const info = (p: Product) => ({
    name: locale === 'vi-VN' ? p.name : p.nameEn,
    institution: p.institution,
    footer: <SourceAttribution source={p.source} />,
  });
  return (
    <View style={{ gap: 12 }}>
      <MarketNotice>{t('catalogDisclosure')}</MarketNotice>
      <NormalizedComparison products={products} onNavigate={onNavigate} />
      <ComparisonGrid
        products={[info(products[0]), info(products[1])]}
        rows={left.map(({ label, value }, index) => ({
          label,
          values: [value, right[index].value],
        }))}
      />
    </View>
  );
}

function NormalizedComparison({
  products,
  onNavigate,
}: {
  products: readonly [Product, Product];
  onNavigate: () => void;
}) {
  const { locale, t, money, colors: c } = useDesign();
  const local = (vi: string, en: string) => (locale === 'vi-VN' ? vi : en);
  const bounds = commonScenarioBounds(products);
  const [values, change] = useState(() => ({
    amount: bounds
      ? String(clampWithin(simulatorDefaults.amount, bounds.amountMin, bounds.amountMax))
      : '',
    months: bounds
      ? String(clampWithin(simulatorDefaults.months, bounds.monthsMin, bounds.monthsMax))
      : '',
    firstDue: nextDue(),
  }));
  const inputs = useMemo(() => matchedInputs(products, values), [products, values]);
  const result = useMemo(() => (inputs ? compare(...inputs) : null), [inputs]);
  const peak = (payments: { payment: number }[]) => Math.max(...payments.map((p) => p.payment));
  const unavailable = local('Chưa thể tính', 'Cannot calculate yet');
  const comparisonProduct = (product: Product, label: 'A' | 'B') => ({
    name: local(product.name, product.nameEn),
    institution: percent(product.rateMin, locale) + ' · ' + t(product.method),
    footer: (
      <Button
        label={local('Mô phỏng', 'Simulate') + ' ' + label}
        variant="outline"
        onPress={() => {
          onNavigate();
          router.push({
            pathname: '/simulate/[id]',
            params: {
              id: product.id,
              amount: values.amount,
              term: values.months,
              due: values.firstDue,
            },
          });
        }}
      />
    ),
  });

  return (
    <MarketPanel style={{ borderRadius: 20, padding: 14 }}>
      <Heading size={19}>{local('Cùng số tiền, cùng kỳ hạn', 'Same amount, same term')}</Heading>
      {!bounds ? (
        <Text small muted>
          {local(
            'Hai sản phẩm không có khoảng số tiền và kỳ hạn chung. Chỉ đối chiếu điều kiện bên dưới.',
            'These products have no common amount and term. Compare their terms below instead.',
          )}
        </Text>
      ) : (
        <>
          <Text small muted>
            {local(
              'Dùng lãi suất thấp nhất trong từng mẫu và ngày trả đầu giống nhau. Đây không phải báo giá.',
              'Uses each sample’s lowest rate and the same first due date. Not a quote.',
            )}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <View style={{ flex: 1.6, minWidth: 136 }}>
              <Field
                label={t('amount')}
                value={values.amount}
                inputMode="numeric"
                keyboardType="number-pad"
                onChangeText={(value) =>
                  change((v) => ({ ...v, amount: normalizeIntegerInput(value, locale) }))
                }
                hint={money(bounds.amountMin) + ' – ' + money(bounds.amountMax)}
              />
            </View>
            <View style={{ flex: 1, minWidth: 106 }}>
              <Field
                label={t('term')}
                value={values.months}
                inputMode="numeric"
                keyboardType="number-pad"
                onChangeText={(value) => change((v) => ({ ...v, months: value }))}
                hint={bounds.monthsMin + '–' + bounds.monthsMax + ' ' + t('months')}
              />
            </View>
          </View>
          <Text small muted>
            {local('Ngày trả đầu dùng chung', 'Shared first due date')}:{' '}
            {date(values.firstDue, locale)}
          </Text>
          {result && inputs ? (
            <>
              {result.totalDifference === null ? (
                <Text small muted>
                  {local(
                    'Ít nhất một bên chưa rõ phí. Không xếp hạng tổng chi phí.',
                    'Fees are unknown for at least one side. Total cost is not ranked.',
                  )}
                </Text>
              ) : null}
              <ComparisonGrid
                products={[
                  comparisonProduct(products[0], 'A'),
                  comparisonProduct(products[1], 'B'),
                ]}
                rows={[
                  {
                    label: t('firstPayment'),
                    values: [money(result.left.firstPayment), money(result.right.firstPayment)],
                  },
                  {
                    label: local('Kỳ cao nhất theo lịch', 'Highest scheduled payment'),
                    values: [money(peak(result.left.schedule)), money(peak(result.right.schedule))],
                  },
                  {
                    label: t('repayment'),
                    values: [money(result.left.repayment), money(result.right.repayment)],
                  },
                  {
                    label: t('total'),
                    values: [
                      result.left.total === null ? unavailable : money(result.left.total),
                      result.right.total === null ? unavailable : money(result.right.total),
                    ],
                  },
                ]}
              />
            </>
          ) : (
            <Text small role="alert" style={{ color: c.error }}>
              {local(
                'Nhập số tiền và kỳ hạn trong khoảng chung để tính.',
                'Enter an amount and term within the shared limits to calculate.',
              )}
            </Text>
          )}
        </>
      )}
    </MarketPanel>
  );
}
