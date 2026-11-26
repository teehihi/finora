import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from '@jest/globals';
import {
  loanDataCompleteness,
  normalizeLoanSearch,
  publicLoanSearchSchema,
  reviewedLoanDatasetSchema,
} from '@finora/contracts';

const entries = JSON.parse(
  readFileSync(resolve(__dirname, '../src/catalog/loans.vn.json'), 'utf8'),
) as Array<Record<string, unknown>>;

describe('reviewed public loan catalog', () => {
  it('keeps reviewed origin and source timestamps without converting unknown prices', () => {
    const records = reviewedLoanDatasetSchema.parse(entries);
    expect(records).toHaveLength(6);
    expect(records.every((p) => p.provenance === 'official_public')).toBe(true);
    expect(records.find((p) => p.id === 'vpbank-salary-consumer')?.rate).toBeNull();
    expect(records.find((p) => p.id === 'home-credit-online-cash')?.rate).toMatchObject({
      advertised: 0.75,
      min: null,
      max: null,
      period: 'month',
      basis: 'declining',
    });
    expect(records.every((p) => p.fee === null)).toBe(true);
    expect(records.every((p) => p.sources.every((s) => s.verifiedAt >= s.collectedAt))).toBe(true);
  });

  it('distinguishes explicit zero from a missing aggregate fee in completeness', () => {
    const [original] = reviewedLoanDatasetSchema.parse(entries);
    expect(loanDataCompleteness(original)).toEqual({ known: 7, total: 10 });
    expect(loanDataCompleteness({ ...original, fee: 0 })).toEqual({ known: 8, total: 10 });
  });

  it('rejects invalid ranges, duplicate identities or official product pages, and malformed sources', () => {
    const [original] = reviewedLoanDatasetSchema.parse(entries);
    expect(
      reviewedLoanDatasetSchema.safeParse([{ ...original, amountMin: original.amountMax! + 1 }])
        .success,
    ).toBe(false);
    expect(
      reviewedLoanDatasetSchema.safeParse([original, { ...original, id: 'duplicate-renamed' }])
        .success,
    ).toBe(false);
    expect(
      reviewedLoanDatasetSchema.safeParse([
        original,
        { ...original, id: 'same-page', name: 'Another name' },
      ]).success,
    ).toBe(false);
    expect(
      reviewedLoanDatasetSchema.safeParse([
        { ...original, sources: [{ ...original.sources[0], url: 'not a url' }] },
      ]).success,
    ).toBe(false);
    expect(
      reviewedLoanDatasetSchema.safeParse([
        {
          ...original,
          sources: [{ ...original.sources[0], url: 'https://homecredit.vn.example.org/foo' }],
        },
      ]).success,
    ).toBe(false);
    expect(
      reviewedLoanDatasetSchema.safeParse([
        { ...original, sources: [{ ...original.sources[0], verifiedAt: '2020-01-01' }] },
      ]).success,
    ).toBe(false);
  });

  it('validates strict structured search and understands Vietnamese combining marks', () => {
    expect(normalizeLoanSearch('Vay mua Ô tô, Đồng hành')).toBe('vay mua o to, dong hanh');
    expect(
      publicLoanSearchSchema.safeParse({ category: 'auto', amount: 50_000_000, months: 24 })
        .success,
    ).toBe(true);
    expect(publicLoanSearchSchema.safeParse({ amount: '50000000' }).success).toBe(false);
    expect(publicLoanSearchSchema.safeParse({ verified: true }).success).toBe(false);
  });
});
