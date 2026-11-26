import { describe, expect, it } from '@jest/globals';
import { repaymentPlan } from '@finora/financial-engine';

describe('financial engine workspace entry', () => {
  it('resolves the repayment planner used by the loan center', () => {
    expect(
      repaymentPlan({ due: 100, reserved: 25, income: 500, expenses: 250, lowerIncome: false }),
    ).toEqual({ net: 250, available: 275, difference: 175 });
  });
});
