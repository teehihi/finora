import { View } from 'react-native';
import { router } from 'expo-router';
import { ArrowUpRight, Check } from 'lucide-react-native';
import { Action, Heading, SourceAttribution, Text, useDesign } from '@finora/ui';
import { percent } from '@finora/i18n';
import type { Product } from '@finora/contracts';
import { ComparisonGrid, MarketNotice, MarketPanel, ProductIcon } from './market-ui';

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
    <MarketPanel>
      <Heading size={20}>{t('productTerms')}</Heading>
      <View style={{ gap: 3 }}>
        {rows.map(({ label, value }) => (
          <View
            key={label}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 8,
              borderRadius: 8,
              backgroundColor: c.elevated,
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
      style={{ borderColor: selected ? c.primary : c.border, width: wide ? '49%' : undefined }}
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
      <View style={{ backgroundColor: c.elevated, borderRadius: 12, padding: 11, gap: 7 }}>
        <View style={{ gap: 2 }}>
          <Text bold style={{ color: c.primary, fontVariant: ['tabular-nums'] }}>
            {rateRange(p, locale)}
          </Text>
          <Text small muted>
            {t('yearRate')} · {t(p.method)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1.8, minWidth: 0 }}>
            <Text small muted>
              {t('amount')}
            </Text>
            <Text small bold style={{ fontVariant: ['tabular-nums'] }}>
              {money(p.amountMin)} – {money(p.amountMax)}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text small muted>
              {t('term')}
            </Text>
            <Text small bold style={{ fontVariant: ['tabular-nums'] }}>
              {p.monthsMin}–{p.monthsMax} {t('months')}
            </Text>
          </View>
        </View>
      </View>
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
            borderRadius: 10,
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
              paddingHorizontal: 9,
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

export function ProductComparison({ products }: { products: readonly [Product, Product] }) {
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
