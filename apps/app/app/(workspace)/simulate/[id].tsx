import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { requestId } from '../../../src/services/request-id';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, useWatch, Controller } from 'react-hook-form';
import type { Product, LoanInput, Estimate, Method } from '@finora/contracts';
import { simulate } from '@finora/financial-engine';
import { percent } from '@finora/i18n';
import {
  Calculator,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  SlidersHorizontal,
} from 'lucide-react-native';
import { tokens } from '@finora/design-tokens';
import { Action, Text, Heading, Button, Choices, Dialog, Field, useDesign } from '@finora/ui';
import { Data, Page, Back, Columns } from '../../../src/components/layout';
import { SignatureIcon } from '../../../src/components/signature';
import { PlanningSnapshot } from '../../../src/features/simulator-signature';
import { SimulatorVndField } from '../../../src/features/simulator-vnd-field';
import { compareScenarioBurden } from '../../../src/features/simulator-decision';
import { Breakdown } from '../../../src/features/breakdown';
import { LoanProductTerms } from '../../../src/features/catalog';
import { api, auth } from '../../../src/services/client';
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

import {
  clearSimulationHandoff,
  readSimulationHandoffContext,
} from '../../../src/features/simulation-handoff';

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
  handoff,
}: {
  p: Product | null;
  amount?: string;
  term?: string;
  due?: string;
  handoff?: string;
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
  const owner = auth.useSession().data?.user.id;
  const [carried] = useState(() =>
    !p && handoff ? readSimulationHandoffContext(owner, handoff) : undefined,
  );
  useEffect(() => {
    if (handoff) clearSimulationHandoff(owner, handoff);
  }, [handoff, owner]);
  const form = useForm<ScenarioFields>({
    defaultValues: carried?.fields ?? scenarioDefaults(p, { amount, months: term, firstDue: due }),
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [principal, months, annualRate, firstDue, method, fee] = useWatch({
    control: form.control,
    name: ['principal', 'months', 'annualRate', 'firstDue', 'method', 'fee'],
  });
  const liveInput = useMemo(
    () => parseScenario(p, { principal, months, annualRate, firstDue, method, fee }),
    [p, principal, months, annualRate, firstDue, method, fee],
  );
  const productId = p?.id;
  const [live, setLive] = useState<{ input: LoanInput; result: Estimate | null } | null>(null);
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
    if (!liveInput || preview || calc.isPending) return;
    let active = true;
    const timer = setTimeout(() => {
      const calculate = async () =>
        productId ? await api.preview(productId, liveInput) : simulate(liveInput);
      void calculate()
        .then((result) => {
          if (active) setLive({ input: liveInput, result });
        })
        .catch(() => {
          if (active) setLive({ input: liveInput, result: null });
        });
    }, 420);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [calc.isPending, liveInput, productId, preview]);
  const submit = form.handleSubmit((v) => {
    const input = parseScenario(p, v);
    mark(!input);
    if (!input) {
      if (!parseScenario(p, { ...v, firstDue: scenarioDefaults(p).firstDue, fee: '' })) return;
      // Reveal invalid hidden fields instead of leaving the user stranded at a generic error.
      setDetailsOpen(true);
      return;
    }
    Keyboard.dismiss();
    if (live?.result && sameScenarioInput(live.input, input)) {
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
        const Input = k === 'principal' ? SimulatorVndField : Field;
        const hint =
          k === 'principal'
            ? p
              ? money(p.amountMin) + ' – ' + money(p.amountMax)
              : undefined
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
          <Input
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
  const decision = reference && preview ? compareScenarioBurden(reference, preview) : null;
  const signedMoney = (value: number) => (value > 0 ? '+' : '') + money(value);
  const feeSummary =
    fee === ''
      ? local('Chưa biết phí', 'Fee unknown')
      : /^\d{1,13}$/.test(fee)
        ? t('fee') + ': ' + money(Number(fee))
        : local('Kiểm tra phí đã nhập', 'Check the entered fee');
  const currentLive = live?.input === liveInput ? live?.result : undefined;
  const liveMessage = !liveInput
    ? local(
        'Cần số tiền, kỳ hạn, lãi suất và cách tính hợp lệ.',
        'Enter a valid amount, term, rate and method.',
      )
    : currentLive === null
      ? local(
          'Chưa cập nhật được. Bấm tính lịch để thử lại.',
          'Could not update. Calculate the schedule to retry.',
        )
      : local('Đang tính theo điều khoản hiện tại…', 'Calculating with the current terms…');
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
          {decision ? (
            <View style={{ backgroundColor: c.secondary, borderRadius: 13, padding: 12, gap: 6 }}>
              <Text bold style={{ fontVariant: ['tabular-nums'], color: c.primary }}>
                {local('Chênh lệch kỳ đầu', 'Difference in first payment')}:{' '}
                {signedMoney(decision.firstDelta)}
              </Text>
              <Text small>
                {local('Chênh lệch kỳ cao nhất', 'Difference in highest payment')}:{' '}
                {signedMoney(decision.peakDelta)}
              </Text>
              {decision.unknownFees ? (
                <Text small>
                  {local(
                    'Chưa biết phí của ít nhất một phương án. Không xếp hạng theo tổng chi phí.',
                    'At least one scenario has unknown fees. Total costs are not ranked.',
                  )}
                </Text>
              ) : decision.totalDelta !== null ? (
                <Text small>
                  {local('Chênh lệch tổng gồm phí', 'Difference in total including fees')}:{' '}
                  {signedMoney(decision.totalDelta)}
                </Text>
              ) : null}
              {decision.tradeoff === 'lowerPeakHigherTotal' ? (
                <Text small>
                  {local(
                    'Phương án mới giảm áp lực ở kỳ cao nhất nhưng tăng tổng phải trả.',
                    'The new scenario lowers the largest payment but increases the total.',
                  )}
                </Text>
              ) : decision.tradeoff === 'higherPeakLowerTotal' ? (
                <Text small>
                  {local(
                    'Phương án mới giảm tổng phải trả nhưng phải dành nhiều tiền hơn ở kỳ cao nhất.',
                    'The new scenario lowers the total but requires more cash at the largest payment.',
                  )}
                </Text>
              ) : null}
              {decision.rateOrMethodChanged || decision.dateChanged ? (
                <Text small muted>
                  {local(
                    'Có thay đổi về lãi suất, cách tính lãi hoặc ngày trả đầu. Không quy chênh lệch chỉ cho kỳ hạn.',
                    'The interest rate, repayment method, or first payment date changed. Do not attribute the difference to term alone.',
                  )}
                </Text>
              ) : null}
            </View>
          ) : null}
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
      top={
        <Back
          to={() =>
            carried && router.canGoBack()
              ? router.back()
              : router.navigate(p ? '/explore?mode=sample' : '/explore')
          }
        />
      }
    >
      {carried ? (
        <MarketNotice
          title={
            carried.origin === 'document'
              ? local('Điều khoản đã rà soát', 'Reviewed document terms')
              : local('Giả định từ Finora AI', 'Assumptions from Finora AI')
          }
        >
          {local(
            'Kiểm tra điều khoản trước khi tính lại. Chưa lưu mô phỏng hay tạo khoản vay.',
            'Review the terms before calculating. No estimate or loan has been saved.',
          )}
        </MarketNotice>
      ) : null}
      <Columns style={{ gap: desktop ? 30 : 19, alignItems: desktop ? 'flex-start' : 'stretch' }}>
        <View style={{ flex: desktop ? 1 : undefined, minWidth: 0, gap: 22 }}>
          <MarketPanel style={{ padding: desktop ? 22 : 16, gap: 16, borderRadius: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
              <SignatureIcon icon={Calculator} size={42} />
              <View style={{ minWidth: 0, flex: 1 }}>
                <Text small bold style={{ color: c.primary, fontSize: 12, lineHeight: 16 }}>
                  {local('Điều khoản vay', 'Loan terms')}
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
            {!desktop && !preview ? (
              <View
                accessibilityLiveRegion="polite"
                style={{
                  backgroundColor: currentLive ? c.signatureStart : c.secondary,
                  borderRadius: 17,
                  padding: 12,
                  gap: 7,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  {currentLive ? (
                    <CircleCheck size={16} color={c.signatureLime} />
                  ) : (
                    <CircleAlert size={17} color={c.primary} />
                  )}
                  <Text small bold style={currentLive ? { color: c.onForestMuted } : undefined}>
                    {local('Ước tính kỳ đầu', 'Estimated first payment')}
                  </Text>
                </View>
                {currentLive ? (
                  <>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        columnGap: 14,
                        rowGap: 6,
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                      }}
                    >
                      <Text
                        bold
                        style={{
                          color: c.onForest,
                          fontSize: 26,
                          lineHeight: 32,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {money(currentLive.firstPayment)}
                      </Text>
                      <View>
                        <Text small style={{ color: c.onForestMuted }}>
                          {local('Tổng gốc + lãi', 'Principal + interest')}
                        </Text>
                        <Text
                          small
                          bold
                          style={{ color: c.onForest, fontVariant: ['tabular-nums'] }}
                        >
                          {money(currentLive.repayment)}
                        </Text>
                      </View>
                    </View>
                    <Text small style={{ color: c.onForestMuted }}>
                      {local('Chưa cộng phí một lần.', 'Excludes one-time fees.')}
                    </Text>
                  </>
                ) : (
                  <Text small muted>
                    {liveMessage}
                  </Text>
                )}
              </View>
            ) : null}
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
              </>
            )}
            <View
              style={{
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: c.border,
                paddingVertical: 6,
                gap: 8,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={local('Ngày trả và phí', 'Payment date and fees')}
                accessibilityState={{ expanded: detailsOpen }}
                accessibilityHint={firstDue + ' · ' + feeSummary}
                onPress={() => setDetailsOpen((open) => !open)}
                style={({ pressed }) => ({
                  minHeight: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 6,
                  gap: 9,
                  opacity: pressed ? 0.72 : 1,
                })}
              >
                <SlidersHorizontal size={17} color={c.primary} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text bold small>
                    {local('Ngày trả và phí', 'Payment date and fees')}
                  </Text>
                  <Text small muted>
                    {firstDue} · {feeSummary}
                  </Text>
                </View>
                {detailsOpen ? (
                  <ChevronDown size={18} color={c.primary} />
                ) : (
                  <ChevronRight size={18} color={c.primary} />
                )}
              </Pressable>
              {detailsOpen ? (
                <View style={{ paddingBottom: 9, gap: 8 }}>
                  {inputField('firstDue')}
                  {!p ? inputField('fee') : null}
                  {!p ? (
                    <Text small muted>
                      {local(
                        'Chỉ tính phí một lần đã nhập. Không tính lãi phạt, phí trả trước hạn hay lãi suất thay đổi.',
                        'Includes only the entered one-time fees. Penalties, early repayment charges and rate changes are excluded.',
                      )}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
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
          ) : desktop ? (
            <PlanningSnapshot
              live
              heading={local('Xem từng kỳ trước khi vay', 'See each payment before borrowing')}
              label={local('Ước tính kỳ đầu', 'Estimated first payment')}
              amount={currentLive?.firstPayment}
            >
              <Text small style={{ color: c.onForestMuted }}>
                {currentLive
                  ? local(
                      'Bấm tính lịch để xem đầy đủ các kỳ và khoản phí.',
                      'Calculate the schedule to review every payment and fee.',
                    )
                  : liveMessage}
              </Text>
            </PlanningSnapshot>
          ) : null}
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
  const { id, amount, term, due, handoff } = useLocalSearchParams<{
    id: string;
    amount?: string;
    term?: string;
    due?: string;
    handoff?: string;
  }>();
  const q = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.product(id),
    enabled: !!id && id !== 'custom',
  });
  if (id === 'custom') return <Simulator key={handoff ?? 'custom'} p={null} handoff={handoff} />;
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
