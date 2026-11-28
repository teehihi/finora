import {
  documentFieldNames,
  type DocumentField,
  type DocumentFieldName,
  type DocumentRisk,
  type DocumentRiskKind,
} from '@finora/contracts';

type Fields = Record<DocumentFieldName, DocumentField>;

// These are review prompts, not legal conclusions or lender eligibility decisions.
export function assessDocumentRisks(fields: Fields): DocumentRisk[] {
  const risks: DocumentRisk[] = [];
  const add = (
    kind: DocumentRiskKind,
    field: DocumentFieldName,
    severity: DocumentRisk['severity'],
    related: DocumentFieldName[] = [],
  ) => {
    const evidence = [field, ...related].flatMap((name) => fields[name].sources);
    if (kind !== 'missing_term' && evidence.length === 0) return;
    risks.push({ kind, field, severity, evidence });
  };

  for (const field of documentFieldNames) {
    if (fields[field].state === 'conflicting') add('conflicting_term', field, 'attention');
  }
  for (const field of ['principal', 'months', 'annualRate', 'method', 'totalFees'] as const) {
    if (fields[field].state === 'missing') add('missing_term', field, 'review');
  }
  if (fields.serviceFee.state === 'found' && Number(fields.serviceFee.value) > 0)
    add('mandatory_fee', 'serviceFee', 'review');
  if (fields.insuranceFee.state === 'found' && Number(fields.insuranceFee.value) > 0)
    add('insurance_deduction', 'insuranceFee', 'review');
  if (
    fields.annualRate.state === 'found' &&
    fields.effectiveApr.state === 'found' &&
    Number(fields.effectiveApr.value) > Number(fields.annualRate.value)
  )
    add('nominal_effective_gap', 'effectiveApr', 'review', ['annualRate']);
  if (fields.method.state === 'unsupported') add('ambiguous_interest', 'method', 'attention');
  if (fields.earlyRepaymentFee.state === 'found' && Number(fields.earlyRepaymentFee.value) > 0)
    add('early_repayment_penalty', 'earlyRepaymentFee', 'review');
  if (fields.latePenalty.state === 'found') add('late_payment_obligation', 'latePenalty', 'review');
  if (fields.paymentFrequency.state === 'found' && fields.paymentFrequency.value !== 'monthly')
    add('non_monthly_frequency', 'paymentFrequency', 'attention');
  return risks.slice(0, 25);
}
