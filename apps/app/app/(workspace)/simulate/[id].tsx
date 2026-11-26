import { useEffect, useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { requestId } from '../../../src/services/request-id';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { loanSchema, type Product, type LoanInput, type Estimate } from '@finora/contracts';
import { percent } from '@finora/i18n';
import { Calculator, ChevronRight } from 'lucide-react-native';
import { Action, Text, Heading, Button, Field, useDesign } from '@finora/ui';
import { Data, Page, Back, Columns } from '../../../src/components/layout';
import { Breakdown } from '../../../src/features/breakdown';
import { LoanProductTerms } from '../../../src/features/catalog';
import { api } from '../../../src/services/client';
import { queryClient, useAccount } from '../../../src/providers/AppProviders';
import { ComparisonGrid, MarketNotice, MarketPanel } from '../../../src/features/market-ui';
import { AmountControl } from '../../../src/features/market-amount';
function nextDue() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((x) => x.type === 'year')?.value),
    month = Number(parts.find((x) => x.type === 'month')?.value);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}
function parseScenario(
  p: Product,
  form: Partial<{ principal: string; months: string; annualRate: string; firstDue: string }>,
) {
  const decimal = (s?: string) =>
    typeof s === 'string' && /^\d+(?:[.,]\d+)?$/.test(s) ? Number(s.replace(',', '.')) : NaN;
  const r = loanSchema.safeParse({
    principal: decimal(form.principal),
    months: decimal(form.months),
    annualRate: decimal(form.annualRate),
    firstDue: form.firstDue,
    method: p.method,
    fee: p.fee,
  });
  return r.success &&
    r.data.principal >= p.amountMin &&
    r.data.principal <= p.amountMax &&
    r.data.months >= p.monthsMin &&
    r.data.months <= p.monthsMax &&
    r.data.annualRate >= p.rateMin &&
    r.data.annualRate <= p.rateMax
    ? r.data
    : null;
}

