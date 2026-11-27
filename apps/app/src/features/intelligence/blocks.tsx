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
  TrendingUp,
  RotateCcw,
} from 'lucide-react-native';
import type { IntelligenceBlock, IntelligenceScenario } from '@finora/contracts';
import { Action, Button, Dialog, Heading, Text, useDesign } from '@finora/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { date, digitalTwinText, intelligenceDecision } from '@finora/i18n';
import { tokens } from '@finora/design-tokens';
import { SignatureIcon } from '../../components/signature';
import { api, auth } from '../../services/client';
import { requestId } from '../../services/request-id';
import { saveIntelligenceScenario } from './transport';
import { compareIntelligenceDurations, safeSource, scenarioPressure } from './model';
import { AnalysisLedger } from './presentation';
import { prepareSimulationHandoff } from '../simulation-handoff';
import { LoanMatchingResults } from '../loan-matching';

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
  const order = {
    affordability: 0,
    profile_update: 1,
    scenario: 2,
    digital_twin: 3,
    matches: 4,
    document_review: 5,
    missing: 6,
    notice: 7,
    offers: 8,
  } as const;
  const sorted = blocks
    .map((block, index) => ({ block, index }))
    .sort((a, b) => order[a.block.kind] - order[b.block.kind]);
  const scenarios = sorted.filter(
    (entry): entry is { block: IntelligenceScenario; index: number } =>
      entry.block.kind === 'scenario',
  );
  const { locale, colors: c } = useDesign();
  const words = intelligenceDecision(locale);
  const canReset = scenarios.some(({ block }) => block.stressBasis !== undefined);
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
      {paired ? <CompareStrip scenarios={[scenarios[0].block, scenarios[1].block]} /> : null}
      {scenarios.length > 0 && followUp ? (
        <View
          style={{
            padding: 13,
            gap: 8,
            borderRadius: 16,
            borderWidth: 1,
            backgroundColor: c.surface,
            borderColor: c.border,
          }}
        >
          <Heading size={18}>{words.whatIf}</Heading>
          <Text small muted>
            {words.whatIfHint}
          </Text>
          <View
            style={{ gap: 7, flexDirection: width >= 850 ? 'row' : 'column', flexWrap: 'wrap' }}
          >
            <Button
              label={words.incomeAction}
              leading={<TrendingDown size={16} color={c.primary} />}
              variant="outline"
              onPress={() => followUp(words.incomePrompt)}
            />
            <Button
              label={words.expenseAction}
              leading={<TrendingUp size={16} color={c.primary} />}
              variant="outline"
              onPress={() => followUp(words.expensePrompt)}
            />
            {canReset ? (
              <Button
                label={words.resetAction}
                leading={<RotateCcw size={16} color={c.primary} />}
                variant="text"
                onPress={() => followUp(words.resetPrompt)}
              />
            ) : null}
          </View>
        </View>
      ) : null}
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
  const words = intelligenceDecision(locale);
  const trade = compareIntelligenceDurations(...scenarios);
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
            {trade.comparable ? words.sameBasis : words.mismatched}
          </Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 14, paddingVertical: 9, gap: 7 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {scenarios.map((s, index) => (
            <Text
              key={s.months + ':' + index}
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
                <View key={s.months + ':' + index} style={{ flex: 1, minWidth: 0, gap: 4 }}>
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
                  {trade.comparable && label === t('intelligencePeak') && maxPayment > 0 ? (
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
        {trade.comparable ? (
          <View style={{ backgroundColor: c.elevated, gap: 5, padding: 9, borderRadius: 10 }}>
            {trade.peak ? (
              <Text small>
                {words.peakLower}: {trade.peak.months} {t('months')} · {money(trade.peak.amount)}
              </Text>
            ) : null}
            {trade.allIn || trade.principalAndInterest ? (
              <Text small>
                {trade.allIn ? words.allInLower : words.principalInterestLower}
                {': '}
                {(trade.allIn ?? trade.principalAndInterest)?.months} {t('months')} ·{' '}
                {money((trade.allIn ?? trade.principalAndInterest)!.amount)}
              </Text>
            ) : null}
            {!trade.peak && !trade.allIn && !trade.principalAndInterest ? (
              <Text small>{words.noLower}</Text>
            ) : null}
          </View>
        ) : null}
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

function ProfileUpdateCard({
  value,
}: {
  value: Extract<IntelligenceBlock, { kind: 'profile_update' }>;
}) {
  const { t, money, colors: c } = useDesign();
  const queries = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const update = useMutation({
    mutationFn: () =>
      api.profile({ income: value.income, expenses: value.expenses, debt: value.debt }),
    onSuccess: async () => {
      await queries.invalidateQueries({ queryKey: ['account'] });
      await queries.invalidateQueries({ queryKey: ['loan-matches'] });
      setSaved(true);
      setOpen(false);
    },
  });
  return (
    <Receipt label={t('intelligenceProfileUpdate')} title={t('intelligenceProfileReview')}>
      <AnalysisLedger
        rows={[
          { label: t('income'), value: money(value.income) },
          { label: t('expenses'), value: money(value.expenses) },
          { label: t('debt'), value: money(value.debt) },
        ]}
      />
      <Text small muted>
        {t('intelligenceProfileUpdateHint')}
      </Text>
      <Button
        label={saved ? t('intelligenceProfileUpdated') : t('intelligenceProfileUpdate')}
        variant="outline"
        disabled={saved || update.isPending}
        onPress={() => setOpen(true)}
      />
      <Dialog
        title={t('intelligenceProfileConfirm')}
        visible={open}
        onClose={() => !update.isPending && setOpen(false)}
      >
        <Text>{t('intelligenceProfileUpdateHint')}</Text>
        <Text bold style={{ color: c.primary }}>
          {money(value.income)} · {money(value.expenses)} · {money(value.debt)}
        </Text>
        {update.isError ? <Text role="alert">{t('error')}</Text> : null}
        <Button
          label={t('intelligenceProfileConfirm')}
          loading={update.isPending}
          onPress={() => update.mutate()}
        />
        <Button
          label={t('cancel')}
          variant="outline"
          disabled={update.isPending}
          onPress={() => setOpen(false)}
        />
      </Dialog>
    </Receipt>
  );
}

function SaveScenario({ save, scenario }: { save: Save; scenario: IntelligenceScenario }) {
  const { t, money, colors: c, locale } = useDesign();
  const words = intelligenceDecision(locale);
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
        label={scenario.source === 'saved_simulation' ? words.stressSave : t('intelligenceSave')}
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
        <Text>{scenario.stressBasis ? words.stressSaveHint : t('intelligenceSaveHint')}</Text>
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
  const owner = auth.useSession().data?.user.id;
  const [offersExpanded, expandOffers] = useState(false);
  const [details, setDetails] = useState(false);
  const vi = locale === 'vi-VN';
  const words = intelligenceDecision(locale);
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
    case 'digital_twin': {
      const twin = (key: Parameters<typeof digitalTwinText>[0]) => digitalTwinText(key, locale);
      const signed = (n: number | null) =>
        n === null ? twin('unknown') : (n < 0 ? '−' : '') + money(Math.abs(n));
      return (
        <Receipt
          label={twin('scenario')}
          title={twin('title')}
          figure={twin(value.stressed.resilience)}
        >
          <AnalysisLedger
            rows={[
              {
                label: twin('firstShortfall'),
                value:
                  value.stressed.firstCashShortfall === null
                    ? twin('none')
                    : twin('month').replace('{value}', String(value.stressed.firstCashShortfall)),
              },
              { label: twin('stressed'), value: String(value.stressed.stressedPeriods) },
              {
                label: twin('net'),
                value: signed(value.stressed.minimumCashFlow),
                warning: (value.stressed.minimumCashFlow ?? 0) < 0,
              },
              { label: twin('savingsChart'), value: signed(value.stressed.finalSavings) },
            ]}
          />
          {value.stressed.unknownCosts.map((key) => (
            <Text key={key} small style={{ color: c.warning }}>
              {twin(key === 'origination_fee' ? 'unknownFee' : 'unknownEarlyFee')}
            </Text>
          ))}
          {value.stressed.hypotheticalEarlyRepayment ? (
            <Text small style={{ color: c.warning }}>
              {twin('earlyHypothetical')}
            </Text>
          ) : null}
          <Text small muted>
            {twin('intro')}
          </Text>
          {value.simulationId ? (
            <Button
              label={twin('open')}
              variant="outline"
              onPress={() => router.push('/twin/' + value.simulationId)}
            />
          ) : null}
        </Receipt>
      );
    }
    case 'matches':
      return <LoanMatchingResults result={value.result} compact />;
    case 'profile_update':
      return <ProfileUpdateCard value={value} />;
    case 'document_review':
      return (
        <Receipt label={t('intelligenceDocuments')} title={t('intelligenceDocumentCard')}>
          <Text>{t('intelligenceDocumentFound') + ': ' + value.foundCount}</Text>
          <Text small muted>
            {t('intelligenceDocumentReviewHint')}
          </Text>
          <Button
            label={t('intelligenceDocumentOpen')}
            variant="outline"
            onPress={() =>
              router.push({ pathname: '/documents/[id]', params: { id: value.documentId } })
            }
          />
        </Receipt>
      );
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
      const pressure = scenarioPressure(value);
      const stress = value.stressBasis;
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
              ...(value.total === null
                ? []
                : [
                    { label: t('fee'), value: format(value.fee) },
                    { label: t('assistantIncludingFees'), value: money(value.total) },
                  ]),
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
          {pressure ? (
            <View
              style={{
                borderLeftWidth: 3,
                borderColor: pressure === 'within' ? c.success : c.warning,
                borderRadius: 9,
                backgroundColor: c.elevated,
                padding: 9,
                gap: 2,
              }}
            >
              <Text small bold style={{ color: c.primary }}>
                {words.planningTitle}
                {value.planningCapacity === undefined ? '' : ' · ' + money(value.planningCapacity)}
              </Text>
              <Text small>{words.pressure[pressure]}</Text>
              <Text small muted>
                {words.planningRule}
              </Text>
            </View>
          ) : value.remainingCash === null ? (
            <Text small muted>
              {words.planningUnknown}
            </Text>
          ) : null}
          {stress ? (
            <View style={{ gap: 2 }}>
              <Text small bold>
                {words.stressTitle}
              </Text>
              <AnalysisLedger
                rows={[
                  ...(stress.incomeReductionPercent === null
                    ? []
                    : [
                        {
                          label:
                            words.incomeLoss + ' · ' + percent(stress.incomeReductionPercent / 100),
                          value: money(stress.monthlyIncomeLoss),
                        },
                      ]),
                  ...(stress.expenseIncreasePercent === null && stress.monthlyExpenseIncrease === 0
                    ? []
                    : [
                        {
                          label:
                            words.expenseIncrease +
                            (stress.expenseIncreasePercent === null
                              ? ''
                              : ' · ' + percent(stress.expenseIncreasePercent / 100)),
                          value: money(stress.monthlyExpenseIncrease),
                        },
                      ]),
                ]}
              />
            </View>
          ) : null}
          {value.fee === null ? (
            <Text small muted>
              {vi
                ? 'Chưa biết phí một lần. Tổng có phí chưa xác định.'
                : 'One-time fees are unknown. A total with fees is not available.'}
            </Text>
          ) : null}
          {owner && value.source === 'user_assumptions' ? (
            <Button
              label={vi ? 'Mở mô phỏng với giả định này' : 'Model with these assumptions'}
              variant="soft"
              onPress={() => {
                const handoff = prepareSimulationHandoff(owner, value);
                if (handoff)
                  router.push({ pathname: '/simulate/[id]', params: { id: 'custom', handoff } });
              }}
            />
          ) : null}
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
          {save && (value.source === 'user_assumptions' || value.stressBasis) && value.firstDue ? (
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
            paddingHorizontal: 13,
            paddingVertical: 10,
            backgroundColor: c.surface,
            borderRadius: 16,
            borderTopLeftRadius: 5,
            borderWidth: 1,
            borderColor: c.border,
            gap: 5,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
            {value.kind === 'missing' ? (
              <CircleAlert size={16} color={c.warning} />
            ) : (
              <Info size={16} color={c.primary} />
            )}
            <Text bold style={{ color: value.kind === 'missing' ? c.warning : c.primary }}>
              {t(value.kind === 'missing' ? 'intelligenceMissing' : 'intelligenceNotice')}
            </Text>
          </View>
          <Text>{value.message}</Text>
        </View>
      );
  }
}
