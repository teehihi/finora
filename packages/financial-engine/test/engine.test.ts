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
