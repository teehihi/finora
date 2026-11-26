import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { requestId } from '../../../src/services/request-id';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, useWatch, Controller } from 'react-hook-form';
import type { Product, LoanInput, Estimate, Method } from '@finora/contracts';
import { simulate } from '@finora/financial-engine';
import { percent } from '@finora/i18n';
import { Calculator, CalendarDays, ChevronRight } from 'lucide-react-native';
import { tokens } from '@finora/design-tokens';
import { Action, Text, Heading, Button, Choices, Dialog, Field, useDesign } from '@finora/ui';
import { Data, Page, Back, Columns } from '../../../src/components/layout';
import { SignatureIcon } from '../../../src/components/signature';
import { PlanningSnapshot } from '../../../src/features/simulator-signature';
import { Breakdown } from '../../../src/features/breakdown';
import { LoanProductTerms } from '../../../src/features/catalog';
import { api } from '../../../src/services/client';
import { queryClient, useAccount } from '../../../src/providers/AppProviders';
import { ComparisonGrid, MarketNotice, MarketPanel } from '../../../src/features/market-ui';
import { AmountControl } from '../../../src/features/market-amount';
import {
  normalizeIntegerInput,
  parseScenario,
  sameScenarioInput,
  scenarioDefaults,
  type ScenarioFields,
} from '../../../src/features/simulation-model';

const fieldLabels = {
  principal: 'amount',
  annualRate: 'yearRate',
  months: 'term',
  firstDue: 'firstDue',
} as const;

