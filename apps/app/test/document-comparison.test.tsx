import type { DocumentFieldName, DocumentReview, PublicLoanProduct } from '@finora/contracts';
import { compareContractToPublished } from '../src/features/documents/compare';

const field = (value: string | number | null) => ({
  state: value === null ? ('missing' as const) : ('found' as const),
  value,
  sources: value === null ? [] : [{ page: 1, excerpt: 'Synthetic source: ' + value }],
});
const fields = {
  principal: field(20_000_000),
  months: field(24),
  annualRate: field(15),
  method: field('annuity'),
  totalFees: field(null),
  insuranceFee: field(100_000),
} as unknown as DocumentReview['fields'];
const product = {
  id: 'synthetic',
  name: 'Synthetic',
  institution: 'Synthetic',
  amountMin: 10_000_000,
  amountMax: 30_000_000,
  monthsMin: 12,
  monthsMax: 36,
  rate: { advertised: 10, min: null, max: null, period: 'year', basis: 'declining' },
  method: 'annuity',
  fee: null,
  insuranceFee: null,
  sources: [{ url: 'https://example.test/terms', verifiedAt: '2026-11-28' }],
} as unknown as PublicLoanProduct;

test('compares only published bounds and keeps unknown fees and starting rates unknown', () => {
  const rows = compareContractToPublished(fields, product);
  const status = (key: DocumentFieldName) => rows.find((row) => row.field === key)?.status;
  expect(status('principal')).toBe('within');
  expect(status('months')).toBe('within');
  expect(status('annualRate')).toBe('unknown');
  expect(status('totalFees')).toBe('unknown');
  expect(status('insuranceFee')).toBe('unknown');
  expect(status('method')).toBe('same');
  expect(rows.every((row) => row.contractEvidence.length > 0 || row.status === 'unknown')).toBe(
    true,
  );
});

test('known amount violation is flagged without an approval decision', () => {
  const rows = compareContractToPublished(
    {
      ...fields,
      principal: field(40_000_000),
    } as DocumentReview['fields'],
    product,
  );
  expect(rows.find((row) => row.field === 'principal')?.status).toBe('outside');
});
