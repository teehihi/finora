import {
  documentReviewSchema,
  type DocumentFieldName,
  type DocumentReview,
  type Method,
} from '@finora/contracts';

export const editableFields = [
  'principal',
  'months',
  'annualRate',
  'firstDue',
  'totalFees',
  'lender',
] as const;
export type EditableField = (typeof editableFields)[number];
export type DocumentDraft = Record<EditableField, string>;
type ReviewKey = EditableField | 'method';

export const requiredTerms = ['principal', 'months', 'annualRate', 'method', 'firstDue'] as const;
export const documentMethods = ['flat', 'equalPrincipal', 'annuity'] as const;

export function isDocumentMethod(value: unknown): value is Method {
  return documentMethods.some((m) => m === value);
}

export function initialDraft(fields: DocumentReview['fields']): DocumentDraft {
  return Object.fromEntries(
    editableFields.map((name) => [
      name,
      fields[name].state === 'found' ? String(fields[name].value ?? '') : '',
    ]),
  ) as DocumentDraft;
}

export function unresolvedRequiredTerms(fields: DocumentReview['fields']) {
  return requiredTerms.filter(
    (name) => fields[name].state !== 'found' || fields[name].value === null,
  );
}

export function feeEvidenceExists(fields: DocumentReview['fields']) {
  return (['serviceFee', 'insuranceFee'] satisfies DocumentFieldName[]).some(
    (name) => fields[name].state === 'found' && fields[name].value !== null,
  );
}

function wholeNumber(value: string) {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN;
}

function vnd(value: string) {
  const normalized = value.trim().replace(/[\u00a0\u202f]/g, ' ');
  if (/^\d+$/.test(normalized)) return Number(normalized);
  // An exact sequence of thousands groups is safe to normalize; a decimal or a
  // mixture of different separators must never be silently multiplied by 1,000.
  return /^\d{1,3}([,. ])\d{3}(?:\1\d{3})*$/.test(normalized)
    ? Number(normalized.replace(/[,. ]/g, ''))
    : Number.NaN;
}

function calendarDate(value: string) {
  const input = value.trim();
  const parts = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return parts
    ? parts[3] + '-' + parts[2].padStart(2, '0') + '-' + parts[1].padStart(2, '0')
    : input;
}

export function validateDraft(fields: DocumentDraft, method: Method | null) {
  const rate = fields.annualRate.trim();
  const result = documentReviewSchema.safeParse({
    confirmed: true,
    ...(fields.lender.trim() && { lender: fields.lender.trim() }),
    input: {
      principal: vnd(fields.principal),
      months: wholeNumber(fields.months),
      annualRate: /^\d+(?:[.,]\d{1,4})?$/.test(rate) ? Number(rate.replace(',', '.')) : Number.NaN,
      method,
      fee: fields.totalFees.trim() ? vnd(fields.totalFees) : null,
      firstDue: calendarDate(fields.firstDue),
    },
  });
  if (result.success) return { success: true as const, body: result.data };
  const errors = new Set<ReviewKey>();
  for (const issue of result.error.issues) {
    const path = issue.path[0] === 'input' ? issue.path[1] : issue.path[0];
    const name = path === 'fee' ? 'totalFees' : path;
    if (name === 'method' || editableFields.some((field) => field === name))
      errors.add(name as ReviewKey);
  }
  return { success: false as const, errors };
}
