import { describe, expect, it } from '@jest/globals';
import type { IntelligenceScenario } from '@finora/contracts';
import { compareIntelligenceDurations, scenarioPressure } from '../src/features/intelligence/model';

const first: IntelligenceScenario = {
  kind: 'scenario',
  months: 12,
  principal: 50_000_000,
  annualRate: 12,
  firstDue: '2027-01-01',
  method: 'annuity',
  fee: null,
  firstPayment: 4_440_000,
  peakPayment: 4_450_000,
  repayment: 53_280_000,
  total: null,
  remainingCash: 1_550_000,
  stressRemainingCash: null,
  planningCapacity: 4_250_000,
  source: 'user_assumptions',
};

describe('AI scenario presentation', () => {
  it('shows opposite term advantages without an all-in ranking when a fee is unknown', () => {
    const longer = { ...first, months: 24, peakPayment: 2_450_000, repayment: 58_280_000 };
    expect(compareIntelligenceDurations(first, longer)).toEqual({
      comparable: true,
      peak: { months: 24, amount: 2_000_000 },
      principalAndInterest: { months: 12, amount: 5_000_000 },
      allIn: null,
    });
    expect(compareIntelligenceDurations(first, { ...longer, annualRate: 14 })).toEqual({
      comparable: false,
      peak: null,
      principalAndInterest: null,
      allIn: null,
    });
    expect(compareIntelligenceDurations(first, { ...longer, fee: 0 }).comparable).toBe(false);
  });

  it('flags zero cash and negative stressed cash ahead of planning capacity alone', () => {
    expect(scenarioPressure(first)).toBe('above');
    expect(scenarioPressure({ ...first, remainingCash: 0 })).toBe('baseline');
    expect(scenarioPressure({ ...first, stressRemainingCash: 0 })).toBe('stress');
    expect(scenarioPressure({ ...first, peakPayment: 4_250_000 })).toBe('within');
    expect(scenarioPressure({ ...first, planningCapacity: undefined })).toBe(null);
  });
});
