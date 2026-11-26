import { useState } from 'react';
import { router } from 'expo-router';
import { Linking, View, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, BadgeCheck, Check, Columns2, SlidersHorizontal } from 'lucide-react-native';
import {
  Action,
  BottomSheet,
  Button,
  Choices,
  Dialog,
  EmptyState,
  Field,
  Heading,
  SearchInput,
  Text,
  useDesign,
} from '@finora/ui';
import { publicLoanSearchSchema, type PublicLoanProduct } from '@finora/contracts';
import { date, numeric, percent, type Key } from '@finora/i18n';
import { Data } from '../components/layout';
import { api } from '../services/client';
import { ComparisonGrid, MarketNotice, MarketPanel, ProductIcon } from './market-ui';
import { hasUnknownRelevantBounds, matchesPublishedLoan } from './market-filters';

const categoryKeys = {
  personal: 'personal',
  education: 'education',
  home: 'homeCat',
  auto: 'publicAuto',
} as const;

const categories = ['all', 'personal', 'education', 'home', 'auto'] as const;
const useTermsFormat = () => {
  const { t, locale, money } = useDesign();
  const local = <T,>(vi: T, en: T) => (locale === 'vi-VN' ? vi : en);
  function range(min: number | null, max: number | null, format: (n: number) => string): string {
    if (min !== null && max !== null) {
      return min === max ? format(min) : format(min) + ' – ' + format(max);
    }
    if (max !== null) return t('publishedUpTo') + ' ' + format(max);
    if (min !== null) return t('publishedMin') + ' ' + format(min);
    return t('unknown');
  }
  function rate(p: PublicLoanProduct) {
    if (!p.rate) return t('unknown');
    const r = p.rate;
    const suffix = ' ' + t(r.period === 'month' ? 'publicRateMonth' : 'publicRateYear');
    const pcts = (n: number) => percent(n, locale);
    if (r.min !== null || r.max !== null) return range(r.min, r.max, pcts) + suffix;
    return r.advertised === null
      ? t('unknown')
      : t('advertisedFrom') + ' ' + pcts(r.advertised) + suffix;
  }
  function fields(p: PublicLoanProduct): [Key, string][] {
    return [
      ['amount', range(p.amountMin, p.amountMax, money)],
      ['term', range(p.monthsMin, p.monthsMax, (n) => numeric(n, locale) + ' ' + t('months'))],
      ['publicRate', rate(p)],
      [
        'marketBasis',
        t(
          p.rate?.basis === 'declining'
            ? 'decliningBasis'
            : p.rate?.basis === 'flat'
              ? 'flatBasis'
              : 'unknown',
        ),
      ],
      ['method', p.method === null ? t('unknown') : t(p.method)],
      ['publicFees', p.fee === null ? t('unknown') : money(p.fee)],
      ['publicInsurance', local(p.insurance, p.insuranceEn) ?? t('unknown')],
      ['publicEarlyFee', local(p.earlyRepayment, p.earlyRepaymentEn) ?? t('unknown')],
    ];
  }
  return { local, rate, fields };
};

