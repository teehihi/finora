import { describe, expect, it } from '@jest/globals';
import { financialTwinFromIntent, wantsFinancialTwin } from '../src/modules/intelligence-twin';
import { interpret } from '../src/modules/intelligence-rules';

const loan = {
  principal: 24_000_000,
  annualRate: 12,
  months: 12,
  method: 'annuity' as const,
  fee: null,
  firstDue: '2026-01-31',
};
const profile = { income: 12_000_000, expenses: 6_000_000, debt: 1_000_000 };
const source = (amount: number) => ({ amount, source: 'user_estimate' as const });
const prior = {
  kind: 'digital_twin' as const,
  state: {
    monthlyIncome: source(12_000_000),
    incomeStability: 'stable' as const,
    essentialExpenses: source(5_000_000),
    discretionaryExpenses: source(1_000_000),
    existingDebtPayments: source(1_000_000),
    currentSavings: source(10_000_000),
    emergencyFund: source(8_000_000),
    events: [],
  },
  scenario: { shocks: [] },
  simulationId: null,
  baseline: {
    months: 12,
    resilience: 'resilient' as const,
    firstCashShortfall: null,
    stressedPeriods: 0,
    minimumCashFlow: 1,
    finalSavings: 1,
  },
  stressed: {
    months: 12,
    resilience: 'resilient' as const,
    firstCashShortfall: null,
    stressedPeriods: 0,
    minimumCashFlow: 1,
    finalSavings: 1,
    reserveDepletionMonth: null,
    unknownCosts: [],
    hypotheticalEarlyRepayment: false,
    missing: [],
  },
};

describe('Fin financial twin tool', () => {
  it('asks for the expense split without making the profile total essential expenses', () => {
    const prompt = 'What happens if my income decreases by 20%?';
    expect(wantsFinancialTwin(prompt, false)).toBe(true);
    const result = financialTwinFromIntent({
      prompt,
      intent: interpret(prompt),
      profile,
      loan,
      simulationId: null,
      history: [],
    });
    expect(result.block).toBeNull();
    expect(result.missing).toEqual(
      expect.arrayContaining(['essentialExpenses', 'discretionaryExpenses']),
    );
  });

  it('uses authorized prior state for a later three-month unemployment question', () => {
    const prompt = 'What happens if I lose my job for three months?';
    const result = financialTwinFromIntent({
      prompt: 'What happens if I lose my job for 3 months?',
      intent: interpret('What happens if I lose my job for 3 months?'),
      profile,
      loan,
      simulationId: null,
      history: [{ blocks: [prior] }],
    });
    expect(wantsFinancialTwin(prompt, false)).toBe(true);
    expect(result.block?.scenario.shocks).toEqual([
      { kind: 'unemployment', startMonth: 1, durationMonths: 3 },
    ]);
    expect(result.block?.stressed.firstCashShortfall).toBe(1);
    expect(result.block?.baseline.months).toBe(12);
  });

  it('recognizes a spoken three-month duration and compares two terms', () => {
    const unemployment = 'Can I afford this loan if I lose my job for three months?';
    const first = financialTwinFromIntent({
      prompt: unemployment,
      intent: interpret(unemployment),
      profile,
      loan,
      simulationId: null,
      history: [{ blocks: [prior] }],
    });
    expect(first.block?.scenario.shocks).toEqual([
      { kind: 'unemployment', startMonth: 1, durationMonths: 3 },
    ]);
    const comparison = 'Compare 12-month and 24-month repayment plans';
    expect(wantsFinancialTwin(comparison, false)).toBe(true);
    const second = financialTwinFromIntent({
      prompt: comparison,
      intent: interpret(comparison),
      profile,
      loan,
      simulationId: null,
      history: [{ blocks: [prior] }],
    });
    expect(second.block?.scenario.alternativeLoan).toEqual({ months: 24 });
    expect(second.block?.stressed.months).toBe(24);
  });

  it('labels a partial early payment hypothetical with unknown lender fee', () => {
    const prompt = 'What happens if I repay 5 million early after month 4?';
    const result = financialTwinFromIntent({
      prompt,
      intent: interpret(prompt),
      profile,
      loan,
      simulationId: null,
      history: [{ blocks: [prior] }],
    });
    expect(result.block?.scenario.shocks).toEqual([
      { kind: 'earlyRepayment', startMonth: 4, amount: 5_000_000, fee: null },
    ]);
    expect(result.block?.stressed.hypotheticalEarlyRepayment).toBe(true);
    expect(result.block?.stressed.unknownCosts).toContain('early_repayment_fee');
  });
});
