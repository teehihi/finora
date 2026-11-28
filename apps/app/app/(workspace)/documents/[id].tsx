import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Keyboard,
  Linking,
  Platform,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Action, Button, Dialog, Field, Heading, Text, useDesign } from '@finora/ui';
import {
  ArrowUpRight,
  Calculator,
  Check,
  CircleAlert,
  FileSearch,
  ShieldCheck,
  Trash2,
} from 'lucide-react-native';
import {
  documentFieldNames,
  type DocumentEvidence,
  type DocumentFieldName,
  type DocumentReview,
  type DocumentReviewInput,
  type Estimate,
  type Method,
} from '@finora/contracts';
import { documentStrings } from '@finora/i18n';
import { api, auth } from '../../../src/services/client';
import { backTo, Data, Page } from '../../../src/components/layout';
import { Breakdown } from '../../../src/features/breakdown';
import { DocumentApiError, docApi } from '../../../src/features/documents/client';
import { PrivatePreview } from '../../../src/features/documents/PrivatePreview';
import { compareContractToPublished } from '../../../src/features/documents/compare';
import { prepareSimulationHandoff } from '../../../src/features/simulation-handoff';

import {
  documentMethods,
  editableFields,
  feeEvidenceExists,
  initialDraft,
  isDocumentMethod,
  unresolvedRequiredTerms,
  validateDraft,
} from '../../../src/features/documents/review-model';

type EditableField = (typeof editableFields)[number];
const requiredForm = ['principal', 'months', 'annualRate', 'firstDue'] as const;
const optionalForm = ['totalFees', 'lender'] as const;
const numericOnly = ['principal', 'months', 'totalFees'];
const calculationFields = new Set<DocumentFieldName>([
  'principal',
  'months',
  'annualRate',
  'method',
  'firstDue',
  'totalFees',
  'lender',
]);

