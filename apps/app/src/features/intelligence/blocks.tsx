import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Link, router } from 'expo-router';
import {
  ArrowUpRight,
  ChevronDown,
  CircleAlert,
  ChartNoAxesCombined,
  Info,
  Landmark,
  TrendingDown,
} from 'lucide-react-native';
import type { IntelligenceBlock, IntelligenceScenario } from '@finora/contracts';
import { Action, Button, Dialog, Heading, Text, useDesign } from '@finora/ui';
import { useQueryClient } from '@tanstack/react-query';
import { date } from '@finora/i18n';
import { tokens } from '@finora/design-tokens';
import { SignatureIcon } from '../../components/signature';
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
  figureLabel,
  emphasis = false,
  children,
}: {
  label?: string;
  title: string;
  figure?: string;
  figureLabel?: string;
  emphasis?: boolean;
  children: ReactNode;
}) {
  const { colors: c } = useDesign();
  return (
    <View
      style={{
        backgroundColor: c.surface,
        padding: 15,
        gap: 10,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 21,
        flexShrink: 0,
      }}
    >
      {label ? (
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 8,
            backgroundColor: c.secondary,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text small bold style={{ color: c.primary }}>
            {label}
          </Text>
        </View>
      ) : null}
      <Heading size={20}>{title}</Heading>
      {figure ? (
        <View
          style={{
            backgroundColor: emphasis ? c.signatureStart : c.elevated,
            paddingHorizontal: 13,
            paddingVertical: 10,
            borderRadius: 14,
          }}
        >
          {figureLabel ? (
            <Text small style={{ color: emphasis ? c.onForestMuted : c.muted }}>
              {figureLabel}
            </Text>
          ) : null}
          <Text
            bold
            style={{
              fontFamily: tokens.font.heading,
              fontSize: figure.length > 19 ? 24 : 30,
              lineHeight: figure.length > 19 ? 30 : 36,
              letterSpacing: -0.65,
              fontVariant: ['tabular-nums'],
              color: emphasis ? c.signatureLime : c.primary,
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
  followUp,
}: {
  blocks: IntelligenceBlock[];
  turnId?: string;
  followUp?: (prompt: string) => void;
}) {
  const { width } = useWindowDimensions();
  const order = { affordability: 0, scenario: 1, missing: 2, notice: 3, offers: 4 } as const;
  const sorted = blocks
    .map((block, index) => ({ block, index }))
    .sort((a, b) => order[a.block.kind] - order[b.block.kind]);
  const scenarios = sorted.filter(
    (entry): entry is { block: IntelligenceScenario; index: number } =>
      entry.block.kind === 'scenario',
  );
  const { locale, colors: c } = useDesign();
  const vi = locale === 'vi-VN';
  const stressPrompt = vi ? 'Nếu thu nhập giảm 20% thì sao?' : 'What if my income drops by 20%?';
  const paired = scenarios.length === 2;
  const render = ({ block, index }: (typeof sorted)[number]) => (
    <Block
      key={block.kind + index}
      value={block}
      save={turnId ? { turnId, blockIndex: index } : undefined}
      followUp={followUp}
    />
  );
  return (
    <View style={{ gap: 14 }}>
      {scenarios.length &&
      followUp &&
      !scenarios.some(({ block }) => block.stressRemainingCash !== null) ? (
        <Button
          label={vi ? 'Thử thu nhập giảm 20%' : 'Try 20% lower income'}
          leading={<TrendingDown size={16} color={c.primary} />}
          variant="outline"
          onPress={() => followUp(stressPrompt)}
        />
      ) : null}
      {paired ? <CompareStrip scenarios={[scenarios[0].block, scenarios[1].block]} /> : null}
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

function CompareStrip({ scenarios }: { scenarios: [IntelligenceScenario, IntelligenceScenario] }) {
  const { colors: c, locale, t, money } = useDesign();
  const vi = locale === 'vi-VN';
  const feesKnown = scenarios.every((scenario) => scenario.total !== null);
  const stressed = scenarios.some((scenario) => scenario.stressRemainingCash !== null);
  const moneyOf = (value: number | null) => (value === null ? t('unknown') : money(value));
  const maxPayment = Math.max(...scenarios.map((s) => s.peakPayment));
  const values: { label: string; amount: (s: IntelligenceScenario) => number | null }[] = [
    { label: t('intelligencePeak'), amount: (s) => s.peakPayment },
    {
      label: t(feesKnown ? 'assistantIncludingFees' : 'assistantPrincipalInterest'),
      amount: (s) => (feesKnown ? s.total : s.repayment),
    },
    ...(stressed
      ? [
          {
            label: t('intelligenceStress'),
            amount: (s: IntelligenceScenario) => s.stressRemainingCash,
          },
        ]
      : []),
  ];
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: c.border,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 13,
          backgroundColor: c.signatureStart,
          gap: 10,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <SignatureIcon icon={ChartNoAxesCombined} tone="lime" size={40} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Heading size={18} style={{ color: c.onForest }}>
            {vi ? 'So sánh theo kỳ hạn' : 'Compare both terms'}
          </Heading>
          <Text small style={{ color: c.onForestMuted }}>
            {vi ? 'Cùng số tiền vay, lãi suất và cách tính' : 'Same loan amount, rate and method'}
          </Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 14, paddingVertical: 9, gap: 7 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {scenarios.map((s) => (
            <Text
              key={s.months}
              bold
              style={{ flex: 1, color: c.primary, fontVariant: ['tabular-nums'] }}
            >
              {s.months} {t('months')}
            </Text>
          ))}
        </View>
        {values.map(({ label, amount }) => (
          <View
            key={label}
            style={{ gap: 4, borderTopWidth: 1, borderColor: c.border, paddingTop: 7 }}
          >
            <Text small muted>
              {label}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {scenarios.map((s, index) => (
                <View key={s.months} style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text
                    small
                    bold
                    style={{
                      color: (amount(s) ?? 0) < 0 ? c.warning : c.foreground,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {moneyOf(amount(s))}
                  </Text>
                  {label === t('intelligencePeak') && maxPayment > 0 ? (
                    <View
                      accessible={false}
                      importantForAccessibility="no-hide-descendants"
                      style={{ height: 5, backgroundColor: c.elevated, borderRadius: 4 }}
                    >
                      <View
                        style={{
                          height: 5,
                          width: `${(Math.max(0, s.peakPayment) / maxPayment) * 100}%`,
                          maxWidth: '100%',
                          backgroundColor: index === 0 ? c.chartPrincipal : c.actionBlue,
                          borderRadius: 4,
                        }}
                      />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ))}
        {!feesKnown ? (
          <Text small muted>
            {vi
              ? 'Chưa đủ dữ liệu phí để xếp hạng tổng chi phí.'
              : 'Fees are not known, so full costs cannot be ranked.'}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

type Save = { turnId: string; blockIndex: number };

function SaveScenario({ save, scenario }: { save: Save; scenario: IntelligenceScenario }) {
  const { t, money, colors: c } = useDesign();
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
        <Text bold style={{ color: c.primary, fontVariant: ['tabular-nums'] }}>
          {scenario.months} {t('months')} · {money(scenario.principal)}
        </Text>
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

function Block({
  value,
  save,
  followUp,
}: {
  value: IntelligenceBlock;
  save?: Save;
  followUp?: (prompt: string) => void;
}) {
  const { t, money, locale, colors: c } = useDesign();
  const [offersExpanded, expandOffers] = useState(false);
  const [details, setDetails] = useState(false);
  const vi = locale === 'vi-VN';
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
          figureLabel={t('perMonth')}
          emphasis
        >
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
      const detailLabel = details
        ? vi
          ? 'Thu gọn phép tính'
          : 'Hide calculation'
        : vi
          ? 'Xem phép tính'
          : 'Inspect calculation';
      const assumptions = vi
        ? `Nếu vay ${value.principal} ₫ trong ${value.months} tháng, lãi suất ${value.annualRate}%/năm, ${{ flat: 'lãi phẳng', annuity: 'trả góp đều', equalPrincipal: 'gốc đều' }[value.method]}. ${value.fee === null ? 'Chưa biết phí.' : 'Phí hồ sơ ' + value.fee + ' ₫.'}`
        : `What if I borrow ${value.principal} VND for ${value.months} months, interest ${value.annualRate}% per year, ${{ flat: 'flat rate', annuity: 'equal installments', equalPrincipal: 'equal principal' }[value.method]}? ${value.fee === null ? 'Fee unknown.' : 'One-time fee ' + value.fee + ' VND.'}`;
      return (
        <Receipt
          label={t(
            value.source === 'saved_simulation'
              ? 'intelligenceFromSaved'
              : 'intelligenceAssumptions',
          )}
          title={t('intelligenceScenarios') + ' · ' + months(value.months)}
          figure={money(value.firstPayment)}
          figureLabel={t('firstPayment')}
        >
          <AnalysisLedger
            rows={[
              { label: t('intelligencePeak'), value: money(value.peakPayment) },
              { label: t('assistantPrincipalInterest'), value: money(value.repayment) },
              {
                label: t('intelligenceAfterPayment'),
                value: format(value.remainingCash),
                warning: value.remainingCash !== null && value.remainingCash < 0,
              },
              ...(value.stressRemainingCash === null
                ? []
                : [
                    {
                      label: t('intelligenceStress'),
                      value: format(value.stressRemainingCash),
                      warning: value.stressRemainingCash < 0,
                    },
                  ]),
            ]}
          />
          <Action
            label={detailLabel}
            onPress={() => setDetails(!details)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 4,
            }}
          >
            <Text small bold style={{ color: c.primary }}>
              {detailLabel}
            </Text>
            <ChevronDown
              size={17}
              color={c.primary}
              style={details ? { transform: [{ rotate: '180deg' }] } : undefined}
            />
          </Action>
          {details ? (
            <>
              <AnalysisLedger
                rows={[
                  { label: t('amount'), value: money(value.principal) },
                  { label: t('term'), value: months(value.months) },
                  { label: t('intelligenceFirstDue'), value: date(value.firstDue, locale) },
                  { label: t('intelligenceAnnualRate'), value: percent(value.annualRate / 100) },
                  { label: t('method'), value: t(methodKey) },
                  { label: t('interest'), value: money(value.repayment - value.principal) },
                  { label: t('fee'), value: format(value.fee) },
                  { label: t('assistantIncludingFees'), value: format(value.total) },
                ]}
              />
              {followUp ? (
                <Button
                  label={vi ? 'Đổi giả định' : 'Edit assumptions'}
                  variant="text"
                  onPress={() => followUp(assumptions)}
                />
              ) : null}
            </>
          ) : null}
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
            <SaveScenario save={save} scenario={value} />
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
          <Button
            label={t('intelligenceCatalog')}
            variant="text"
            onPress={() => router.push('/explore')}
          />
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
