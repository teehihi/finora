import { describe, expect, it } from '@jest/globals';
import { simulate } from '@finora/financial-engine';
import type { LoanInput } from '@finora/contracts';
import { compareScenarioBurden, formatVndDraft } from '../src/features/simulator-decision';

const terms: LoanInput = {
  principal: 50_000_000,
  annualRate: 12,
  months: 12,
  firstDue: '2027-01-15',
  method: 'annuity',
  fee: 0,
};
const estimate = (input: LoanInput) => ({ input, result: simulate(input) });

describe('simulator presentation boundary', () => {
  it('formats VND without modifying empty, invalid, zero, or large draft values', () => {
    expect(formatVndDraft('50000000', 'vi-VN')).toBe('50.000.000');
    expect(formatVndDraft('50000000', 'en-US')).toBe('50,000,000');
    expect(formatVndDraft('1000000000000', 'vi-VN')).toBe('1.000.000.000.000');
    expect(formatVndDraft('', 'vi-VN')).toBe('');
    expect(formatVndDraft('0', 'vi-VN')).toBe('0');
    expect(formatVndDraft('1.25', 'vi-VN')).toBe('1.25');
  });

  it('explains lower peak versus higher total for a longer same-principal term', () => {
    const longer = { ...terms, months: 24 };
    const decision = compareScenarioBurden(estimate(terms), estimate(longer));
    expect(decision).toMatchObject({
      samePrincipal: true,
      rateOrMethodChanged: false,
      unknownFees: false,
      tradeoff: 'lowerPeakHigherTotal',
    });
    expect(decision.peakDelta).toBeLessThan(0);
    expect(decision.totalDelta).toBeGreaterThan(0);
    expect(compareScenarioBurden(estimate(longer), estimate(terms)).tradeoff).toBe(
      'higherPeakLowerTotal',
    );
  });

  it('does not compare totals when principal differs or a fee is unknown', () => {
    expect(
      compareScenarioBurden(estimate(terms), estimate({ ...terms, principal: 55_000_000 })),
    ).toMatchObject({ samePrincipal: false, unknownFees: false, totalDelta: null, tradeoff: null });
    expect(compareScenarioBurden(estimate(terms), estimate({ ...terms, fee: null }))).toMatchObject(
      {
        samePrincipal: true,
        unknownFees: true,
        totalDelta: null,
        tradeoff: null,
      },
    );
  });

  it('identifies changed dates, rates, or methods without inventing an attribution', () => {
    expect(
      compareScenarioBurden(
        estimate(terms),
        estimate({ ...terms, annualRate: 8, method: 'flat', firstDue: '2027-02-15' }),
      ),
    ).toMatchObject({ dateChanged: true, rateOrMethodChanged: true });
  });
});
