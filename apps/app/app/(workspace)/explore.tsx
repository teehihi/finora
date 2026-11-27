import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  Action,
  Text,
  Choices,
  SearchInput,
  SegmentedControl,
  BottomSheet,
  Dialog,
  Button,
  EmptyState,
  useDesign,
} from '@finora/ui';
import { ArrowUpRight, Calculator, SlidersHorizontal } from 'lucide-react-native';
import { numeric, percent } from '@finora/i18n';
import { api } from '../../src/services/client';
import { Page, Data } from '../../src/components/layout';
import { SignatureIcon } from '../../src/components/signature';
import { LoanProductCard, ProductComparison } from '../../src/features/catalog';
import { PublicCatalogView } from '../../src/features/public-catalog';
import { ComparisonTray, FilterChip, Provenance } from '../../src/features/catalog-marketplace';
import {
  categories,
  filterProducts,
  maxRates,
  type Category,
} from '../../src/features/catalog-model';

export default function Explore() {
  const { t } = useDesign();
  const params = useLocalSearchParams<{ mode?: string; intent?: string }>();
  const mode = params.mode === 'sample' ? 'sample' : 'public';
  return (
    <Page
      title={t('catalog')}
      showDescriptionOnPhone={false}
      description={t(mode === 'public' ? 'publicCatalogIntro' : 'catalogIntro')}
    >
      <SegmentedControl
        value={mode}
        onChange={(value) => router.setParams({ mode: value })}
        options={[
          { value: 'public', label: t('publicCatalog') },
          { value: 'sample', label: t('sampleCatalogMode') },
        ]}
      />
      <PersonalTerms />
      {mode === 'public' ? (
        <PublicCatalogView />
      ) : (
        <SampleCatalogView compareIntent={params.intent === 'compare'} />
      )}
    </Page>
  );
}

function PersonalTerms() {
  const { colors: c, locale } = useDesign();
  const label = locale === 'vi-VN' ? 'Nhập điều khoản của tôi' : 'Use my own loan terms';
  return (
    <Action
      label={label}
      onPress={() => router.push('/simulate/custom')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        gap: 9,
        padding: 9,
      }}
    >
      <SignatureIcon icon={Calculator} size={32} tone="emerald" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text small muted>
          {locale === 'vi-VN' ? 'Điều khoản cá nhân' : 'Personal loan terms'}
        </Text>
        <Text bold style={{ color: c.primary }}>
          {label}
        </Text>
        <Text small muted>
          {locale === 'vi-VN'
            ? 'Tính riêng với lãi và phí bạn nhập'
            : 'Estimate with your own rate and fees'}
        </Text>
      </View>
      <ArrowUpRight size={16} color={c.primary} />
    </Action>
  );
}

