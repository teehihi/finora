import type {
  DocumentEvidence,
  DocumentFieldName,
  DocumentReview,
  PublicLoanProduct,
} from '@finora/contracts';

export type PublishedComparison = {
  field: DocumentFieldName;
  status: 'within' | 'outside' | 'same' | 'different' | 'unknown';
  contractValue: string | number | null;
  publishedValue: string | number | null;
  contractEvidence: DocumentEvidence[];
  sourceUrls: string[];
};

export function compareContractToPublished(
  fields: DocumentReview['fields'],
  product: PublicLoanProduct,
): PublishedComparison[] {
  const sourceUrls = product.sources.map((source) => source.url);
  const add = (
    field: DocumentFieldName,
    status: PublishedComparison['status'],
    publishedValue: PublishedComparison['publishedValue'],
  ): PublishedComparison => ({
    field,
    status,
    contractValue: fields[field].state === 'found' ? fields[field].value : null,
    publishedValue,
    contractEvidence: fields[field].sources,
    sourceUrls,
  });
  const range = (field: 'principal' | 'months', min: number | null, max: number | null) => {
    const value = fields[field].state === 'found' ? fields[field].value : null;
    const published = min === null && max === null ? null : [min ?? '?', max ?? '?'].join(' – ');
    if (typeof value !== 'number' || (min === null && max === null))
      return add(field, 'unknown', published);
    return add(
      field,
      (min !== null && value < min) || (max !== null && value > max) ? 'outside' : 'within',
      published,
    );
  };
  const exact = (
    field: 'method' | 'totalFees' | 'insuranceFee',
    published: string | number | null,
  ) => {
    const value = fields[field].state === 'found' ? fields[field].value : null;
    if (value === null || published === null) return add(field, 'unknown', published);
    return add(field, value === published ? 'same' : 'different', published);
  };
  const rate = product.rate;
  const annualValue = fields.annualRate.state === 'found' ? fields.annualRate.value : null;
  const annualStatus =
    typeof annualValue !== 'number' ||
    rate?.period !== 'year' ||
    rate.min === null ||
    rate.max === null
      ? 'unknown'
      : annualValue >= rate.min && annualValue <= rate.max
        ? 'within'
        : 'outside';
  return [
    range('principal', product.amountMin, product.amountMax),
    range('months', product.monthsMin, product.monthsMax),
    add(
      'annualRate',
      annualStatus,
      rate
        ? rate.min !== null && rate.max !== null
          ? `${rate.min}–${rate.max}%/${rate.period}`
          : rate.advertised !== null
            ? `≥${rate.advertised}%/${rate.period}`
            : null
        : null,
    ),
    exact('method', product.method),
    exact('totalFees', product.fee),
    exact('insuranceFee', product.insuranceFee),
  ];
}
