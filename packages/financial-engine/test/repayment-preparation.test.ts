import { describe, expect, it } from 'vitest';
import { prepareRepayment } from '../src';

describe('repayment preparation', () => {
  const input = {
    start: '2026-11-24',
    opening: 1_000_000,
    income: { amount: 2_000_000, day: 28 },
    expense: { amount: 200_000, day: 26 },
    payments: [
      { id: 'target', title: 'Loan', date: '2026-11-27', amount: 1_500_000 },
      { id: 'other', title: 'Other', date: '2026-11-26', amount: 100_000 },
    ],
    oneOffExpenses: [{ id: 'school', title: 'School', date: '2026-11-25', amount: 100_000 }],
  };

  it('reconciles target and other obligations with the existing daily cashflow engine', () => {
    const plan = prepareRepayment(input, 'target', 500_000);
    expect(plan.dueDate).toBe('2026-11-27');
    expect(plan.balanceAfterDue).toBe(-900_000);
    expect(plan.additionalNeeded).toBe(1_400_000);
    expect(plan.dailyGoal).toBe(466_667);
    expect(plan.weeklyGoal).toBe(1_400_000);
    expect(plan.firstShortfall).toBe('2026-11-27');
  });

  it('rejects absent target and out-of-horizon dates', () => {
    expect(() => prepareRepayment(input, 'missing', 0)).toThrow(RangeError);
    expect(() => prepareRepayment(input, 'target', -1)).toThrow(RangeError);
  });
});