function SampleCatalogView({ compareIntent }: { compareIntent: boolean }) {
  const { t, colors: c, locale } = useDesign();
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const wide = width >= 1280;
  const ComparisonOverlay = desktop ? Dialog : BottomSheet;
  const q = useQuery({ queryKey: ['catalog'], queryFn: api.catalog });
  const [query, search] = useState('');
  const [category, setCat] = useState<Category>('all');
  const [max, rate] = useState<(typeof maxRates)[number]>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);

  const products = selection.flatMap((id) => {
    const product = q.data?.find((p) => p.id === id);
    return product ? [product] : [];
  });
  const pair = products.length === 2 ? ([products[0], products[1]] as const) : null;
  const filterControls = (
    <>
      <Text small bold>
        {t('maxRate')}
      </Text>
      <Choices
        value={max}
        onChange={rate}
        options={maxRates.map((v) => ({
          value: v,
          label: v === 'all' ? t('all') : percent(Number(v), locale),
        }))}
      />
    </>
  );
  const compareControls = (
    <ComparisonTray
      names={products.map((p) => ({
        id: p.id,
        title: locale === 'vi-VN' ? p.name : p.nameEn,
        institution: p.institution,
      }))}
      onRemove={(id) => setSelection((ids) => ids.filter((value) => value !== id))}
      onClear={() => setSelection([])}
      onCompare={() => setCompareOpen(true)}
    />
  );

  return (
    <>
      <View style={{ gap: 6, paddingHorizontal: 4 }}>
        <Provenance mode="sample" />
        <Text small muted>
          {t('catalogDisclosure')}
        </Text>
      </View>
      {compareIntent && (
        <Text small bold style={{ color: c.primary }}>
          {locale === 'vi-VN'
            ? 'Chọn hai sản phẩm để tính với cùng số tiền và kỳ hạn.'
            : 'Select two products to calculate with the same amount and term.'}
        </Text>
      )}
      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: desktop ? 34 : 18 }}>
        <View style={{ width: desktop ? 216 : undefined, gap: desktop ? 18 : 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
            <SearchInput label={t('search')} value={query} onChange={search} />
            {!desktop && (
              <Action
                label={t('filters')}
                onPress={() => setFilterOpen(true)}
                style={{
                  width: 46,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderRadius: 13,
                  borderColor: c.border,
                  backgroundColor: max === 'all' ? c.surface : c.secondary,
                }}
              >
                <SlidersHorizontal size={18} color={c.primary} />
              </Action>
            )}
          </View>
          <View style={{ gap: 8 }}>
            <Text small bold>
              {t('category')}
            </Text>
            <Choices
              value={category}
              onChange={setCat}
              options={categories.map((v) => ({
                value: v,
                label: t(v === 'home' ? 'homeCat' : v),
              }))}
            />
          </View>
          {!desktop && max !== 'all' ? (
            <View style={{ alignSelf: 'flex-start' }}>
              <FilterChip
                label={t('maxRate') + ' · ' + percent(Number(max), locale)}
                onRemove={() => rate('all')}
              />
            </View>
          ) : null}
          {desktop && (
            <View style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderColor: c.border }}>
              {filterControls}
            </View>
          )}
          {compareControls}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Data q={q}>
            {(all) => {
              const results = filterProducts(all, query, category, max);
              return (
                <View style={{ gap: 10 }}>
                  <View style={{ paddingBottom: 1 }} accessibilityLiveRegion="polite">
                    <Text small muted>
                      {t('catalogMatches')} · {numeric(results.length, locale)}
                    </Text>
                    {selection.length === 2 ? (
                      <Text small muted>
                        {t('compareTwoOnly')}
                      </Text>
                    ) : null}
                  </View>
                  {results.length ? (
                    <View
                      style={{
                        gap: 10,
                        flexDirection: wide ? 'row' : 'column',
                        flexWrap: wide ? 'wrap' : 'nowrap',
                      }}
                    >
                      {results.map((p) => (
                        <LoanProductCard
                          key={p.id}
                          p={p}
                          wide={wide}
                          selected={selection.includes(p.id)}
                          comparisonDisabled={selection.length >= 2 && !selection.includes(p.id)}
                          toggleComparison={() =>
                            setSelection((ids) =>
                              ids.includes(p.id)
                                ? ids.filter((id) => id !== p.id)
                                : ids.length >= 2
                                  ? ids
                                  : [...ids, p.id],
                            )
                          }
                        />
                      ))}
                    </View>
                  ) : (
                    <EmptyState
                      title={t('noResults')}
                      action={
                        <Button
                          label={t('clear')}
                          onPress={() => {
                            search('');
                            setCat('all');
                            rate('all');
                          }}
                        />
                      }
                    />
                  )}
                </View>
              );
            }}
          </Data>
        </View>
      </View>
      <BottomSheet visible={filterOpen} onClose={() => setFilterOpen(false)} title={t('filters')}>
        {filterControls}
        <Button label={t('done')} onPress={() => setFilterOpen(false)} />
      </BottomSheet>
      <ComparisonOverlay
        visible={compareOpen && !!pair}
        onClose={() => setCompareOpen(false)}
        title={t('compare')}
      >
        {pair && (
          <ProductComparison
            key={pair.map((p) => p.id).join(':')}
            products={pair}
            onNavigate={() => setCompareOpen(false)}
          />
        )}
        <Text small muted>
          {t('noLoanApproval')}
        </Text>
      </ComparisonOverlay>
    </>
  );
}
