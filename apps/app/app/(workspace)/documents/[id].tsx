import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Eyebrow, Field, Heading, Text, useDesign } from '@finora/ui';
import {
  documentFieldNames,
  documentReviewSchema,
  type DocumentReview,
  type DocumentReviewInput,
  type Estimate,
  type Method,
} from '@finora/contracts';
import { documentStrings } from '@finora/i18n';
import { auth } from '../../../src/services/client';
import { Back, Data, Page } from '../../../src/components/layout';
import { Breakdown } from '../../../src/features/breakdown';
import { docApi } from '../../../src/features/documents/client';

const numericFields = ['principal', 'months', 'annualRate', 'totalFees'] as const;
const inputFields = ['lender', ...numericFields, 'firstDue'] as const;
const methods = ['flat', 'equalPrincipal', 'annuity'] as const;
function isMethod(value: unknown): value is Method {
  return methods.some((m) => m === value);
}

function Review({
  document: documentReview,
  userId,
}: {
  document: DocumentReview;
  userId: string;
}) {
  const { locale, colors: c, money } = useDesign();
  const s = documentStrings[locale];
  const { width } = useWindowDimensions();
  const split = width >= 1100;
  const queryClient = useQueryClient();
  const [showSources, setShowSources] = useState(split);
  const [deleting, setDeleting] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [checked, setChecked] = useState<{
    body: DocumentReviewInput;
    result: Estimate;
    requestId: string;
  } | null>(null);
  const [fields, setFields] = useState(
    Object.fromEntries(
      inputFields.map((key) => [key, String(documentReview.fields[key].value ?? '')]),
    ) as Record<(typeof inputFields)[number], string>,
  );
  const [method, setMethod] = useState<Method | null>(() => {
    const value = documentReview.fields.method.value;
    return isMethod(value) ? value : null;
  });
  const modeMessage =
    documentReview.mode === 'pdf-text'
      ? s.textReview
      : documentReview.mode === 'local-ocr'
        ? s.ocrReview
        : documentReview.reason === 'reader-unavailable'
          ? s.manualReader
          : documentReview.reason === 'ocr-unavailable'
            ? s.manualOcr
            : s.noText;
  const preview = useMutation({
    mutationFn: (body: DocumentReviewInput) => docApi.preview(documentReview.id, body),
    onSuccess: (result, body) => setChecked({ body, result, requestId: randomUUID() }),
  });
  const save = useMutation({
    mutationFn: ({ body, requestId }: NonNullable<typeof checked>) =>
      docApi.save(documentReview.id, body, requestId),
    onSuccess: ({ id }) => {
      void queryClient.invalidateQueries({ queryKey: ['saved', userId] });
      router.replace({ pathname: '/saved/[id]', params: { id } });
    },
  });
  const remove = useMutation({
    mutationFn: () => docApi.remove(documentReview.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['privateDocuments', userId] });
      router.replace('/documents');
      queryClient.removeQueries({ queryKey: ['privateDocument', userId, documentReview.id] });
    },
  });
  const busy = preview.isPending || save.isPending || remove.isPending;
  const currencyEvidence: string[] = [
    'principal',
    'monthlyRepayment',
    'totalRepayment',
    'totalFees',
    'serviceFee',
    'insuranceFee',
  ];
  function confirm() {
    const plain = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : Number.NaN);
    const rate = fields.annualRate.trim();
    const body = documentReviewSchema.safeParse({
      confirmed: true,
      ...(fields.lender.trim() && { lender: fields.lender.trim() }),
      input: {
        principal: plain(fields.principal),
        months: plain(fields.months),
        annualRate: /^\d+(?:[.,]\d{1,4})?$/.test(rate)
          ? Number(rate.replace(',', '.'))
          : Number.NaN,
        method,
        fee: fields.totalFees.trim() ? plain(fields.totalFees) : null,
        firstDue: fields.firstDue.trim(),
      },
    });
    setInvalid(!body.success);
    if (body.success) {
      setChecked(null);
      preview.mutate(body.data);
    }
  }
  const sourceContent = (
    <View style={{ gap: 11 }}>
      <Heading size={25}>{s.extracted}</Heading>
      <Text small muted>
        {modeMessage}
      </Text>
      <Button
        variant="text"
        label={showSources ? s.hideSources : s.showSources}
        onPress={() => setShowSources(!showSources)}
      />
      {showSources
        ? documentFieldNames.map((field) => {
            const value = documentReview.fields[field];
            const label =
              value.state === 'conflicting'
                ? s.conflict
                : value.state === 'unsupported'
                  ? s.unsupported
                  : s.unknown;
            const rendered =
              value.value === null
                ? label
                : field === 'method' && isMethod(value.value)
                  ? s.methods[value.value]
                  : typeof value.value === 'number' && currencyEvidence.includes(field)
                    ? money(value.value)
                    : field === 'annualRate'
                      ? value.value + '%'
                      : String(value.value);
            return (
              <View
                key={field}
                style={{ gap: 4, borderTopWidth: 1, borderColor: c.border, paddingVertical: 9 }}
              >
                <Text bold small>
                  {s.fields[field]}
                </Text>
                <Text muted={value.value === null}>{rendered}</Text>
                {value.sources.map((source, i) => (
                  <Text key={i} small muted>
                    {s.source} · {s.page} {source.page}: “{source.excerpt}”
                  </Text>
                ))}
              </View>
            );
          })
        : null}
    </View>
  );
  const changes = (
    <View style={{ gap: 16 }}>
      <Heading size={25}>{s.assumptions}</Heading>
      <Text small muted>
        {s.confirmHelp}
      </Text>
      {inputFields.map((name) => (
        <Field
          key={name}
          label={s.fields[name]}
          value={fields[name]}
          editable={!busy}
          maxLength={name === 'lender' ? 160 : 16}
          hint={
            name === 'annualRate'
              ? s.annualHint
              : name === 'principal' || name === 'totalFees'
                ? s.digits
                : undefined
          }
          keyboardType={numericFields.some((x) => x === name) ? 'decimal-pad' : 'default'}
          placeholder={name === 'firstDue' ? s.datePlaceholder : s.unknown}
          onChangeText={(value) => {
            setFields((current) => ({ ...current, [name]: value }));
            setChecked(null);
            setInvalid(false);
            preview.reset();
          }}
        />
      ))}
      <View style={{ gap: 5 }}>
        <Text bold small>
          {s.fields.method}
        </Text>
        <View style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
          {methods.map((m) => (
            <Button
              key={m}
              label={s.methods[m]}
              disabled={busy}
              variant={method === m ? 'primary' : 'outline'}
              onPress={() => {
                setMethod(m);
                setChecked(null);
                setInvalid(false);
                preview.reset();
              }}
            />
          ))}
        </View>
      </View>
      {invalid ? (
        <Text role="alert" style={{ color: c.error }}>
          {s.invalid}
        </Text>
      ) : null}
      {preview.isError ? (
        <Text role="alert" style={{ color: c.error }}>
          {s.requestError}
        </Text>
      ) : null}
      <Button label={s.calculate} loading={preview.isPending} disabled={busy} onPress={confirm} />
    </View>
  );
  return (
    <Page
      title={s.reviewTitle}
      description={s.reviewDescription}
      top={<Back to={() => router.navigate('/documents')} />}
    >
      {documentReview.synthetic ? <Eyebrow tone="forest">{s.syntheticFile}</Eyebrow> : null}
      <View
        style={{
          flexDirection: split ? 'row' : 'column',
          gap: split ? 28 : 22,
          alignItems: 'stretch',
        }}
      >
        <View
          style={{
            flex: split ? 1 : undefined,
            borderTopWidth: 1,
            borderColor: c.border,
            paddingTop: 16,
          }}
        >
          {sourceContent}
        </View>
        <View
          style={{
            flex: split ? 1 : undefined,
            borderTopWidth: 1,
            borderColor: c.border,
            paddingTop: 16,
          }}
        >
          {changes}
        </View>
      </View>
      {checked ? (
        <View style={{ gap: 10, borderTopWidth: 1, borderColor: c.border, paddingTop: 18 }}>
          <Heading size={28}>{s.estimated}</Heading>
          <Text muted small>
            {s.calculationNote}
          </Text>
          <Breakdown
            input={checked.body.input}
            result={checked.result}
            actions={
              <Button
                label={s.save}
                loading={save.isPending}
                disabled={busy}
                onPress={() => save.mutate(checked)}
              />
            }
          />
          {save.isError ? (
            <Text role="alert" style={{ color: c.error }}>
              {s.requestError}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={{ gap: 10, borderTopWidth: 1, borderColor: c.border, paddingTop: 10 }}>
        {deleting ? (
          <>
            <Text>{s.confirmDelete}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button
                label={s.deleteNow}
                variant="outline"
                loading={remove.isPending}
                disabled={busy}
                onPress={() => remove.mutate()}
              />
              <Button
                label={s.cancel}
                variant="text"
                disabled={busy}
                onPress={() => setDeleting(false)}
              />
            </View>
          </>
        ) : (
          <Button
            label={s.remove}
            variant="text"
            disabled={busy}
            onPress={() => setDeleting(true)}
          />
        )}
        {remove.isError ? (
          <Text role="alert" style={{ color: c.error }}>
            {s.requestError}
          </Text>
        ) : null}
      </View>
    </Page>
  );
}

export default function ReviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = auth.useSession().data?.user.id;
  const q = useQuery({
    queryKey: ['privateDocument', userId, id],
    queryFn: () => docApi.get(id),
    enabled: Boolean(userId && id),
  });
  return (
    <Data q={q}>
      {(documentReview) => (
        <Review key={documentReview.id} document={documentReview} userId={userId ?? ''} />
      )}
    </Data>
  );
}
