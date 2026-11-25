import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  Action,
  Text,
  Heading,
  Choices,
  SearchInput,
  BottomSheet,
  Dialog,
  Button,
  EmptyState,
  useDesign,
} from '@finora/ui';
import { BookOpen, Columns2, SlidersHorizontal } from 'lucide-react-native';
import { numeric, percent } from '@finora/i18n';
import { api } from '../../src/services/client';
import { Page, Data } from '../../src/components/layout';
import { LoanProductCard, ProductComparison } from '../../src/features/catalog';
import {
  categories,
  filterProducts,
  maxRates,
  type Category,
} from '../../src/features/catalog-model';

export default function Explore() {
  const { t, colors: c, locale } = useDesign();
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const ComparisonOverlay = desktop ? Dialog : BottomSheet;
  const q = useQuery({ queryKey: ['catalog'], queryFn: api.catalog });
  const [query, search] = useState('');
  const [category, setCat] = useState<Category>('all');
  const [max, rate] = useState<(typeof maxRates)[number]>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);

  const products = q.data?.filter((p) => selection.includes(p.id)) ?? [];
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
  const compareControls = products.length > 0 && (
    <View style={{ gap: 10, paddingTop: 16, borderTopWidth: 1, borderColor: c.border }}>
      <Heading size={22}>
        {t('compare')} ({products.length}/2)
      </Heading>
      {products.map((p) => (
        <Text small key={p.id}>
          {locale === 'vi-VN' ? p.name : p.nameEn}
        </Text>
      ))}
      {pair && desktop ? (
        <Button
          variant="soft"
          label={t('compare')}
          icon={<Columns2 size={16} color={c.primary} />}
          onPress={() => setCompareOpen(true)}
        />
      ) : !pair ? (
        <Text muted small>
          {t('compareChooseAnother')}
        </Text>
      ) : null}
      <Action
        label={t('compareClear')}
        onPress={() => setSelection([])}
        style={{ alignSelf: 'flex-start', paddingHorizontal: 4 }}
      >
        <Text small bold style={{ color: c.primary }}>
          {t('compareClear')}
        </Text>
      </Action>
    </View>
  );

  return (
    <Page title={t('catalog')} description={t('catalogIntro')} eyebrow={t('explore')}>
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
        <View style={{ flex: 1, gap: 2 }}>
          <Text small bold style={{ color: c.primary }}>
            {t('catalogIndex')}
          </Text>
          <Text small>{t('catalogDisclosure')}</Text>
        </View>
      </View>
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
          {desktop && (
            <View style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderColor: c.border }}>
              {filterControls}
            </View>
          )}
          {desktop && compareControls}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {!desktop && pair ? (
            <View style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
              <Button
                variant="soft"
                label={t('compare')}
                icon={<Columns2 size={16} color={c.primary} />}
                onPress={() => setCompareOpen(true)}
              />
            </View>
          ) : null}
          <Data q={q}>
            {(all) => {
              const results = filterProducts(all, query, category, max);
              return (
                <View>
                  <View style={{ paddingBottom: 12 }} accessibilityLiveRegion="polite">
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
                    results.map((p) => (
                      <LoanProductCard
                        key={p.id}
                        p={p}
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
                    ))
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
          {!desktop && compareControls}
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
        {pair && <ProductComparison products={pair} />}
        <Text small muted>
          {t('noLoanApproval')}
        </Text>
      </ComparisonOverlay>
    </Page>
  );
}
