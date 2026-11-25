import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Text,
  Choices,
  SearchInput,
  IconButton,
  BottomSheet,
  Button,
  EmptyState,
  useDesign,
} from '@finora/ui';
import { SlidersHorizontal } from 'lucide-react-native';
import { percent } from '@finora/i18n';
import { api } from '../../src/services/client';
import { Page, Data } from '../../src/components/layout';
import { LoanProductCard } from '../../src/features/catalog';
export default function Explore() {
  const { t, colors: c, locale } = useDesign();
  const { width } = useWindowDimensions();
  const q = useQuery({ queryKey: ['catalog'], queryFn: api.catalog });
  const [query, search] = useState(''),
    [category, setCat] = useState('all'),
    [max, rate] = useState('all'),
    [open, setOpen] = useState(false);
  const options = ['all', 'personal', 'education', 'home'] as const;
  return (
    <Page title={t('catalog')} description={t('catalogHint')}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <SearchInput label={t('search')} value={query} onChange={search} />
        <IconButton
          label={t('filters')}
          onPress={() => setOpen(true)}
          icon={<SlidersHorizontal size={23} color={c.primary} />}
        />
      </View>
      <Choices
        value={category}
        onChange={setCat}
        options={options.map((v) => ({ value: v, label: t(v === 'home' ? 'homeCat' : v) }))}
      />
      <View style={{ gap: 6 }}>
        <Badge>{t('sample')}</Badge>
        <Text small muted>
          {t('sampleNote')}
        </Text>
      </View>
      <Data q={q}>
        {(products) => {
          const needle = query.trim().toLocaleLowerCase();
          const filtered = products.filter(
            (p) =>
              (category === 'all' || p.category === category) &&
              (max === 'all' || p.rateMax <= Number(max)) &&
              [p.name, p.nameEn, p.institution].join(' ').toLocaleLowerCase().includes(needle),
          );
          return filtered.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
              {filtered.map((p) => (
                <View key={p.id} style={{ width: width >= 1024 ? '48.7%' : '100%' }}>
                  <LoanProductCard p={p} />
                </View>
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
          );
        }}
      </Data>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={t('filters')}>
        <Text>{t('maxRate')}</Text>
        <Choices
          value={max}
          onChange={rate}
          options={['all', '10', '12', '15'].map((v) => ({
            value: v,
            label: v === 'all' ? t('all') : percent(Number(v), locale),
          }))}
        />
        <Button label={t('done')} onPress={() => setOpen(false)} />
      </BottomSheet>
    </Page>
  );
}
