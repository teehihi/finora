import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Link, router } from 'expo-router';
import { ArrowUpRight, CircleAlert, Info, Landmark } from 'lucide-react-native';
import type { IntelligenceBlock } from '@finora/contracts';
import { Action, Button, Dialog, Heading, Text, useDesign } from '@finora/ui';
import { useQueryClient } from '@tanstack/react-query';
import { date } from '@finora/i18n';
import { auth } from '../../services/client';
import { requestId } from '../../services/request-id';
import { saveIntelligenceScenario } from './transport';
import { safeSource } from './model';

type Metric = { label: string; value: string; warning?: boolean };

export function AnalysisLedger({ rows }: { rows: Metric[] }) {
  const { colors: c } = useDesign();
  return (
    <View>
      {rows.map(({ label, value, warning }, index) => (
        <View
          key={label}
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            columnGap: 14,
            rowGap: 2,
            paddingVertical: 6,
            borderTopWidth: index ? 1 : 0,
            borderColor: c.border,
          }}
        >
          <Text small muted>
            {label}
          </Text>
          <Text
            small
            bold
            style={{ color: warning ? c.warning : c.foreground, fontVariant: ['tabular-nums'] }}
          >
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Receipt({
  label,
  title,
  figure,
  children,
}: {
  label?: string;
  title: string;
  figure?: string;
  children: ReactNode;
}) {
  const { colors: c } = useDesign();
  return (
    <View
      style={{
        backgroundColor: c.surface,
        padding: 15,
        gap: 8,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 18,
        flexShrink: 0,
      }}
    >
      {label ? (
        <Text small bold style={{ color: c.primary }}>
          {label}
        </Text>
      ) : null}
      <Heading size={19}>{title}</Heading>
      {figure ? (
        <View
          style={{
            backgroundColor: c.secondary,
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderRadius: 10,
          }}
        >
          <Text
            bold
            style={{
              fontSize: 26,
              lineHeight: 34,
              fontVariant: ['tabular-nums'],
              color: c.primary,
            }}
          >
            {figure}
          </Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

function PublicSource({ value }: { value: string | null }) {
  const url = safeSource(value);
  const { t, colors: c } = useDesign();
  if (!url) return null;
  return (
    <Link href={url.href} target="_blank" rel="noopener noreferrer" asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t('intelligenceSourceOpen') + ': ' + url.hostname}
        style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text small bold style={{ color: c.primary }}>
            {url.hostname}
          </Text>
          <ArrowUpRight size={14} color={c.primary} />
        </View>
      </Pressable>
    </Link>
  );
}

export function AnalysisBlocks({
  blocks,
  turnId,
}: {
  blocks: IntelligenceBlock[];
  turnId?: string;
}) {
  const { width } = useWindowDimensions();
  const order = { affordability: 0, scenario: 1, missing: 2, notice: 3, offers: 4 } as const;
  const sorted = blocks
    .map((block, index) => ({ block, index }))
    .sort((a, b) => order[a.block.kind] - order[b.block.kind]);
  const scenarios = sorted.filter(({ block }) => block.kind === 'scenario');
  const paired = scenarios.length === 2;
  const render = ({ block, index }: (typeof sorted)[number]) => (
    <Block
      key={block.kind + index}
      value={block}
      save={turnId ? { turnId, blockIndex: index } : undefined}
    />
  );
  return (
    <View style={{ gap: 14 }}>
      {sorted.map((item) => {
        if (!paired || item.block.kind !== 'scenario') return render(item);
        if (item.index !== scenarios[0].index) return null;
        return (
          <View
            key="paired-scenarios"
            style={{
              gap: 14,
              flexDirection: width >= 1370 ? 'row' : 'column',
              alignItems: 'stretch',
            }}
          >
            {scenarios.map((scenario) => (
              <View
                key={scenario.index}
                style={{ flex: width >= 1370 ? 1 : undefined, minWidth: 0 }}
              >
                {render(scenario)}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

type Save = { turnId: string; blockIndex: number };

function SaveScenario({ save }: { save: Save }) {
  const { t } = useDesign();
  const session = auth.useSession();
  const queries = useQueryClient();
  const identifier = useRef<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => () => request.current?.abort(), []);
  async function confirm() {
    if (request.current) return;
    identifier.current ??= requestId();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setFailed(false);
    try {
      const id = await saveIntelligenceScenario(
        { ...save, requestId: identifier.current, confirmed: true },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      await queries.invalidateQueries({ queryKey: ['saved', session.data?.user.id] });
      if (controller.signal.aborted) return;
      setOpen(false);
      router.push({ pathname: '/saved/[id]', params: { id } });
    } catch {
      if (!controller.signal.aborted) setFailed(true);
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <>
      <Button
        label={t('intelligenceSave')}
        variant="outline"
        onPress={() => {
          setFailed(false);
          setOpen(true);
        }}
      />
      <Dialog
        title={t('intelligenceConfirmSave')}
        visible={open}
        onClose={() => !busy && setOpen(false)}
      >
        <Text>{t('intelligenceSaveHint')}</Text>
        {failed ? (
          <Text role="alert" muted>
            {t('intelligenceSaveError')}
          </Text>
        ) : null}
        <Button
          label={t('intelligenceConfirmSave')}
          loading={busy}
          onPress={() => void confirm()}
        />
        <Button
          label={t('cancel')}
          variant="outline"
          disabled={busy}
          onPress={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}

function Block({ value, save }: { value: IntelligenceBlock; save?: Save }) {
  const { t, money, locale, colors: c } = useDesign();
  const [offersExpanded, expandOffers] = useState(false);
  const format = (amount: number | null) => (amount === null ? t('unknown') : money(amount));
  const percent = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(n);
  const months = (n: number) => n + ' ' + t('months');
  const range = (min: number | null, max: number | null, formatItem: (n: number) => string) => {
    if (min !== null && max !== null)
      return min === max ? formatItem(min) : formatItem(min) + ' – ' + formatItem(max);
    if (min !== null) return t('intelligenceFrom') + ' ' + formatItem(min);
    if (max !== null) return t('intelligenceUpTo') + ' ' + formatItem(max);
    return t('unknown');
  };

  switch (value.kind) {
    case 'affordability':
      return (
        <Receipt
          label={t(
            value.basis === 'profile' ? 'intelligenceProfileBasis' : 'intelligenceProvidedBasis',
          )}
          title={t('intelligenceAffordability')}
          figure={money(value.monthlyCapacity)}
        >
          <Text small muted>
            {t('perMonth')}
          </Text>
          <AnalysisLedger
            rows={[
              { label: t('income'), value: money(value.income) },
              { label: t('expenses'), value: money(value.expenses) },
              { label: t('debt'), value: money(value.debt) },
              {
                label: t('intelligenceCashFlow'),
                value: money(value.cashFlow),
                warning: value.cashFlow < 0,
              },
              {
                label: t('ratio'),
                value: value.debtRatio === null ? t('unknown') : percent(value.debtRatio / 100),
              },
              ...(value.emergencyMonths == null
                ? []
                : [
                    {
                      label: t('intelligenceEmergencyCover'),
                      value: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
                        value.emergencyMonths,
                      ),
                    },
                  ]),
            ]}
          />
        </Receipt>
      );
    case 'scenario': {
      const savedId = value.simulationId;
      const methodKey =
        value.method === 'flat'
          ? 'flat'
          : value.method === 'annuity'
            ? 'annuity'
            : 'equalPrincipal';
      return (
        <Receipt
          label={t(
            value.source === 'saved_simulation'
              ? 'intelligenceFromSaved'
              : 'intelligenceAssumptions',
          )}
          title={t('intelligenceScenarios') + ' · ' + months(value.months)}
          figure={money(value.firstPayment)}
        >
          <Text small muted>
            {t('firstPayment')}
          </Text>
          <AnalysisLedger
            rows={[
              { label: t('amount'), value: money(value.principal) },
              { label: t('term'), value: months(value.months) },
              ...(value.firstDue
                ? [{ label: t('intelligenceFirstDue'), value: date(value.firstDue, locale) }]
                : []),
              { label: t('intelligenceAnnualRate'), value: percent(value.annualRate / 100) },
              { label: t('method'), value: t(methodKey) },
              { label: t('intelligencePeak'), value: money(value.peakPayment) },
              { label: t('assistantPrincipalInterest'), value: money(value.repayment) },
              { label: t('fee'), value: format(value.fee) },
              { label: t('assistantIncludingFees'), value: format(value.total) },
              {
                label: t('intelligenceAfterPayment'),
                value: format(value.remainingCash),
                warning: value.remainingCash !== null && value.remainingCash < 0,
              },
              {
                label: t('intelligenceStress'),
                value: format(value.stressRemainingCash),
                warning: value.stressRemainingCash !== null && value.stressRemainingCash < 0,
              },
            ]}
          />
          {savedId ? (
            <Action
              label={t('assistantOpenPlan')}
              onPress={() => router.push({ pathname: '/saved/[id]', params: { id: savedId } })}
            >
              <Text bold small style={{ color: c.primary }}>
                {t('assistantOpenPlan')}
              </Text>
            </Action>
          ) : null}
          {save && value.source === 'user_assumptions' && value.firstDue ? (
            <SaveScenario save={save} />
          ) : null}
        </Receipt>
      );
    }
    case 'offers':
      if (!value.items.length) return null;
      return (
        <Receipt title={t('intelligenceOffers')}>
          <Text small muted>
            {t('intelligenceActualTerms')}
          </Text>
          {value.items.length > 2 ? (
            <Button
              label={
                t(offersExpanded ? 'intelligenceOffersClose' : 'intelligenceOffersView') +
                ' · ' +
                value.items.length
              }
              variant="outline"
              onPress={() => expandOffers(!offersExpanded)}
            />
          ) : null}
          {(value.items.length <= 2 || offersExpanded ? value.items : []).map((item) => (
            <View
              key={item.id}
              style={{ gap: 5, padding: 11, backgroundColor: c.elevated, borderRadius: 12 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Landmark size={17} color={c.primary} />
                <Text small bold style={{ color: c.primary }}>
                  {item.institution}
                </Text>
              </View>
              <Text bold>{item.name}</Text>
              <AnalysisLedger
                rows={[
                  {
                    label: t('intelligenceAmounts'),
                    value: range(item.amountMin, item.amountMax, money),
                  },
                  {
                    label: t('intelligenceTerms'),
                    value: range(item.monthsMin, item.monthsMax, months),
                  },
                  { label: t('intelligenceRateLabel'), value: item.rateLabel ?? t('unknown') },
                ]}
              />
              <PublicSource value={item.sourceUrl} />
            </View>
          ))}
        </Receipt>
      );
    case 'missing':
    case 'notice':
      return (
        <View
          style={{
            padding: 12,
            backgroundColor: value.kind === 'missing' ? c.secondary : c.elevated,
            borderRadius: 13,
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
            {value.kind === 'missing' ? (
              <CircleAlert size={16} color={c.warning} />
            ) : (
              <Info size={16} color={c.primary} />
            )}
            <Text small bold style={{ color: value.kind === 'missing' ? c.warning : c.primary }}>
              {t(value.kind === 'missing' ? 'intelligenceMissing' : 'intelligenceNotice')}
            </Text>
          </View>
          <Text>{value.message}</Text>
        </View>
      );
  }
}
