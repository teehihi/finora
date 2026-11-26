import { documentFieldNames, maxDocumentBytes, type DocumentReview } from '@finora/contracts';
import { DocumentApiError, documentFileMime } from '../src/features/documents/file-policy';
import {
  feeEvidenceExists,
  initialDraft,
  unresolvedRequiredTerms,
  validateDraft,
  type DocumentDraft,
} from '../src/features/documents/review-model';

const valid: DocumentDraft = {
  principal: '26.000.000',
  months: '18',
  annualRate: '12,5',
  firstDue: '15/01/2027',
  totalFees: '',
  lender: '',
};

test('review parses agreed locale input but never imputes unknown total fees', () => {
  expect(validateDraft(valid, 'annuity')).toEqual({
    success: true,
    body: {
      confirmed: true,
      input: {
        principal: 26_000_000,
        months: 18,
        annualRate: 12.5,
        firstDue: '2027-01-15',
        fee: null,
        method: 'annuity',
      },
    },
  });
  expect(validateDraft({ ...valid, totalFees: '0' }, 'annuity')).toMatchObject({
    success: true,
    body: { input: { fee: 0 } },
  });
  expect(validateDraft({ ...valid, principal: '26\u202f000\u202f000' }, 'annuity')).toMatchObject({
    success: true,
    body: { input: { principal: 26_000_000 } },
  });
});

test('review reports individual invalid fields; inconsistent grouping is not interpreted as money', () => {
  const rejected = validateDraft(
    {
      ...valid,
      principal: '26,000.000',
      months: '18.5',
      annualRate: '12,50001',
      firstDue: '31/02/2027',
      totalFees: '1.5',
    },
    null,
  );
  expect(rejected).toEqual({
    success: false,
    errors: new Set(['principal', 'months', 'annualRate', 'firstDue', 'totalFees', 'method']),
  });
});

test('extraction conflicts and individual fees are never prefilled as known terms or totals', () => {
  const fields = Object.fromEntries(
    documentFieldNames.map((name) => [name, { state: 'missing', value: null, sources: [] }]),
  ) as unknown as DocumentReview['fields'];
  fields.principal = { state: 'conflicting', value: 30_000_000, sources: [] };
  fields.annualRate = { state: 'found', value: 12.5, sources: [] };
  fields.serviceFee = { state: 'found', value: 100_000, sources: [] };
  expect(initialDraft(fields)).toMatchObject({ principal: '', annualRate: '12.5', totalFees: '' });
  expect(unresolvedRequiredTerms(fields)).toEqual(['principal', 'months', 'method', 'firstDue']);
  expect(feeEvidenceExists(fields)).toBe(true);
});

test('file selection distinguishes unsupported format, oversized bytes and an empty file', () => {
  expect(documentFileMime('offer.PdF', 'application/octet-stream', maxDocumentBytes)).toBe(
    'application/pdf',
  );
  expect(documentFileMime('offer.JPG', undefined, 100)).toBe('image/jpeg');
  for (const [filename, mime, size, status] of [
    ['offer.pdf', 'text/plain', 40, 415],
    ['offer.pdf', 'application/pdf', maxDocumentBytes + 1, 413],
    ['offer.pdf', 'application/pdf', 0, 400],
  ] as const) {
    try {
      documentFileMime(filename, mime, size);
      throw new Error('Expected validation error');
    } catch (error) {
      expect(error).toBeInstanceOf(DocumentApiError);
      expect(error).toHaveProperty('status', status);
    }
  }
});
