import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { requestId } from '../../../src/services/request-id';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { loanSchema, type Product, type LoanInput, type Estimate } from '@finora/contracts';
import { percent } from '@finora/i18n';
import { Text, Card, Button, Field, Badge, SourceAttribution, useDesign } from '@finora/ui';
import { Data, Page, Back, Columns } from '../../../src/components/layout';
import { Breakdown } from '../../../src/features/breakdown';
import { api } from '../../../src/services/client';
import { queryClient } from '../../../src/providers/AppProviders';
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
  const { t, money, locale } = useDesign();
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
  return (
    <Page
      title={locale === 'vi-VN' ? p.name : p.nameEn}
      description={p.institution}
      top={<Back to={() => router.navigate('/explore')} />}
    >
      <Columns>
        <View style={{ flex: 1, gap: 12 }}>
          <Card>
            <Badge>{t('sample')}</Badge>
            <Text>{t(p.method)}</Text>
            {(['principal', 'annualRate', 'months', 'firstDue'] as const).map((k) => (
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
                    editable={!calc.isPending && !save.isPending}
                    onChangeText={(s) => {
                      field.onChange(s);
                      setPreview(null);
                      mark(false);
                    }}
                    keyboardType={k === 'firstDue' ? 'default' : 'decimal-pad'}
                    hint={
                      k === 'principal'
                        ? money(p.amountMin) + ' – ' + money(p.amountMax)
                        : k === 'annualRate'
                          ? percent(p.rateMin, locale) + ' – ' + percent(p.rateMax, locale)
                          : k === 'months'
                            ? p.monthsMin + '–' + p.monthsMax + ' ' + t('months')
                            : undefined
                    }
                  />
                )}
              />
            ))}
            <SourceAttribution source={p.source} />
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
          </Card>
        </View>
        {preview ? (
          <View style={{ flex: 1.2 }}>
            <Breakdown
              {...preview}
              actions={
                <>
                  <Button
                    label={t('save')}
                    onPress={() => save.mutate()}
                    loading={save.isPending}
                  />
                  {save.isError ? <Text role="alert">{t('error')}</Text> : null}
                </>
              }
            />
          </View>
        ) : null}
      </Columns>
    </Page>
  );
}
export default function SimulateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['product', id], queryFn: () => api.product(id) });
  return <Data q={q}>{(p) => <Simulator key={p.id} p={p} />}</Data>;
}
