import { describe, expect, it } from 'vitest';
import { projectDigitalTwin, compareDigitalTwin, simulate } from '../src/index';

const value = (amount: number) => ({ amount, source: 'user_estimate' as const });
const loan = {
  principal: 24_000_000,
  annualRate: 12,
  months: 12,
  method: 'annuity' as const,
  fee: null,
  firstDue: '2026-01-31',
};
const state = {
  monthlyIncome: value(12_000_000),
  incomeStability: 'stable' as const,
  essentialExpenses: value(5_000_000),
  discretionaryExpenses: value(1_000_000),
  existingDebtPayments: value(1_000_000),
  currentSavings: value(10_000_000),
  emergencyFund: value(8_000_000),
  events: [],
};

describe('financial digital twin', () => {
  it('reconciles every baseline installment, date and balance with the existing engine', () => {
    const projection = projectDigitalTwin({ state, loan, scenario: { shocks: [] } });
    const schedule = simulate(loan).schedule;
    expect(projection.status).toBe('projected');
    expect(projection.months).toHaveLength(12);
    for (let i = 0; i < schedule.length; i++) {
      expect(projection.months[i]).toMatchObject({
        date: schedule[i].date,
        loanPayment: schedule[i].payment,
        loanBalance: schedule[i].balance,
      });
    }
    expect(projection.months.map((m) => m.date).slice(0, 3)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
  });

  it('keeps missing savings unknown instead of silently treating them as zero', () => {
    const projection = projectDigitalTwin({
      state: { ...state, currentSavings: null },
      loan,
      scenario: { shocks: [] },
    });
    expect(projection.months[0].accumulatedSavings).toBeNull();
    expect(projection.missing).toContain('currentSavings');
  });

  it('identifies shortfall and depleted reserves under combined shocks', () => {
    const scenario = {
      shocks: [
        { kind: 'unemployment' as const, startMonth: 2, durationMonths: 3 },
        { kind: 'unexpectedExpense' as const, startMonth: 2, amount: 4_000_000 },
      ],
    };
    const result = projectDigitalTwin({ state, loan, scenario });
    expect(result.firstCashShortfall).toBe(2);
    expect(result.stressedPeriods).toBeGreaterThanOrEqual(3);
    expect(result.reserveDepletionMonth).not.toBeNull();
    expect(projectDigitalTwin({ state, loan, scenario })).toEqual(result);
  });

  it('compares terms from the same baseline without changing the base result', () => {
    const comparison = compareDigitalTwin({
      state,
      loan,
      scenarios: [
        { shocks: [], alternativeLoan: { months: 24 } },
        {
          shocks: [
            { kind: 'incomeReduction' as const, startMonth: 1, durationMonths: 3, percent: 20 },
          ],
        },
      ],
    });
    expect(comparison.baseline.months).toHaveLength(12);
    expect(comparison.alternatives[0].months).toHaveLength(24);
    expect(comparison.alternatives[1].months).toHaveLength(12);
    expect(comparison.alternatives[1].months[0].income).toBe(9_600_000);
  });

  it('uses the existing engine for an alternative amount and applies bounded inflation', () => {
    const result = compareDigitalTwin({
      state,
      loan,
      scenarios: [
        {
          alternativeLoan: { principal: 12_000_000 },
          shocks: [{ kind: 'expenseInflation', startMonth: 2, durationMonths: 2, percent: 10 }],
        },
      ],
    });
    const alternate = result.alternatives[0];
    expect(alternate.months[0].loanPayment).toBe(
      simulate({ ...loan, principal: 12_000_000 }).schedule[0].payment,
    );
    expect(alternate.months.map((m) => m.essentialExpenses).slice(0, 4)).toEqual([
      5_000_000, 5_500_000, 6_050_000, 5_000_000,
    ]);
    expect(result.baseline.months[0].loanPayment).toBe(simulate(loan).schedule[0].payment);
  });

  it('labels early repayment hypothetical and preserves unknown lender fees', () => {
    const result = projectDigitalTwin({
      state,
      loan,
      scenario: {
        shocks: [{ kind: 'earlyRepayment', startMonth: 4, amount: 5_000_000, fee: null }],
      },
    });
    expect(result.hypotheticalEarlyRepayment).toBe(true);
    expect(result.unknownCosts).toContain('early_repayment_fee');
    expect(result.months[3].loanBalance).toBeLessThan(simulate(loan).schedule[3].balance);
    expect(result.months.at(-1)?.loanBalance).toBe(0);
  });

  it('rejects missing core budget values and invalid shock ranges', () => {
    const missing = projectDigitalTwin({
      state: { ...state, discretionaryExpenses: null },
      loan,
      scenario: { shocks: [] },
    });
    expect(missing.status).toBe('incomplete');
    expect(missing.months).toEqual([]);
    expect(() =>
      projectDigitalTwin({
        state,
        loan,
        scenario: {
          shocks: [{ kind: 'incomeReduction', startMonth: 0, durationMonths: 3, percent: 20 }],
        },
      }),
    ).toThrow();
    expect(() =>
      projectDigitalTwin({
        state,
        loan,
        scenario: { shocks: [{ kind: 'unemployment', startMonth: 13, durationMonths: 1 }] },
      }),
    ).toThrow('Scenario starts after the proposed loan term');
  });

  it('applies recurring budget changes only in their defined months', () => {
    const result = projectDigitalTwin({
      state: {
        ...state,
        events: [
          {
            kind: 'income',
            change: 2_000_000,
            startMonth: 2,
            durationMonths: 2,
            source: 'observed',
            label: 'Synthetic part-time work',
          },
        ],
      },
      loan,
      scenario: { shocks: [] },
    });
    expect(result.months.map((m) => m.income).slice(0, 4)).toEqual([
      12_000_000, 14_000_000, 14_000_000, 12_000_000,
    ]);
    expect(result.provenance.events).toEqual(['observed']);
  });

  it('treats explicit zero as known and keeps reserve coverage numeric', () => {
    const result = projectDigitalTwin({
      state: {
        ...state,
        discretionaryExpenses: value(0),
        currentSavings: value(0),
        emergencyFund: value(0),
      },
      loan,
      scenario: { shocks: [] },
    });
    expect(result.status).toBe('projected');
    expect(result.missing).not.toContain('discretionaryExpenses');
    expect(result.months[0].accumulatedSavings).not.toBeNull();
    expect(result.months[0].emergencyCoverageMonths).toBe(0);
    expect(result.reserveDepletionMonth).toBeNull();
    expect(result.resilience).toBe('pressured');
  });

  it('marks the plan unsustainable when cash obligations exceed all available savings', () => {
    const result = projectDigitalTwin({
      state: { ...state, currentSavings: value(0), emergencyFund: value(0) },
      loan,
      scenario: { shocks: [{ kind: 'unemployment', startMonth: 1, durationMonths: 3 }] },
    });
    expect(result.months[0].accumulatedSavings).toBeLessThan(0);
    expect(result.resilience).toBe('unsustainable');
    expect(result.firstCashShortfall).toBe(1);
  });
});
