import { describe, expect, it } from '@jest/globals';
import { publishedComparisonReasons } from '../src/features/published-comparison';

const known = {
  rate: {
    period: 'year',
    basis: 'declining',
    min: 10,
    max: 15,
    advertised: null,
  },
  fee: 0,
  amountMin: 10_000_000,
  amountMax: 50_000_000,
  monthsMin: 12,
  monthsMax: 24,
} as const;

describe('published product comparison guardrails', () => {
  it('does not promote two disclosed rates to personal terms or treat zero as missing', () => {
    expect(publishedComparisonReasons(known, known)).toEqual(['personal']);
  });

  it('explains missing fees, incompatible rates, and nonoverlapping terms independently', () => {
    expect(
      publishedComparisonReasons(known, {
        ...known,
        rate: { ...known.rate, period: 'month' },
        fee: null,
        monthsMin: 25,
        monthsMax: 36,
      }),
    ).toEqual(['fees', 'rate', 'ranges', 'personal']);
  });

  it('does not claim unknown or touching ranges are incompatible', () => {
    expect(
      publishedComparisonReasons(known, {
        ...known,
        amountMin: null,
        monthsMin: 24,
        monthsMax: 36,
      }),
    ).toEqual(['personal']);
  });
});
