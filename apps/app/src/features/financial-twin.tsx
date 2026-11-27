import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CircleAlert, Plus } from 'lucide-react-native';
import {
  twinComparisonRequestSchema,
  type TwinComparison,
  twinShockSchema,
  type TwinScenario,
} from '@finora/contracts';
import { digitalTwinText, type DigitalTwinCopyKey } from '@finora/i18n';
import { Action, Button, Heading, Text, useDesign } from '@finora/ui';
import { Page, Data, backTo } from '../components/layout';
import { MarketPanel } from './market-ui';
import { api, auth } from '../services/client';

type Shock = TwinScenario['shocks'][number];
type Mode = Shock['kind'] | 'alternativeTerm' | 'alternativeAmount';
const modes: Mode[] = [
  'incomeReduction',
  'unemployment',
  'unexpectedExpense',
  'expenseInflation',
  'additionalDebt',
  'earlyRepayment',
  'alternativeTerm',
  'alternativeAmount',
];
const amountFields = [
  ['monthlyIncome', 'income'],
  ['essentialExpenses', 'essential'],
  ['discretionaryExpenses', 'discretionary'],
  ['existingDebtPayments', 'debt'],
  ['currentSavings', 'savings'],
  ['emergencyFund', 'reserve'],
] as const;
type AmountField = (typeof amountFields)[number][0];
const parseAmount = (raw: string) =>
  /^\d{1,13}$/.test(raw) && Number(raw) <= 1_000_000_000_000 ? Number(raw) : null;

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  const { colors: c } = useDesign();
  return (
    <View style={{ flexGrow: 1, flexBasis: 150, minWidth: 0, gap: 4 }}>
      <Text small muted>
        {label}
      </Text>
      <Text
        bold
        style={{
          color: warning ? c.warning : c.primary,
          fontSize: 17,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function BarSeries({
  title,
  baseline,
  alternative,
  value,
}: {
  title: string;
  baseline: TwinComparison['baseline']['months'];
  alternative: TwinComparison['baseline']['months'];
  value: 'netCashFlow' | 'accumulatedSavings' | 'loanBalance';
}) {
  const { colors: c, locale, money } = useDesign();
  const t = (key: DigitalTwinCopyKey) => digitalTwinText(key, locale);
  const sample = Array.from(
    { length: Math.min(12, Math.max(baseline.length, alternative.length)) },
    (_, i) => i,
  );
  const scale = Math.max(
    1,
    ...sample.flatMap((i) => [
      Math.abs(baseline[i]?.[value] ?? 0),
      Math.abs(alternative[i]?.[value] ?? 0),
    ]),
  );
  return (
    <MarketPanel style={{ gap: 10 }}>
      <Heading size={18}>{title}</Heading>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <Text small style={{ color: c.primary }}>
          ■ {t('baseline')}
        </Text>
        <Text small style={{ color: c.warning }}>
          ■ {t('scenario')}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel={title}>
        <View style={{ flexDirection: 'row', gap: 7, paddingBottom: 4 }}>
          {sample.map((i) => (
            <View key={i} style={{ width: 95, gap: 4 }}>
              <Text small muted>
                {t('month').replace('{value}', String(i + 1))}
              </Text>
              {([baseline[i]?.[value], alternative[i]?.[value]] as const).map((n, j) => (
                <View key={j}>
                  <View
                    style={{
                      height: 9,
                      width: `${Math.max(2, Math.round((Math.abs(n ?? 0) / scale) * 100))}%`,
                      borderRadius: 4,
                      backgroundColor:
                        n !== null && n !== undefined && n < 0
                          ? c.warning
                          : j
                            ? c.actionAmber
                            : c.primary,
                    }}
                  />
                  <Text
                    small
                    numberOfLines={1}
                    style={{
                      color: n !== null && n !== undefined && n < 0 ? c.warning : c.muted,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {n === null || n === undefined
                      ? t('unknown')
                      : (n < 0 ? '−' : '') + money(Math.abs(n))}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </MarketPanel>
  );
}

export function FinancialTwin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { locale, money, colors: c } = useDesign();
  const { width } = useWindowDimensions();
  const t = (key: DigitalTwinCopyKey) => digitalTwinText(key, locale);
  const session = auth.useSession();
  const saved = useQuery({
    queryKey: ['savedOne', session.data?.user.id, id],
    queryFn: () => api.detail(id!),
    enabled: !!session.data?.user.id && !!id,
  });
  const account = useQuery({
    queryKey: ['account', session.data?.user.id],
    queryFn: api.account,
    enabled: !!session.data?.user.id,
  });
  const [values, setValues] = useState<Record<AmountField, string>>({
    monthlyIncome: '',
    essentialExpenses: '',
    discretionaryExpenses: '',
    existingDebtPayments: '',
    currentSavings: '',
    emergencyFund: '',
  });
  const [prefilled, setPrefilled] = useState(false);
  const [stability, setStability] = useState<'stable' | 'variable' | 'unknown'>('unknown');
  if (!prefilled && account.data?.profile) {
    setValues((old) => ({
      ...old,
      monthlyIncome: String(account.data!.profile!.income),
      existingDebtPayments: String(account.data!.profile!.debt),
    }));
    setPrefilled(true);
  }
  const [mode, setMode] = useState<Mode>('incomeReduction');
  const [start, setStart] = useState('1');
  const [duration, setDuration] = useState('3');
  const [severity, setSeverity] = useState('');
  const [fee, setFee] = useState('');
  const [shocks, setShocks] = useState<Shock[]>([]);
  const [alternativeLoan, setAlternativeLoan] = useState<{ principal?: number; months?: number }>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(0);
  const projection = useMutation({
    mutationFn: (input: Omit<typeof twinComparisonRequestSchema._output, 'loan'>) =>
      api.compareSavedTwin(id!, input),
    onError: () => setError(t('failed')),
    onSuccess: () => {
      setError(null);
      setMonth(0);
    },
  });
  const addShock = () => {
    const monthNumber = Number(start),
      durationNumber = Number(duration),
      magnitude = Number(severity);
    if (
      !Number.isInteger(monthNumber) ||
      monthNumber < 1 ||
      monthNumber > 360 ||
      !Number.isInteger(durationNumber) ||
      durationNumber < 1 ||
      durationNumber > 360 ||
      (mode !== 'unemployment' &&
        (severity.trim() === '' || !Number.isFinite(magnitude) || magnitude < 0))
    ) {
      setError(t('invalid'));
      return;
    }
    if (mode === 'alternativeTerm' || mode === 'alternativeAmount') {
      if (
        !Number.isInteger(magnitude) ||
        magnitude < 1 ||
        (mode === 'alternativeTerm' ? magnitude > 360 : magnitude > 1_000_000_000_000)
      ) {
        setError(t('invalid'));
        return;
      }
      setAlternativeLoan((old) => ({
        ...old,
        [mode === 'alternativeTerm' ? 'months' : 'principal']: magnitude,
      }));
      setError(null);
      return;
    }
    const interval = { startMonth: monthNumber, durationMonths: durationNumber };
    let shock: Shock;
    if (mode === 'incomeReduction' || mode === 'expenseInflation')
      shock = { kind: mode, ...interval, percent: magnitude };
    else if (mode === 'unemployment') shock = { kind: mode, ...interval };
    else if (mode === 'unexpectedExpense')
      shock = { kind: mode, startMonth: monthNumber, amount: magnitude };
    else if (mode === 'additionalDebt')
      shock = { kind: mode, ...interval, monthlyPayment: magnitude };
    else
      shock = {
        kind: 'earlyRepayment',
        startMonth: monthNumber,
        amount: magnitude,
        fee: fee.trim() === '' ? null : parseAmount(fee),
      };
    if (shocks.length >= 12 || !twinShockSchema.safeParse(shock).success) {
      setError(t('invalid'));
      return;
    }
    setShocks((old) => [...old, shock]);
    setError(null);
  };
  const calculate = () => {
    if (!shocks.length && !Object.keys(alternativeLoan).length) {
      setError(t('noShock'));
      return;
    }
    const state = {
      monthlyIncome:
        values.monthlyIncome === ''
          ? null
          : { amount: parseAmount(values.monthlyIncome), source: 'user_estimate' },
      essentialExpenses:
        values.essentialExpenses === ''
          ? null
          : { amount: parseAmount(values.essentialExpenses), source: 'user_estimate' },
      discretionaryExpenses:
        values.discretionaryExpenses === ''
          ? null
          : { amount: parseAmount(values.discretionaryExpenses), source: 'user_estimate' },
      existingDebtPayments:
        values.existingDebtPayments === ''
          ? null
          : { amount: parseAmount(values.existingDebtPayments), source: 'user_estimate' },
      currentSavings:
        values.currentSavings === ''
          ? null
          : { amount: parseAmount(values.currentSavings), source: 'user_estimate' },
      emergencyFund:
        values.emergencyFund === ''
          ? null
          : { amount: parseAmount(values.emergencyFund), source: 'user_estimate' },
      incomeStability: stability,
      events: [],
    };
    const parsed = twinComparisonRequestSchema.omit({ loan: true }).safeParse({
      state,
      scenarios: [{ shocks, ...(Object.keys(alternativeLoan).length ? { alternativeLoan } : {}) }],
    });
    if (!parsed.success) {
      setError(t('invalid'));
      return;
    }
    if (
      parsed.data.state.monthlyIncome === null ||
      parsed.data.state.essentialExpenses === null ||
      parsed.data.state.discretionaryExpenses === null ||
      parsed.data.state.existingDebtPayments === null
    ) {
      setError(t('missing'));
      return;
    }
    setError(null);
    projection.mutate(parsed.data);
  };
  return (
    <Data
      q={saved}
      pendingDetail={{ title: t('title'), onBack: () => backTo('/loans?pane=simulations') }}
    >
      {(loan) => (
        <Page
          title={t('title')}
          description={t('intro')}
          detail={{ onBack: () => backTo('/saved/' + id) }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 950,
              alignSelf: 'center',
              gap: 16,
              paddingBottom: 40,
            }}
          >
            <MarketPanel style={{ gap: 5, backgroundColor: c.secondary }}>
              <Text bold>{locale === 'vi-VN' ? loan.product.name : loan.product.nameEn}</Text>
              <Text small>
                {money(loan.input.principal)} · {loan.input.months} {t('monthLabel').toLowerCase()}{' '}
                · {loan.input.annualRate}% · {loan.input.method}
              </Text>
            </MarketPanel>
            <MarketPanel style={{ gap: 12 }}>
              <Heading size={20}>{t('budget')}</Heading>
              <Text small muted>
                {t('optionalHint')} {t('profileHint')}
              </Text>
              <Text small muted>
                {t('userEstimate')}
              </Text>
              {account.data?.profile ? (
                <Text small muted>
                  {t('expensesHint').replace('{amount}', money(account.data.profile.expenses))}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {amountFields.map(([key, label]) => (
                  <View
                    key={key}
                    style={{ flexGrow: 1, flexBasis: width < 600 ? 140 : 240, gap: 5 }}
                  >
                    <Text small bold>
                      {t(label)}
                    </Text>
                    <TextInput
                      accessibilityLabel={t(label)}
                      value={values[key]}
                      onChangeText={(raw) =>
                        setValues((old) => ({ ...old, [key]: raw.replace(/[^0-9]/g, '') }))
                      }
                      keyboardType="number-pad"
                      inputMode="numeric"
                      placeholder={t('unknown')}
                      placeholderTextColor={c.muted}
                      style={{
                        minHeight: 48,
                        borderWidth: 1,
                        borderColor: c.border,
                        backgroundColor: c.elevated,
                        borderRadius: 12,
                        color: c.foreground,
                        paddingHorizontal: 12,
                        fontSize: 16,
                      }}
                    />
                  </View>
                ))}
              </View>
              <View style={{ gap: 6 }}>
                <Text small bold>
                  {t('stability')}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                  {(['stable', 'variable', 'unknown'] as const).map((choice) => (
                    <Pressable
                      key={choice}
                      accessibilityRole="button"
                      accessibilityState={{ selected: stability === choice }}
                      onPress={() => setStability(choice)}
                      style={{
                        minHeight: 44,
                        justifyContent: 'center',
                        borderRadius: 11,
                        paddingHorizontal: 12,
                        backgroundColor: stability === choice ? c.secondary : c.elevated,
                        borderWidth: 1,
                        borderColor: stability === choice ? c.primary : c.border,
                      }}
                    >
                      <Text
                        small
                        bold
                        style={{ color: stability === choice ? c.primary : c.foreground }}
                      >
                        {t(choice)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </MarketPanel>
            <MarketPanel style={{ gap: 12 }}>
              <Heading size={20}>{t('scenario')}</Heading>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {modes.map((item) => (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: mode === item }}
                    onPress={() => {
                      setMode(item);
                      setSeverity('');
                    }}
                    style={{
                      minHeight: 44,
                      justifyContent: 'center',
                      borderRadius: 11,
                      paddingHorizontal: 11,
                      backgroundColor: mode === item ? c.secondary : c.elevated,
                      borderWidth: 1,
                      borderColor: mode === item ? c.primary : c.border,
                    }}
                  >
                    <Text small bold style={{ color: mode === item ? c.primary : c.foreground }}>
                      {t(item)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {mode !== 'alternativeTerm' && mode !== 'alternativeAmount' ? (
                  <TwinInput label={t('start')} value={start} setValue={setStart} />
                ) : null}
                {['incomeReduction', 'unemployment', 'expenseInflation', 'additionalDebt'].includes(
                  mode,
                ) ? (
                  <TwinInput label={t('duration')} value={duration} setValue={setDuration} />
                ) : null}
                {mode !== 'unemployment' ? (
                  <TwinInput
                    label={
                      mode === 'alternativeTerm'
                        ? t('alternativeTerm')
                        : mode === 'alternativeAmount'
                          ? t('alternativeAmount')
                          : t('severity')
                    }
                    value={severity}
                    setValue={setSeverity}
                  />
                ) : null}
                {mode === 'earlyRepayment' ? (
                  <TwinInput label={t('fee')} value={fee} setValue={setFee} />
                ) : null}
              </View>
              <Button
                label={t('add')}
                icon={<Plus size={16} color={c.onPrimary} />}
                onPress={addShock}
              />
              {shocks.map((shock, index) => (
                <Action
                  key={index}
                  label={t('remove')}
                  onPress={() => setShocks((old) => old.filter((_, i) => i !== index))}
                  style={{ minHeight: 44, alignItems: 'flex-start' }}
                >
                  <Text>
                    {t(shock.kind)} · {t('month').replace('{value}', String(shock.startMonth))} ×
                  </Text>
                </Action>
              ))}
              {Object.entries(alternativeLoan).map(([key, value]) => (
                <Action
                  key={key}
                  label={t('remove')}
                  onPress={() =>
                    setAlternativeLoan((old) => {
                      const next = { ...old };
                      delete next[key as keyof typeof next];
                      return next;
                    })
                  }
                  style={{ minHeight: 44 }}
                >
                  <Text>
                    {t(key === 'months' ? 'alternativeTerm' : 'alternativeAmount')}: {value} ×
                  </Text>
                </Action>
              ))}
              {error ? (
                <Text small style={{ color: c.warning }}>
                  {error}
                </Text>
              ) : null}
              <Button
                label={
                  projection.isPending
                    ? t('calculating')
                    : projection.isError
                      ? t('retry')
                      : t('run')
                }
                onPress={calculate}
                disabled={projection.isPending}
              />
            </MarketPanel>
            {projection.data ? (
              <TwinResults result={projection.data} month={month} setMonth={setMonth} />
            ) : null}
          </View>
        </Page>
      )}
    </Data>
  );
}

function TwinInput({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  const { colors: c } = useDesign();
  return (
    <View style={{ flexGrow: 1, flexBasis: 145, gap: 5 }}>
      <Text small bold>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={(raw) => setValue(raw.replace(/[^0-9.]/g, ''))}
        keyboardType="decimal-pad"
        inputMode="decimal"
        placeholder="—"
        placeholderTextColor={c.muted}
        style={{
          minHeight: 48,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.elevated,
          borderRadius: 12,
          color: c.foreground,
          paddingHorizontal: 12,
          fontSize: 16,
        }}
      />
    </View>
  );
}

function TwinResults({
  result,
  month,
  setMonth,
}: {
  result: TwinComparison;
  month: number;
  setMonth: (v: number) => void;
}) {
  const { locale, money, colors: c } = useDesign();
  const t = (key: DigitalTwinCopyKey) => digitalTwinText(key, locale);
  const base = result.baseline,
    stress = result.alternatives[0];
  const row = stress.months[month];
  const signed = (n: number | null) =>
    n === null ? t('unknown') : (n < 0 ? '−' : '') + money(Math.abs(n));
  return (
    <View style={{ gap: 14 }}>
      <MarketPanel style={{ gap: 12 }}>
        <Heading size={20}>
          {t('outcome')}: {t(stress.resilience)}
        </Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Metric
            label={t('firstShortfall')}
            value={
              stress.firstCashShortfall === null
                ? t('none')
                : t('month').replace('{value}', String(stress.firstCashShortfall))
            }
            warning={stress.firstCashShortfall !== null}
          />
          <Metric
            label={t('stressed')}
            value={String(stress.stressedPeriods)}
            warning={stress.stressedPeriods > 0}
          />
          <Metric
            label={t('coverage')}
            value={
              stress.months[0]?.emergencyCoverageMonths === null
                ? t('unknown')
                : String(stress.months[0]?.emergencyCoverageMonths ?? '—') +
                  ' ' +
                  t('monthLabel').toLowerCase()
            }
          />
        </View>
        {stress.unknownCosts.map((key) => (
          <View key={key} style={{ flexDirection: 'row', gap: 7 }}>
            <CircleAlert size={16} color={c.warning} />
            <Text small style={{ color: c.warning }}>
              {t(key === 'origination_fee' ? 'unknownFee' : 'unknownEarlyFee')}
            </Text>
          </View>
        ))}
        {stress.hypotheticalEarlyRepayment ? (
          <Text small style={{ color: c.warning }}>
            {t('earlyHypothetical')}
          </Text>
        ) : null}
      </MarketPanel>
      {stress.months.length ? (
        <>
          <BarSeries
            title={t('chart')}
            baseline={base.months}
            alternative={stress.months}
            value="netCashFlow"
          />
          <BarSeries
            title={t('savingsChart')}
            baseline={base.months}
            alternative={stress.months}
            value="accumulatedSavings"
          />
          <BarSeries
            title={t('balanceChart')}
            baseline={base.months}
            alternative={stress.months}
            value="loanBalance"
          />
          <MarketPanel style={{ gap: 12 }}>
            <Heading size={20}>{t('breakdown')}</Heading>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Action
                label={t('prev')}
                disabled={month <= 0}
                onPress={() => setMonth(Math.max(0, month - 1))}
                style={{ minHeight: 44 }}
              >
                <Text>‹ {t('prev')}</Text>
              </Action>
              <Text bold>{t('month').replace('{value}', String(month + 1))}</Text>
              <Action
                label={t('next')}
                disabled={month >= stress.months.length - 1}
                onPress={() => setMonth(Math.min(stress.months.length - 1, month + 1))}
                style={{ minHeight: 44 }}
              >
                <Text>{t('next')} ›</Text>
              </Action>
            </View>
            {row ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <Metric label={t('income')} value={money(row.income)} />
                <Metric label={t('essential')} value={money(row.essentialExpenses)} />
                <Metric label={t('discretionary')} value={money(row.discretionaryExpenses)} />
                <Metric label={t('debt')} value={money(row.existingDebtPayments)} />
                <Metric label={t('payment')} value={money(row.loanPayment)} />
                <Metric
                  label={t('net')}
                  value={signed(row.netCashFlow)}
                  warning={row.cashShortfall}
                />
                <Metric label={t('savingsChart')} value={signed(row.accumulatedSavings)} />
                <Metric label={t('balanceChart')} value={money(row.loanBalance)} />
              </View>
            ) : null}
          </MarketPanel>
        </>
      ) : (
        <Text>{t('missing')}</Text>
      )}
      <MarketPanel style={{ gap: 6 }}>
        <Heading size={18}>{t('assumptions')}</Heading>
        <Text small muted>
          {t('intro')}
        </Text>
        <Text small muted>
          {t('threshold')
            .replace('{dti}', String(stress.thresholds.stressedDebtToIncomePercent))
            .replace('{reserve}', String(stress.thresholds.requiredEmergencyMonths))}
        </Text>
      </MarketPanel>
    </View>
  );
}