function Simulator({ p }: { p: Product }) {
  const { t, money, locale, colors: c } = useDesign();
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const account = useAccount();
  const budget = account.data?.readiness?.monthlyBudget;
  const local = (vi: string, en: string) => (locale === 'vi-VN' ? vi : en);
  const [reference, pin] = useState<{ input: LoanInput; result: Estimate } | null>(null);
  const [invalid, mark] = useState(false);
  const [preview, setPreview] = useState<{
    input: LoanInput;
    result: Estimate;
    requestId: string;
  } | null>(null);
  const form = useForm({
    defaultValues: {
      principal: String(Math.min(p.amountMax, Math.max(p.amountMin, 30000000))),
      months: String(Math.min(p.monthsMax, Math.max(p.monthsMin, 12))),
      annualRate: String(p.rateMin),
      firstDue: nextDue(),
    },
  });
  const [changed, setChanged] = useState(false);
  const [principal, months, annualRate, firstDue] = useWatch({
    control: form.control,
    name: ['principal', 'months', 'annualRate', 'firstDue'],
  });
  const liveInput = useMemo(
    () => parseScenario(p, { principal, months, annualRate, firstDue }),
    [p, principal, months, annualRate, firstDue],
  );
  const [live, setLive] = useState<{ input: LoanInput; result: Estimate } | null>(null);
  const calc = useMutation({
    mutationFn: (input: LoanInput) => api.preview(p.id, input),
    onSuccess: (result, input) => setPreview({ result, input, requestId: requestId() }),
  });
  const save = useMutation({
    mutationFn: () => api.save(p.id, preview!.input, preview!.requestId),
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: ['saved'] });
      router.push('/saved/' + row.id);
    },
  });
  useEffect(() => {
    if (!changed || !liveInput || preview || calc.isPending) return;
    let active = true;
    const timer = setTimeout(() => {
      void api
        .preview(p.id, liveInput)
        .then((result) => {
          if (active) setLive({ input: liveInput, result });
        })
        .catch(() => {
          // The explicit schedule action remains the recovery path for a network failure.
        });
    }, 420);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [calc.isPending, changed, liveInput, p.id, preview]);
  const submit = form.handleSubmit((v) => {
    const input = parseScenario(p, v);
    mark(!input);
    if (!input) return;
    if (live?.input === liveInput) {
      setPreview({ result: live.result, input, requestId: requestId() });
    } else calc.mutate(input);
  });
  const changeScenario = () => {
    setPreview(null);
    setChanged(true);
    mark(false);
  };
  const controlsLocked = calc.isPending || save.isPending;
  const setAmount = (value: number) => {
    form.setValue('principal', String(value));
    changeScenario();
  };
  const termChoices = [...new Set([6, 12, 24, 36, 60, p.monthsMin, p.monthsMax])]
    .filter((value) => value >= p.monthsMin && value <= p.monthsMax)
    .sort((x, y) => x - y);
  const inputField = (k: 'principal' | 'annualRate' | 'months' | 'firstDue') => (
    <Controller
      key={k}
      name={k}
      control={form.control}
      render={({ field }) => (
        <Field
          label={t(
            (
              {
                principal: 'amount',
                annualRate: 'yearRate',
                months: 'term',
                firstDue: 'firstDue',
              } as const
            )[k],
          )}
          value={field.value}
          inputMode={k === 'firstDue' ? undefined : k === 'annualRate' ? 'decimal' : 'numeric'}
          editable={!controlsLocked}
          style={
            k === 'principal'
              ? { fontSize: 26, fontVariant: ['tabular-nums'], minHeight: 60 }
              : undefined
          }
          onChangeText={(s) => {
            const group = locale === 'vi-VN' ? /\./g : /,/g;
            const compact = k === 'principal' ? s.replace(/\s/g, '') : s;
            const grouped = locale === 'vi-VN' ? /^\d{1,3}(?:\.\d{3})+$/ : /^\d{1,3}(?:,\d{3})+$/;
            field.onChange(
              k === 'principal' && grouped.test(compact) ? compact.replace(group, '') : compact,
            );
            changeScenario();
          }}
          keyboardType={k === 'firstDue' ? 'default' : 'decimal-pad'}
          hint={
            k === 'principal'
              ? (/^\d{1,15}$/.test(field.value) ? money(Number(field.value)) + ' · ' : '') +
                money(p.amountMin) +
                ' – ' +
                money(p.amountMax)
              : k === 'annualRate'
                ? percent(p.rateMin, locale) + ' – ' + percent(p.rateMax, locale)
                : k === 'months'
                  ? p.monthsMin + '–' + p.monthsMax + ' ' + t('months')
                  : undefined
          }
        />
      )}
    />
  );
  const comparison = reference ? (
    <MarketPanel>
      <Heading size={21}>{local('Mốc so sánh', 'Comparison baseline')}</Heading>
      {preview ? (
        <>
          <ComparisonGrid
            products={[
              {
                name: local('Mốc đã giữ', 'Pinned baseline'),
                institution: reference.input.months + ' ' + t('months'),
                footer: null,
              },
              {
                name: local('Phương án mới', 'New scenario'),
                institution: preview.input.months + ' ' + t('months'),
                footer: null,
              },
            ]}
            rows={[
              {
                label: t('amount'),
                values: [money(reference.input.principal), money(preview.input.principal)],
              },
              {
                label: t('yearRate'),
                values: [
                  percent(reference.input.annualRate, locale),
                  percent(preview.input.annualRate, locale),
                ],
              },
              {
                label: t('firstPayment'),
                values: [money(reference.result.firstPayment), money(preview.result.firstPayment)],
              },
              {
                label: t('repayment'),
                values: [money(reference.result.repayment), money(preview.result.repayment)],
              },
            ]}
          />
          <Text bold>
            {local('Chênh lệch kỳ đầu', 'Difference in first payment')}:{' '}
            {preview.result.firstPayment > reference.result.firstPayment ? '+' : ''}
            {money(preview.result.firstPayment - reference.result.firstPayment)}
          </Text>
        </>
      ) : (
        <>
          <Text bold>
            {money(reference.input.principal)} · {reference.input.months} {t('months')}
          </Text>
          <Text muted>
            {t('firstPayment')}: {money(reference.result.firstPayment)}.{' '}
            {local(
              'Đổi giả định rồi tính lịch mới để so sánh.',
              'Change your assumptions and calculate again to compare.',
            )}
          </Text>
        </>
      )}
      <Button
        variant="outline"
        label={local('Bỏ mốc', 'Clear baseline')}
        onPress={() => pin(null)}
      />
    </MarketPanel>
  ) : null;
  return (
    <Page
      title={locale === 'vi-VN' ? p.name : p.nameEn}
      description={p.institution + ' · ' + t('sample')}
      top={<Back to={() => router.navigate('/explore?mode=sample')} />}
    >
      <Columns style={{ gap: desktop ? 32 : 20, alignItems: 'stretch' }}>
        <View style={{ flex: desktop ? 1 : undefined, minWidth: 0, gap: 22 }}>
          <MarketPanel style={{ padding: desktop ? 21 : 16, gap: 13 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Calculator size={21} color={c.primary} />
              <Heading size={22}>{local('Lập phương án', 'Set up your scenario')}</Heading>
            </View>
            {inputField('principal')}
            <AmountControl
              value={Number(principal)}
              min={p.amountMin}
              max={p.amountMax}
              disabled={controlsLocked}
              onChange={setAmount}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, minWidth: 0 }}>{inputField('annualRate')}</View>
              <View style={{ flex: 1, minWidth: 0 }}>{inputField('months')}</View>
            </View>
            {!!termChoices.length && (
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {termChoices.map((value) => (
                  <Action
                    key={value}
                    role="radio"
                    label={value + ' ' + t('months')}
                    selected={Number(months) === value}
                    disabled={controlsLocked}
                    onPress={() => {
                      form.setValue('months', String(value));
                      changeScenario();
                    }}
                    style={{
                      borderRadius: 10,
                      backgroundColor: Number(months) === value ? c.secondary : c.elevated,
                      paddingHorizontal: 9,
                    }}
                  >
                    <Text small bold style={{ color: c.primary }}>
                      {value} {t('months')}
                    </Text>
                  </Action>
                ))}
              </View>
            )}
            {inputField('firstDue')}
            <MarketNotice title={t('method') + ': ' + t(p.method)}>{t('planHint')}</MarketNotice>
            {invalid || calc.isError ? (
              <Text role="alert" style={{ color: c.error }}>
                {t(invalid ? 'invalidRange' : 'error')}
              </Text>
            ) : null}
            <Button
              label={t('preview')}
              onPress={submit}
              loading={calc.isPending}
              disabled={save.isPending}
              icon={<ChevronRight color={c.onPrimary} size={16} />}
            />
          </MarketPanel>
          {desktop ? <LoanProductTerms p={p} /> : null}
        </View>
        <View style={{ flex: desktop ? 1.2 : undefined, minWidth: 0, gap: 18 }}>
          {preview ? (
            <Breakdown
              {...preview}
              budget={budget}
              actions={
                <>
                  <Button
                    label={t('save')}
                    onPress={() => save.mutate()}
                    loading={save.isPending}
                  />
                  {save.isError ? <Text role="alert">{t('error')}</Text> : null}
                  {comparison}
                  {!reference ? (
                    <Button
                      variant="outline"
                      label={local('Giữ làm mốc so sánh', 'Keep as comparison baseline')}
                      onPress={() => pin(preview)}
                    />
                  ) : null}
                </>
              }
            />
          ) : (
            <MarketPanel
              style={{ backgroundColor: c.secondary, borderColor: c.secondary, padding: 18 }}
            >
              {live?.input === liveInput ? (
                <View style={{ gap: 5 }}>
                  <Text muted small>
                    {local('Ước tính kỳ đầu', 'Estimated first payment')}
                  </Text>
                  <Text
                    bold
                    style={{
                      fontSize: 27,
                      lineHeight: 33,
                      color: c.primary,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {money(live.result.firstPayment)}
                  </Text>
                  <Text muted small>
                    {local(
                      'Bấm tính lịch để xem đầy đủ các kỳ và khoản phí.',
                      'Calculate the schedule to review every payment and fee.',
                    )}
                  </Text>
                </View>
              ) : (
                <>
                  <Heading size={20}>
                    {local('Xem từng kỳ trước khi vay', 'See each payment before borrowing')}
                  </Heading>
                  <Text muted small>
                    {local(
                      'Tính lịch để xem kỳ đầu, gốc, lãi và các khoản phí đã biết.',
                      'Calculate a schedule to see the first payment, principal, interest and known fees.',
                    )}
                  </Text>
                </>
              )}
            </MarketPanel>
          )}
          {!preview ? comparison : null}
          {!desktop ? <LoanProductTerms p={p} /> : null}
        </View>
      </Columns>
    </Page>
  );
}
export default function SimulateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['product', id], queryFn: () => api.product(id), enabled: !!id });
  return <Data q={q}>{(p) => <Simulator key={p.id} p={p} />}</Data>;
}
