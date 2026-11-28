import { describe, expect, it } from 'vitest';
import { simulate, affordability, compare } from '../src';
import type { LoanInput, Method } from '@finora/contracts';
const base: LoanInput = {
  principal: 12000000,
  months: 12,
  annualRate: 12,
  fee: null,
  method: 'flat',
  firstDue: '2024-01-31',
};
describe('monthly VND ledger', () => {
  it('charges flat interest on original principal each period', () => {
    const x = simulate(base);
    expect(x.interest).toBe(1440000);
    expect(x.firstPayment).toBe(1120000);
    expect(x.total).toBeNull();
  });
  it('reduces interest on outstanding principal', () => {
    const x = simulate({ ...base, method: 'equalPrincipal', fee: 15000 });
    expect(x.interest).toBe(780000);
    expect(x.total).toBe(12795000);
    expect(x.schedule.at(-1)?.interest).toBe(10000);
  });
  it('amortizes an annuity', () => {
    const x = simulate({ ...base, method: 'annuity' });
    expect(x.firstPayment).toBe(1066185);
    expect(x.schedule[1].payment).toBe(x.firstPayment);
  });
  it('clamps dates from the original anchor', () =>
    expect(
      simulate(base)
        .schedule.slice(0, 3)
        .map((x) => x.date),
    ).toEqual(['2024-01-31', '2024-02-29', '2024-03-31']));
  it('rounds half a dong up', () =>
    expect(simulate({ ...base, principal: 50, months: 1 }).interest).toBe(1));
  it.each(['flat', 'annuity', 'equalPrincipal'] as Method[])(
    'reconciles rounded principal and terminal balance for %s',
    (method) => {
      for (const principal of [1, 2, 999, 987654321, 1e12])
        for (const months of [1, 2, 12, 360])
          for (const annualRate of [0, 0.01, 85, 100]) {
            const r = simulate({ ...base, principal, months, method, annualRate });
            expect(r.schedule.reduce((sum, p) => sum + p.principal, 0)).toBe(principal);
            expect(r.schedule.at(-1)?.balance).toBe(0);
            expect(r.schedule.every((p) => p.balance >= 0 && p.principal >= 0)).toBe(true);
            expect(r.schedule.reduce((sum, p) => sum + p.payment, 0)).toBe(r.repayment);
          }
    },
  );
  it.each([
    { months: 0 },
    { principal: -1 },
    { annualRate: Infinity },
    { annualRate: 1e-80 },
    { fee: -1 },
    { firstDue: '2025-02-29' },
    { months: 361 },
  ])('rejects invalid inputs', (bad) => expect(() => simulate({ ...base, ...bad })).toThrow());
  it('preserves unknown fees in comparisons', () => {
    expect(compare(base, base).totalDifference).toBeNull();
    expect(compare({ ...base, fee: 100 }, { ...base, fee: 0 }).totalDifference).toBe(100);
  });
  it('caps a scenario by disposable income and debt headroom', () => {
    expect(affordability({ income: 10000, debt: 1500, expenses: 8100 })).toEqual({
      monthlyBudget: 400,
      debtToIncome: 15,
      target: 0.35,
    });
    expect(affordability({ income: 1, debt: 5, expenses: 0 }).monthlyBudget).toBe(0);
    expect(() => affordability({ income: 0, debt: 0, expenses: 0 })).toThrow();
  });
});

describe('financial cap, fee, and calendar audit', () => {
  it('cross-checks representative methods against independently written monthly formulas', () => {
    const principal = 12_000_000;
    const months = 12;
    const annualRate = 12;
    const periodicRate = annualRate / 1_200;
    const flat = simulate({ ...base, principal, months, annualRate, method: 'flat', fee: 0 });
    const equal = simulate({
      ...base,
      principal,
      months,
      annualRate,
      method: 'equalPrincipal',
      fee: 0,
    });
    const annuity = simulate({ ...base, principal, months, annualRate, method: 'annuity', fee: 0 });
    expect(flat.schedule[0].payment).toBe(principal / months + principal * periodicRate);
    expect(equal.schedule[0].payment).toBe(principal / months + principal * periodicRate);
    expect(equal.schedule.at(-1)?.payment).toBe(
      principal / months + (principal / months) * periodicRate,
    );
    expect(annuity.schedule[0].payment).toBe(
      Math.round((principal * periodicRate) / (1 - (1 + periodicRate) ** -months)),
    );
  });
  it.each(['flat', 'annuity', 'equalPrincipal'] as Method[])(
    'does not spread one-time fees into the payment schedule for %s',
    (method) => {
      const terms = { ...base, method, principal: 1_200, months: 12, annualRate: 0 };
      const unknown = simulate(terms);
      const noFee = simulate({ ...terms, fee: 0 });
      const known = simulate({ ...terms, fee: 150 });
      expect(known.schedule).toEqual(unknown.schedule);
      expect(known.firstPayment).toBe(100);
      expect(known.interest).toBe(0);
      expect(unknown.total).toBeNull();
      expect(noFee.total).toBe(1_200);
      expect(known.total).toBe(1_350);
    },
  );

  it('preserves UTC date-only anchors through rollover and non-leap February', () => {
    expect(
      simulate({ ...base, months: 4, firstDue: '2026-12-31' }).schedule.map((x) => x.date),
    ).toEqual(['2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31']);
  });

  it('keeps safe integer VND at the accepted principal/rate/term bounds', () => {
    const input = {
      ...base,
      principal: 1_000_000_000_000,
      annualRate: 0.0001,
      months: 360,
      fee: 1_000_000_000_000,
      method: 'annuity' as const,
    };
    const result = simulate(input);
    expect(result.schedule[0].interest).toBe(83_333);
    expect(result.schedule).toHaveLength(360);
    expect(result.schedule.every((row) => Number.isSafeInteger(row.payment))).toBe(true);
    expect(result.schedule.at(-1)?.balance).toBe(0);
    expect(result.total).toBe(result.repayment + input.fee);
  });

  it('discloses through the ledger when a rounded tiny installment ends with a larger final payment', () => {
    const result = simulate({ ...base, principal: 1, annualRate: 0, method: 'annuity', months: 2 });
    // The rounded first installment consumes the full balance; the final payment is zero here.
    expect(result.schedule.map((row) => row.payment)).toEqual([1, 0]);
    const firstBelowHalf = simulate({
      ...base,
      principal: 1,
      annualRate: 0,
      method: 'annuity',
      months: 3,
    });
    expect(firstBelowHalf.schedule.map((row) => row.payment)).toEqual([0, 0, 1]);
  });

  it('never claims target debt headroom that cannot be covered after expenses', () => {
    expect(
      affordability({ income: 16_000_000, expenses: 13_000_000, debt: 4_000_000 }),
    ).toMatchObject({
      monthlyBudget: 0,
      debtToIncome: 25,
    });
    expect(() =>
      affordability({ income: 16_000_000, expenses: 4_000_000, debt: 0 }, 1.01),
    ).toThrow();
  });
});