function Review({
  document: documentReview,
  userId,
}: {
  document: DocumentReview;
  userId: string;
}) {
  const { locale, colors: c, money, t } = useDesign();
  const s = documentStrings[locale];
  const { width } = useWindowDimensions();
  const split = width >= 1100;
  const vi = locale === 'vi-VN';
  const queryClient = useQueryClient();
  const [showSources, setShowSources] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [focusedEvidence, setFocusedEvidence] = useState<
    (DocumentEvidence & { nonce: number }) | null
  >(null);
  const [correctionField, setCorrectionField] = useState<DocumentFieldName | null>(null);
  const [correctionValue, setCorrectionValue] = useState('');
  const catalog = useQuery({
    queryKey: ['published-catalog'],
    queryFn: () => api.publicCatalog(),
    enabled: compareOpen,
  });
  const selectedProduct = catalog.data?.find((product) => product.id === selectedProductId);
  const comparison = selectedProduct
    ? compareContractToPublished(documentReview.fields, selectedProduct)
    : [];
  const [deleting, setDeleting] = useState(false);
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [handoffFailed, setHandoffFailed] = useState(false);
  const [edited, setEdited] = useState<Set<EditableField | 'method'>>(new Set());
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const estimate = useRef<ComponentRef<typeof View>>(null);
  const attached = useRef(true);
  const announcedEstimate = useRef<string | null>(null);
  useEffect(() => {
    attached.current = true;
    return () => {
      attached.current = false;
    };
  }, []);
  const [invalid, setInvalid] = useState<Set<EditableField | 'method'>>(new Set());
  const [checked, setChecked] = useState<{
    body: DocumentReviewInput;
    result: Estimate;
    requestId: string;
  } | null>(null);
  const [fields, setFields] = useState(() => initialDraft(documentReview.fields));
  const [method, setMethod] = useState<Method | null>(() => {
    const extracted = documentReview.fields.method;
    return extracted.state === 'found' && isDocumentMethod(extracted.value)
      ? extracted.value
      : null;
  });
  const requiredAttention = unresolvedRequiredTerms(documentReview.fields).length;
  const feeUnknown = documentReview.fields.totalFees.state !== 'found';
  const estimateId = 'document-estimate-' + documentReview.id;
  const fieldAnchor = 'document-field-' + documentReview.id + '-';
  useEffect(() => {
    if (!checked) return;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const frame = requestAnimationFrame(() =>
        document.getElementById(estimateId)?.scrollIntoView({ block: 'start' }),
      );
      return () => cancelAnimationFrame(frame);
    }
    AccessibilityInfo.announceForAccessibility(s.estimated);
  }, [checked, estimateId, s.estimated]);
  function revealNativeEstimate() {
    if (Platform.OS === 'web' || !checked || announcedEstimate.current === checked.requestId)
      return;
    const frame = scroll.current;
    const content = frame?.getInnerViewRef();
    if (!frame || !content) return;
    estimate.current?.measureLayout(
      content,
      (_, y) => {
        announcedEstimate.current = checked.requestId;
        frame.scrollTo({ y: Math.max(0, y - 12), animated: false });
      },
      () => {},
    );
  }
  const modeMessage =
    documentReview.mode === 'pdf-text'
      ? s.textReview
      : documentReview.mode === 'local-ocr' || documentReview.mode === 'pdf-ocr'
        ? s.ocrReview
        : documentReview.reason === 'reader-unavailable'
          ? documentReview.mime === 'application/pdf'
            ? s.manualReader
            : s.manualImageReader
          : documentReview.reason === 'ocr-unavailable'
            ? s.manualOcr
            : s.noText;
  const preview = useMutation({
    gcTime: 0,
    mutationFn: (body: DocumentReviewInput) => docApi.preview(documentReview.id, body),
    onSuccess: (result, body) => setChecked({ body, result, requestId: randomUUID() }),
  });
  const save = useMutation({
    gcTime: 0,
    mutationFn: ({ body, requestId }: NonNullable<typeof checked>) =>
      docApi.save(documentReview.id, body, requestId),
    onSuccess: ({ id }) => {
      void queryClient.invalidateQueries({ queryKey: ['saved', userId] });
      if (attached.current) router.replace({ pathname: '/saved/[id]', params: { id } });
    },
  });
  const remove = useMutation({
    mutationFn: () => docApi.remove(documentReview.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['privateDocuments', userId] });
      if (attached.current) router.replace('/documents');
      queryClient.removeQueries({ queryKey: ['privateDocument', userId, documentReview.id] });
    },
  });
  const correctTerm = useMutation({
    mutationFn: ({ field, rawValue }: { field: DocumentFieldName; rawValue: string }) =>
      docApi.confirmTerm(documentReview.id, field, rawValue),
    onSuccess: (updated) => {
      queryClient.setQueryData(['privateDocument', userId, documentReview.id], updated);
      setCorrectionField(null);
      setCorrectionValue('');
    },
  });
  const busy = preview.isPending || save.isPending || remove.isPending || correctTerm.isPending;
  const currencyEvidence: string[] = [
    'principal',
    'disbursementAmount',
    'monthlyRepayment',
    'totalRepayment',
    'totalFees',
    'serviceFee',
    'insuranceFee',
  ];
  function clearError(name: EditableField | 'method') {
    setEdited((previous) => (previous.has(name) ? previous : new Set([...previous, name])));
    setInvalid((previous) => {
      if (!previous.has(name)) return previous;
      const next = new Set(previous);
      next.delete(name);
      return next;
    });
    if (preview.isError) preview.reset();
  }

  function confirm() {
    const result = validateDraft(fields, method);
    setInvalid(result.success ? new Set() : result.errors);
    if (!result.success) {
      const first = ([...requiredForm, 'method', ...optionalForm] as const).find((name) =>
        result.errors.has(name),
      );
      if (Platform.OS === 'web' && typeof document !== 'undefined' && first) {
        requestAnimationFrame(() => {
          const field = document.getElementById(fieldAnchor + first);
          field?.scrollIntoView({ block: 'center' });
          if (first !== 'method') field?.focus({ preventScroll: true });
        });
      } else {
        AccessibilityInfo.announceForAccessibility(s.invalid);
      }
      return;
    }
    Keyboard.dismiss();
    setHandoffFailed(false);
    setChecked(null);
    preview.mutate(result.body);
  }

  function fieldsFor(name: EditableField) {
    const hint =
      name === 'annualRate'
        ? s.annualHint
        : name === 'principal'
          ? s.digits
          : name === 'firstDue'
            ? s.datePlaceholder
            : name === 'totalFees'
              ? feeUnknown && feeEvidenceExists(documentReview.fields)
                ? s.feeUnconfirmed
                : s.feeUnknown
              : name === 'lender'
                ? s.optionalLender
                : undefined;
    const isPrefilled = documentReview.fields[name].state === 'found';
    const evidence = edited.has(name) ? s.enteredByYou : isPrefilled ? s.copiedForReview : '';
    return (
      <Field
        key={name}
        nativeID={fieldAnchor + name}
        label={s.fields[name]}
        accessibilityState={{ disabled: busy }}
        value={fields[name]}
        editable={!busy}
        maxLength={name === 'lender' ? 160 : name === 'principal' || name === 'totalFees' ? 32 : 16}
        error={invalid.has(name) ? s.reviewInputError[name] : undefined}
        hint={[evidence, hint].filter(Boolean).join(' · ') || undefined}
        keyboardType={
          name === 'annualRate' || numericOnly.includes(name) ? 'decimal-pad' : 'default'
        }
        inputMode={name === 'months' ? 'numeric' : name === 'annualRate' ? 'decimal' : undefined}
        placeholder={name === 'firstDue' ? s.datePlaceholder : s.unknown}
        onChangeText={(value) => {
          setFields((current) => ({ ...current, [name]: value }));
          clearError(name);
        }}
      />
    );
  }
  const sourceContent = (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <FileSearch size={21} color={c.primary} />
        <Heading size={20}>{s.extracted}</Heading>
      </View>
      {showSources || documentReview.mode !== 'pdf-text' ? (
        <Text small muted>
          {modeMessage}
        </Text>
      ) : null}
      {documentReview.mode !== 'manual' && documentReview.reason ? (
        <Text small role="alert" style={{ color: c.warning }}>
          {vi
            ? 'Một số trang chưa đọc được bằng OCR. Hãy kiểm tra toàn bộ bản gốc.'
            : 'Some pages could not be read by OCR. Check the complete original.'}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 6 }}>
        <Text small bold style={{ color: requiredAttention ? c.actionAmber : c.primary }}>
          {documentReview.mode === 'manual'
            ? s.needsManual
            : requiredAttention
              ? requiredAttention + ' ' + s.requiredAttention
              : s.extractedUnconfirmed}
        </Text>
        {!showSources && documentReview.mode === 'pdf-text' ? (
          <Text small muted>
            · {s.pdfLimit}
          </Text>
        ) : null}
      </View>
      {!showSources ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            columnGap: 9,
            rowGap: 7,
            padding: 10,
            backgroundColor: c.elevated,
            borderRadius: 12,
          }}
        >
          {(
            [
              ['principal', vi ? 'Tiền gốc' : 'Principal'],
              ['months', vi ? 'Kỳ hạn' : 'Term'],
              ['annualRate', vi ? 'Lãi năm' : 'Annual rate'],
            ] as const
          ).map(([key, label]) => {
            const term = documentReview.fields[key];
            const value =
              typeof term.value !== 'number'
                ? term.state === 'conflicting'
                  ? s.conflict
                  : s.unknown
                : key === 'principal'
                  ? money(term.value)
                  : key === 'annualRate'
                    ? new Intl.NumberFormat(locale, {
                        style: 'percent',
                        maximumFractionDigits: 4,
                      }).format(term.value / 100)
                    : term.value + (vi ? ' tháng' : ' months');
            return (
              <View key={key} style={{ flexGrow: 1, minWidth: 70, gap: 1 }}>
                <Text small muted>
                  {label}
                </Text>
                <Text
                  small
                  bold
                  style={{
                    color: term.value === null ? c.muted : c.primary,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {value}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
      {(documentReview.risks?.length ?? 0) > 0 ? (
        <View style={{ gap: 7, borderTopWidth: 1, borderColor: c.border, paddingTop: 12 }}>
          <Text bold>{s.riskTitle}</Text>
          {documentReview.risks?.map((risk, index) => (
            <View key={index} style={{ gap: 3, paddingVertical: 5 }}>
              <Text
                small
                bold
                style={{ color: risk.severity === 'attention' ? c.warning : c.foreground }}
              >
                {s.riskKinds[risk.kind]} · {s.fields[risk.field]}
              </Text>
              {risk.evidence.slice(0, 2).map((source, citation) => (
                <Action
                  key={citation}
                  label={(vi ? 'Xem' : 'View') + ' · ' + s.page + ' ' + source.page}
                  onPress={() => setFocusedEvidence({ ...source, nonce: Date.now() + citation })}
                >
                  <Text small muted>
                    {s.page} {source.page}: “{source.excerpt}”
                  </Text>
                </Action>
              ))}
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ gap: 8, borderTopWidth: 1, borderColor: c.border, paddingTop: 12 }}>
        <Text bold>{s.comparisonTitle}</Text>
        <Button
          variant="outline"
          label={s.comparisonOpen}
          onPress={() => setCompareOpen((open) => !open)}
        />
        {compareOpen ? (
          <View style={{ gap: 9 }}>
            <Text small muted>
              {s.comparisonNote}
            </Text>
            {catalog.isPending ? (
              <Text small muted>
                {s.comparisonSelect}…
              </Text>
            ) : null}
            {catalog.isError ? (
              <Text small role="alert">
                {s.requestError}
              </Text>
            ) : null}
            {catalog.data ? (
              <>
                <Text small bold>
                  {s.comparisonSelect}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                  {catalog.data.map((product) => (
                    <Action
                      key={product.id}
                      role="radio"
                      selected={selectedProductId === product.id}
                      label={product.institution + ' · ' + (vi ? product.name : product.nameEn)}
                      onPress={() => setSelectedProductId(product.id)}
                      style={{
                        padding: 9,
                        borderWidth: 1,
                        borderRadius: 9,
                        borderColor: selectedProductId === product.id ? c.primary : c.border,
                      }}
                    >
                      <Text small bold>
                        {product.institution} · {vi ? product.name : product.nameEn}
                      </Text>
                    </Action>
                  ))}
                </View>
              </>
            ) : null}
            {selectedProduct ? (
              <View style={{ gap: 7 }}>
                {comparison.map((row) => (
                  <View
                    key={row.field}
                    style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 7, gap: 2 }}
                  >
                    <Text small bold>
                      {s.fields[row.field]} · {s.comparisonStatuses[row.status]}
                    </Text>
                    <Text small muted>
                      {s.comparisonContract}:{' '}
                      {row.contractValue === null ? s.unknown : String(row.contractValue)}
                    </Text>
                    <Text small muted>
                      {s.comparisonPublished}:{' '}
                      {row.publishedValue === null ? s.unknown : String(row.publishedValue)}
                    </Text>
                  </View>
                ))}
                {selectedProduct.sources.map((source) => (
                  <Action
                    key={source.url}
                    label={s.comparisonSource + ': ' + source.title}
                    onPress={() => void Linking.openURL(source.url)}
                  >
                    <Text small style={{ color: c.primary }}>
                      {s.comparisonSource}: {source.title} ↗
                    </Text>
                  </Action>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <Button
        variant="outline"
        label={showSources ? s.hideSources : s.showSources}
        onPress={() => setShowSources(!showSources)}
      />
      <Button
        variant="outline"
        label={t('intelligenceDocumentAsk')}
        onPress={() =>
          router.push({
            pathname: '/assistant',
            params: { documentId: documentReview.id, draftPrompt: t('intelligenceDocumentPrompt') },
          })
        }
      />
      {showSources ? (
        <Text small muted>
          {s.evidenceOnly}
        </Text>
      ) : null}
      {showSources
        ? documentFieldNames.map((field) => {
            const value = documentReview.fields[field];
            const correction = documentReview.confirmedTerms?.[field];
            const label =
              value.state === 'conflicting'
                ? s.conflict
                : value.state === 'unsupported'
                  ? s.unsupported
                  : s.unknown;
            const rendered =
              value.value === null
                ? label
                : field === 'method' && isDocumentMethod(value.value)
                  ? s.methods[value.value]
                  : typeof value.value === 'number' && currencyEvidence.includes(field)
                    ? money(value.value)
                    : field === 'annualRate' || field === 'effectiveApr'
                      ? value.value + '%'
                      : field === 'earlyRepaymentFee' && value.unit === 'percent'
                        ? value.value + '%'
                        : String(value.value);
            return (
              <View
                key={field}
                style={{ gap: 6, borderTopWidth: 1, borderColor: c.border, paddingTop: 9 }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 5,
                  }}
                >
                  <Text bold small>
                    {s.fields[field]}
                  </Text>
                  {value.value === null ? (
                    <Text
                      small
                      bold
                      style={{ color: value.state === 'conflicting' ? c.warning : c.muted }}
                    >
                      {rendered}
                    </Text>
                  ) : (
                    <Text bold style={{ color: c.primary, fontVariant: ['tabular-nums'] }}>
                      {rendered}
                    </Text>
                  )}
                </View>
                {value.state === 'found' ? (
                  <Text small muted>
                    {s.confidence[value.confidence ?? 'none']}
                  </Text>
                ) : null}
                {correction ? (
                  <Text small bold style={{ color: c.primary }}>
                    {s.correctionConfirmed}: {correction.rawValue}
                  </Text>
                ) : null}
                {!calculationFields.has(field) ? (
                  correctionField === field ? (
                    <View style={{ gap: 7 }}>
                      <Field
                        label={s.fields[field]}
                        value={correctionValue}
                        maxLength={220}
                        editable={!busy}
                        hint={s.correctionHint}
                        error={correctTerm.isError ? s.correctionError : undefined}
                        onChangeText={(next) => {
                          setCorrectionValue(next);
                          if (correctTerm.isError) correctTerm.reset();
                        }}
                      />
                      <Button
                        label={s.correctionSave}
                        loading={correctTerm.isPending}
                        disabled={busy || !correctionValue.trim()}
                        onPress={() => correctTerm.mutate({ field, rawValue: correctionValue })}
                      />
                    </View>
                  ) : (
                    <Button
                      variant="outline"
                      label={s.correctionEdit}
                      disabled={busy}
                      onPress={() => {
                        correctTerm.reset();
                        setCorrectionField(field);
                        setCorrectionValue(correction?.rawValue ?? value.rawValue ?? '');
                      }}
                    />
                  )
                ) : null}
                {value.sources.map((source, i) => (
                  <View
                    key={i}
                    style={{ gap: 3, borderRadius: 9, backgroundColor: c.elevated, padding: 8 }}
                  >
                    <Text small muted>
                      {s.source}
                    </Text>
                    <Text small>
                      {s.page} {source.page}: “{source.excerpt}”
                    </Text>
                    <Action
                      label={(vi ? 'Xem trang gốc' : 'View source page') + ' ' + source.page}
                      onPress={() => setFocusedEvidence({ ...source, nonce: Date.now() + i })}
                    >
                      <Text small bold style={{ color: c.primary }}>
                        {vi ? 'Xem trang gốc' : 'View source page'} →
                      </Text>
                    </Action>
                  </View>
                ))}
              </View>
            );
          })
        : null}
    </View>
  );
  const changes = (
    <View style={{ gap: 13 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <ShieldCheck size={21} color={c.primary} />
        <Heading size={20}>{s.reviewTerms}</Heading>
      </View>
      <Text small muted>
        {s.confirmHelp}
      </Text>
      <View style={{ gap: 10 }}>
        <Text small bold muted>
          {s.requiredForm}
        </Text>
        {requiredForm.map(fieldsFor)}
        <View style={{ gap: 6 }}>
          <Text bold small>
            {s.fields.method}
          </Text>
          {edited.has('method') || documentReview.fields.method.state === 'found' ? (
            <Text small muted>
              {edited.has('method') ? s.enteredByYou : s.copiedForReview}
            </Text>
          ) : null}
          <View
            nativeID={fieldAnchor + 'method'}
            accessibilityRole="radiogroup"
            accessibilityLabel={s.fields.method}
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
          >
            {documentMethods.map((m) => (
              <Action
                key={m}
                label={s.methods[m]}
                role="radio"
                disabled={busy}
                selected={method === m}
                onPress={() => {
                  setMethod(m);
                  clearError('method');
                }}
                style={{
                  flexGrow: 1,
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: method === m ? c.primary : c.borderStrong,
                  backgroundColor: method === m ? c.secondary : c.input,
                }}
              >
                <Text
                  small
                  bold={method === m}
                  style={{ color: method === m ? c.primary : c.foreground }}
                >
                  {s.methods[m]}
                </Text>
              </Action>
            ))}
          </View>
          {invalid.has('method') ? (
            <Text small role="alert" style={{ color: c.error }}>
              {s.reviewInputError.method}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ gap: 10, borderTopWidth: 1, borderColor: c.border, paddingTop: 13 }}>
        <Text small bold muted>
          {s.optionalForm}
        </Text>
        {optionalForm.map(fieldsFor)}
      </View>
      {invalid.size ? (
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
      style={{ gap: split ? 17 : 13 }}
      scrollRef={scroll}
      detail={{ onBack: () => backTo('/documents') }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          columnGap: 5,
          rowGap: 6,
          alignItems: 'center',
        }}
        accessibilityLabel={vi ? 'Quy trình rà soát đề nghị vay' : 'Loan offer review steps'}
      >
        <ReviewStep number={1} label={s.stepRead} complete />
        <ReviewStep number={2} label={s.reviewTerms} active={!checked} complete={!!checked} />
        <ReviewStep number={3} label={s.stepEstimate} active={!!checked} />
      </View>
      <PrivatePreview review={documentReview} focus={focusedEvidence} />
      {documentReview.synthetic ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <CircleAlert size={15} color={c.warning} />
          <Text small muted>
            {s.syntheticFile}
          </Text>
        </View>
      ) : null}
      {!checked ? (
        <View
          style={{
            flexDirection: split ? 'row' : 'column',
            gap: 14,
            alignItems: split ? 'flex-start' : 'stretch',
          }}
        >
          <ReviewPanel styleFlex={split ? 1 : undefined}>{sourceContent}</ReviewPanel>
          <ReviewPanel styleFlex={split ? 1 : undefined}>{changes}</ReviewPanel>
        </View>
      ) : null}
      {checked ? (
        <View
          ref={estimate}
          collapsable={false}
          onLayout={revealNativeEstimate}
          nativeID={estimateId}
          accessibilityLiveRegion="polite"
          style={{ gap: 10 }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <Calculator size={21} color={c.primary} />
            <View style={{ flex: 1, minWidth: 160 }}>
              <Heading size={23}>{s.estimated}</Heading>
            </View>
            <Button
              variant="outline"
              label={s.editReviewed}
              disabled={busy}
              onPress={() => {
                setChecked(null);
                preview.reset();
                save.reset();
                setHandoffFailed(false);
              }}
            />
          </View>
          <Text muted small>
            {s.calculationNote}
          </Text>
          <ReviewPanel>
            <View style={{ gap: 11 }}>
              <Text small muted>
                {s.handoffNote}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button
                  label={s.openSimulator}
                  leading={<ArrowUpRight size={17} color={c.onPrimary} />}
                  disabled={busy}
                  onPress={() => {
                    const handoff = prepareSimulationHandoff(
                      userId,
                      checked.body.input,
                      'document',
                    );
                    if (!handoff) return setHandoffFailed(true);
                    router.push({
                      pathname: '/simulate/[id]',
                      params: { id: 'custom', handoff },
                    });
                  }}
                />
                <Button
                  label={s.save}
                  variant="outline"
                  disabled={busy}
                  onPress={() => {
                    save.reset();
                    setConfirmingSave(true);
                  }}
                />
              </View>
              {handoffFailed ? (
                <Text role="alert" style={{ color: c.error }}>
                  {s.handoffFailed}
                </Text>
              ) : null}
            </View>
          </ReviewPanel>
          <Breakdown input={checked.body.input} result={checked.result} />
        </View>
      ) : null}
      <View
        style={{
          alignItems: 'flex-start',
          borderTopWidth: 1,
          borderColor: c.border,
          paddingTop: 4,
        }}
      >
        <Action
          label={s.remove}
          disabled={busy}
          onPress={() => {
            remove.reset();
            setDeleting(true);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4 }}
        >
          <Trash2 size={16} color={c.error} />
          <Text small bold style={{ color: c.error }}>
            {s.remove}
          </Text>
        </Action>
      </View>
      <Dialog
        visible={confirmingSave && !!checked}
        bottom={width < 620}
        title={s.confirmSaveTitle}
        onClose={() => !busy && setConfirmingSave(false)}
      >
        <Text>{s.confirmSaveBody}</Text>
        {save.isError ? (
          <Text role="alert" style={{ color: c.error }}>
            {s.requestError}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            label={s.confirmSaveAction}
            loading={save.isPending}
            disabled={busy || !checked}
            onPress={() => {
              if (checked) save.mutate(checked);
            }}
          />
          <Button
            label={s.cancelSaveAction}
            variant="text"
            disabled={busy}
            onPress={() => setConfirmingSave(false)}
          />
        </View>
      </Dialog>
      <Dialog
        visible={deleting}
        bottom={width < 620}
        title={s.remove}
        onClose={() => !busy && setDeleting(false)}
      >
        <Text>{s.confirmDelete}</Text>
        {remove.isError ? (
          <Text role="alert" style={{ color: c.error }}>
            {s.requestError}
          </Text>
        ) : null}
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
      </Dialog>
    </Page>
  );
}

export default function ReviewRoute() {
  const { locale } = useDesign();
  const s = documentStrings[locale];
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = auth.useSession().data?.user.id;
  const q = useQuery({
    queryKey: ['privateDocument', userId, id],
    queryFn: ({ signal }) => docApi.get(id, signal),
    gcTime: 60_000,
    retry: (attempt, error) =>
      attempt < 1 && !(error instanceof DocumentApiError && [401, 404].includes(error.status)),
    enabled: Boolean(userId && id),
  });
  if (q.error instanceof DocumentApiError && [401, 404].includes(q.error.status))
    return (
      <Page
        title={s.reviewTitle}
        description={s.documentUnavailable}
        detail={{ onBack: () => backTo('/documents') }}
      >
        <Button
          variant="outline"
          label={s.documentUnavailableAction}
          onPress={() => router.replace('/documents')}
        />
      </Page>
    );
  return (
    <Data q={q} pendingDetail={{ title: s.reviewTitle, onBack: () => backTo('/documents') }}>
      {(documentReview) =>
        userId ? (
          <Review
            key={userId + ':' + documentReview.id}
            document={documentReview}
            userId={userId}
          />
        ) : null
      }
    </Data>
  );
}

function ReviewPanel({ children, styleFlex }: { children: ReactNode; styleFlex?: number }) {
  const { colors: c } = useDesign();
  return (
    <View
      style={{
        flex: styleFlex,
        minWidth: 0,
        padding: 15,
        borderRadius: 19,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      }}
    >
      {children}
    </View>
  );
}

function ReviewStep({
  number,
  label,
  active,
  complete,
}: {
  number: number;
  label: string;
  active?: boolean;
  complete?: boolean;
}) {
  const { colors: c } = useDesign();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 5,
        paddingHorizontal: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: active ? c.signatureEdge : c.border,
        backgroundColor: active ? c.secondary : c.surface,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          backgroundColor: active ? c.signatureLime : complete ? c.primary : c.elevated,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {complete ? (
          <Check size={13} color={c.onPrimary} />
        ) : (
          <Text small bold style={{ color: active ? c.signatureInk : c.muted }}>
            {number}
          </Text>
        )}
      </View>
      <Text small bold style={{ color: active ? c.primary : c.muted, fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}