function Simulator({
  p,
  amount,
  term,
  due,
}: {
  p: Product | null;
  amount?: string;
  term?: string;
  due?: string;
}) {
  const { t, money, locale, colors: c } = useDesign();
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const account = useAccount();
  const budget = account.data?.readiness?.monthlyBudget;
  const local = (vi: string, en: string) => (locale === 'vi-VN' ? vi : en);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const resultAnchor = useRef<ComponentRef<typeof View>>(null);
  const revealedResult = useRef<string | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [reference, pin] = useState<{ input: LoanInput; result: Estimate } | null>(null);
  const [invalid, mark] = useState(false);
  const [preview, setPreview] = useState<{
    input: LoanInput;
    result: Estimate;
    requestId: string;
  } | null>(null);
  const form = useForm<ScenarioFields>({
    defaultValues: scenarioDefaults(p, { amount, months: term, firstDue: due }),
  });
  const [changed, setChanged] = useState(false);
  const [principal, months, annualRate, firstDue, method, fee] = useWatch({
    control: form.control,
    name: ['principal', 'months', 'annualRate', 'firstDue', 'method', 'fee'],
  });
  const liveInput = useMemo(
    () => parseScenario(p, { principal, months, annualRate, firstDue, method, fee }),
    [p, principal, months, annualRate, firstDue, method, fee],
  );
  const productId = p?.id;
  const [live, setLive] = useState<{ input: LoanInput; result: Estimate } | null>(null);
  const calc = useMutation({
    mutationFn: async (input: LoanInput) =>
      productId ? await api.preview(productId, input) : simulate(input),
    onSuccess: (result, input) => setPreview({ result, input, requestId: requestId() }),
  });
  const save = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error('No scenario to save');
      return productId
        ? api.save(productId, preview.input, preview.requestId)
        : api.saveCustom({ confirmed: true, input: preview.input, requestId: preview.requestId });
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: ['saved'] });
      router.push('/saved/' + row.id);
    },
  });
  useEffect(() => {
    if (!changed || !liveInput || preview || calc.isPending) return;
    let active = true;
    const timer = setTimeout(() => {
      const calculate = async () =>
        productId ? await api.preview(productId, liveInput) : simulate(liveInput);
      void calculate()
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
  }, [calc.isPending, changed, liveInput, productId, preview]);
  const submit = form.handleSubmit((v) => {
    const input = parseScenario(p, v);
    mark(!input);
    if (!input) return;
    Keyboard.dismiss();
    if (live && sameScenarioInput(live.input, input)) {
      setPreview({ result: live.result, input, requestId: requestId() });
    } else calc.mutate(input);
  });
  const revealResult = () => {
    if (desktop || !preview || revealedResult.current === preview.requestId) return;
    const scrollView = scroll.current;
    const anchor = resultAnchor.current;
    const content = scrollView?.getInnerViewRef();
    if (!scrollView || !content || !anchor) return;
    anchor.measureLayout(
      content,
      (_, top) => {
        revealedResult.current = preview.requestId;
        if (Platform.OS === 'web') anchor.focus();
        scrollView.scrollTo({ y: Math.max(0, top - 8), animated: false });
      },
      () => {},
    );
  };
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
  const minMonths = p?.monthsMin ?? 1;
  const maxMonths = p?.monthsMax ?? 360;
  const termChoices = [...new Set([6, 12, 24, 36, 60, ...(p ? [minMonths, maxMonths] : [])])]
    .filter((value) => value >= minMonths && value <= maxMonths)
    .sort((x, y) => x - y);
  const inputField = (k: 'principal' | 'annualRate' | 'months' | 'firstDue' | 'fee') => (
    <Controller
      key={k}
      name={k}
      control={form.control}
      render={({ field }) => {
        const integer = k === 'principal' || k === 'fee';
        const dateField = k === 'firstDue';
        const hint =
          k === 'principal'
            ? [
                /^\d{1,13}$/.test(field.value) ? money(Number(field.value)) : '',
                p ? money(p.amountMin) + ' – ' + money(p.amountMax) : '',
              ]
                .filter(Boolean)
                .join(' · ')
            : k === 'annualRate'
              ? p
                ? percent(p.rateMin, locale) + ' – ' + percent(p.rateMax, locale)
                : local(
                    'Nhập % mỗi năm, không phải % mỗi tháng.',
                    'Enter % per year, not a monthly rate.',
                  )
              : k === 'months'
                ? minMonths + '–' + maxMonths + ' ' + t('months')
                : k === 'fee'
                  ? local(
                      'Để trống nếu chưa biết. Chỉ nhập 0 khi đã xác nhận không có phí.',
                      'Leave blank if unknown. Enter 0 only if you know there are no fees.',
                    )
                  : 'YYYY-MM-DD';
        return (
          <Field
            label={
              k === 'fee'
                ? local('Tổng phí một lần (VND)', 'Total one-time fees (VND)')
                : t(fieldLabels[k])
            }
            value={field.value}
            inputMode={dateField ? undefined : k === 'annualRate' ? 'decimal' : 'numeric'}
            editable={!controlsLocked}
            style={
              k === 'principal'
                ? {
                    fontSize: 30,
                    minHeight: 62,
                    fontFamily: tokens.font.heading,
                    fontVariant: ['tabular-nums'],
                    letterSpacing: -0.6,
                    color: c.foreground,
                  }
                : { fontVariant: ['tabular-nums'] }
            }
            onChangeText={(value) => {
              field.onChange(integer ? normalizeIntegerInput(value, locale) : value);
              changeScenario();
            }}
            keyboardType={dateField ? 'default' : k === 'annualRate' ? 'decimal-pad' : 'number-pad'}
            hint={hint || undefined}
          />
        );
      }}
    />
  );
  const peak = (result: Estimate) => Math.max(...result.schedule.map((row) => row.payment));
  const comparison = reference ? (
    <MarketPanel style={{ padding: 18, borderRadius: 22 }}>
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
                label: local('Kỳ cao nhất theo lịch', 'Highest scheduled payment'),
                values: [money(peak(reference.result)), money(peak(preview.result))],
              },
              {
                label: t('method'),
                values: [t(reference.input.method), t(preview.input.method)],
              },
              {
                label: t('repayment'),
                values: [money(reference.result.repayment), money(preview.result.repayment)],
              },
              {
                label: t('total'),
                values: [
                  reference.result.total === null ? t('unknown') : money(reference.result.total),
                  preview.result.total === null ? t('unknown') : money(preview.result.total),
                ],
              },
            ]}
          />
          {preview.input.principal !== reference.input.principal ? (
            <Text small muted>
              {local(
                'Hai phương án khác số tiền vay. Không nên đọc chênh lệch như phương án nào rẻ hơn.',
                'These scenarios borrow different amounts. Read their cash flows separately rather than treating one as cheaper.',
              )}
            </Text>
          ) : null}
          <View style={{ backgroundColor: c.secondary, borderRadius: 13, padding: 11 }}>
            <Text bold style={{ fontVariant: ['tabular-nums'], color: c.primary }}>
              {local('Chênh lệch kỳ đầu', 'Difference in first payment')}:{' '}
              {preview.result.firstPayment > reference.result.firstPayment ? '+' : ''}
              {money(preview.result.firstPayment - reference.result.firstPayment)}
            </Text>
          </View>
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
      scrollRef={scroll}
      title={
        p
          ? locale === 'vi-VN'
            ? p.name
            : p.nameEn
          : local('Mô phỏng khoản vay của bạn', 'Simulate your own loan')
      }
      description={
        p
          ? p.institution + ' · ' + t('sample')
          : local(
              'Dùng điều khoản bạn đã xác nhận. Kết quả chỉ là ước tính, không phải báo giá.',
              'Use terms you have confirmed. Results are estimates, not a quote.',
            )
      }
      top={<Back to={() => router.navigate(p ? '/explore?mode=sample' : '/explore')} />}
    >
      <Columns style={{ gap: desktop ? 30 : 19, alignItems: desktop ? 'flex-start' : 'stretch' }}>
        <View style={{ flex: desktop ? 1 : undefined, minWidth: 0, gap: 22 }}>
          <MarketPanel style={{ padding: desktop ? 22 : 16, gap: 16, borderRadius: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
              <SignatureIcon icon={Calculator} size={42} />
              <View style={{ minWidth: 0, flex: 1 }}>
                <Text
                  small
                  bold
                  style={{ color: c.primary, fontSize: 11, letterSpacing: 1.1, lineHeight: 16 }}
                >
                  {local('01 · ĐIỀU KHOẢN', '01 · LOAN TERMS')}
                </Text>
                <Heading size={21}>{local('Lập phương án', 'Set up your scenario')}</Heading>
              </View>
            </View>
            <View
              style={{
                borderRadius: 18,
                padding: 12,
                paddingBottom: p ? 10 : 12,
                gap: 6,
                backgroundColor: c.elevated,
              }}
            >
              {inputField('principal')}
              {p ? (
                <AmountControl
                  value={Number(principal)}
                  min={p.amountMin}
                  max={p.amountMax}
                  disabled={controlsLocked}
                  onChange={setAmount}
                />
              ) : null}
            </View>
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
                      borderRadius: 11,
                      borderWidth: 1,
                      borderColor: Number(months) === value ? c.primary : c.border,
                      backgroundColor: Number(months) === value ? c.secondary : c.surface,
                      alignItems: 'center',
                      paddingHorizontal: 10,
                    }}
                  >
                    <Text small bold style={{ color: c.primary }}>
                      {value} {t('months')}
                    </Text>
                  </Action>
                ))}
              </View>
            )}
            <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 13, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <CalendarDays size={15} color={c.primary} />
                <Text small bold style={{ color: c.primary, fontSize: 11, letterSpacing: 0.9 }}>
                  {local('LỊCH THANH TOÁN', 'REPAYMENT TIMING')}
                </Text>
              </View>
              {inputField('firstDue')}
            </View>
            {p ? (
              <MarketNotice title={t('method') + ': ' + t(p.method)}>{t('planHint')}</MarketNotice>
            ) : (
              <>
                <Text small bold>
                  {t('method')}
                </Text>
                <Choices<Method | ''>
                  value={method}
                  onChange={(value) => {
                    if (controlsLocked) return;
                    form.setValue('method', value);
                    changeScenario();
                  }}
                  options={(['flat', 'equalPrincipal', 'annuity'] as const).map((value) => ({
                    value,
                    label: t(value),
                  }))}
                />
                {inputField('fee')}
                <Text small muted>
                  {local(
                    'Chỉ tính phí một lần đã nhập. Không tính lãi phạt, phí trả trước hạn hay lãi suất thay đổi.',
                    'Includes only the entered one-time fees. Penalties, early repayment charges and rate changes are excluded.',
                  )}
                </Text>
              </>
            )}
            {invalid || calc.isError ? (
              <Text role="alert" style={{ color: c.error }}>
                {invalid && !p
                  ? method
                    ? local(
                        'Kiểm tra số tiền, kỳ hạn, lãi suất năm, ngày và phí đã nhập.',
                        'Check your amount, term, annual rate, date, and entered fee.',
                      )
                    : local(
                        'Chọn cách tính lãi rồi thử lại.',
                        'Choose a repayment method and retry.',
                      )
                  : t(invalid ? 'invalidRange' : 'error')}
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
          {desktop && p ? <LoanProductTerms p={p} /> : null}
        </View>
        <View style={{ flex: desktop ? 1.2 : undefined, minWidth: 0, gap: 18 }}>
          {preview ? (
            <View
              ref={resultAnchor}
              collapsable={false}
              tabIndex={Platform.OS === 'web' && !desktop ? -1 : undefined}
              accessibilityLabel={t('breakdown')}
              onLayout={revealResult}
            >
              <Breakdown
                {...preview}
                budget={budget}
                actions={
                  <>
                    <Button
                      label={t('save')}
                      onPress={() => (p ? save.mutate() : setConfirmSave(true))}
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
            </View>
          ) : (
            <PlanningSnapshot
              live
              heading={local('Xem từng kỳ trước khi vay', 'See each payment before borrowing')}
              label={local('Ước tính kỳ đầu', 'Estimated first payment')}
              amount={live && live.input === liveInput ? live.result.firstPayment : undefined}
            >
              <Text small style={{ color: c.onForestMuted }}>
                {live && live.input === liveInput
                  ? local(
                      'Bấm tính lịch để xem đầy đủ các kỳ và khoản phí.',
                      'Calculate the schedule to review every payment and fee.',
                    )
                  : local(
                      'Tính lịch để xem kỳ đầu, gốc, lãi và các khoản phí đã biết.',
                      'Calculate a schedule to see the first payment, principal, interest and known fees.',
                    )}
              </Text>
            </PlanningSnapshot>
          )}
          {!preview ? comparison : null}
          {!desktop && p ? <LoanProductTerms p={p} /> : null}
        </View>
      </Columns>
      {!p && (
        <Dialog
          visible={confirmSave}
          onClose={() => setConfirmSave(false)}
          title={local('Lưu bản mô phỏng?', 'Save scenario?')}
        >
          <Text muted>
            {local(
              'Chỉ lưu phương án ước tính. Finora không tạo khoản vay hoặc theo dõi trả nợ khi bạn bấm lưu.',
              'Only this estimate is saved. Saving does not create a loan or start repayment tracking.',
            )}
          </Text>
          <Button
            label={local('Xác nhận lưu', 'Confirm save')}
            onPress={() => {
              setConfirmSave(false);
              save.mutate();
            }}
          />
        </Dialog>
      )}
    </Page>
  );
}
export default function SimulateScreen() {
  const { id, amount, term, due } = useLocalSearchParams<{
    id: string;
    amount?: string;
    term?: string;
    due?: string;
  }>();
  const q = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.product(id),
    enabled: !!id && id !== 'custom',
  });
  if (id === 'custom') return <Simulator key="custom" p={null} />;
  return (
    <Data q={q}>
      {(p) => (
        <Simulator
          key={p.id + ':' + amount + ':' + term + ':' + due}
          p={p}
          amount={amount}
          term={term}
          due={due}
        />
      )}
    </Data>
  );
}
