import { View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ArrowUpRight, BookOpen, House, Wallet } from 'lucide-react-native';
import { Action, Heading, SourceAttribution, Text, useDesign } from '@finora/ui';
import { percent } from '@finora/i18n';
import type { Product } from '@finora/contracts';

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
    <View style={{ gap: 12 }}>
      <Heading size={25}>{t('productTerms')}</Heading>
      <View>
        {rows.map(({ label, value }) => (
          <View
            key={label}
            style={{
              paddingVertical: 10,
              borderTopWidth: 1,
              borderColor: c.border,
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
    </View>
  );
}

export function LoanProductCard({
  p,
  selected,
  toggleComparison,
  comparisonDisabled = false,
}: {
  p: Product;
  selected?: boolean;
  toggleComparison?: () => void;
  comparisonDisabled?: boolean;
}) {
  const { t, colors: c, locale, money } = useDesign();
  const { width } = useWindowDimensions();
  const horizontal = width >= 1024;
  const productName = locale === 'vi-VN' ? p.name : p.nameEn;
  const Icon = p.category === 'home' ? House : p.category === 'education' ? BookOpen : Wallet;
  return (
    <View style={{ gap: 15, paddingVertical: 19, borderTopWidth: 1, borderColor: c.border }}>
      <View style={{ flexDirection: horizontal ? 'row' : 'column', gap: horizontal ? 20 : 10 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
            <Icon size={16} color={c.primary} />
            <Text small muted>
              {p.institution} · {t(p.category === 'home' ? 'homeCat' : p.category)}
            </Text>
          </View>
          <Heading size={24}>{productName}</Heading>
        </View>
        <View style={{ alignItems: horizontal ? 'flex-end' : 'flex-start', gap: 0 }}>
          <Text
            bold
            style={{
              color: c.primary,
              fontSize: 24,
              lineHeight: 30,
              fontVariant: ['tabular-nums'],
            }}
          >
            {rateRange(p, locale)}
          </Text>
          <Text small muted>
            {t('yearRate')}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Text small bold style={{ fontVariant: ['tabular-nums'] }}>
          {money(p.amountMin)} – {money(p.amountMax)}
        </Text>
        <Text small muted>
          · {p.monthsMin}–{p.monthsMax} {t('months')}
        </Text>
      </View>
      <SourceAttribution source={p.source} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <Action
          label={t('openPlan') + ': ' + productName}
          onPress={() => router.push('/simulate/' + p.id)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
          }}
        >
          <Text bold small style={{ color: c.primary }}>
            {t('openPlan')}
          </Text>
          <ArrowUpRight size={16} color={c.primary} />
        </Action>
        {toggleComparison ? (
          <Action
            label={t('compareChoice') + ': ' + productName}
            role="checkbox"
            selected={selected}
            disabled={comparisonDisabled}
            onPress={toggleComparison}
            style={{
              paddingHorizontal: 10,
              backgroundColor: selected ? c.secondary : 'transparent',
            }}
          >
            <Text small bold style={{ color: c.primary }}>
              {t(selected ? 'compareSelected' : 'compareChoice')}
            </Text>
          </Action>
        ) : null}
      </View>
    </View>
  );
}

export function ProductComparison({ products }: { products: readonly [Product, Product] }) {
  const { colors: c, locale } = useDesign();
  const left = useTerms(products[0]);
  const right = useTerms(products[1]);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
        {products.map((p) => (
          <View key={p.id} style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text bold>{locale === 'vi-VN' ? p.name : p.nameEn}</Text>
            <Text small muted>
              {p.institution}
            </Text>
          </View>
        ))}
      </View>
      {left.map(({ label, value }, index) => (
        <View
          key={label}
          style={{ gap: 3, borderTopWidth: 1, borderColor: c.border, paddingTop: 8 }}
        >
          <Text small muted>
            {label}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Text bold small style={{ flex: 1, fontVariant: ['tabular-nums'] }}>
              {value}
            </Text>
            <Text bold small style={{ flex: 1, fontVariant: ['tabular-nums'] }}>
              {right[index].value}
            </Text>
          </View>
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {products.map((p) => (
          <View key={p.id} style={{ flex: 1, minWidth: 0 }}>
            <SourceAttribution source={p.source} />
          </View>
        ))}
      </View>
    </View>
  );
}
