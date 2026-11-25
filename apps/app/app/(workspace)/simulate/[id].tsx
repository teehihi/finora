import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { requestId } from '../../../src/services/request-id';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { loanSchema, type Product, type LoanInput, type Estimate } from '@finora/contracts';
import { percent } from '@finora/i18n';
import { Text, Heading, Button, Field, useDesign } from '@finora/ui';
import { Data, Page, Back, Columns } from '../../../src/components/layout';
import { Breakdown } from '../../../src/features/breakdown';
import { LoanProductTerms } from '../../../src/features/catalog';
import { api } from '../../../src/services/client';
import { queryClient, useAccount } from '../../../src/providers/AppProviders';
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
  const submit = form.handleSubmit((v) => {
    const n = (s: string) => (/^\d+(?:[.,]\d+)?$/.test(s) ? Number(s.replace(',', '.')) : NaN);
    const r = loanSchema.safeParse({
      ...v,
      principal: n(v.principal),
      months: n(v.months),
      annualRate: n(v.annualRate),
      method: p.method,
      fee: p.fee,
    });
    const ok =
      r.success &&
      r.data.principal >= p.amountMin &&
      r.data.principal <= p.amountMax &&
      r.data.months >= p.monthsMin &&
      r.data.months <= p.monthsMax &&
      r.data.annualRate >= p.rateMin &&
      r.data.annualRate <= p.rateMax;
    mark(!ok);
    if (ok) calc.mutate(r.data);
  });
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
          editable={!calc.isPending && !save.isPending}
          onChangeText={(s) => {
            const group = locale === 'vi-VN' ? /\./g : /,/g;
            const compact = k === 'principal' ? s.replace(/\s/g, '') : s;
            const grouped = locale === 'vi-VN' ? /^\d{1,3}(?:\.\d{3})+$/ : /^\d{1,3}(?:,\d{3})+$/;
            field.onChange(
              k === 'principal' && grouped.test(compact) ? compact.replace(group, '') : compact,
            );
            setPreview(null);
            mark(false);
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
    <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 16, gap: 10 }}>
      <Heading size={25}>{local('Mốc so sánh', 'Comparison baseline')}</Heading>
      <Text>
        {money(reference.input.principal)} · {reference.input.months} {t('months')} ·{' '}
        {percent(reference.input.annualRate, locale)}
      </Text>
      <Text muted>
        {t('firstPayment')}: {money(reference.result.firstPayment)}
      </Text>
      {preview ? (
        <Text bold>
          {local('Chênh lệch kỳ đầu', 'Difference in first payment')}:{' '}
          {preview.result.firstPayment > reference.result.firstPayment ? '+' : ''}
          {money(preview.result.firstPayment - reference.result.firstPayment)}
        </Text>
      ) : (
        <Text muted>
          {local(
            'Đổi giả định rồi tính lịch mới để so sánh.',
            'Change your assumptions and calculate again to compare.',
          )}
        </Text>
      )}
      <Button
        variant="outline"
        label={local('Bỏ mốc', 'Clear baseline')}
        onPress={() => pin(null)}
      />
    </View>
  ) : null;
  return (
    <Page
      title={locale === 'vi-VN' ? p.name : p.nameEn}
      description={p.institution + ' · ' + t('sample')}
      top={<Back to={() => router.navigate('/explore?mode=sample')} />}
    >
      <Columns style={{ gap: desktop ? 32 : 20, alignItems: 'stretch' }}>
        <View style={{ flex: desktop ? 1 : undefined, minWidth: 0, gap: 22 }}>
          <View
            style={{
              backgroundColor: c.surface,
              borderTopWidth: 2,
              borderColor: c.accent,
              padding: desktop ? 26 : 18,
              gap: 15,
            }}
          >
            <Text small bold style={{ letterSpacing: 1.2, color: c.muted }}>
              {local('01 / GIẢ ĐỊNH', '01 / ASSUMPTIONS')}
            </Text>
            <Heading size={27}>{local('Lập phương án', 'Set up your scenario')}</Heading>
            <Text small muted>
              {t('method')}: {t(p.method)}
            </Text>
            {inputField('principal')}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 0 }}>{inputField('annualRate')}</View>
              <View style={{ flex: 1, minWidth: 0 }}>{inputField('months')}</View>
            </View>
            {inputField('firstDue')}
            <Text small muted>
              {t('planHint')}
            </Text>
            {invalid || calc.isError ? (
              <Text role="alert">{t(invalid ? 'invalidRange' : 'error')}</Text>
            ) : null}
            <Button
              label={t('preview')}
              onPress={submit}
              loading={calc.isPending}
              disabled={save.isPending}
            />
          </View>
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
            <View
              style={{
                backgroundColor: c.secondary,
                borderRadius: 18,
                padding: desktop ? 28 : 21,
                gap: 10,
              }}
            >
              <Text small bold style={{ letterSpacing: 1.2, color: c.muted }}>
                {local('02 / KẾT QUẢ', '02 / RESULTS')}
              </Text>
              <Heading size={27}>
                {local('Xem từng kỳ trước khi vay', 'See each payment before borrowing')}
              </Heading>
              <Text muted>
                {local(
                  'Tính lịch để xem kỳ đầu, gốc, lãi và các khoản phí đã biết.',
                  'Calculate a schedule to see the first payment, principal, interest and known fees.',
                )}
              </Text>
            </View>
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