function PublicLoanTerms({
  product,
  onClose,
}: {
  product: PublicLoanProduct;
  onClose: () => void;
}) {
  const { colors: c, locale, t } = useDesign();
  const { fields, local } = useTermsFormat();
  const [linkError, setLinkError] = useState(false);
  const note = local(product.notes, product.notesEn);
  const feeDetails = local(product.feeDetails, product.feeDetailsEn);
  const requirements = local(product.eligibility, product.eligibilityEn);
  const purposes = local(product.purposes, product.purposesEn);
  const rows: [Key, string][] = [...fields(product)];
  if (product.maxLoanToValuePercent !== null)
    rows.push(['publicLoanToValue', percent(product.maxLoanToValuePercent, locale)]);
  rows.push(['category', purposes.join(' · ')]);
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <ProductIcon category={product.category} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text bold>{product.institution}</Text>
          <Text small muted>
            {t('publicCompleteness')} · {product.completeness.known}/{product.completeness.total}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {rows.map(([label, value]) => (
          <View
            key={label}
            style={{
              flexBasis: '45%',
              flexGrow: 1,
              minWidth: 0,
              gap: 3,
              borderRadius: 12,
              padding: 11,
              backgroundColor: c.elevated,
            }}
          >
            <Text muted small>
              {t(label)}
            </Text>
            <Text bold small style={{ fontVariant: ['tabular-nums'] }}>
              {value}
            </Text>
          </View>
        ))}
      </View>
      <Text small bold>
        {t('publicEligibility')}
      </Text>
      {requirements.length ? (
        requirements.map((line) => (
          <Text small key={line}>
            {line}
          </Text>
        ))
      ) : (
        <Text small muted>
          {t('unknown')}
        </Text>
      )}
      {feeDetails && (
        <Text small muted>
          {feeDetails}
        </Text>
      )}
      {note && (
        <Text small muted>
          {note}
        </Text>
      )}
      <Text small muted>
        {t('publicCatalogNotice')}
      </Text>
      <View style={{ alignSelf: 'flex-start' }}>
        <Button
          label={t('publicAskFin')}
          variant="soft"
          onPress={() => {
            onClose();
            router.navigate({
              pathname: '/intelligence',
              params: {
                draftPrompt: local(
                  `Tôi đang xem ${product.name} của ${product.institution}. Tôi cần xác nhận những điều khoản nào để tính chi phí? Đừng dùng lãi suất công bố như lãi suất đã được duyệt.`,
                  `I am looking at ${product.nameEn} from ${product.institution}. Which terms should I confirm before estimating costs? Do not use the advertised rate as an approved rate.`,
                ),
              },
            });
          }}
        />
      </View>
      <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 10, gap: 6 }}>
        {product.sources.map((source) => (
          <View key={source.url} style={{ gap: 1 }}>
            <Action
              label={t('publicSourceOpen') + ': ' + source.title}
              onPress={() => {
                setLinkError(false);
                void Linking.openURL(source.url).catch(() => setLinkError(true));
              }}
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <Text bold small style={{ color: c.primary }}>
                {source.title}
              </Text>
              <ArrowUpRight size={16} color={c.primary} />
            </Action>
            <Text small muted>
              {t('publicSourceVerified')} {date(source.verifiedAt + 'T00:00:00Z', locale)}
            </Text>
          </View>
        ))}
        {linkError ? (
          <Text small role="alert">
            {t('error')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function PublishedComparison({
  products,
}: {
  products: readonly [PublicLoanProduct, PublicLoanProduct];
}) {
  const { local, fields } = useTermsFormat();
  const { t, locale } = useDesign();
  const left = fields(products[0]);
  const right = fields(products[1]);
  const info = (p: PublicLoanProduct) => ({
    name: local(p.name, p.nameEn),
    institution: p.institution,
    note: t('publicCompleteness') + ' ' + p.completeness.known + '/' + p.completeness.total,
    footer: (
      <View style={{ gap: 3 }}>
        <Text small muted>
          {p.sources[0].title}
        </Text>
        <Text small muted>
          {t('publicSourceVerified')} {date(p.sources[0].verifiedAt + 'T00:00:00Z', locale)}
        </Text>
      </View>
    ),
  });
  return (
    <View style={{ gap: 12 }}>
      <MarketNotice>{t('publicCompareNotice')}</MarketNotice>
      <ComparisonGrid
        products={[info(products[0]), info(products[1])]}
        rows={left.map(([label, value], index) => ({
          label: t(label),
          values: [value, right[index][1]],
        }))}
      />
    </View>
  );
}

type Bounds = { amount: number | null; months: number | null };
const emptyBounds: Bounds = { amount: null, months: null };

export function PublicCatalogView() {
  const { colors: c, t, locale, money } = useDesign();
  const { local, rate, fields } = useTermsFormat();
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const wide = width >= 1280;
  const Overlay = desktop ? Dialog : BottomSheet;
  const q = useQuery({ queryKey: ['published-catalog'], queryFn: () => api.publicCatalog() });
  const [query, search] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('all');
  const [choice, setChoice] = useState<PublicLoanProduct | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [boundDraft, setBoundDraft] = useState({ amount: '', months: '' });
  const [bounds, setBounds] = useState<Bounds>(emptyBounds);
  const [filterError, setFilterError] = useState(false);
  const first = q.data?.find((p) => p.id === selection[0]);
  const second = q.data?.find((p) => p.id === selection[1]);
  const pair = first && second ? ([first, second] as const) : null;
  const filtersActive = bounds.amount !== null || bounds.months !== null;

  function openFilters() {
    setBoundDraft({
      amount: bounds.amount?.toString() ?? '',
      months: bounds.months?.toString() ?? '',
    });
    setFilterError(false);
    setFilterOpen(true);
  }
  function applyFilters() {
    const rawAmount = boundDraft.amount.trim().replace(/\s/g, '');
    const grouped = locale === 'vi-VN' ? /^\d{1,3}(?:\.\d{3})+$/ : /^\d{1,3}(?:,\d{3})+$/;
    const amount = grouped.test(rawAmount) ? rawAmount.replace(/[.,]/g, '') : rawAmount;
    const months = boundDraft.months.trim();
    const next = {
      amount: amount === '' ? undefined : /^\d{1,13}$/.test(amount) ? Number(amount) : NaN,
      months: months === '' ? undefined : /^\d{1,3}$/.test(months) ? Number(months) : NaN,
    };
    const parsed = publicLoanSearchSchema.safeParse(next);
    if (!parsed.success) {
      setFilterError(true);
      return;
    }
    setBounds({ amount: parsed.data.amount ?? null, months: parsed.data.months ?? null });
    setFilterOpen(false);
  }
  return (
    <>
      <MarketNotice verified title={local('Nguồn từ tổ chức cho vay', 'From lender sources')}>
        {t('publicCatalogNotice')}
      </MarketNotice>
      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: desktop ? 24 : 14 }}>
        <View style={{ width: desktop ? 226 : undefined, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SearchInput label={t('search')} value={query} onChange={search} />
            <Action
              label={t('filters')}
              onPress={openFilters}
              style={{
                width: 48,
                alignItems: 'center',
                borderWidth: 1,
                borderRadius: 13,
                borderColor: filtersActive ? c.primary : c.border,
                backgroundColor: filtersActive ? c.secondary : c.surface,
              }}
            >
              <SlidersHorizontal size={19} color={c.primary} />
            </Action>
          </View>
          <Choices
            value={category}
            onChange={setCategory}
            options={categories.map((key) => ({
              value: key,
              label: t(key === 'all' ? 'all' : categoryKeys[key]),
            }))}
          />
          {filtersActive ? (
            <View style={{ gap: 3 }}>
              <Text small bold style={{ color: c.primary }}>
                {[
                  bounds.amount === null ? '' : money(bounds.amount),
                  bounds.months === null ? '' : bounds.months + ' ' + t('months'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text small muted>
                {local(
                  'Giới hạn chưa công bố không xác nhận sản phẩm phù hợp.',
                  'Unpublished limits do not confirm a match.',
                )}
              </Text>
            </View>
          ) : null}
          {selection.length > 0 && (
            <MarketPanel style={{ gap: 6, padding: 11 }}>
              <Text bold small>
                {t('publicCompareChoose')} · {selection.length}/2
              </Text>
              {selection.map((id) => {
                const product = q.data?.find((p) => p.id === id);
                return product ? (
                  <Text key={id} small muted>
                    {local(product.name, product.nameEn)}
                  </Text>
                ) : null;
              })}
              <View style={{ flexDirection: 'row', gap: 9, flexWrap: 'wrap' }}>
                {pair && (
                  <Button
                    label={t('compare')}
                    variant="soft"
                    icon={<Columns2 size={16} color={c.primary} />}
                    onPress={() => setCompareOpen(true)}
                  />
                )}
                <Button label={t('compareClear')} variant="text" onPress={() => setSelection([])} />
              </View>
            </MarketPanel>
          )}
        </View>
        <View style={{ flex: desktop ? 1 : undefined, minWidth: 0 }}>
          <Data q={q}>
            {(records) => {
              const results = records.filter((p) =>
                matchesPublishedLoan(p, { query, category, ...bounds }),
              );
              return (
                <View style={{ gap: 10 }}>
                  <View accessibilityLiveRegion="polite">
                    <Text small muted>
                      {t('catalogMatches')} · {numeric(results.length, locale)}
                    </Text>
                  </View>
                  <View
                    style={{
                      gap: 10,
                      flexDirection: wide ? 'row' : 'column',
                      flexWrap: wide ? 'wrap' : 'nowrap',
                    }}
                  >
                    {results.map((p) => {
                      const name = local(p.name, p.nameEn);
                      const selected = selection.includes(p.id);
                      const terms = fields(p);
                      const amountText =
                        p.amountMin === null &&
                        p.amountMax === null &&
                        p.maxLoanToValuePercent !== null
                          ? t('publicLoanToValue') + ': ' + percent(p.maxLoanToValuePercent, locale)
                          : terms[0][1];
                      const unknownBounds = hasUnknownRelevantBounds(
                        p,
                        bounds.amount,
                        bounds.months,
                      );
                      return (
                        <MarketPanel
                          key={p.id}
                          style={{
                            borderColor: selected ? c.primary : c.border,
                            width: wide ? '49%' : undefined,
                          }}
                        >
                          <View style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start' }}>
                            <ProductIcon category={p.category} />
                            <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                              <Text small muted>
                                {p.institution} · {t(categoryKeys[p.category])}
                              </Text>
                              <Heading size={20}>{name}</Heading>
                            </View>
                          </View>
                          <View
                            style={{
                              backgroundColor: c.elevated,
                              borderRadius: 12,
                              padding: 11,
                              gap: 8,
                            }}
                          >
                            <View style={{ gap: 2 }}>
                              <Text
                                bold
                                style={{ color: c.primary, fontVariant: ['tabular-nums'] }}
                              >
                                {rate(p)}
                              </Text>
                              <Text small muted>
                                {t('publicRate')} · {terms[3][1]}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                                <Text small muted>
                                  {t('amount')}
                                </Text>
                                <Text small bold style={{ fontVariant: ['tabular-nums'] }}>
                                  {amountText}
                                </Text>
                              </View>
                              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                                <Text small muted>
                                  {t('term')}
                                </Text>
                                <Text small bold style={{ fontVariant: ['tabular-nums'] }}>
                                  {terms[1][1]}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <BadgeCheck size={15} color={c.success} />
                            <Text small muted>
                              {t('publicCompleteness')} · {p.completeness.known}/
                              {p.completeness.total}
                            </Text>
                          </View>
                          {unknownBounds ? (
                            <Text small style={{ color: c.warning }}>
                              {local(
                                'Cần xác nhận số tiền hoặc kỳ hạn với tổ chức cho vay.',
                                'Confirm the loan amount or term with the lender.',
                              )}
                            </Text>
                          ) : null}
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                            <Action
                              label={t('publicDetails') + ': ' + name}
                              onPress={() => setChoice(p)}
                              style={{
                                flexDirection: 'row',
                                gap: 6,
                                alignItems: 'center',
                                paddingHorizontal: 11,
                                borderRadius: 10,
                                backgroundColor: c.secondary,
                              }}
                            >
                              <Text bold small style={{ color: c.primary }}>
                                {t('publicDetails')}
                              </Text>
                              <ArrowUpRight size={15} color={c.primary} />
                            </Action>
                            <Action
                              label={t('compareChoice') + ': ' + name}
                              role="checkbox"
                              selected={selected}
                              disabled={selection.length >= 2 && !selected}
                              onPress={() =>
                                setSelection((ids) =>
                                  ids.includes(p.id)
                                    ? ids.filter((id) => id !== p.id)
                                    : ids.length < 2
                                      ? [...ids, p.id]
                                      : ids,
                                )
                              }
                              style={{
                                flexDirection: 'row',
                                gap: 5,
                                alignItems: 'center',
                                paddingHorizontal: 9,
                                backgroundColor: selected ? c.elevated : 'transparent',
                              }}
                            >
                              {selected ? <Check size={15} color={c.primary} /> : null}
                              <Text bold small style={{ color: c.primary }}>
                                {t(selected ? 'compareSelected' : 'compareChoice')}
                              </Text>
                            </Action>
                          </View>
                        </MarketPanel>
                      );
                    })}
                  </View>
                  {!results.length ? (
                    <EmptyState
                      title={t('noResults')}
                      action={
                        <Button
                          label={t('clear')}
                          onPress={() => {
                            search('');
                            setCategory('all');
                            setBounds(emptyBounds);
                          }}
                        />
                      }
                    />
                  ) : null}
                </View>
              );
            }}
          </Data>
        </View>
      </View>
      <Overlay title={t('filters')} visible={filterOpen} onClose={() => setFilterOpen(false)}>
        <Text muted small>
          {local(
            'Nhập số tiền và kỳ hạn muốn vay. Có thể để trống.',
            'Enter an amount and term, or leave either blank.',
          )}
        </Text>
        <Field
          label={t('amount')}
          value={boundDraft.amount}
          onChangeText={(amount) => {
            setBoundDraft((draft) => ({ ...draft, amount }));
            setFilterError(false);
          }}
          inputMode="numeric"
          keyboardType="number-pad"
          placeholder="50000000"
        />
        <Field
          label={t('term') + ' (' + t('months') + ')'}
          value={boundDraft.months}
          onChangeText={(months) => {
            setBoundDraft((draft) => ({ ...draft, months }));
            setFilterError(false);
          }}
          inputMode="numeric"
          keyboardType="number-pad"
          placeholder="24"
        />
        {filterError ? (
          <Text role="alert" small style={{ color: c.error }}>
            {t('invalidRange')}
          </Text>
        ) : null}
        <Button label={t('done')} onPress={applyFilters} />
        <Button
          label={t('clear')}
          variant="text"
          onPress={() => {
            setBounds(emptyBounds);
            setFilterOpen(false);
          }}
        />
      </Overlay>
      {choice && (
        <Overlay title={local(choice.name, choice.nameEn)} visible onClose={() => setChoice(null)}>
          <PublicLoanTerms key={choice.id} product={choice} onClose={() => setChoice(null)} />
        </Overlay>
      )}
      {pair && (
        <Overlay title={t('compare')} visible={compareOpen} onClose={() => setCompareOpen(false)}>
          <PublishedComparison products={pair} />
        </Overlay>
      )}
    </>
  );
}
