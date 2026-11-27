import { useState } from 'react';
import { Linking, View } from 'react-native';
import {
  ArrowUpRight,
  Check,
  Columns2,
  Database,
  FlaskConical,
  Plus,
  X,
} from 'lucide-react-native';
import { Action, Button, Heading, Text, useDesign } from '@finora/ui';
import type { PublicLoanProduct } from '@finora/contracts';
import { date } from '@finora/i18n';

export function Provenance({ mode }: { mode: 'public' | 'sample' }) {
  const { colors: c, locale } = useDesign();
  const vi = locale === 'vi-VN';
  const Icon = mode === 'public' ? Database : FlaskConical;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <Icon size={16} color={c.primary} />
      <Text bold small style={{ color: c.primary }}>
        {mode === 'public'
          ? vi
            ? 'Dữ liệu công bố'
            : 'Published information'
          : vi
            ? 'Dữ liệu minh họa'
            : 'Illustrative data'}
      </Text>
    </View>
  );
}

export function ComparisonTray({
  names,
  onRemove,
  onClear,
  onCompare,
}: {
  names: { id: string; title: string; institution: string }[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onCompare: () => void;
}) {
  const { colors: c, t, locale } = useDesign();
  const vi = locale === 'vi-VN';
  if (names.length === 0) return null;
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 18,
        padding: 12,
        gap: 10,
        backgroundColor: c.elevated,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Columns2 size={19} color={c.primary} />
        <Heading size={18} style={{ flex: 1 }}>
          {vi ? 'Danh sách so sánh' : 'Comparison shortlist'}
        </Heading>
        <View accessibilityLiveRegion="polite">
          <Text bold small style={{ color: c.primary }}>
            {names.length}/2
          </Text>
        </View>
      </View>
      {([0, 1] as const).map((index) => {
        const item = names[index];
        return item ? (
          <View
            key={item.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: c.surface,
              borderRadius: 10,
              paddingLeft: 9,
            }}
          >
            <Text bold small style={{ color: c.primary }}>
              {index === 0 ? 'A' : 'B'}
            </Text>
            <View style={{ minWidth: 0, flex: 1, paddingVertical: 6 }}>
              <Text bold small>
                {item.title}
              </Text>
              <Text small muted>
                {item.institution}
              </Text>
            </View>
            <Action
              label={(vi ? 'Bỏ khỏi so sánh: ' : 'Remove from comparison: ') + item.title}
              onPress={() => onRemove(item.id)}
              style={{ width: 48, minHeight: 48, alignItems: 'center' }}
            >
              <X size={17} color={c.foreground} />
            </Action>
          </View>
        ) : (
          <View
            key="open-slot"
            style={{
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 9,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: c.borderStrong,
              borderRadius: 10,
              gap: 8,
            }}
          >
            <Plus size={16} color={c.primary} />
            <Text small muted style={{ flex: 1 }}>
              {t('compareChooseAnother')}
            </Text>
          </View>
        );
      })}
      {names.length === 2 ? <Button label={t('compare')} onPress={onCompare} /> : null}
      <Action
        label={t('compareClear')}
        onPress={onClear}
        style={{ alignSelf: 'flex-start', paddingHorizontal: 5 }}
      >
        <Text small bold style={{ color: c.primary }}>
          {t('compareClear')}
        </Text>
      </Action>
    </View>
  );
}

export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const { colors: c, locale } = useDesign();
  return (
    <Action
      label={(locale === 'vi-VN' ? 'Bỏ lọc: ' : 'Remove filter: ') + label}
      onPress={onRemove}
      style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 22,
        backgroundColor: c.secondary,
        paddingHorizontal: 11,
      }}
    >
      <Text small bold style={{ color: c.primary }}>
        {label}
      </Text>
      <X size={14} color={c.primary} />
    </Action>
  );
}

export function ComparisonSource({ product }: { product: PublicLoanProduct }) {
  const { colors: c, t, locale } = useDesign();
  const [failed, setFailed] = useState(false);
  const source = product.sources[0];
  return (
    <View style={{ gap: 4 }}>
      <Text small muted>
        {t('publicSourceVerified')} {date(source.verifiedAt + 'T00:00:00Z', locale)}
      </Text>
      <Action
        label={t('publicSourceOpen') + ': ' + source.title}
        onPress={() => {
          setFailed(false);
          void Linking.openURL(source.url).catch(() => setFailed(true));
        }}
        style={{ flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'flex-start' }}
      >
        <Text small bold style={{ color: c.primary, flex: 1 }}>
          {source.title}
        </Text>
        <ArrowUpRight size={14} color={c.primary} />
      </Action>
      {failed ? (
        <Text small role="alert" style={{ color: c.error }}>
          {t('error')}
        </Text>
      ) : null}
    </View>
  );
}

export function AvailabilitySummary({ known, total }: { known: number; total: number }) {
  const { colors: c, t } = useDesign();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
      <Check size={15} color={c.muted} />
      <Text small muted style={{ flex: 1 }}>
        {t('publicCompleteness')} · {known}/{total}
      </Text>
    </View>
  );
}
