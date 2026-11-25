import { useState } from 'react';
import { router } from 'expo-router';
import { Linking, View, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, BookOpen, Columns2 } from 'lucide-react-native';
import {
  Action,
  BottomSheet,
  Button,
  Choices,
  Dialog,
  EmptyState,
  Heading,
  SearchInput,
  Text,
  useDesign,
} from '@finora/ui';
import { normalizeLoanSearch, type PublicLoanProduct } from '@finora/contracts';
import { date, numeric, percent, type Key } from '@finora/i18n';
import { Data } from '../components/layout';
import { api } from '../services/client';

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
    <View style={{ gap: 12 }}>
      <Text bold>{product.institution}</Text>
      <Text small muted>
        {t('publicCompleteness')} · {product.completeness.known}/{product.completeness.total}
      </Text>
      <View style={{ gap: 9 }}>
        {rows.map(([label, value]) => (
          <View
            key={label}
            style={{ gap: 3, borderTopWidth: 1, borderColor: c.border, paddingTop: 8 }}
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
  const { colors: c, t, locale } = useDesign();
  const left = fields(products[0]);
  const right = fields(products[1]);
  return (
    <View style={{ gap: 10 }}>
      <Text small muted>
        {t('publicCompareNotice')}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          borderBottomWidth: 1,
          borderColor: c.border,
          paddingBottom: 8,
        }}
      >
        {products.map((p) => (
          <View key={p.id} style={{ flex: 1, minWidth: 0 }}>
            <Text bold small>
              {local(p.name, p.nameEn)}
            </Text>
            <Text small muted>
              {p.institution}
            </Text>
            <Text small muted>
              {t('publicCompleteness')} {p.completeness.known}/{p.completeness.total}
            </Text>
          </View>
        ))}
      </View>
      {left.map(([label, value], index) => (
        <View
          key={label}
          style={{ gap: 3, borderBottomWidth: 1, borderColor: c.border, paddingBottom: 8 }}
        >
          <Text small muted>
            {t(label)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Text bold small style={{ flex: 1, fontVariant: ['tabular-nums'] }}>
              {value}
            </Text>
            <Text bold small style={{ flex: 1, fontVariant: ['tabular-nums'] }}>
              {right[index][1]}
            </Text>
          </View>
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {products.map((p) => (
          <View key={p.id} style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text small muted>
              {p.sources[0].title}
            </Text>
            <Text small muted>
              {t('publicSourceVerified')} {date(p.sources[0].verifiedAt + 'T00:00:00Z', locale)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function PublicCatalogView() {
  const { colors: c, t, locale } = useDesign();
  const { local, rate, fields } = useTermsFormat();
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const Overlay = desktop ? Dialog : BottomSheet;
  const q = useQuery({ queryKey: ['published-catalog'], queryFn: () => api.publicCatalog() });
  const [query, search] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('all');
  const [choice, setChoice] = useState<PublicLoanProduct | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const first = q.data?.find((p) => p.id === selection[0]);
  const second = q.data?.find((p) => p.id === selection[1]);
  const pair = first && second ? ([first, second] as const) : null;

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          padding: 14,
          borderRadius: 12,
          backgroundColor: c.secondary,
        }}
      >
        <BookOpen size={17} color={c.primary} style={{ marginTop: 2 }} />
        <Text small style={{ flex: 1 }}>
          {t('publicCatalogNotice')}
        </Text>
      </View>
      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: desktop ? 32 : 16 }}>
        <View style={{ width: desktop ? 218 : undefined, gap: 14 }}>
          <View style={{ flexDirection: 'row' }}>
            <SearchInput label={t('search')} value={query} onChange={search} />
          </View>
          <Choices
            value={category}
            onChange={setCategory}
            options={categories.map((key) => ({
              value: key,
              label: t(key === 'all' ? 'all' : categoryKeys[key]),
            }))}
          />
          {selection.length > 0 && (
            <View style={{ gap: 8, alignItems: 'flex-start' }}>
              <Text muted small>
                {t('publicCompareChoose')} · {selection.length}/2
              </Text>
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
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Data q={q}>
            {(records) => {
              const words = normalizeLoanSearch(query.trim()).split(/\s+/);
              const results = records.filter((p) => {
                const haystack = normalizeLoanSearch(
                  [p.name, p.nameEn, p.institution, ...p.purposes, ...p.purposesEn].join(' '),
                );
                return (
                  (category === 'all' || p.category === category) &&
                  words.every((word) => haystack.includes(word))
                );
              });
              return (
                <View>
                  <View style={{ paddingBottom: 11 }} accessibilityLiveRegion="polite">
                    <Text small muted>
                      {t('catalogMatches')} · {numeric(results.length, locale)}
                    </Text>
                  </View>
                  {results.map((p) => {
                    const name = local(p.name, p.nameEn);
                    const selected = selection.includes(p.id);
                    const terms = fields(p);
                    const amountHint =
                      p.amountMin !== null || p.amountMax !== null
                        ? terms[0][1]
                        : p.maxLoanToValuePercent === null
                          ? null
                          : t('publicLoanToValue') + ' ' + percent(p.maxLoanToValuePercent, locale);
                    const termHint =
                      p.monthsMin !== null || p.monthsMax !== null ? terms[1][1] : null;
                    return (
                      <View
                        key={p.id}
                        style={{
                          gap: 11,
                          paddingVertical: 17,
                          borderTopWidth: 1,
                          borderColor: c.border,
                        }}
                      >
                        <View style={{ flexDirection: desktop ? 'row' : 'column', gap: 10 }}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text small muted>
                              {p.institution} · {t(categoryKeys[p.category])}
                            </Text>
                            <Heading size={24}>{name}</Heading>
                          </View>
                          <View style={{ alignItems: desktop ? 'flex-end' : 'flex-start' }}>
                            <Text
                              bold
                              small
                              style={{ color: c.primary, fontVariant: ['tabular-nums'] }}
                            >
                              {rate(p)}
                            </Text>
                            <Text small muted>
                              {t('publicRate')}
                            </Text>
                          </View>
                        </View>
                        {amountHint || termHint ? (
                          <Text small muted style={{ fontVariant: ['tabular-nums'] }}>
                            {[amountHint, termHint].filter(Boolean).join(' · ')}
                          </Text>
                        ) : null}
                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Action
                            label={t('publicDetails') + ': ' + name}
                            onPress={() => setChoice(p)}
                            style={{
                              flexDirection: 'row',
                              gap: 8,
                              alignItems: 'center',
                              paddingHorizontal: 9,
                              borderWidth: 1,
                              borderColor: c.border,
                            }}
                          >
                            <Text bold small style={{ color: c.primary }}>
                              {t('publicDetails')}
                            </Text>
                            <ArrowUpRight size={16} color={c.primary} />
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
                              paddingHorizontal: 9,
                              backgroundColor: selected ? c.secondary : 'transparent',
                            }}
                          >
                            <Text bold small style={{ color: c.primary }}>
                              {t(selected ? 'compareSelected' : 'compareChoice')}
                            </Text>
                          </Action>
                        </View>
                      </View>
                    );
                  })}
                  {!results.length ? (
                    <EmptyState
                      title={t('noResults')}
                      action={
                        <Button
                          label={t('clear')}
                          onPress={() => {
                            search('');
                            setCategory('all');
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
