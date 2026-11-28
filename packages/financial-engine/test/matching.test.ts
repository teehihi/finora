import { describe, expect, it } from 'vitest';
import type { PublicLoanProduct } from '@finora/contracts';
import { simulate } from '../src/index';
import { DEFAULT_MATCH_POLICY, matchLoans } from '../src/matching';

const source = {
  title: 'Synthetic lender terms',
  url: 'https://example.test/terms',
  kind: 'product-page' as const,
  collectedAt: '2026-01-01',
  verifiedAt: '2026-01-01',
};
function product(id: string, changes: Partial<PublicLoanProduct> = {}): PublicLoanProduct {
  return {
    id,
    institution: 'Synthetic lender',
    name: id,
    nameEn: id,
    category: 'personal',
    purposes: ['Tiêu dùng cá nhân'],
    purposesEn: ['Personal spending'],
    amountMin: 1_000_000,
    amountMax: 100_000_000,
    monthsMin: 6,
    monthsMax: 60,
    rate: { advertised: null, min: 12, max: 12, period: 'year', basis: 'declining' },
    method: 'annuity',
    fee: 0,
    insuranceFee: 0,
    classification: 'simulated',
    feeDetails: null,
    feeDetailsEn: null,
    insurance: 'No mandatory insurance in this synthetic fixture',
    insuranceEn: 'No mandatory insurance in this synthetic fixture',
    earlyRepayment: 'See contract',
    earlyRepaymentEn: 'See contract',
    eligibility: [],
    eligibilityEn: [],
    notes: null,
    notesEn: null,
    maxLoanToValuePercent: null,
    provenance: 'official_public',
    verification: 'reviewed_public',
    sources: [source],
    completeness: { known: 10, total: 10 },
    ...changes,
  };
}
const profile = { income: 20_000_000, expenses: 7_000_000, debt: 1_000_000 };
const request = { amount: 30_000_000, months: 24, category: 'personal' as const };

describe('deterministic loan matching', () => {
  it('produces stable rankings and resolves equal-score ties by product ID', () => {
    const products = [product('b'), product('a')];
    const first = matchLoans({ request, profile }, products);
    const second = matchLoans({ request, profile }, [...products].reverse());
    expect(first).toEqual(second);
    expect(first.ranked.map((entry) => entry.productId)).toEqual(['a', 'b']);
    expect(first.ranked.every((entry) => entry.suitability === 'suitable')).toBe(true);
    expect(first.weights).toEqual(DEFAULT_MATCH_POLICY.weights);
  });

  it('never promotes a product that exceeds the hard monthly budget', () => {
    const costly = product('costly', {
      rate: { advertised: null, min: 90, max: 90, period: 'year', basis: 'declining' },
    });
    const result = matchLoans(
      { request, profile: { income: 8_000_000, expenses: 3_000_000, debt: 1_000_000 } },
      [costly, product('affordable')],
    );
    expect(result.ranked.find((entry) => entry.productId === 'costly')?.suitability).toBe(
      'unsuitable',
    );
    expect(result.suitableIds).not.toContain('costly');
    expect(result.ranked[0].productId).toBe('affordable');
    const constrained = result.ranked.find((entry) => entry.productId === 'costly');
    expect(
      constrained?.alternatives.some(
        (option) => option.kind === 'lower_amount' && option.peakPayment <= 1_800_000,
      ),
    ).toBe(true);
  });

  it('keeps unknown fees and rates unknown, and returns no suitable product', () => {
    const result = matchLoans({ request, profile }, [
      product('no-fee', { fee: null }),
      product('no-rate', { rate: null }),
      product('no-insurance', { insuranceFee: null }),
    ]);
    expect(result.outcome).toBe('no_suitable_loan');
    expect(result.suitableIds).toEqual([]);
    expect(
      result.ranked.find((entry) => entry.productId === 'no-fee')?.repayment?.totalWithFees,
    ).toBeNull();
    expect(result.ranked.find((entry) => entry.productId === 'no-rate')?.repayment).toBeNull();
    expect(
      result.ranked.find((entry) => entry.productId === 'no-insurance')?.repayment?.totalWithFees,
    ).toBeNull();
    expect(result.ranked.every((entry) => entry.suitability === 'insufficient_information')).toBe(
      true,
    );
  });

  it('separates published-condition failures from insufficient information', () => {
    const result = matchLoans({ request, profile }, [
      product('amount-fails', { amountMax: 10_000_000 }),
      product('term-fails', { monthsMax: 12 }),
      product('unknown-bound', { amountMax: null }),
      product('other-purpose', { category: 'auto' }),
    ]);
    expect(result.outcome).toBe('no_suitable_loan');
    expect(
      result.ranked.filter((entry) => entry.eligibility === 'does_not_meet_known_conditions'),
    ).toHaveLength(3);
    expect(result.ranked.find((entry) => entry.productId === 'unknown-bound')?.eligibility).toBe(
      'insufficient_information',
    );
  });

  it('uses the existing engine result exactly and exposes adverse cash flow', () => {
    const result = matchLoans(
      { request: { ...request, savings: 25_000_000, reserveMonths: 2 }, profile },
      [product('known')],
    );
    const entry = result.ranked[0];
    const engine = simulate({
      principal: request.amount,
      months: request.months,
      annualRate: 12,
      method: 'annuity',
      fee: 0,
      firstDue: '2000-01-01',
    });
    expect(entry.repayment?.firstPayment).toBe(engine.firstPayment);
    expect(entry.repayment?.peakPayment).toBe(
      Math.max(...engine.schedule.map((period) => period.payment)),
    );
    expect(entry.repayment?.totalWithFees).toBe(engine.total);
    expect(entry.repayment?.stressedResidual).toBeLessThan(entry.repayment?.baselineResidual ?? 0);
    const harderStress = matchLoans({ request: { ...request, incomeStressPercent: 50 }, profile }, [
      product('known'),
    ]);
    expect(harderStress.ranked[0].repayment?.stressedIncome).toBe(10_000_000);
  });

  it('validates configurable weights and rejects a reserve shortfall as a hard constraint', () => {
    expect(() =>
      matchLoans({ request, profile }, [product('known')], {
        ...DEFAULT_MATCH_POLICY,
        weights: { ...DEFAULT_MATCH_POLICY.weights, monthlyAffordability: 40 },
      }),
    ).toThrow();
    const result = matchLoans({ request: { ...request, savings: 0, reserveMonths: 3 }, profile }, [
      product('known'),
    ]);
    expect(result.ranked[0].suitability).toBe('unsuitable');
    expect(result.ranked[0].hardConstraints).toContain('reserve_shortfall');
  });

  it('keeps large valid engine totals without applying the input-money ceiling to outputs', () => {
    const large = product('large', {
      amountMax: 1_000_000_000_000,
      monthsMax: 360,
      rate: { advertised: null, min: 100, max: 100, period: 'year', basis: 'flat' },
      method: 'flat',
    });
    const result = matchLoans(
      { request: { amount: 1_000_000_000_000, months: 360, category: 'personal' }, profile },
      [large],
    );
    expect(result.ranked[0].repayment?.totalKnown).toBeGreaterThan(1_000_000_000_000);
    expect(result.ranked[0].suitability).toBe('unsuitable');
  });
});
